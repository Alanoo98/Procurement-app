import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { calculateSpending } from '@/utils/spendingCalculation';
import { getSpendingData, SpendingQueryResult } from '@/utils/spendingQueries';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';
import { useLocations } from '../data/useLocations';

export interface CogsDashboardItem {
  location_id: string;
  location_name: string;
  year: number;
  month: number;
  revenue_amount: number | null;
  total_spend: number;
  cogs_percentage: number | null;
  currency: string;
  has_revenue: boolean;
  product_count: number;
  spend_per_pax: number | null;
  // Budget comparison fields
  revenue_budget?: number | null;
  cogs_budget?: number | null;
  target_cogs_percentage?: number | null;
  revenue_vs_budget?: number | null; // percentage difference
  cogs_vs_budget?: number | null; // percentage difference
  cogs_percentage_vs_target?: number | null; // percentage points difference
}

export const useCogsDashboard = (selectedYear?: number, selectedMonth?: number) => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const { data: locations } = useLocations();
  
  // Use selected month or default to current month
  const currentDate = new Date();
  const targetYear = selectedYear || currentDate.getFullYear();
  const targetMonth = selectedMonth || (currentDate.getMonth() + 1);

  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.COGS_DASHBOARD, {
      organizationId: currentOrganization?.id,
      businessUnitId: currentBusinessUnit?.id,
      year: targetYear,
      month: targetMonth,
    }),
    queryFn: async (): Promise<CogsDashboardItem[]> => {
      if (!currentOrganization || !locations || locations.length === 0) {
        return [];
      }

      // Get spending data for each location individually using the EXACT SAME query as useProductSpendingAnalysis
      // This ensures we get the same data as Deep Dive Analysis
      const locationSpendingMap = new Map<string, SpendingQueryResult[]>();
      
      for (const location of locations) {
        const locationSpendingData = await getSpendingData({
          organizationId: currentOrganization.id,
          year: targetYear,
          month: targetMonth,
          locationId: location.location_id
        });
        
        locationSpendingMap.set(location.location_id, locationSpendingData);
      }

      // Get revenue data for the selected month
      const { data: revenueData, error: revenueError } = await supabase
        .from('monthly_revenue')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('year', targetYear)
        .eq('month', targetMonth);

      if (revenueError) {
        throw revenueError;
      }

      // Get budget data for the selected month
      const { data: budgetData, error: budgetError } = await supabase
        .from('monthly_budget')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('year', targetYear)
        .eq('month', targetMonth);

      if (budgetError) {
        throw budgetError;
      }

      // Get PAX data for the selected month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0);
      
      const { data: paxData, error: paxError } = await supabase
        .from('pax')
        .select('location_id, pax_count, date_id')
        .eq('organization_id', currentOrganization.id)
        .gte('date_id', startDate.toISOString().split('T')[0])
        .lte('date_id', endDate.toISOString().split('T')[0]);

      if (paxError) {
        console.warn('PAX data fetch error (non-critical):', paxError);
      }

      // Process the data - only show locations with actual spending data
      const dashboardItems: CogsDashboardItem[] = [];
      
      // Process each location that has data
      for (const location of locations) {
        const locationSpending = locationSpendingMap.get(location.location_id) || [];
        
        // Skip locations with no spending data
        if (locationSpending.length === 0) continue;

        // Use the unified spending calculation
        const spendingResult = calculateSpending(locationSpending);
        const totalSpend = spendingResult.totalSpend;

        const productCount = new Set(locationSpending.map(item => 
          item.product_code || item.description
        )).size;

        // Find revenue data for this location/month
        const revenue = revenueData?.find(r => 
          r.location_id === location.location_id
        );

        // Find budget data for this location/month
        const budget = budgetData?.find(b => 
          b.location_id === location.location_id
        );

        const currency = locationSpending[0]?.currency || revenue?.currency || budget?.currency || 'DKK';

        // Calculate budget comparisons
        const revenueAmount = revenue?.revenue_amount || null;
        const revenueBudget = budget?.revenue_budget || null;
        const cogsBudget = budget?.cogs_budget || null;
        const targetCogsPercentage = budget && budget.revenue_budget > 0 
          ? (budget.cogs_budget / budget.revenue_budget) * 100 
          : null;

        const revenueVsBudget = revenueAmount && revenueBudget && revenueBudget > 0
          ? ((revenueAmount - revenueBudget) / revenueBudget) * 100
          : null;

        const cogsVsBudget = totalSpend && cogsBudget && cogsBudget > 0
          ? ((totalSpend - cogsBudget) / cogsBudget) * 100
          : null;

        const cogsPercentageVsTarget = revenueAmount && revenueAmount > 0 && targetCogsPercentage
          ? ((totalSpend / revenueAmount) * 100) - targetCogsPercentage
          : null;

        // Calculate total PAX for this location
        const locationPaxData = paxData?.filter(pax => pax.location_id === location.location_id) || [];
        const totalPax = locationPaxData.reduce((sum, pax) => sum + (pax.pax_count || 0), 0);
        const spendPerPax = totalPax > 0 ? totalSpend / totalPax : null;

        dashboardItems.push({
          location_id: location.location_id,
          location_name: location.name,
          year: targetYear,
          month: targetMonth,
          revenue_amount: revenueAmount,
          total_spend: totalSpend,
          cogs_percentage: revenueAmount && revenueAmount > 0 
            ? (totalSpend / revenueAmount) * 100 
            : null,
          currency,
          has_revenue: !!revenue,
          product_count: productCount,
          spend_per_pax: spendPerPax,
          // Budget comparison data
          revenue_budget: revenueBudget,
          cogs_budget: cogsBudget,
          target_cogs_percentage: targetCogsPercentage,
          revenue_vs_budget: revenueVsBudget,
          cogs_vs_budget: cogsVsBudget,
          cogs_percentage_vs_target: cogsPercentageVsTarget
        });
      }

      // Sort by location name
      dashboardItems.sort((a, b) => a.location_name.localeCompare(b.location_name));

      return dashboardItems;
    },
    enabled: !!currentOrganization && !!locations,
    staleTime: STALE_TIMES.FRESH, // Data is fresh for 2 minutes
    gcTime: CACHE_TIMES.MEDIUM, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts (but will use cache if fresh)
  });
};