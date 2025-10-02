import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Currency } from '@/utils/currency';
import { getPriceValue } from '@/utils/getPriceValue';

export interface MonthlyRevenue {
  id: string;
  organization_id: string;
  location_id: string;
  business_unit_id?: string;
  year: number;
  month: number;
  revenue_amount: number;
  currency: string; // Direct currency code (DKK, NOK, GBP)
  notes?: string;
  created_at: string;
  updated_at: string;
  locations?: {
    name: string;
    address?: string;
  };
}

export interface CogsProductBreakdown {
  product_code: string;
  description: string;
  total_spend: number;
  spend_percentage: number;
  invoice_count: number;
  avg_price: number;
  spend_per_pax: number;
  category_name?: string;
}

export interface CogsAnalysis {
  location_id: string;
  location_name: string;
  year: number;
  month: number;
  revenue_amount: number;
  total_spend: number;
  cogs_percentage: number;
  product_breakdown: CogsProductBreakdown[];
  currency: string; // Currency code from revenue data
  currencyInfo?: Currency; // Optional currency formatting info
}

export const useCogsAnalysis = (locationId?: string, year?: number, month?: number, categoryFilter?: string, supplierFilter?: string) => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [data, setData] = useState<CogsAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCogsAnalysis = async () => {
      if (!currentOrganization || !locationId || !year || !month) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
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
          console.error('COGS Debug - Revenue Error:', revenueError);
          throw revenueError;
        }

        console.log('COGS Debug - Revenue Data Array:', revenueDataArray);

        const revenueData = revenueDataArray?.[0];
        if (!revenueData) {
          console.log('COGS Debug - No revenue data found');
          setData(null);
          setIsLoading(false);
          return;
        }

        // Fetch spending data for the same month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        console.log('COGS Debug - Looking for data:', {
          organizationId: currentOrganization.id,
          locationId,
          year,
          month,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          categoryFilter,
          supplierFilter
        });

        // Build the spending data query with simple filters
        let spendingQuery = supabase
          .from('invoice_lines')
          .select(`
            product_code,
            description,
            total_price_after_discount,
            total_price,
            category_id,
            category_mapping_id,
            currency,
            supplier_id,
            suppliers!supplier_id(name),
            product_category_mappings!category_mapping_id(
              product_categories!category_id(category_name)
            ),
            product_categories!category_id(category_name)
          `)
          .eq('organization_id', currentOrganization.id)
          .eq('location_id', locationId)
          .gte('invoice_date', startDate.toISOString().split('T')[0])
          .lte('invoice_date', endDate.toISOString().split('T')[0])
          .not('total_price_after_discount', 'is', null);

        // Apply simple filters
        if (categoryFilter) {
          spendingQuery = spendingQuery.eq('category_id', categoryFilter);
        }

        if (supplierFilter) {
          spendingQuery = spendingQuery.eq('supplier_id', supplierFilter);
        }

        const { data: spendingData, error: spendingError } = await spendingQuery;

        if (spendingError) {
          throw spendingError;
        }

        console.log('COGS Debug - Revenue Data:', revenueData);
        console.log('COGS Debug - Spending Data:', spendingData);
        console.log('COGS Debug - Date Range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

        // Fetch PAX data for the same month
        const { data: paxData, error: paxError } = await supabase
          .from('pax')
          .select('pax_count, date_id')
          .eq('location_id', locationId)
          .gte('date_id', startDate.toISOString().split('T')[0])
          .lte('date_id', endDate.toISOString().split('T')[0]);

        if (paxError) {
          console.warn('COGS Debug - PAX Error (non-critical):', paxError);
        }

        // Calculate total PAX for the month
        const totalPax = paxData?.reduce((sum, pax) => sum + (pax.pax_count || 0), 0) || 0;
        console.log('COGS Debug - Total PAX:', totalPax);
        
        // Debug: Check if we have category mapping data
        const sampleWithCategory = spendingData?.find(item => item.category_mapping_id);
        const sampleWithoutCategory = spendingData?.find(item => !item.category_mapping_id);
        console.log('COGS Debug - Sample with category_mapping_id:', sampleWithCategory);
        console.log('COGS Debug - Sample without category_mapping_id:', sampleWithoutCategory);

        // Calculate total spend and check currency consistency - FIXED: Use consistent logic
        const totalSpend = spendingData?.reduce((sum, item) => {
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
          return sum + spend;
        }, 0) || 0;

        console.log('COGS Debug - Total Spend:', totalSpend);

        // Check if all spending data is in the same currency as revenue
        const spendingCurrencies = [...new Set(spendingData?.map(item => item.currency).filter(Boolean) || [])];
        const revenueCurrency = revenueData.currency;
        
        if (spendingCurrencies.length > 1) {
          console.warn('Multiple currencies found in spending data:', spendingCurrencies);
        }
        
        if (spendingCurrencies.length > 0 && revenueCurrency && !spendingCurrencies.includes(revenueCurrency)) {
          console.warn(`Currency mismatch: Revenue in ${revenueCurrency}, Spending in ${spendingCurrencies.join(', ')}`);
        }

        // Calculate COGS percentage
        const cogsPercentage = revenueData.revenue_amount > 0 
          ? (totalSpend / revenueData.revenue_amount) * 100 
          : 0;

        // Group spending by product
        const productSpending = new Map<string, {
          product_code: string;
          description: string;
          total_spend: number;
          invoice_count: number;
          prices: number[];
          category_name?: string;
        }>();

        spendingData?.forEach(item => {
          const key = item.product_code || item.description;
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
            existing.prices.push(spend);
          } else {
            productSpending.set(key, {
              product_code: item.product_code || '',
              description: item.description || '',
              total_spend: spend,
              invoice_count: 1,
              prices: [spend],
              category_name: item.product_category_mappings?.[0]?.product_categories?.[0]?.category_name || 
                            item.product_categories?.[0]?.category_name
            });
          }
        });

        // Convert to array and calculate percentages
        const productBreakdown: CogsProductBreakdown[] = Array.from(productSpending.values())
          .map(product => ({
            ...product,
            spend_percentage: totalSpend > 0 ? (product.total_spend / totalSpend) * 100 : 0,
            avg_price: product.prices.length > 0 
              ? product.prices.reduce((sum, price) => sum + price, 0) / product.prices.length 
              : 0,
            spend_per_pax: totalPax > 0 ? product.total_spend / totalPax : 0
          }))
          .sort((a, b) => b.total_spend - a.total_spend);

        const analysis: CogsAnalysis = {
          location_id: locationId,
          location_name: revenueData.locations?.name || 'Unknown Location',
          year,
          month,
          revenue_amount: revenueData.revenue_amount,
          total_spend: totalSpend,
          cogs_percentage: cogsPercentage,
          product_breakdown: productBreakdown,
          currency: revenueData.currency
        };

        console.log('COGS Debug - Final Analysis:', analysis);

        setData(analysis);
      } catch (err) {
        console.error('Error fetching COGS analysis:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch COGS analysis'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCogsAnalysis();
  }, [currentOrganization, currentBusinessUnit, locationId, year, month, categoryFilter, supplierFilter]);

  return { data, isLoading, error };
};

