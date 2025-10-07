import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPriceValue } from '@/utils/getPriceValue';
import { cache } from '@/lib/cache';

type GroupBy = 'location' | 'supplier' | 'product' | 'document';

export interface MetricResult {
  key: string;
  label: string;
  total_spend: number;
  invoice_count: number;
  supplier_count: number;
  product_count: number;
  address: string;
  _invoiceNumbers?: Set<string>;
  _supplierIds?: Set<string>;
  _productCodes?: Set<string>;
}

export const useInvoiceMetrics = (groupBy: GroupBy) => {
  const {
    dateRange,
    restaurants,
    suppliers,
    categories,
    documentType,
    productSearch,
    productCodeFilter,
  } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();

  const [data, setData] = useState<MetricResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create cache key based on all filter parameters
  const cacheKey = useMemo(() => {
    if (!currentOrganization) return '';
    
    const filterHash = JSON.stringify({
      orgId: currentOrganization.id,
      buId: currentBusinessUnit?.id,
      groupBy,
      dateRange,
      restaurants: restaurants.sort(),
      suppliers: suppliers.sort(),
      categories: categories.sort(),
      documentType,
      productSearch,
      productCodeFilter,
    });
    
    return `invoice-metrics:${btoa(filterHash)}`;
  }, [currentOrganization, currentBusinessUnit, groupBy, dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    
    console.log('🔍 Checking cache with key:', cacheKey);
    const result = cache.get<MetricResult[]>(cacheKey);
    console.log('🎯 Cache result:', result ? `${result.length} items` : 'no cache hit');
    return result;
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: MetricResult[]) => {
    if (!cacheKey) return;
    
    console.log('💾 Caching data with key:', cacheKey, 'data length:', data.length);
    cache.set(cacheKey, data, 10 * 60 * 1000); // 10 minutes
  }, [cacheKey]);

  const fetch = useCallback(async () => {
    if (!currentOrganization) {
      setIsLoading(false);
      return;
    }
    
    // Check cache first - this will dramatically improve performance
    const cachedData = getCachedData();
    if (cachedData) {
      console.log('✅ Using cached data:', cachedData.length, 'items');
      setData(cachedData);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    console.log('🌐 No cache hit, fetching from API...');
    
    setIsLoading(true);
    setError(null);



      try {
        // Build the query with proper server-side filtering
        let query = supabase
          .from('invoice_lines')
          .select(`
            location_id,
            locations!left(name, address),
            supplier_id,
            suppliers!left(name),
            invoice_number,
            product_code,
            description,
            total_price_after_discount,
            total_price,
            document_type
          `)
          .eq('organization_id', currentOrganization.id);
        
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          query = query.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Apply date range filter
        if (dateRange?.start && dateRange?.end) {
          query = query.gte('invoice_date', dateRange.start).lte('invoice_date', dateRange.end);
        }

        // Apply location filter - Fixed tautology query
        if (restaurants.length > 0) {
          // When specific locations are selected, filter by those location IDs
          query = query.in('location_id', restaurants);
        } else {
          // When no locations are selected, show only mapped locations (not null)
          query = query.not('location_id', 'is', null);
        }

        // Apply supplier filter
        if (suppliers.length > 0) {
          query = query.in('supplier_id', suppliers);
        }

        // Apply category filter
        if (categories.length > 0) {
          query = query.in('category_id', categories);
        }

        // Apply document type filter
        if (documentType === 'Faktura') {
          query = query.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          // Accept both capitalization variants to match dashboard logic
          query = query.in('document_type', ['Kreditnota', 'Credit note', 'Credit Note']);
        }

        // Apply product code filter
        if (productCodeFilter === 'with_codes') {
          query = query.not('product_code', 'is', null).neq('product_code', '');
        } else if (productCodeFilter === 'without_codes') {
          query = query.or('product_code.is.null,product_code.eq.');
        }

        // Fetch all data using pagination (Supabase has a hard limit of 1000 rows per query)
        let allRows: Array<{
          location_id: string | null;
          locations: { name: string; address: string } | null;
          supplier_id: string;
          suppliers: { name: string } | null;
          invoice_number: string;
          product_code: string | null;
          description: string | null;
          total_price_after_discount: number | null;
          total_price: number | null;
          document_type: string | null;
        }> = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const offset = page * pageSize;
          
          const { data: pageRows, error: pageError } = await query
            .range(offset, offset + pageSize - 1);

          if (pageError) {
            setError(pageError);
            setIsLoading(false);
            return;
          }

          if (!pageRows || pageRows.length === 0) {
            hasMore = false;
          } else {
            allRows = allRows.concat(pageRows as unknown as typeof allRows);
            
            // If we got less than pageSize, we've reached the end
            if (pageRows.length < pageSize) {
              hasMore = false;
            }
            
            page++;
          }
        }

        const rows = allRows;



        // Apply product search filter on client side (since Supabase doesn't support complex text search)
        let filteredRows = rows || [];
        if (productSearch.terms.length > 0) {
          filteredRows = filteredRows.filter(row => {
            const searchText = `${row.description || ''} ${row.product_code || ''}`.toLowerCase();
            if (productSearch.mode === 'AND') {
              return productSearch.terms.every(term => 
                searchText.includes(term.toLowerCase())
              );
            } else {
              return productSearch.terms.some(term => 
                searchText.includes(term.toLowerCase())
              );
            }
          });

        }

        // Group by type on client side
        const grouped: Record<string, MetricResult> = {};

        for (const row of filteredRows) {
          let total = getPriceValue(
            (row.total_price_after_discount as unknown as number) ?? null,
            (row.total_price as unknown as number) ?? null
          );
          
          // Handle credit notes: they should reduce total spending
          const documentType = row.document_type || '';
          if (documentType.toLowerCase().includes('kreditnota') || 
              documentType.toLowerCase().includes('credit')) {
            // For credit notes, we want to subtract the absolute value
            total = -Math.abs(total);
          }
          // If price is already negative from ETL processing, keep it negative
          else if (total < 0) {
            // Price is already negative from ETL processing - keep it negative
          }
          let key = '';
          let label = '';

          if (groupBy === 'location') {
            key = (row.location_id || '-') as string;
            label = (row.locations?.name) ?? '-';
          } else if (groupBy === 'supplier') {
            key = (row.supplier_id || '-') as string;
            label = (row.suppliers?.name) ?? '-';
          } else if (groupBy === 'product') {
            key = row.product_code || row.description || 'unknown';
            label = row.description ?? '-';
          } else if (groupBy === 'document') {
            key = row.invoice_number;
            label = row.invoice_number;
          }

          if (!grouped[key]) {
            grouped[key] = {
              key,
              label,
              total_spend: 0,
              invoice_count: 0,
              supplier_count: 0,
              product_count: 0,
              address: groupBy === 'location' ? (row.locations?.address ?? '') : '',
            };
          }

          grouped[key].total_spend += total;
          
          // Track unique values using Sets
          if (!grouped[key]._invoiceNumbers) {
            grouped[key]._invoiceNumbers = new Set();
          }
          if (!grouped[key]._supplierIds) {
            grouped[key]._supplierIds = new Set();
          }
          if (!grouped[key]._productCodes) {
            grouped[key]._productCodes = new Set();
          }

          grouped[key]._invoiceNumbers!.add(row.invoice_number);
          grouped[key]._supplierIds!.add(row.supplier_id);
          grouped[key]._productCodes!.add(row.product_code || row.description || 'unknown');
        }

        // Convert Sets to counts and clean up
        const result = Object.values(grouped).map(location => ({
          ...location,
          invoice_count: location._invoiceNumbers?.size || 0,
          supplier_count: location._supplierIds?.size || 0,
          product_count: location._productCodes?.size || 0,
          _invoiceNumbers: undefined,
          _supplierIds: undefined,
          _productCodes: undefined,
        }));

        // Sort by total spend descending
        result.sort((a, b) => b.total_spend - a.total_spend);

        console.log('📊 API returned data:', result.length, 'locations');
        console.log('📊 Sample location data:', result.slice(0, 2));
        
        setData(result);
        setCachedData(result); // Cache the result for next time
              } catch (err) {
          setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, [currentOrganization, currentBusinessUnit, groupBy, dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, getCachedData, setCachedData]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error };
};
