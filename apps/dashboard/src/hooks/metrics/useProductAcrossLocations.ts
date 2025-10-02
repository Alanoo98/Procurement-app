import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getSpendingData } from '@/utils/spendingQueries';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';
import { getPriceValue } from '@/utils/getPriceValue';

export interface ProductLocationBreakdown {
  location_id: string;
  location_name: string;
  total_spend: number;
  spend_per_pax: number;
  percentage_of_total_spend: number;
  percentage_of_revenue: number;
  invoice_count: number;
  category_name: string | null;
  supplier_name: string | null;
  currency: string;
}

export const useProductAcrossLocations = (
  productCode: string | null,
  productDescription: string | null,
  year: number,
  month: number,
  excludeLocationId?: string | null
) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.PRODUCT_ACROSS_LOCATIONS, {
      organizationId: currentOrganization?.id,
      productCode,
      productDescription,
      year,
      month,
      excludeLocationId,
    }),
    queryFn: async (): Promise<ProductLocationBreakdown[]> => {
      if (!currentOrganization || (!productCode && !productDescription)) {
        return [];
      }

      // Get all locations from the existing deep dive analysis data
      // This reuses the same logic and avoids duplicate queries
      const { data: deepDiveData } = await supabase
        .from('invoice_lines')
        .select(`
          location_id,
          locations!location_id(name)
        `)
        .eq('organization_id', currentOrganization.id)
        .gte('invoice_date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lte('invoice_date', `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`)
        .in('document_type', ['Faktura', 'Invoice', 'Kreditnota', 'Credit note']);

      if (!deepDiveData || deepDiveData.length === 0) {
        return [];
      }

      // Get unique locations with proper structure
      const locationMap = new Map();
      deepDiveData.forEach(item => {
        if (item.location_id && item.locations) {
          locationMap.set(item.location_id, {
            id: item.location_id,
            name: item.locations.name
          });
        }
      });
      const uniqueLocations = Array.from(locationMap.values());

      console.log('Debug - Found unique locations:', uniqueLocations.length);
      console.log('Debug - Location details:', uniqueLocations.map(loc => ({ id: loc.id, name: loc.name })));

      // Process each location individually (same logic as deep dive analysis)
      const results: ProductLocationBreakdown[] = [];
      
      for (const location of uniqueLocations) {
        // Skip the excluded location
        if (excludeLocationId && location.id === excludeLocationId) {
          continue;
        }

        console.log(`Debug - Processing location: ${location.name} (${location.id})`);
        console.log(`Debug - Location object:`, location);
        
        // Get spending data for this location (same as deep dive analysis)
        const locationSpendingData = await getSpendingData({
          organizationId: currentOrganization.id,
          year,
          month,
          locationId: location.id
        });
        
        console.log(`Debug - Location ${location.name}: ${locationSpendingData.length} total records`);
        
        // Filter to the specific product for this location
        const productSpending = locationSpendingData.filter(item => {
          if (productCode && item.product_code) {
            return item.product_code === productCode;
          }
          if (productDescription && item.description) {
            return item.description === productDescription;
          }
          return false;
        });
        
        console.log(`Debug - Location ${location.name} product records: ${productSpending.length}`);
        
        if (productSpending.length === 0) {
          continue; // Skip locations that don't have this product
        }

        // Calculate product spending for this location (same logic as deep dive analysis)
        let totalProductSpend = 0;
        let invoiceCount = 0;
        let categoryName: string | null = null;
        let supplierName: string | null = null;
        let currency = 'NOK';

        for (const item of productSpending) {
          let spend = getPriceValue(
            item.total_price_after_discount ? parseFloat(item.total_price_after_discount) : null,
            item.total_price ? parseFloat(item.total_price) : null
          );
          
          // Handle credit notes
          const documentType = item.document_type || '';
          if (documentType.toLowerCase().includes('kreditnota') || 
              documentType.toLowerCase().includes('credit')) {
            spend = -Math.abs(spend);
          }
          // If price is already negative from ETL processing, keep it negative
          else if (spend < 0) {
            // Price is already negative from ETL processing - keep it negative
          }
          
          totalProductSpend += spend;
          invoiceCount++;
          
          if (!currency && item.currency) {
            currency = item.currency;
          }
        }

        // Get total location spending (all products) for percentage calculation
        let totalLocationSpend = 0;
        for (const item of locationSpendingData) {
          let spend = getPriceValue(
            item.total_price_after_discount ? parseFloat(item.total_price_after_discount) : null,
            item.total_price ? parseFloat(item.total_price) : null
          );
          
          // Handle credit notes
          const documentType = item.document_type || '';
          if (documentType.toLowerCase().includes('kreditnota') || 
              documentType.toLowerCase().includes('credit')) {
            spend = -Math.abs(spend);
          }
          // If price is already negative from ETL processing, keep it negative
          else if (spend < 0) {
            // Price is already negative from ETL processing - keep it negative
          }
          
          totalLocationSpend += spend;
        }

        // Get location revenue data - using correct column name
        console.log(`Debug - Fetching revenue for location ${location.id}`);
        const { data: revenueData, error: revenueError } = await supabase
          .from('monthly_revenue')
          .select('revenue_amount')
          .eq('organization_id', currentOrganization.id)
          .eq('location_id', location.id)
          .eq('year', year)
          .eq('month', month)
          .single();

        console.log(`Debug - Revenue data for ${location.name}:`, { revenueData, revenueError });

        // Get PAX data - using date_id range instead of year/month
        console.log(`Debug - Fetching PAX for location ${location.id}`);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
        
        const { data: paxData, error: paxError } = await supabase
          .from('pax')
          .select('pax_count')
          .eq('organization_id', currentOrganization.id)
          .eq('location_id', location.id)
          .gte('date_id', startDate)
          .lte('date_id', endDate);

        console.log(`Debug - PAX data for ${location.name}:`, { paxData, paxError });

        // Use correct column names
        const totalRevenue = revenueData?.revenue_amount || 0;
        const paxCount = paxData?.reduce((sum, item) => sum + (item.pax_count || 0), 0) || 0;

        // Get category and supplier info from the first product record
        if (productSpending.length > 0) {
          const firstItem = productSpending[0];
          
          console.log(`Debug - First item for ${location.name}:`, {
            category_id: firstItem.category_id,
            supplier_id: firstItem.supplier_id,
            suppliers: firstItem.suppliers
          });
          
          // Get category name - using correct column names from existing code
          if (firstItem.category_id) {
            try {
              const { data: categoryData } = await supabase
                .from('product_categories')
                .select('category_name')
                .eq('category_id', firstItem.category_id)
                .eq('organization_id', currentOrganization.id)
                .single();
              categoryName = categoryData?.category_name || null;
              console.log(`Debug - Category from direct: ${categoryName}`, categoryData);
            } catch (error) {
              console.log(`Debug - Category direct lookup failed:`, error);
            }
          }
          
          // Try category mapping if direct category didn't work
          if (!categoryName && firstItem.category_mapping_id) {
            try {
              const { data: mappingData } = await supabase
                .from('product_category_mappings')
                .select(`
                  mapping_id,
                  category_id,
                  product_categories!category_id(category_name)
                `)
                .eq('mapping_id', firstItem.category_mapping_id)
                .eq('organization_id', currentOrganization.id)
                .single();
              categoryName = mappingData?.product_categories?.[0]?.category_name || null;
              console.log(`Debug - Category from mapping: ${categoryName}`, mappingData);
            } catch (error) {
              console.log(`Debug - Category mapping lookup failed:`, error);
            }
          }
          
          // Get supplier name - try both direct and from suppliers relation
          if (firstItem.suppliers?.name) {
            supplierName = firstItem.suppliers.name;
            console.log(`Debug - Supplier from relation: ${supplierName}`);
          } else if (firstItem.supplier_id) {
            const { data: supplierData } = await supabase
              .from('suppliers')
              .select('name')
              .eq('id', firstItem.supplier_id)
              .single();
            supplierName = supplierData?.name || null;
            console.log(`Debug - Supplier from direct: ${supplierName}`);
          }
        }

        // Calculate percentages
        const percentageOfTotalSpend = totalLocationSpend > 0 
          ? (totalProductSpend / totalLocationSpend) * 100 
          : 0;
        
        const percentageOfRevenue = totalRevenue > 0 
          ? (totalProductSpend / totalRevenue) * 100 
          : 0;
        
        const spendPerPax = paxCount > 0 
          ? totalProductSpend / paxCount 
          : 0;

        console.log(`Debug - Location ${location.name} calculations:`, {
          totalProductSpend,
          totalLocationSpend,
          totalRevenue,
          paxCount,
          percentageOfTotalSpend,
          percentageOfRevenue,
          spendPerPax,
          invoiceCount
        });

        results.push({
          location_id: location.id,
          location_name: location.name,
          total_spend: totalProductSpend,
          spend_per_pax: spendPerPax,
          percentage_of_total_spend: percentageOfTotalSpend,
          percentage_of_revenue: percentageOfRevenue,
          invoice_count: invoiceCount,
          category_name: categoryName,
          supplier_name: supplierName,
          currency: currency
        });
      }

      console.log('Debug - Final results:', results);
      return results;
    },
    enabled: !!currentOrganization && (!!productCode || !!productDescription),
    staleTime: STALE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM,
  });
};