export const useMonthlyRevenue = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMonthlyRevenue = async () => {
      if (!currentOrganization) {
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('monthly_revenue')
          .select(`
            *,
            locations!left(name, address)
          `)
          .eq('organization_id', currentOrganization.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (currentBusinessUnit) {
          query = query.eq('business_unit_id', currentBusinessUnit.id);
        }

        const { data: revenueData, error: revenueError } = await query;

        if (revenueError) {
          throw revenueError;
        }

        setData(revenueData || []);
      } catch (err) {
        console.error('Error fetching monthly revenue:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch monthly revenue'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyRevenue();
  }, [currentOrganization, currentBusinessUnit]);

  return { data, isLoading, error };
};

export const useSaveMonthlyRevenue = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveRevenue = async (revenueData: {
    location_id: string;
    year: number;
    month: number;
    revenue_amount: number;
    currency: string;
    notes?: string;
  }) => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    setIsLoading(true);
    setError(null);

    try {
        const { data, error: saveError } = await supabase
          .from('monthly_revenue')
          .upsert({
            organization_id: currentOrganization.id,
            business_unit_id: currentBusinessUnit?.id,
            ...revenueData
          })
          .select()
          .single();

      if (saveError) {
        throw saveError;
      }

      return data;
    } catch (err) {
      console.error('Error saving monthly revenue:', err);
      const error = err instanceof Error ? err : new Error('Failed to save monthly revenue');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { saveRevenue, isLoading, error };
};
