import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getSpendingData } from '@/utils/spendingQueries';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';
import { getPriceValue } from '@/utils/getPriceValue';

export interface ProductSpendingItem {
  product_code: string | null;
  description: string | null;
  total_spend: number;
  percentage_of_total_spend: number;
  percentage_of_revenue: number;
  invoice_count: number;
  spend_per_pax: number;
  category_name: string | null;
  supplier_name: string | null;
}

export interface ProductSpendingAnalysis {
  location_id: string;
  location_name: string;
  year: number;
  month: number;
  total_revenue: number | null;
  total_spend: number;
  cogs_percentage: number | null;
  currency: string;
  products: ProductSpendingItem[];
}

export const useProductSpendingAnalysis = (
  locationId: string | null,
  year: number,
  month: number,
  categoryFilters?: string[],
  supplierFilters?: string[]
) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.PRODUCT_SPENDING_ANALYSIS, {
      organizationId: currentOrganization?.id,
      locationId,
      year,
      month,
      categoryFilters: categoryFilters?.sort(),
      supplierFilters: supplierFilters?.sort(),
    }),
    queryFn: async (): Promise<ProductSpendingAnalysis | null> => {
      if (!currentOrganization || !locationId) {
        return null;
      }

      // Fetch monthly revenue data
      const { data: revenueDataArray, error: revenueError } = await supabase
        .from('monthly_revenue')
        .select(`
          *,
          locations!left(name, address)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('location_id', locationId)
        .eq('year', year)
        .eq('month', month);

      if (revenueError) {
        throw revenueError;
      }

      const revenueData = revenueDataArray?.[0];

      // Get location data
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('name')
        .eq('location_id', locationId)
        .single();

      if (locationError) {
        throw locationError;
      }

      // Fetch spending data using the same query as other hooks
      const spendingData = await getSpendingData({
        organizationId: currentOrganization.id,
        year,
        month,
        locationId
      });

      // Fetch category information separately
      const categoryIds = [...new Set(spendingData.map(item => item.category_id).filter(Boolean))];
      const categoryMappingIds = [...new Set(spendingData.map(item => item.category_mapping_id).filter(Boolean))];

      const categoriesMap = new Map<string, string>();
      const categoryMappingsMap = new Map<string, string>();

      // Fetch direct categories
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('product_categories')
          .select('category_id, category_name')
          .eq('organization_id', currentOrganization.id)
          .in('category_id', categoryIds);

        if (categoriesError) {
          console.warn('Error fetching categories:', categoriesError);
        } else {
          categoriesData?.forEach(cat => {
            categoriesMap.set(cat.category_id, cat.category_name);
          });
        }
      }

      // Fetch category mappings
      if (categoryMappingIds.length > 0) {
        const { data: mappingsData, error: mappingsError } = await supabase
          .from('product_category_mappings')
          .select(`
            mapping_id,
            category_id,
            product_categories!category_id(category_name)
          `)
          .eq('organization_id', currentOrganization.id)
          .in('mapping_id', categoryMappingIds);

        if (mappingsError) {
          console.warn('Error fetching category mappings:', mappingsError);
        } else {
          mappingsData?.forEach(mapping => {
            if (mapping.product_categories?.[0]?.category_name) {
              categoryMappingsMap.set(mapping.mapping_id, mapping.product_categories[0].category_name);
            }
          });
        }
      }

      // Fetch PAX data for the same month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const { data: paxData, error: paxError } = await supabase
        .from('pax')
        .select('pax_count, date_id')
        .eq('location_id', locationId)
        .gte('date_id', startDateStr)
        .lte('date_id', endDateStr);

      if (paxError) {
        console.warn('PAX data fetch error (non-critical):', paxError);
      }

      // Calculate total PAX for the month
      const totalPax = paxData?.reduce((sum, pax) => sum + (pax.pax_count || 0), 0) || 0;

      // Process spending data and group by product
      const productSpending = new Map<string, {
        product_code: string | null;
        description: string | null;
        total_spend: number;
        invoice_count: number;
        spend_per_pax: number;
        category_name: string | null;
        supplier_name: string | null;
      }>();

      // Debug: Log the first few items to see the structure
      console.log('Debug - First spending item structure:', spendingData[0]);
      console.log('Debug - Category IDs found:', categoryIds);
      console.log('Debug - Category Mapping IDs found:', categoryMappingIds);
      
      // Debug: Check for credit notes and negative values
      const creditNotes = spendingData.filter(item => 
        (item.document_type || '').toLowerCase().includes('kreditnota') || 
        (item.document_type || '').toLowerCase().includes('credit') ||
        (item.quantity || 0) < 0
      );
      console.log('Debug - Credit notes found:', creditNotes.length, creditNotes.slice(0, 3));
      
      const negativeValues = spendingData.filter(item => {
        const priceAfterDiscount = parseFloat(item.total_price_after_discount || '0');
        const totalPrice = parseFloat(item.total_price || '0');
        return priceAfterDiscount < 0 || totalPrice < 0;
      });
      console.log('Debug - Negative values found:', negativeValues.length, negativeValues.slice(0, 3));
      
      spendingData.forEach(item => {
        const key = item.product_code || item.description || 'unknown';
        let spend = getPriceValue(
          item.total_price_after_discount ? parseFloat(item.total_price_after_discount) : null,
          item.total_price ? parseFloat(item.total_price) : null
        );
        
        // Handle credit notes: they should reduce total spending
        const documentType = item.document_type || '';
        if (documentType.toLowerCase().includes('kreditnota') || 
            documentType.toLowerCase().includes('credit')) {
          // For credit notes, we want to subtract the absolute value
          spend = -Math.abs(spend);
        }
        // If price is already negative from ETL processing, keep it negative
        else if (spend < 0) {
          // Price is already negative from ETL processing - keep it negative
        }

        if (productSpending.has(key)) {
          const existing = productSpending.get(key)!;
          existing.total_spend += spend;
          existing.invoice_count += 1;
        } else {
          // Extract category name using the maps
          let categoryName = null;
          
          // First try category mapping, then direct category
          if (item.category_mapping_id && categoryMappingsMap.has(item.category_mapping_id)) {
            categoryName = categoryMappingsMap.get(item.category_mapping_id) || null;
          } else if (item.category_id && categoriesMap.has(item.category_id)) {
            categoryName = categoriesMap.get(item.category_id) || null;
          }

          // Extract supplier name
          const supplierName = (item as { suppliers?: { name: string } }).suppliers?.name || null;

          productSpending.set(key, {
            product_code: item.product_code,
            description: item.description,
            total_spend: spend,
            invoice_count: 1,
            spend_per_pax: 0, // Will be calculated later
            category_name: categoryName,
            supplier_name: supplierName
          });
        }
      });

      // Convert to array and apply filters
      let filteredProducts = Array.from(productSpending.values());
      
      // Debug logging for main product data
      console.log('Debug - Main product spending data:', filteredProducts.map(p => ({
        productCode: p.product_code,
        description: p.description,
        totalSpend: p.total_spend,
        invoiceCount: p.invoice_count
      })));
      
      // Debug: Calculate total spend to verify
      const calculatedTotalSpend = filteredProducts.reduce((sum, p) => sum + p.total_spend, 0);
      console.log('Debug - Calculated total spend from products:', calculatedTotalSpend);

      // Apply category filter
      if (categoryFilters && categoryFilters.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
          product.category_name && categoryFilters.includes(product.category_name)
        );
      }

      // Apply supplier filter
      if (supplierFilters && supplierFilters.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
          product.supplier_name && supplierFilters.includes(product.supplier_name)
        );
      }

      // Calculate filtered totals
      const filteredTotalSpend = filteredProducts.reduce((sum, product) => sum + product.total_spend, 0);

      // Convert to array and calculate percentages based on filtered totals
      const products: ProductSpendingItem[] = filteredProducts
        .map(product => ({
          ...product,
          // Keep category_name as is (null/empty for uncategorized products)
          percentage_of_total_spend: filteredTotalSpend > 0 ? (product.total_spend / filteredTotalSpend) * 100 : 0,
          percentage_of_revenue: revenueData?.revenue_amount && revenueData.revenue_amount > 0 
            ? (product.total_spend / revenueData.revenue_amount) * 100 
            : 0,
          spend_per_pax: totalPax > 0 ? product.total_spend / totalPax : 0
        }))
        .sort((a, b) => b.total_spend - a.total_spend);

      const currency = spendingData?.[0]?.currency || revenueData?.currency || 'DKK';
      const totalRevenue = revenueData?.revenue_amount || null;
      const cogsPercentage = totalRevenue && totalRevenue > 0 ? (filteredTotalSpend / totalRevenue) * 100 : null;

      return {
        location_id: locationId,
        location_name: locationData.name,
        year,
        month,
        total_revenue: totalRevenue,
        total_spend: filteredTotalSpend, // Use filtered total spend
        cogs_percentage: cogsPercentage,
        currency,
        products
      };
    },
    enabled: !!currentOrganization && !!locationId,
    staleTime: STALE_TIMES.FRESH, // Data is fresh for 2 minutes
    gcTime: CACHE_TIMES.MEDIUM, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
  });
};