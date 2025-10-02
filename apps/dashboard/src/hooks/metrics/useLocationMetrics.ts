import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';

export interface LocationMetric {
  location_id: string;
  location_name: string;
  location_address: string;
  invoice_count: number;
  supplier_count: number;
  product_count: number;
  total_spend: number;
  _invoiceNumbers?: Set<string>;
  _supplierIds?: Set<string>;
  _productCodes?: Set<string>;
}

export const useLocationMetrics = () => {
  const {
    dateRange,
    restaurants,
    suppliers,
    categories,
    documentType,
    productCodeFilter,
  } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();

  const [data, setData] = useState<LocationMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!currentOrganization) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        // Build the query with server-side aggregation
        let query = supabase
          .from('invoice_lines')
          .select(`
            location_id,
            locations!left(name, address),
            invoice_number,
            supplier_id,
            product_code,
            description,
            total_price_after_discount,
            total_price
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

        // Apply location filter - IMPORTANT: This should always be applied to ensure consistency
        // When no specific locations are selected, we want to show all mapped locations
        if (restaurants.length > 0) {
          // When specific locations are selected, filter by those location IDs
          query = query.in('location_id', restaurants);
        } else {
          // When no locations are selected, only show mapped locations (not null)
          // This ensures consistency between filtered and unfiltered views
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
          query = query.in('document_type', ['Kreditnota', 'Credit Note']);
        }

        // Apply product code filter
        if (productCodeFilter === 'with_codes') {
          query = query.not('product_code', 'is', null).neq('product_code', '');
        } else if (productCodeFilter === 'without_codes') {
          query = query.or('product_code.is.null,product_code.eq.');
        }

        console.log('🔍 Query filters:', {
          organization_id: currentOrganization.id,
          business_unit_id: currentBusinessUnit?.id,
          dateRange,
          restaurants,
          suppliers,
          documentType,
          productCodeFilter
        });

        // Fetch all data using pagination (Supabase has a hard limit of 1000 rows per query)
        let allRows: any[] = [];
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
            allRows = allRows.concat(pageRows);
            
            // If we got less than pageSize, we've reached the end
            if (pageRows.length < pageSize) {
              hasMore = false;
            }
            
            page++;
          }
        }

        const rows = allRows;

        // Group by location on the client side (much simpler than before)
        const grouped: Record<string, LocationMetric> = {};

        for (const row of rows) {
          const locationId = row.location_id;
          const priceAfterDiscount = parseFloat(row.total_price_after_discount || '0');
          const totalPrice = parseFloat(row.total_price || '0');
          
          // Prefer total_price_after_discount if it's > 0, otherwise use total_price
          const total = priceAfterDiscount > 0 ? priceAfterDiscount : totalPrice;

          if (!grouped[locationId]) {
            grouped[locationId] = {
              location_id: locationId,
              location_name: row.locations?.name || 'Unknown',
              location_address: row.locations?.address || '',
              invoice_count: 0,
              supplier_count: 0,
              product_count: 0,
              total_spend: 0,
            };
          }

          // Track unique values using Sets
          if (!grouped[locationId]._invoiceNumbers) {
            grouped[locationId]._invoiceNumbers = new Set();
          }
          if (!grouped[locationId]._supplierIds) {
            grouped[locationId]._supplierIds = new Set();
          }
          if (!grouped[locationId]._productCodes) {
            grouped[locationId]._productCodes = new Set();
          }

          grouped[locationId]._invoiceNumbers!.add(row.invoice_number);
          grouped[locationId]._supplierIds!.add(row.supplier_id);
          grouped[locationId]._productCodes!.add(row.product_code || row.description || 'unknown');
          grouped[locationId].total_spend += total;
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

        console.log('📈 Final results:', result.map(loc => ({
          name: loc.location_name,
          invoices: loc.invoice_count,
          suppliers: loc.supplier_count,
          products: loc.product_count,
          spend: loc.total_spend
        })));

        setData(result);
        console.log('Location metrics loaded:', result.length, 'locations');
      } catch (err) {
        console.error('Error fetching location metrics:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [dateRange, restaurants, suppliers, categories, documentType, productCodeFilter, currentOrganization, currentBusinessUnit]);

  return { data, isLoading, error };
};
