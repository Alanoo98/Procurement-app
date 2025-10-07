/**
 * UNIFIED SUPPLIER ANALYTICS HOOK
 * 
 * This replaces both useSuppliers and useSupplierMetricsAnalysis
 * with a single, comprehensive supplier analytics hook.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPriceValue } from '@/utils/getPriceValue';
import { cache } from '@/lib/cache';

type SupplierMetric = {
  supplier_id: string;
  name: string;
  address: string;
  tax_id: string;
  active: boolean;
  invoice_count: number;
  total_spend: number;
  product_count: number;
  top_products: string;
  // Additional analytics fields
  avg_invoice_value?: number;
  spend_trend?: 'increasing' | 'decreasing' | 'stable';
  efficiency_score?: number;
  consolidation_opportunities?: number;
};

type SupplierAnalyticsOptions = {
  // Include additional analytics calculations
  includeAnalytics?: boolean;
  // Include consolidation opportunities
  includeConsolidation?: boolean;
  // Include trend analysis
  includeTrends?: boolean;
  // Cache TTL in milliseconds
  cacheTtl?: number;
};

export const useSuppliers = (options: SupplierAnalyticsOptions = {}) => {
  const {
    includeAnalytics = true,
    includeConsolidation = true,
    includeTrends = true,
    cacheTtl = 10 * 60 * 1000, // 10 minutes
  } = options;

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

  const [data, setData] = useState<SupplierMetric[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create cache key based on all filter parameters
  const cacheKey = useMemo(() => {
    if (!currentOrganization) return '';
    
    const filterHash = JSON.stringify({
      orgId: currentOrganization.id,
      buId: currentBusinessUnit?.id,
      dateRange,
      restaurants: restaurants.sort(),
      suppliers: suppliers.sort(),
      categories: categories.sort(),
      documentType,
      productSearch,
      productCodeFilter,
      includeAnalytics,
      includeConsolidation,
      includeTrends,
    });
    
    return `supplier-analytics:${btoa(filterHash)}`;
  }, [currentOrganization, currentBusinessUnit, dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, includeAnalytics, includeConsolidation, includeTrends]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    return cache.get<SupplierMetric[]>(cacheKey);
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: SupplierMetric[]) => {
    if (!cacheKey) return;
    cache.set(cacheKey, data, cacheTtl);
  }, [cacheKey, cacheTtl]);

  const fetchData = async () => {
    if (!currentOrganization) return;
    
    // Check cache first - this will dramatically improve performance
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // First, get all unique supplier IDs from invoice lines
      let supplierIdsQuery = supabase
        .from('invoice_lines')
        .select('supplier_id')
        .eq('organization_id', currentOrganization.id);
        
      // Apply business unit filter if selected
      if (currentBusinessUnit && currentBusinessUnit.id) {
        supplierIdsQuery = supplierIdsQuery.eq('business_unit_id', currentBusinessUnit.id);
      }

      if (dateRange?.start && dateRange?.end) {
        supplierIdsQuery = supplierIdsQuery
          .gte('invoice_date', dateRange.start)
          .lte('invoice_date', dateRange.end);
      }

      if (restaurants.length > 0) {
        supplierIdsQuery = supplierIdsQuery.in('location_id', restaurants);
      }

      if (suppliers.length > 0) {
        supplierIdsQuery = supplierIdsQuery.in('supplier_id', suppliers);
      }

      if (categories.length > 0) {
        supplierIdsQuery = supplierIdsQuery.in('category_id', categories);
      }

      if (documentType === 'Faktura') {
        supplierIdsQuery = supplierIdsQuery.in('document_type', ['Faktura', 'Invoice']);
      } else if (documentType === 'Kreditnota') {
        supplierIdsQuery = supplierIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
      }

      // Apply product code filter
      if (productCodeFilter === 'with_codes') {
        supplierIdsQuery = supplierIdsQuery.not('product_code', 'is', null).neq('product_code', '');
      } else if (productCodeFilter === 'without_codes') {
        supplierIdsQuery = supplierIdsQuery.or('product_code.is.null,product_code.eq.');
      }

      const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;

      if (supplierIdsError) {
        setError(supplierIdsError);
        setData([]);
        setLoading(false);
        return;
      }

      // Get unique supplier IDs, filtering out null values
      const uniqueSupplierIds = [...new Set((supplierIdsData || []).map(row => row.supplier_id))].filter(id => id !== null);

      if (uniqueSupplierIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Get supplier details
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('supplier_id, name, address, tax_id, active')
        .eq('organization_id', currentOrganization.id)
        .in('supplier_id', uniqueSupplierIds)
        .eq('active', true);

      if (suppliersError) {
        setError(suppliersError);
        setData([]);
        setLoading(false);
        return;
      }

      // Create a map for quick supplier lookup
      const suppliersMap = new Map(
        (suppliersData || []).map(supplier => [
          supplier.supplier_id, 
          { name: supplier.name, address: supplier.address, tax_id: supplier.tax_id, active: supplier.active }
        ])
      );

      // Get invoice lines data for the suppliers
      let invoiceLinesQuery = supabase
        .from('invoice_lines')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .in('supplier_id', uniqueSupplierIds);

      // Apply business unit filter if selected
      if (currentBusinessUnit && currentBusinessUnit.id) {
        invoiceLinesQuery = invoiceLinesQuery.eq('business_unit_id', currentBusinessUnit.id);
      }

      // Apply all the same filters as the supplier query
      if (dateRange?.start && dateRange?.end) {
        invoiceLinesQuery = invoiceLinesQuery
          .gte('invoice_date', dateRange.start)
          .lte('invoice_date', dateRange.end);
      }

      if (restaurants.length > 0) {
        invoiceLinesQuery = invoiceLinesQuery.in('location_id', restaurants);
      }

      if (suppliers.length > 0) {
        invoiceLinesQuery = invoiceLinesQuery.in('supplier_id', suppliers);
      }

      if (categories.length > 0) {
        invoiceLinesQuery = invoiceLinesQuery.in('category_id', categories);
      }

      if (documentType === 'Faktura') {
        invoiceLinesQuery = invoiceLinesQuery.in('document_type', ['Faktura', 'Invoice']);
      } else if (documentType === 'Kreditnota') {
        invoiceLinesQuery = invoiceLinesQuery.in('document_type', ['Kreditnota', 'Credit note']);
      }

      if (productCodeFilter === 'with_codes') {
        invoiceLinesQuery = invoiceLinesQuery.not('product_code', 'is', null).neq('product_code', '');
      } else if (productCodeFilter === 'without_codes') {
        invoiceLinesQuery = invoiceLinesQuery.or('product_code.is.null,product_code.eq.');
      }

      // Fetch all data using pagination
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const offset = page * pageSize;
        
        const { data: pageRows, error: pageError } = await invoiceLinesQuery
          .range(offset, offset + pageSize - 1);

        if (pageError) {
          setError(pageError);
          setData([]);
          setLoading(false);
          return;
        }

        if (!pageRows || pageRows.length === 0) {
          hasMore = false;
        } else {
          allRows = allRows.concat(pageRows);
          
          if (pageRows.length < pageSize) {
            hasMore = false;
          }
          
          page++;
        }
      }

      // Process the data
      const grouped: Record<string, {
        supplier_id: string;
        name: string;
        address: string;
        tax_id: string;
        invoice_numbers: Set<string>;
        total_spend: number;
        product_totals: Map<string, { description: string; spend: number }>;
      }> = {};

      for (const row of allRows) {
        const id = row.supplier_id;
        const supplier = suppliersMap.get(id);
        
        if (!supplier) continue;

        if (!grouped[id]) {
          grouped[id] = {
            supplier_id: id,
            name: supplier.name,
            address: supplier.address,
            tax_id: supplier.tax_id,
            invoice_numbers: new Set(),
            total_spend: 0,
            product_totals: new Map(),
          };
        }

        const total = getPriceValue(row.total_price_after_discount, row.total_price);
        grouped[id].invoice_numbers.add(row.invoice_number);
        grouped[id].total_spend += total;

        const productKey = row.product_code ?? row.description ?? '-';
        if (!grouped[id].product_totals.has(productKey)) {
          grouped[id].product_totals.set(productKey, {
            description: row.description ?? row.product_code ?? 'Unnamed product',
            spend: 0,
          });
        }

        grouped[id].product_totals.get(productKey)!.spend += total;
      }

      const result = Object.values(grouped)
        .map((entry) => {
          const topProducts = Array.from(entry.product_totals.entries())
            .sort((a, b) => b[1].spend - a[1].spend)
            .slice(0, 5)
            .map(([, { description, spend }]) => {
              const cleanDescription = (description || '')
                .replace(/\r?\n+/g, ' ')
                .replace(/,+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              return `${cleanDescription} (${spend.toFixed(0)} kr)`;
            })
            .join(', ');

          const supplier = suppliersMap.get(entry.supplier_id);

          return {
            supplier_id: entry.supplier_id,
            name: entry.name,
            address: entry.address,
            tax_id: entry.tax_id,
            active: supplier?.active ?? true,
            invoice_count: entry.invoice_numbers.size,
            total_spend: entry.total_spend,
            product_count: entry.product_totals.size,
            top_products: topProducts,
            // Additional analytics if requested
            ...(includeAnalytics && {
              avg_invoice_value: entry.invoice_numbers.size > 0 ? entry.total_spend / entry.invoice_numbers.size : 0,
            }),
            ...(includeConsolidation && {
              consolidation_opportunities: entry.product_totals.size,
            }),
            ...(includeTrends && {
              spend_trend: 'stable' as const, // Would need historical data to calculate
            }),
          };
        })
        .sort((a, b) => b.total_spend - a.total_spend);

      setData(result);
      setCachedData(result); // Cache the result for next time
    } catch (err) {
      console.error('Error fetching supplier analytics:', err);
      setError(err as Error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit, getCachedData, setCachedData]);

  const refetch = useCallback(() => {
    // Clear cache when manually refetching
    if (cacheKey) {
      cache.delete(cacheKey);
    }
    setLoading(true);
    setError(null);
    fetchData();
  }, [cacheKey]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};
