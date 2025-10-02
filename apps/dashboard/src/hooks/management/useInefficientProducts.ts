import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLocationComparisons } from '../metrics/useRestaurantComparisons';
import { useDashboardStore } from '@/store/dashboardStore';
import { getPriceValue } from '@/utils/getPriceValue';

export interface InefficientProduct {
  productCode: string;
  description: string;
  comparisonGroup: string;
  restaurants: Array<{
    id: string;
    name: string;
    avgPrice: number;
    totalSpend: number;
    quantity: number;
  }>;
  priceDifference: number;
  priceDifferencePercentage: number;
  efficiencyScore: number; // 0-100, higher is more efficient
  potentialSavings: number;
  recommendation: string;
}

export const useInefficientProducts = () => {
  const {
    dateRange,
    restaurants,
    suppliers,
    categories,
    documentType,
    productSearch,
  } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const { comparisonGroups } = useLocationComparisons();
  const { inefficientProductThreshold } = useDashboardStore();

  const [data, setData] = useState<InefficientProduct[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInefficientProducts = async () => {
      if (!currentOrganization || comparisonGroups.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // First, get all unique location IDs from invoice lines
        let locationIdsQuery = supabase
          .from('invoice_lines')
          .select('location_id')
          .eq('organization_id', currentOrganization.id);
          
        if (currentBusinessUnit) {
          locationIdsQuery = locationIdsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        if (dateRange?.start && dateRange?.end) {
          locationIdsQuery = locationIdsQuery
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        if (restaurants.length > 0) {
          locationIdsQuery = locationIdsQuery.in('location_id', restaurants);
        }

        if (suppliers.length > 0) {
          locationIdsQuery = locationIdsQuery.in('supplier_id', suppliers);
        }

        if (categories.length > 0) {
          locationIdsQuery = locationIdsQuery.in('category_id', categories);
        }

        if (documentType === 'Faktura') {
          locationIdsQuery = locationIdsQuery.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          locationIdsQuery = locationIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
        }

        const { data: locationIdsData, error: locationIdsError } = await locationIdsQuery;

        if (locationIdsError) throw locationIdsError;

        // Get unique location IDs
        const uniqueLocationIds = [...new Set((locationIdsData || []).map(row => row.location_id))];

        // Fetch location details
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('location_id, name')
          .eq('organization_id', currentOrganization.id)
          .in('location_id', uniqueLocationIds);

        if (locationsError) throw locationsError;

        // Create a map of location names
        const locationsMap = new Map(
          (locationsData || []).map(location => [location.location_id, location.name])
        );

        // Fetch invoice lines data
        let query = supabase
          .from('invoice_lines')
          .select(`
            product_code,
            description,
            unit_type,
            unit_price,
            unit_price_after_discount,
            total_price,
            total_price_after_discount,
            quantity,
            location_id,
            supplier_id
          `)
          .eq('organization_id', currentOrganization.id);

        if (currentBusinessUnit) {
          query = query.eq('business_unit_id', currentBusinessUnit.id);
        }

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

        const { data: invoiceLines, error } = await query;

        if (error) throw error;

        // Process data for each comparison group
        const inefficientProducts: InefficientProduct[] = [];

        comparisonGroups.forEach(comparison => {
          // Filter invoice lines for restaurants in this comparison group
          const comparisonLines = (invoiceLines || []).filter(line => 
            comparison.locations.some(location => location.location_id === line.location_id)
          );

          // Group by product and calculate metrics per restaurant
          const productMetrics = new Map<string, Map<string, {
            totalSpend: number;
            totalQuantity: number;
            avgPrice: number;
            pricePoints: number[];
          }>>();

          comparisonLines.forEach(line => {
            const productKey = `${line.product_code}|${line.unit_type}`;
            const locationId = line.location_id;
            const effectivePrice = getPriceValue(line.unit_price_after_discount, line.unit_price);
            const effectiveTotal = getPriceValue(line.total_price_after_discount, line.total_price);

            if (!productMetrics.has(productKey)) {
              productMetrics.set(productKey, new Map());
            }

            const productMap = productMetrics.get(productKey)!;

            if (!productMap.has(locationId)) {
              productMap.set(locationId, {
                totalSpend: 0,
                totalQuantity: 0,
                avgPrice: 0,
                pricePoints: [],
              });
            }

            const locationData = productMap.get(locationId)!;
            locationData.totalSpend += effectiveTotal;
            locationData.totalQuantity += line.quantity || 0;
            locationData.pricePoints.push(effectivePrice);
          });

          // Calculate average prices and identify inefficiencies
          productMetrics.forEach((locationData, productKey) => {
            const [productCode] = productKey.split('|');
            
            // Calculate average prices for each location
            const locationMetrics = Array.from(locationData.entries()).map(([locationId, data]) => ({
              id: locationId,
              name: locationsMap.get(locationId) || '-',
              avgPrice: data.pricePoints.length > 0 
                ? data.pricePoints.reduce((sum, price) => sum + price, 0) / data.pricePoints.length 
                : 0,
              totalSpend: data.totalSpend,
              quantity: data.totalQuantity,
            }));

            // Only process if we have data from multiple locations
            if (locationMetrics.length < 2) return;

            // Find the lowest and highest average prices
            const sortedMetrics = locationMetrics.sort((a, b) => a.avgPrice - b.avgPrice);
            const lowestPrice = sortedMetrics[0].avgPrice;
            const highestPrice = sortedMetrics[sortedMetrics.length - 1].avgPrice;
            const priceDifference = highestPrice - lowestPrice;
            const priceDifferencePercentage = lowestPrice > 0 ? (priceDifference / lowestPrice) * 100 : 0;

            // Calculate efficiency score (0-100, higher is more efficient)
            const efficiencyScore = Math.max(0, 100 - priceDifferencePercentage);

            // Only include if the price difference is significant
            if (priceDifferencePercentage >= inefficientProductThreshold) {
              const potentialSavings = locationMetrics.reduce((total, location) => {
                if (location.avgPrice > lowestPrice) {
                  const savingsPerUnit = location.avgPrice - lowestPrice;
                  return total + (savingsPerUnit * location.quantity);
                }
                return total;
              }, 0);

              // Generate recommendation
              const recommendation = generateRecommendation(
                priceDifferencePercentage,
                sortedMetrics,
                lowestPrice
              );

              inefficientProducts.push({
                productCode,
                description: comparisonLines.find(line => line.product_code === productCode)?.description || '',
                comparisonGroup: comparison.name,
                restaurants: locationMetrics,
                priceDifference,
                priceDifferencePercentage,
                efficiencyScore,
                potentialSavings,
                recommendation,
              });
            }
          });
        });

        // Sort by potential savings (highest first)
        inefficientProducts.sort((a, b) => b.potentialSavings - a.potentialSavings);

        // Apply product search filter if provided
        const filteredProducts = productSearch.terms.length > 0
          ? inefficientProducts.filter(product => {
              const searchText = `${product.description} ${product.productCode}`.toLowerCase();
              const isMatch = productSearch.mode === 'AND'
                ? productSearch.terms.every(term => searchText.includes(term.toLowerCase()))
                : productSearch.terms.some(term => searchText.includes(term.toLowerCase()));
              return isMatch;
            })
          : inefficientProducts;

        setData(filteredProducts);
      } catch (err) {
        console.error('Error fetching inefficient products:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchInefficientProducts();
  }, [
    currentOrganization,
    currentBusinessUnit,
    dateRange,
    restaurants,
    suppliers,
    categories,
    documentType,
    productSearch,
    comparisonGroups,
    inefficientProductThreshold,
  ]);

  return { data, isLoading, error };
};

// Helper function for currency formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
  }).format(amount);
};

// Helper function to generate recommendation based on price difference percentage
const generateRecommendation = (
  priceDifferencePercentage: number,
  sortedMetrics: Array<{ id: string; name: string; avgPrice: number; totalSpend: number; quantity: number }>,
  lowestPrice: number
): string => {
  if (priceDifferencePercentage > 50) {
    const maxPriceLocation = sortedMetrics[sortedMetrics.length - 1];
    return `High inefficiency detected. ${maxPriceLocation.name} is paying ${priceDifferencePercentage.toFixed(1)}% more than ${sortedMetrics[0].name}. Consider price negotiation or supplier consolidation.`;
  } else if (priceDifferencePercentage > 25) {
    const potentialSavings = sortedMetrics.reduce((total, location) => {
      if (location.avgPrice > lowestPrice) {
        const savingsPerUnit = location.avgPrice - lowestPrice;
        return total + (savingsPerUnit * location.quantity);
      }
      return total;
    }, 0);
    return `Moderate inefficiency. ${sortedMetrics[sortedMetrics.length - 1].name} could save ${formatCurrency(potentialSavings)} by matching ${sortedMetrics[0].name}'s pricing.`;
  } else {
    return `Minor price variation. Monitor for trends and consider standardizing pricing across locations.`;
  }
}; 
