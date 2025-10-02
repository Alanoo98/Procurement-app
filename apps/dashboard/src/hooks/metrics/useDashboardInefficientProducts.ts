import { useEffect, useState } from 'react';
import { useTimeBasedEfficiency } from './useTimeBasedEfficiency';
import { useFilterStore } from '@/store/filterStore';

export interface DashboardInefficientProduct {
  productCode: string;
  description: string;
  locationId: string;
  locationName: string;
  unitType: string;
  currentSpendPerPax: number;
  totalSpend: number;
  efficiencyScore: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  volatilityScore: number;
  potentialSavings: number;
  recommendation: string;
  dataPoints: number;
  lastPeriod: string;
  dataQualityFactor: number;
  efficiencyExplanation: string;
}

export const useDashboardInefficientProducts = () => {
  const { dateRange } = useFilterStore();
  const { efficiencyMetrics, isLoading, error } = useTimeBasedEfficiency();

  const [dashboardProducts, setDashboardProducts] = useState<DashboardInefficientProduct[]>([]);

  useEffect(() => {
    if (!efficiencyMetrics || efficiencyMetrics.length === 0) {
      setDashboardProducts([]);
      return;
    }

    // Transform efficiency metrics for dashboard display
    const dashboardData: DashboardInefficientProduct[] = efficiencyMetrics
      .map(metric => {
        const latestData = metric.timeSeries[metric.timeSeries.length - 1];
        const firstData = metric.timeSeries[0];
        
        return {
          productCode: metric.productCode,
          description: metric.description,
          locationId: metric.locationId,
          locationName: metric.locationName,
          unitType: metric.unitType,
          currentSpendPerPax: latestData?.spendPerPax || 0,
          totalSpend: metric.timeSeries.reduce((sum, point) => sum + point.totalSpend, 0),
          efficiencyScore: metric.efficiencyScore,
          trendDirection: metric.trendDirection,
          volatilityScore: metric.volatilityScore,
          potentialSavings: metric.potentialSavings,
          recommendation: metric.recommendation,
          dataPoints: metric.timeSeries.length,
          lastPeriod: latestData?.period || '',
          dataQualityFactor: metric.dataQualityFactor,
          efficiencyExplanation: metric.efficiencyExplanation,
        };
      })
      .filter(product => product.dataPoints >= 2) // Only show products with sufficient data
      .sort((a, b) => {
        // Sort by efficiency score (lowest first = most inefficient)
        // Then by potential savings (highest first)
        if (a.efficiencyScore !== b.efficiencyScore) {
          return a.efficiencyScore - b.efficiencyScore;
        }
        return b.potentialSavings - a.potentialSavings;
      })
      .slice(0, 10); // Top 10 most inefficient

    setDashboardProducts(dashboardData);
  }, [efficiencyMetrics]);

  // Calculate total potential savings
  const totalPotentialSavings = dashboardProducts.reduce((sum, product) => sum + product.potentialSavings, 0);

  return {
    inefficientProducts: dashboardProducts,
    totalPotentialSavings,
    isLoading,
    error,
  };
};
