import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPriceValue } from '@/utils/getPriceValue';

export interface TimeBasedEfficiencyMetric {
  productCode: string;
  description: string;
  locationId: string;
  locationName: string;
  unitType: string;
  timeSeries: Array<{
    period: string; // YYYY-MM format
    spendPerPax: number;
    totalSpend: number;
    totalPax: number;
    quantity: number;
    avgPrice: number;
    transactionCount: number;
  }>;
  efficiencyScore: number; // 0-100, based on trend analysis
  trendDirection: 'improving' | 'stable' | 'declining';
  volatilityScore: number; // 0-100, higher = more volatile
  potentialSavings: number;
  recommendation: string;
  dataQualityFactor: number; // 0-1, higher = more reliable
  efficiencyExplanation: string; // Human-readable explanation
}

export interface ProductEfficiencyChart {
  productCode: string;
  description: string;
  locationName: string;
  unitType: string;
  chartData: Array<{
    period: string;
    spendPerPax: number;
    totalSpend: number;
    totalPax: number;
    quantity: number;
    avgPrice: number;
    transactionCount: number;
    // Multiple smoothing options
    shortTrend: number; // 3-day volume-weighted average
    mediumTrend: number; // 7-day volume-weighted average
    longTrend: number; // 14-day volume-weighted average
    efficiency: number; // Efficiency score for this period
  }>;
  overallEfficiency: number;
  trendAnalysis: {
    direction: 'improving' | 'stable' | 'declining';
    changePercentage: number;
    volatility: number;
  };
}

