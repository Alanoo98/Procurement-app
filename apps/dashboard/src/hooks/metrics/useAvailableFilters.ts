import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';

export interface AvailableFilters {
  categories: string[];
  suppliers: string[];
}

export const useAvailableFilters = (
  locationId: string | null,
  year: number,
  month: number
) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.AVAILABLE_FILTERS, {
      organizationId: currentOrganization?.id,
      locationId,
      year,
      month,
    }),
    queryFn: async (): Promise<AvailableFilters> => {
      if (!currentOrganization || !locationId) {
        return { categories: [], suppliers: [] };
      }

      // Get all unique category_ids and supplier names for the location and month
      const { data: filterData, error: filterError } = await supabase
        .from('invoice_lines')
        .select(`
          category_id,
          variant_supplier_name
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('location_id', locationId)
        .gte('invoice_date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lte('invoice_date', `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`)
        .not('total_price_after_discount', 'is', null);

      if (filterError) {
        throw filterError;
      }

      // Get all category names for mapping (category_id -> category_name)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('category_id, category_name')
        .eq('organization_id', currentOrganization.id);

      if (categoriesError) {
        console.error('❌ Categories query error:', categoriesError);
      }

      // Create category mapping
      const categoryMap = new Map<string, string>();
      categoriesData?.forEach(cat => {
        if (cat.category_id && cat.category_name) {
          categoryMap.set(cat.category_id, cat.category_name);
        }
      });

      // Extract unique categories and suppliers
      const categories = new Set<string>();
      const suppliers = new Set<string>();

      filterData?.forEach(item => {
        // Map category_id to category_name (only if category exists)
        if (item.category_id && categoryMap.has(item.category_id)) {
          categories.add(categoryMap.get(item.category_id)!);
        }
        // Use variant_supplier_name directly
        if (item.variant_supplier_name) {
          suppliers.add(item.variant_supplier_name);
        }
      });

      return {
        categories: Array.from(categories).sort(),
        suppliers: Array.from(suppliers).sort()
      };
    },
    enabled: !!currentOrganization && !!locationId,
    staleTime: STALE_TIMES.MODERATE, // Data is fresh for 10 minutes
    gcTime: CACHE_TIMES.MEDIUM, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
  });
};