import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { getPriceValue } from '@/utils/getPriceValue';

type EfficiencyMetric = {
  locationId: string;
  locationName: string;
  totalSpend: number;
  totalPax: number;
  spendPerPax: number;
  productMetrics: Map<string, {
    productCode: string;
    description: string;
    totalSpend: number;
    spendPerPax: number;
    quantity: number;
    unitType: string;
  }>;
};

type PivotData = {
  rows: string[];
  columns: string[];
  data: Map<string, Map<string, number>>;
  products: Map<string, {
    description: string;
    productCode: string;
    spend: number;
  }>;
};

type InvoiceLine = {
  product_code: string;
  description: string;
  quantity: number;
  unit_type: string;
  unit_price: number;
  unit_price_after_discount: number;
  total_price: number;
  total_price_after_discount: number;
  invoice_date: string;
  location_id: string;
  supplier_id: string;
};

export const useEfficiencyData = () => {
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

  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetric[]>([]);
  const [pivotData, setPivotData] = useState<PivotData>({
    rows: [],
    columns: [],
    data: new Map(),
    products: new Map(),
  });
  const [overallMetrics, setOverallMetrics] = useState({
    restaurantCount: 0,
    totalPax: 0,
    avgSpendPerPax: 0,
    totalProducts: 0,
  });
  const [paxData, setPaxData] = useState<Array<{ restaurant: string; pax: number }>>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchEfficiencyData = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);
      setError(null);
      
      // If we have product search terms, show a toast to indicate filtering is in progress
      if (productSearch?.terms?.length > 0) {
        toast.info(`Filtering efficiency data by ${productSearch.terms.length} search terms...`);
      }

      try {
        // Fetch all locations for the organization
        let locQuery = supabase
          .from('locations')
          .select('location_id, name')
          .eq('organization_id', currentOrganization.id);

        if (currentBusinessUnit && currentBusinessUnit.id) {
          locQuery = locQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        const { data: locationsData, error: locationsError } = await locQuery;
        if (locationsError) throw locationsError;

        // Create a map of location names
        const locationsMap = new Map(
          (locationsData || []).map(location => [location.location_id, location.name])
        );

        // Now fetch invoice lines data
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
          
        // Apply business unit filter if selected (only if currentBusinessUnit is not null)
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
        } else {
          // When no locations are selected, include both mapped and pending locations
          // This ensures we show all data consistently
          query = query.or('location_id.not.is.null,location_id.is.null');
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
            
            // If we got less than pageSize, we've reached the end
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

        // Validate data consistency
        console.log(`Efficiency Data Fetch: ${invoiceLines.length} rows fetched for date range ${dateRange?.start} to ${dateRange?.end}`);
        
        // Check for data consistency
        const uniqueProducts = new Set(invoiceLines.map((line: unknown) => {
          const l = line as { product_code: string; unit_type: string };
          return `${l.product_code}|${l.unit_type}`;
        }));
        console.log(`Unique products found: ${uniqueProducts.size}`);

        // Process the data
        const filteredLines = (invoiceLines || []) as InvoiceLine[];

        // Fetch actual PAX data from the PAX table
        const paxByLocation = new Map<string, number>();
        const paxByLocationName = new Map<string, number>();
        
        try {
          // Step 1: Fetch matching location IDs (same logic as usePaxData)
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

          // Step 2: Query PAX table using those location IDs
          let paxQuery = supabase
            .from('pax')
            .select(`
              location_id,
              pax_count,
              date_id
            `)
            .in('location_id', locationIds)
            .order('date_id', { ascending: false });

          // Step 3: Apply optional filters (same as usePaxData)
          if (dateRange?.start && dateRange?.end) {
            paxQuery = paxQuery
              .gte('date_id', dateRange.start)
              .lte('date_id', dateRange.end);
          }

          if (restaurants.length > 0) {
            paxQuery = paxQuery.in('location_id', restaurants);
          }

          // Step 4: Execute query with pagination (same as usePaxData)
          let allPaxRows: unknown[] = [];
          let page = 0;
          const pageSize = 1000;
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
              
              // If we got less than pageSize, we've reached the end
              if (pageRows.length < pageSize) {
                hasMore = false;
              }
              
              page++;
            }
          }

          const paxData = allPaxRows;

          if (paxData && paxData.length > 0) {
            console.log('PAX data fetched:', paxData.length, 'records');
            console.log('PAX data sample:', paxData.slice(0, 3));
            // Process actual PAX data
            paxData.forEach(paxRecord => {
              const record = paxRecord as { location_id: string; pax_count: number };
              const locationName = locationsMap.get(record.location_id) || '-';
              const currentPax = paxByLocation.get(record.location_id) || 0;
              const currentPaxByName = paxByLocationName.get(locationName) || 0;
              
              paxByLocation.set(record.location_id, currentPax + record.pax_count);
              paxByLocationName.set(locationName, currentPaxByName + record.pax_count);
            });
            
            console.log('PAX by location name:', Array.from(paxByLocationName.entries()));
          } else {
            console.log('No PAX data found in the PAX table');
          }
        } catch (error) {
          console.warn('Failed to fetch PAX data:', error);
        }

        // Convert to array for pivot table
        const paxDataArray = Array.from(paxByLocationName.entries()).map(([restaurant, pax]) => ({
          restaurant,
          pax
        }));
        setPaxData(paxDataArray);

        // Group by location and calculate metrics
        const locationMetrics = new Map<string, EfficiencyMetric>();

        filteredLines.forEach(row => {
          const locationId = row.location_id;
                      const locationName = locationsMap.get(locationId) || '-';
          const effectiveTotal = getPriceValue(row.total_price_after_discount, row.total_price);

          if (!locationMetrics.has(locationId)) {
            locationMetrics.set(locationId, {
              locationId,
              locationName,
              totalSpend: 0,
              totalPax: paxByLocation.get(locationId) || 0,
              spendPerPax: 0,
              productMetrics: new Map(),
            });
          }

          const metric = locationMetrics.get(locationId)!;
          metric.totalSpend += effectiveTotal;

          // Track product metrics
          // Simplified: Use product code + supplier, or description + supplier for products without codes
          const productCode = row.product_code || '';
          const productKey = productCode 
            ? `${productCode}|${row.supplier_id}` 
            : `${row.description}|${row.supplier_id}`;
          
          if (!metric.productMetrics.has(productKey)) {
            metric.productMetrics.set(productKey, {
              productCode: row.product_code,
              description: row.description || '',
              totalSpend: 0,
              spendPerPax: 0,
              quantity: 0,
              unitType: row.unit_type || '',
            });
          }

          const productMetric = metric.productMetrics.get(productKey)!;
          productMetric.totalSpend += effectiveTotal;
          productMetric.quantity += row.quantity || 0;
        });

        // Calculate spend per PAX
        locationMetrics.forEach(metric => {
          metric.spendPerPax = metric.totalPax > 0 ? metric.totalSpend / metric.totalPax : 0;
          
          // Safety check before iterating
          if (typeof metric.productMetrics === 'function' || !(metric.productMetrics instanceof Map)) {
            console.error('Invalid productMetrics type when calculating spendPerPax:', typeof metric.productMetrics);
          } else {
            metric.productMetrics.forEach(product => {
              product.spendPerPax = metric.totalPax > 0 ? product.totalSpend / metric.totalPax : 0;
            });
          }
        });

        // Apply product search filter if specified
        if (productSearch?.terms?.length > 0) {
          const includedTerms: string[] = [];
          const excludedTerms: string[] = [];
          
          console.log('Applying product search filter to efficiency data:', productSearch);
          
          productSearch.terms.forEach(term => {
            if (term.startsWith('-')) {
              excludedTerms.push(term.slice(1).toLowerCase());
            } else {
              includedTerms.push(term.toLowerCase());
            }
          });

          locationMetrics.forEach(metric => {
            // Safety check: ensure productMetrics is a Map before iterating
            if (typeof metric.productMetrics === 'function' || !(metric.productMetrics instanceof Map)) {
              console.error('Invalid productMetrics type:', typeof metric.productMetrics, 'for location:', metric.locationName);
              return;
            }
            const filteredProducts = new Map();
            
            metric.productMetrics.forEach((product, key) => {
              // Add null checks for description and productCode
              const description = (product.description || '').toLowerCase();
              const code = (product.productCode || '').toLowerCase();
              const supplier = metric.locationName.toLowerCase(); // Include location name in search
              
              // Check excluded terms
              const hasExclusion = excludedTerms.some(term =>
                description.includes(term) || code.includes(term) || supplier.includes(term)
              );
              
              if (hasExclusion) return;

              // Check included terms
              if (includedTerms.length > 0) {
                const matches = includedTerms.map(term => 
                  description.includes(term) || code.includes(term) || supplier.includes(term)
                );

                const isMatch = productSearch.mode === 'AND'
                  ? matches.every(Boolean)
                  : matches.some(Boolean);

                if (isMatch) {
                  filteredProducts.set(key, product);
                }
              } else {
                filteredProducts.set(key, product);
              }
            });

            metric.productMetrics = filteredProducts;
          });
        }

        const efficiencyArray = Array.from(locationMetrics.values());
        setEfficiencyMetrics(efficiencyArray);

        // Build pivot data for the pivot table
        const pivotMap = new Map<string, Map<string, number>>();
        const productsMap = new Map<string, {
          description: string;
          productCode: string;
          spend: number;
        }>();
        const locationNames = new Set<string>();

        efficiencyArray.forEach(metric => {
          try {
            locationNames.add(metric.locationName);
            
            // Safety check before iterating
            if (typeof metric.productMetrics === 'function' || !(metric.productMetrics instanceof Map)) {
              console.error('Invalid productMetrics type when building pivot data:', typeof metric.productMetrics);
              return; // Skip this metric
            }
            
            metric.productMetrics.forEach((product, key) => {
              if (!pivotMap.has(key)) {
                pivotMap.set(key, new Map());
              }
              
              pivotMap.get(key)!.set(metric.locationName, product.totalSpend);
              
              if (!productsMap.has(key)) {
                productsMap.set(key, {
                  description: product.description || '',
                  productCode: product.productCode || '',
                  spend: 0,
                });
              }
              
              const productData = productsMap.get(key)!;
              productData.spend += product.totalSpend;
            });
          } catch (err) {
            console.error('Error processing location metrics for pivot data:', err, metric);
          }
        });

        const sortedProducts = Array.from(productsMap.entries())
          .sort(([, a], [, b]) => b.spend - a.spend)
          .map(([key]) => key);

        setPivotData({
          rows: sortedProducts,
          columns: Array.from(locationNames).sort(),
          data: pivotMap,
          products: productsMap,
        });

        // Calculate overall metrics
        const totalSpend = efficiencyArray.reduce((sum, m) => sum + m.totalSpend, 0);
        const totalPax = efficiencyArray.reduce((sum, m) => sum + m.totalPax, 0);
        const avgSpendPerPax = totalPax > 0 ? totalSpend / totalPax : 0;
        let totalProductsCount = 0;
        
        try {
          const productCodeSet = new Set<string>();
        
          for (const m of efficiencyArray) {
            const metrics = m.productMetrics;
        
            if (metrics instanceof Map) {
              for (const product of metrics.values()) {
                if (product.productCode) {
                  productCodeSet.add(product.productCode);
                }
              }
            } else {
              console.warn('Skipping non-Map productMetrics:', metrics);
            }
          }
        
          totalProductsCount = productCodeSet.size;
        } catch (err) {
          console.error('Fatal error collecting unique product codes:', err);
        }
        
        setOverallMetrics({
          restaurantCount: efficiencyArray.length,
          totalPax,
          avgSpendPerPax,
          totalProducts: totalProductsCount,
        });

      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching efficiency data:', err);
          setError(err as Error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchEfficiencyData();
    
    // Cleanup function to cancel requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit]);

  return {
    efficiencyMetrics,
    pivotData,
    overallMetrics,
    paxData,
    isLoading,
    error,
  };
};