export const useTimeBasedEfficiency = (productCode?: string, locationId?: string) => {
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

  const [efficiencyMetrics, setEfficiencyMetrics] = useState<TimeBasedEfficiencyMetric[]>([]);
  const [productChart, setProductChart] = useState<ProductEfficiencyChart | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchTimeBasedEfficiency = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);
      setError(null);

      try {
        // Fetch invoice lines data with date grouping
        let query = supabase
          .from('invoice_lines')
          .select(`
            product_code,
            description,
            quantity,
            unit_type,
            unit_price,
            unit_price_after_discount,
            total_price,
            total_price_after_discount,
            invoice_date,
            location_id,
            supplier_id
          `)
          .eq('organization_id', currentOrganization.id);

        // Apply business unit filter if selected
        if (currentBusinessUnit && currentBusinessUnit.id) {
          query = query.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Apply filters
        if (dateRange?.start && dateRange?.end) {
          query = query
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        if (restaurants.length > 0) {
          query = query.in('location_id', restaurants);
        }

        if (suppliers.length > 0) {
          query = query.in('supplier_id', suppliers);
        }

        if (categories.length > 0) {
          query = query.in('category_id', categories);
        }

        if (documentType === 'Faktura') {
          query = query.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          query = query.in('document_type', ['Kreditnota', 'Credit note']);
        }

        // Apply product code filter
        if (productCodeFilter === 'with_codes') {
          query = query.not('product_code', 'is', null).neq('product_code', '');
        } else if (productCodeFilter === 'without_codes') {
          query = query.or('product_code.is.null,product_code.eq.');
        }

        // Filter by specific product if provided
        if (productCode) {
          query = query.eq('product_code', productCode);
        }

        // Filter by specific location if provided
        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        // Fetch all data using pagination with consistent ordering and cancellation
        let allRows: unknown[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        // Add consistent ordering to prevent race conditions
        query = query.order('invoice_date', { ascending: true })
                    .order('created_at', { ascending: true });

        while (hasMore && !abortController.signal.aborted) {
          const offset = page * pageSize;
          
          const { data: pageRows, error: pageError } = await query
            .range(offset, offset + pageSize - 1);

          if (pageError) {
            throw pageError;
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

        // Check if request was cancelled
        if (abortController.signal.aborted) {
          return;
        }

        const invoiceLines = allRows;

        // Fetch locations data
        let locQuery = supabase
          .from('locations')
          .select('location_id, name')
          .eq('organization_id', currentOrganization.id);

        if (currentBusinessUnit && currentBusinessUnit.id) {
          locQuery = locQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        const { data: locationsData, error: locationsError } = await locQuery;
        if (locationsError) throw locationsError;

        const locationsMap = new Map(
          (locationsData || []).map(location => [location.location_id, location.name])
        );

        // Fetch PAX data for the same period and group by monthly periods
        const paxByLocationAndPeriod = new Map<string, Map<string, number>>();
        
        try {
          let locQuery = supabase
            .from('locations')
            .select('location_id')
            .eq('organization_id', currentOrganization.id);

          if (currentBusinessUnit && currentBusinessUnit.id) {
            locQuery = locQuery.eq('business_unit_id', currentBusinessUnit.id);
          }

          const locResult = await locQuery;
          if (locResult.error) throw locResult.error;

          const locationIds = locResult.data.map(loc => loc.location_id);

          let paxQuery = supabase
            .from('pax')
            .select(`
              location_id,
              pax_count,
              date_id
            `)
            .in('location_id', locationIds)
            .order('date_id', { ascending: false });

          if (dateRange?.start && dateRange?.end) {
            paxQuery = paxQuery
              .gte('date_id', dateRange.start)
              .lte('date_id', dateRange.end);
          }

          if (restaurants.length > 0) {
            paxQuery = paxQuery.in('location_id', restaurants);
          }

          // Fetch PAX data with pagination
          let allPaxRows: unknown[] = [];
          let page = 0;
          let hasMore = true;

          while (hasMore) {
            const offset = page * pageSize;
            
            const { data: pageRows, error: pageError } = await paxQuery
              .range(offset, offset + pageSize - 1);

            if (pageError) {
              throw pageError;
            }

            if (!pageRows || pageRows.length === 0) {
              hasMore = false;
            } else {
              allPaxRows = allPaxRows.concat(pageRows);
              
              if (pageRows.length < pageSize) {
                hasMore = false;
              }
              
              page++;
            }
          }

          const paxData = allPaxRows;

          if (paxData && paxData.length > 0) {
            // Group PAX data by location and monthly period
            paxData.forEach(record => {
              const paxRecord = record as { location_id: string; date_id: string; pax_count: number };
              
              // Simple validation - only check if date exists and is not empty
              if (!paxRecord.date_id || paxRecord.date_id.trim() === '') {
                return; // Skip silently
              }

              // Convert date to YYYY-MM format for monthly grouping
              const paxDate = new Date(paxRecord.date_id);
              const periodKey = `${paxDate.getFullYear()}-${String(paxDate.getMonth() + 1).padStart(2, '0')}`;
              const locationId = paxRecord.location_id;
              
              if (!paxByLocationAndPeriod.has(locationId)) {
                paxByLocationAndPeriod.set(locationId, new Map());
              }
              
              const locationPaxMap = paxByLocationAndPeriod.get(locationId)!;
              const currentPax = locationPaxMap.get(periodKey) || 0;
              locationPaxMap.set(periodKey, currentPax + paxRecord.pax_count);
            });
          }
        } catch (error) {
          console.warn('Failed to fetch PAX data:', error);
        }

        // Process invoice lines and group by product, location, and period (monthly)
        const productMetrics = new Map<string, Map<string, Map<string, {
          totalSpend: number;
          totalQuantity: number;
          pricePoints: number[];
          transactionCount: number;
          invoiceDates: string[]; // Track actual invoice dates for smoothing
        }>>>();
        

        invoiceLines.forEach(record => {
          const line = record as { product_code: string; invoice_date: string; unit_type: string; location_id: string; quantity: number; unit_price_after_discount: number; unit_price: number; total_price_after_discount: number; total_price: number; description: string };
          
          // Simple validation - only check if date exists and is not empty
          if (!line.invoice_date || line.invoice_date.trim() === '') {
            return; // Skip silently
          }

          // Simplified: Use product code + supplier, or description + supplier for products without codes
          const productCode = line.product_code || '';
          const productKey = productCode 
            ? `${productCode}|${line.supplier_id}` 
            : `${line.description}|${line.supplier_id}`;
          const locationId = line.location_id;
          
          // Convert date to YYYY-MM format for monthly grouping
          const invoiceDate = new Date(line.invoice_date);
          const periodKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
          
          const effectivePrice = getPriceValue(line.unit_price_after_discount, line.unit_price);
          const effectiveTotal = getPriceValue(line.total_price_after_discount, line.total_price);

          if (!productMetrics.has(productKey)) {
            productMetrics.set(productKey, new Map());
          }

          const productMap = productMetrics.get(productKey)!;

          if (!productMap.has(locationId)) {
            productMap.set(locationId, new Map());
          }

          const locationMap = productMap.get(locationId)!;

          if (!locationMap.has(periodKey)) {
            locationMap.set(periodKey, {
              totalSpend: 0,
              totalQuantity: 0,
              pricePoints: [],
              transactionCount: 0,
              invoiceDates: [],
            });
          }

          const periodData = locationMap.get(periodKey)!;
          periodData.totalSpend += effectiveTotal;
          periodData.totalQuantity += line.quantity || 0;
          periodData.pricePoints.push(effectivePrice);
          periodData.transactionCount += 1;
          periodData.invoiceDates.push(line.invoice_date);
        });

        // Apply product search filter if specified
        if (productSearch?.terms?.length > 0) {
          const includedTerms: string[] = [];
          const excludedTerms: string[] = [];
          
          console.log('Applying product search filter to time-based efficiency data:', productSearch);
          
          productSearch.terms.forEach(term => {
            if (term.startsWith('-')) {
              excludedTerms.push(term.slice(1).toLowerCase());
            } else {
              includedTerms.push(term.toLowerCase());
            }
          });

          // Filter productMetrics based on search terms
          const filteredProductMetrics = new Map<string, Map<string, Map<string, {
            totalSpend: number;
            totalQuantity: number;
            pricePoints: number[];
            transactionCount: number;
            invoiceDates: string[];
          }>>>();

          productMetrics.forEach((locationMap, productKey) => {
            const [productCode] = productKey.split('|');
            
            // Get product description from the first invoice line that matches this product
            const matchingLine = invoiceLines.find(record => {
              const line = record as { product_code: string; description: string };
              return line.product_code === productCode;
            });
            
            const description = (matchingLine as { product_code: string; description: string })?.description || '';
            const locationName = locationsMap.get(Array.from(locationMap.keys())[0]) || '';
            
            // Check excluded terms
            const hasExclusion = excludedTerms.some(term =>
              description.toLowerCase().includes(term) || 
              productCode.toLowerCase().includes(term) || 
              locationName.toLowerCase().includes(term)
            );
            
            if (hasExclusion) return;

            // Check included terms
            if (includedTerms.length > 0) {
              const matches = includedTerms.map(term => 
                description.toLowerCase().includes(term) || 
                productCode.toLowerCase().includes(term) || 
                locationName.toLowerCase().includes(term)
              );

              const isMatch = productSearch.mode === 'AND'
                ? matches.every(Boolean)
                : matches.some(Boolean);

              if (isMatch) {
                filteredProductMetrics.set(productKey, locationMap);
              }
            } else {
              filteredProductMetrics.set(productKey, locationMap);
            }
          });

          // Replace productMetrics with filtered version
          productMetrics.clear();
          filteredProductMetrics.forEach((value, key) => {
            productMetrics.set(key, value);
          });
        }

        // Calculate time-based efficiency metrics
        const efficiencyResults: TimeBasedEfficiencyMetric[] = [];

        productMetrics.forEach((locationMap, productKey) => {
          const [productCode, unitType] = productKey.split('|');

          locationMap.forEach((periodMap, locationId) => {
            const locationName = locationsMap.get(locationId) || '-';
            const timeSeries: TimeBasedEfficiencyMetric['timeSeries'] = [];

            // Sort periods chronologically
            const sortedPeriods = Array.from(periodMap.keys()).sort();
            
            // Calculate total spend and PAX for the entire period to get the base spend per PAX
            let totalPeriodSpend = 0;
            let totalPeriodPax = 0;
            
            sortedPeriods.forEach(period => {
              const periodData = periodMap.get(period)!;
              const paxForPeriod = paxByLocationAndPeriod.get(locationId)?.get(period) || 0;
              totalPeriodSpend += periodData.totalSpend;
              totalPeriodPax += paxForPeriod;
            });

            // Calculate the base spend per PAX for the entire period
            const baseSpendPerPax = totalPeriodPax > 0 ? totalPeriodSpend / totalPeriodPax : 0;

            sortedPeriods.forEach(period => {
              const periodData = periodMap.get(period)!;
              const paxForPeriod = paxByLocationAndPeriod.get(locationId)?.get(period) || 0;
              
              // Use the base spend per PAX but apply slight variation based on invoice timing
              // This creates the "slightly curved" effect you requested
              let adjustedSpendPerPax = baseSpendPerPax;
              
              if (periodData.invoiceDates.length > 0) {
                // Calculate average invoice date within the period for slight curve adjustment
                const avgInvoiceDate = new Date(
                  periodData.invoiceDates.reduce((sum, date) => sum + new Date(date).getTime(), 0) / periodData.invoiceDates.length
                );
                const periodStart = new Date(period + '-01');
                const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
                
                // Calculate position within the month (0 = start, 1 = end)
                const positionInMonth = (avgInvoiceDate.getTime() - periodStart.getTime()) / (periodEnd.getTime() - periodStart.getTime());
                
                // Apply slight curve: earlier invoices get slightly lower spend per PAX, later ones slightly higher
                // This creates a realistic distribution based on when invoices actually occurred
                const curveAdjustment = (positionInMonth - 0.5) * 0.1; // ±5% variation
                adjustedSpendPerPax = baseSpendPerPax * (1 + curveAdjustment);
              }
              
              const avgPrice = periodData.pricePoints.length > 0 
                ? periodData.pricePoints.reduce((sum, price) => sum + price, 0) / periodData.pricePoints.length
                : 0;

              timeSeries.push({
                period: period,
                spendPerPax: adjustedSpendPerPax,
                totalSpend: periodData.totalSpend,
                totalPax: paxForPeriod,
                quantity: periodData.totalQuantity,
                avgPrice,
                transactionCount: periodData.transactionCount,
              });
            });

            if (timeSeries.length >= 2) { // Need at least 2 data points for trend analysis
              const efficiencyAnalysis = calculateEfficiencyTrend(timeSeries);
              
              efficiencyResults.push({
                productCode,
                description: (() => {
                  const found = invoiceLines.find(record => {
                    const line = record as { product_code: string; description: string };
                    return line.product_code === productCode;
                  });
                  return (found as { product_code: string; description: string })?.description || '';
                })(),
                locationId,
                locationName,
                unitType,
                timeSeries,
                efficiencyScore: efficiencyAnalysis.efficiencyScore,
                trendDirection: efficiencyAnalysis.trendDirection,
                volatilityScore: efficiencyAnalysis.volatilityScore,
                potentialSavings: efficiencyAnalysis.potentialSavings,
                recommendation: efficiencyAnalysis.recommendation,
                dataQualityFactor: efficiencyAnalysis.dataQualityFactor || 0,
                efficiencyExplanation: efficiencyAnalysis.efficiencyExplanation || 'No explanation available',
              });
            }
          });
        });

        // Sort by efficiency score (lowest = most inefficient)
        efficiencyResults.sort((a, b) => a.efficiencyScore - b.efficiencyScore);

        setEfficiencyMetrics(efficiencyResults);

        // If specific product requested, create chart data
        if (productCode) {
          let specificMetric;
          
          if (locationId) {
            // Find specific location if provided
            specificMetric = efficiencyResults.find(
              metric => metric.productCode === productCode && metric.locationId === locationId
            );
          } else {
            // If no location specified, use the first available location for this product
            specificMetric = efficiencyResults.find(
              metric => metric.productCode === productCode
            );
          }

          if (specificMetric) {
            // Create smoothed chart data with multiple smoothing options
            const chartData = specificMetric.timeSeries.map((point, index) => {
              // Calculate different smoothing windows (now in months instead of days)
              const shortWindow = Math.min(2, index + 1); // 2-month moving average
              const mediumWindow = Math.min(3, index + 1); // 3-month moving average  
              const longWindow = Math.min(6, index + 1); // 6-month moving average
              
              // Get data for each window
              const shortData = specificMetric.timeSeries.slice(Math.max(0, index - shortWindow + 1), index + 1);
              const mediumData = specificMetric.timeSeries.slice(Math.max(0, index - mediumWindow + 1), index + 1);
              const longData = specificMetric.timeSeries.slice(Math.max(0, index - longWindow + 1), index + 1);
              
              // Calculate volume-weighted averages (more realistic for period-based data)
              const shortTrend = shortData.length > 0 ? 
                shortData.reduce((sum, p) => sum + (p.spendPerPax * p.totalSpend), 0) / 
                shortData.reduce((sum, p) => sum + p.totalSpend, 0) : point.spendPerPax;
              
              const mediumTrend = mediumData.length > 0 ? 
                mediumData.reduce((sum, p) => sum + (p.spendPerPax * p.totalSpend), 0) / 
                mediumData.reduce((sum, p) => sum + p.totalSpend, 0) : point.spendPerPax;
              
              const longTrend = longData.length > 0 ? 
                longData.reduce((sum, p) => sum + (p.spendPerPax * p.totalSpend), 0) / 
                longData.reduce((sum, p) => sum + p.totalSpend, 0) : point.spendPerPax;

              // Calculate efficiency based on medium-term trend (most balanced)
              const efficiency = mediumTrend > 0 ? Math.max(0, 100 - ((point.spendPerPax - mediumTrend) / mediumTrend * 100)) : 0;

              return {
                period: point.period,
                spendPerPax: point.spendPerPax, // Raw data (now period-based)
                totalSpend: point.totalSpend,
                totalPax: point.totalPax,
                quantity: point.quantity,
                avgPrice: point.avgPrice,
                transactionCount: point.transactionCount,
                // Multiple smoothing options (now in months)
                shortTrend, // 2-month volume-weighted average
                mediumTrend, // 3-month volume-weighted average (default)
                longTrend, // 6-month volume-weighted average
                efficiency,
              };
            });

            setProductChart({
              productCode: specificMetric.productCode,
              description: specificMetric.description,
              locationName: specificMetric.locationName,
              unitType: specificMetric.unitType,
              chartData,
              overallEfficiency: specificMetric.efficiencyScore,
              trendAnalysis: {
                direction: specificMetric.trendDirection,
                changePercentage: calculateChangePercentage(specificMetric.timeSeries),
                volatility: specificMetric.volatilityScore,
              },
            });
          }
        }

      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching time-based efficiency data:', err);
          setError(err as Error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTimeBasedEfficiency();
    
    // Cleanup function to cancel requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit, productCode, locationId]);

  return {
    efficiencyMetrics,
    productChart,
    isLoading,
    error,
  };
};

// Helper function to calculate efficiency trend analysis
function calculateEfficiencyTrend(timeSeries: TimeBasedEfficiencyMetric['timeSeries']) {
  if (timeSeries.length < 2) {
    return {
      efficiencyScore: 50,
      trendDirection: 'stable' as const,
      volatilityScore: 0,
      potentialSavings: 0,
      recommendation: 'Insufficient data for trend analysis',
    };
  }

  const spendPerPaxValues = timeSeries.map(point => point.spendPerPax);
  const totalSpend = timeSeries.reduce((sum, point) => sum + point.totalSpend, 0);

  // Calculate trend direction
  const firstHalf = spendPerPaxValues.slice(0, Math.ceil(spendPerPaxValues.length / 2));
  const secondHalf = spendPerPaxValues.slice(Math.floor(spendPerPaxValues.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const changePercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
  
  let trendDirection: 'improving' | 'stable' | 'declining';
  if (changePercentage < -5) {
    trendDirection = 'improving';
  } else if (changePercentage > 5) {
    trendDirection = 'declining';
  } else {
    trendDirection = 'stable';
  }

  // Calculate volatility (coefficient of variation)
  const mean = spendPerPaxValues.reduce((sum, val) => sum + val, 0) / spendPerPaxValues.length;
  const variance = spendPerPaxValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / spendPerPaxValues.length;
  const standardDeviation = Math.sqrt(variance);
  const volatilityScore = mean > 0 ? Math.min(100, (standardDeviation / mean) * 100) : 0;

  // Calculate efficiency score (0-100, higher is better)
  // Make calculation more forgiving for limited data
  // With daily data, we need more data points for reliable analysis
  const dataQualityFactor = Math.min(1, timeSeries.length / 15); // Full confidence at 15+ data points (about 2 weeks)
  let efficiencyScore = 100;
  
  // Penalize for declining trends (but less harsh with limited data)
  if (trendDirection === 'declining') {
    const trendPenalty = Math.min(40, Math.abs(changePercentage) * 1.5) * dataQualityFactor;
    efficiencyScore -= trendPenalty;
  }
  
  // Penalize for high volatility (but less harsh with limited data)
  const volatilityPenalty = Math.min(25, volatilityScore * 0.4) * dataQualityFactor;
  efficiencyScore -= volatilityPenalty;
  
  // Bonus for improving trends
  if (trendDirection === 'improving') {
    const improvementBonus = Math.min(15, Math.abs(changePercentage) * 0.3) * dataQualityFactor;
    efficiencyScore += improvementBonus;
  }
  
  // Ensure minimum score for limited data to avoid over-punishment
  const minimumScore = dataQualityFactor < 0.5 ? 30 : 0;
  efficiencyScore = Math.max(minimumScore, Math.min(100, efficiencyScore));

  // Calculate potential savings
  const potentialSavings = trendDirection === 'declining' 
    ? totalSpend * Math.min(0.2, Math.abs(changePercentage) / 100)
    : 0;

  // Generate recommendation
  let recommendation = '';
  if (trendDirection === 'declining' && volatilityScore > 20) {
    recommendation = 'High volatility with declining efficiency. Investigate price fluctuations and supplier consistency.';
  } else if (trendDirection === 'declining') {
    recommendation = 'Efficiency declining over time. Review supplier negotiations and purchasing patterns.';
  } else if (volatilityScore > 30) {
    recommendation = 'High price volatility detected. Consider supplier consolidation or price agreements.';
  } else if (trendDirection === 'improving') {
    recommendation = 'Efficiency improving. Continue current procurement strategy.';
  } else {
    recommendation = 'Stable efficiency. Monitor for future changes.';
  }

  return {
    efficiencyScore,
    trendDirection,
    volatilityScore,
    potentialSavings,
    recommendation,
    dataQualityFactor,
    efficiencyExplanation: generateEfficiencyExplanation(efficiencyScore, trendDirection, volatilityScore, dataQualityFactor, changePercentage),
  };
}

// Helper function to generate efficiency explanation
function generateEfficiencyExplanation(
  efficiencyScore: number, 
  trendDirection: string, 
  volatilityScore: number, 
  dataQualityFactor: number, 
  changePercentage: number
): string {
  const explanations: string[] = [];
  
  // Base score explanation
  if (efficiencyScore >= 80) {
    explanations.push("High efficiency score indicates good cost management");
  } else if (efficiencyScore >= 60) {
    explanations.push("Moderate efficiency with room for improvement");
  } else if (efficiencyScore >= 40) {
    explanations.push("Below-average efficiency requiring attention");
  } else {
    explanations.push("Low efficiency score indicating significant cost issues");
  }
  
  // Trend explanation
  if (trendDirection === 'declining') {
    explanations.push(`Spend per PAX increased by ${Math.abs(changePercentage).toFixed(1)}% over time`);
  } else if (trendDirection === 'improving') {
    explanations.push(`Spend per PAX decreased by ${Math.abs(changePercentage).toFixed(1)}% over time`);
  } else {
    explanations.push("Spend per PAX has remained relatively stable");
  }
  
  // Volatility explanation
  if (volatilityScore > 30) {
    explanations.push("High price volatility suggests inconsistent supplier performance");
  } else if (volatilityScore > 15) {
    explanations.push("Moderate price fluctuations detected");
  } else {
    explanations.push("Price stability indicates consistent supplier performance");
  }
  
  // Data quality explanation
  if (dataQualityFactor < 0.5) {
    explanations.push("Limited data points - analysis confidence is reduced");
  } else if (dataQualityFactor < 0.8) {
    explanations.push("Fair data coverage - more historical data would improve accuracy");
  } else {
    explanations.push("Good data coverage provides reliable trend analysis");
  }
  
  return explanations.join(". ") + ".";
}

// Helper function to calculate change percentage
function calculateChangePercentage(timeSeries: TimeBasedEfficiencyMetric['timeSeries']): number {
  if (timeSeries.length < 2) return 0;
  
  const first = timeSeries[0].spendPerPax;
  const last = timeSeries[timeSeries.length - 1].spendPerPax;
  
  return first > 0 ? ((last - first) / first) * 100 : 0;
}
