/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';
import { getPriceValue } from '@/utils/getPriceValue';
import { detectPriceVariations } from '@/utils/priceVariationDetection';
import { cache } from '@/lib/cache';

// Database row types used for stronger typing
interface DbPriceAlert {
  id: string;
  alert_type: 'same_day' | 'agreement' | 'post_negotiation_violation';
  product_code: string | null;
  supplier_name: string | null;
  description: string | null;
  date: string; // ISO date
  min_price: number | null;
  max_price: number | null;
  expected_price: number | null;
  actual_price: number | null;
  affected_locations: Array<{ location_id: string; location_name: string }>|null;
}

interface NegotiationRow {
  id: string;
  organization_id: string;
  business_unit_id: string | null;
  product_code: string;
  supplier_id: string | null;
  supplier: string | null;
  description: string | null;
  unit_type: string | null;
  target_price: string | number | null;
  effective_date: string | null; // ISO date
  status: 'active' | 'resolved';
}

interface InvoiceLineRow {
  invoice_number: string;
  invoice_date: string; // ISO date
  product_code: string | null;
  description: string | null;
  quantity: number | string | null;
  unit_type: string | null;
  unit_price: number | string | null;
  unit_price_after_discount: number | string | null;
  document_type?: string | null;
  supplier_id: string | null;
  suppliers?: { name: string | null } | null;
  location_id: string | null;
  locations?: { name: string | null } | null;
}

type PriceVariation = {
  id: string;
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  unitType: string;
  variations: Array<{
    date: Date;
    unitType: string;
    restaurants: Array<{
      name: string;
      price: number;
      quantity: number;
      invoiceNumber: string;
      isBase: boolean;
      overpaidAmount: number;
    }>;
    priceDifference: number;
    basePrice: number;
    maxPrice: number;
    overpaidAmount: number;
  }>;
  totalOverpaid: number;
  chartData?: Array<{
    date: Date;
    unitType: string;
    basePrice: number;
    variationPrice: number | null;
    priceDifference: number;
    hasVariation: boolean;
  }>;
};

type PricePoint = {
  price: number;
  quantity: number;
  restaurant: string;
  invoiceNumber: string;
  documentType: string;
  date: Date;
};

interface PriceVariationInternal extends PriceVariation {
  pricePoints: Map<string, Map<string, PricePoint[]>>;
}

type AgreementViolation = {
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  unitType: string;
  agreementPrice: number;
  violations: Array<{
    date: Date;
    restaurant: string;
    quantity: number;
    actualPrice: number;
    overspendAmount: number;
    invoiceNumber: string;
  }>;
  totalOverspend: number;
  chartData?: Array<{
    date: Date;
    unitType: string;
    basePrice: number;
    variationPrice: number | null;
    priceDifference: number;
    hasVariation: boolean;
  }>;
};

export const usePriceAlerts = () => {
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
  const { priceVariation: priceVariationSettings } = useSettingsStore();

  const [priceVariations, setPriceVariations] = useState<PriceVariation[]>([]);
  const [agreementViolations, setAgreementViolations] = useState<AgreementViolation[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalSavings, setTotalSavings] = useState({
    variations: 0,
    agreements: 0,
    total: 0,
  });

  // Create cache key based on all filter parameters
  const cacheKey = useMemo(() => {
    if (!currentOrganization) return '';
    
    const filterHash = JSON.stringify({
      orgId: currentOrganization.id,
      buId: currentBusinessUnit?.id,
      dateRange,
      restaurants: restaurants.sort(),
      suppliers: suppliers.sort(),
      categories: categories.sort(),
      documentType,
      productSearch,
      productCodeFilter,
    });
    
    return `price-alerts:${btoa(filterHash)}`;
  }, [currentOrganization, currentBusinessUnit, dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    return cache.get<{
      priceVariations: PriceVariation[];
      agreementViolations: AgreementViolation[];
      totalSavings: { variations: number; agreements: number; total: number };
    }>(cacheKey);
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: {
    priceVariations: PriceVariation[];
    agreementViolations: AgreementViolation[];
    totalSavings: { variations: number; agreements: number; total: number };
  }) => {
    if (!cacheKey) return;
    cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
  }, [cacheKey]);

  const fetchPriceAlerts = useCallback(async () => {
    if (!currentOrganization) return;
    
    // Check cache first - this will dramatically improve performance
    const cachedData = getCachedData();
    if (cachedData) {
      setPriceVariations(cachedData.priceVariations);
      setAgreementViolations(cachedData.agreementViolations);
      setTotalSavings(cachedData.totalSavings);
      setLoading(false);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
      
      // Silent filtering - no toast needed for search operations

      try {
        // 1. Fetch invoice lines for price variations
        let invoiceQuery = supabase 
          .from('invoice_lines')
          .select(`
            id,
            invoice_number,
            invoice_date,
            document_type,
            product_code,
            description,
            quantity,
            unit_type,
            unit_price,
            unit_price_after_discount,
            total_price_after_discount,
            supplier_id,
            location_id,
            suppliers(name),
            locations(name)
          `)
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected (only if currentBusinessUnit is not null)
        if (currentBusinessUnit && currentBusinessUnit.id) {
          invoiceQuery = invoiceQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Apply filters
        if (dateRange?.start && dateRange?.end) {
          invoiceQuery = invoiceQuery
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        if (restaurants.length > 0) {
          invoiceQuery = invoiceQuery.in('location_id', restaurants);
        }

        if (suppliers.length > 0) {
          invoiceQuery = invoiceQuery.in('supplier_id', suppliers);
        }

        if (categories.length > 0) {
          invoiceQuery = invoiceQuery.in('category_id', categories);
        }

        if (documentType === 'Faktura') {
          invoiceQuery = invoiceQuery.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          invoiceQuery = invoiceQuery.in('document_type', ['Kreditnota', 'Credit note']);
        }

        // Apply product code filter
        if (productCodeFilter === 'with_codes') {
          invoiceQuery = invoiceQuery.not('product_code', 'is', null).neq('product_code', '');
        } else if (productCodeFilter === 'without_codes') {
          invoiceQuery = invoiceQuery.or('product_code.is.null,product_code.eq.');
        }

        // Fetch all data using pagination (Supabase has a hard limit of 1000 rows per query)
        let allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const offset = page * pageSize;
          
          const { data: pageRows, error: pageError } = await invoiceQuery
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

        const invoiceRows = allRows;

        // 2. Fetch price alerts from the database
        let alertsQuery = supabase
          .from('price_alerts')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('date', { ascending: false });

        if (currentBusinessUnit && currentBusinessUnit.id) {
          alertsQuery = alertsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Apply category filter to database alerts by joining with invoice_lines
        if (categories.length > 0) {
          // Get product codes that match the selected categories
          const { data: categoryProducts } = await supabase
            .from('invoice_lines')
            .select('product_code')
            .eq('organization_id', currentOrganization.id)
            .in('category_id', categories)
            .not('product_code', 'is', null)
            .neq('product_code', '');

          if (categoryProducts && categoryProducts.length > 0) {
            const productCodes = [...new Set(categoryProducts.map((p: { product_code: string }) => p.product_code))];
            alertsQuery = alertsQuery.in('product_code', productCodes);
          } else {
            // If no products match the categories, return empty results
            alertsQuery = alertsQuery.eq('product_code', 'no-match');
          }
        }

        // Execute queries in parallel
        const [invoiceResult, alertsResult] = await Promise.all([invoiceQuery, alertsQuery]);

        if (invoiceResult.error) throw invoiceResult.error;
        if (alertsResult.error) throw alertsResult.error;
        
        const dbAlerts = (alertsResult.data as DbPriceAlert[] | null) || [];

        // Process same-day price variations
        const variationsMap = new Map<string, PriceVariationInternal>();

        // Apply product search filter if specified
        let filteredInvoiceRows: InvoiceLineRow[] = invoiceRows as InvoiceLineRow[];
        if (productSearch?.terms?.length > 0) {
          const includedTerms: string[] = [];
          const excludedTerms: string[] = [];
          
          productSearch.terms.forEach(term => {
            if (term.startsWith('-')) {
              excludedTerms.push(term.slice(1).toLowerCase());
            } else {
              includedTerms.push(term.toLowerCase());
            }
          });

          filteredInvoiceRows = (invoiceRows as InvoiceLineRow[]).filter(row => {
            const description = (row.description || '').toLowerCase();
            const code = (row.product_code || '').toLowerCase();
            const supplier = (row.suppliers?.name || '').toLowerCase();
            
            // Check excluded terms first
            const hasExclusion = excludedTerms.some(term =>
              description.includes(term) || code.includes(term) || supplier.includes(term)
            );
            
            if (hasExclusion) return false;

            // Check included terms
            if (includedTerms.length > 0) {
              const matches = includedTerms.map(term => 
                description.includes(term) || code.includes(term) || supplier.includes(term)
              );

              return productSearch.mode === 'AND'
                ? matches.every(Boolean)
                : matches.some(Boolean);
            }

            return true;
          });
        }

        // Group by product and date
        filteredInvoiceRows.forEach((row: InvoiceLineRow) => {
          // Use consistent product grouping logic: productCode|supplierId or description|supplierId
          const productCode = row.product_code || '';
          const supplierId = row.supplier_id || 'null';
          const productIdentifier = productCode ? productCode : row.description || 'unknown';
          const productKey = `${productIdentifier}|${supplierId}`;
                      const supplierName = row.suppliers?.name || '-';
            const locationName = row.locations?.name || '-';
          const afterDisc = typeof row.unit_price_after_discount === 'string' ? parseFloat(row.unit_price_after_discount) : row.unit_price_after_discount;
          const orig = typeof row.unit_price === 'string' ? parseFloat(row.unit_price) : row.unit_price;
          const effectivePrice = getPriceValue(afterDisc as number | null | undefined, orig as number | null | undefined);
          // const effectiveTotal = getPriceValue(row.total_price_after_discount as any, (row as any).total_price);

          if (!variationsMap.has(productKey)) {
            variationsMap.set(productKey, {
              id: productKey,
              productCode: productCode,
              description: row.description || '',
              supplier: supplierName,
              supplierId: row.supplier_id || '',
              unitType: row.unit_type || '',
              variations: [],
              totalOverpaid: 0,
              pricePoints: new Map<string, Map<string, PricePoint[]>>(),
            });
          }

          const product = variationsMap.get(productKey)!;
          
          // Track price points by date and unit type
          const dateKey = row.invoice_date;
          if (!product.pricePoints) {
            product.pricePoints = new Map();
          }
          
          if (!product.pricePoints.has(dateKey)) {
            product.pricePoints.set(dateKey, new Map());
          }
          
          const dateGroup = product.pricePoints.get(dateKey)!;
          const unitType = row.unit_type || '-';
          
          if (!dateGroup.has(unitType)) {
            dateGroup.set(unitType, []);
          }
          
          dateGroup.get(unitType)!.push({
            price: effectivePrice,
            quantity: Number(row.quantity) || 0,
            restaurant: locationName,
            invoiceNumber: row.invoice_number,
            documentType: row.document_type || 'Invoice',
            date: new Date(row.invoice_date),
          });
        });

        // Calculate variations and generate chart data
        const processedVariations: PriceVariation[] = [];

        variationsMap.forEach((product: PriceVariationInternal) => {
          // Skip products with no price points
          if (!product.pricePoints || product.pricePoints.size === 0) return;

          let hasVariations = false;
          const variations: any[] = [];
          let totalOverpaid = 0;
          const chartData: any[] = [];

          // Process each unit type across all dates
          const unitTypeGroups = new Map<string, PricePoint[]>();
          
          // Collect all price points by unit type
          product.pricePoints.forEach((dateGroups: Map<string, PricePoint[]>) => {
            dateGroups.forEach((pricePoints: PricePoint[], unitType: string) => {
              if (!unitTypeGroups.has(unitType)) {
                unitTypeGroups.set(unitType, []);
              }
              unitTypeGroups.get(unitType)!.push(...pricePoints);
            });
          });

          // Process each unit type for variations
          unitTypeGroups.forEach((allPricePoints: PricePoint[], unitType: string) => {
            let unitTypeHasVariation = false;
            
            // Filter out credit notes entirely - they shouldn't be part of price variation detection
            const nonCreditPoints = allPricePoints.filter((p: PricePoint) => {
              const docType = p.documentType || '';
              return !docType.toLowerCase().includes('kreditnota') && 
                     !docType.toLowerCase().includes('credit');
            });
            
            if (nonCreditPoints.length < 2) return;

            // Use the new percentage-based detection
            const variationResult = detectPriceVariations(nonCreditPoints, priceVariationSettings);
              
            if (variationResult.hasVariation) {
              hasVariations = true;
              unitTypeHasVariation = true;
              totalOverpaid += variationResult.overpaidAmount;

              // Create restaurant data for the variation
              const restaurantData = nonCreditPoints.map((point: PricePoint) => {
                const isBase = point.price === variationResult.previousPrice;
                const overpaid = isBase ? 0 : (point.price - variationResult.previousPrice) * point.quantity;
                
                return {
                  name: point.restaurant,
                  price: point.price,
                  quantity: point.quantity,
                  invoiceNumber: point.invoiceNumber,
                  isBase,
                  overpaidAmount: overpaid,
                };
              });

              variations.push({
                date: new Date(nonCreditPoints[0].date), // Use the most recent date
                unitType,
                restaurants: restaurantData,
                priceDifference: variationResult.priceDifference,
                basePrice: variationResult.previousPrice,
                maxPrice: variationResult.currentPrice,
                overpaidAmount: variationResult.overpaidAmount,
              });
            }

            // Add to chart data for visualization
            const sortedPoints = [...allPricePoints].sort((a, b) => a.date.getTime() - b.date.getTime());
            const prices = sortedPoints.map((p: PricePoint) => p.price);
            const basePrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceDifference = maxPrice - basePrice;

            chartData.push({
              date: new Date(sortedPoints[sortedPoints.length - 1].date), // Use the most recent date
              unitType,
              basePrice,
              variationPrice: unitTypeHasVariation ? maxPrice : null,
              priceDifference,
              hasVariation: unitTypeHasVariation,
            });
          });

          // Only add products with variations
          if (hasVariations) {
            processedVariations.push({
              ...product,
              variations: variations.sort((a, b) => b.date.getTime() - a.date.getTime()),
              totalOverpaid,
              chartData: chartData.sort((a, b) => a.date.getTime() - b.date.getTime()),
            });
          }

          // Clean up temporary data
          delete (product as any).pricePoints;
        });

        // Process agreement violations
        const agreementViolationsMap = new Map<string, AgreementViolation>();

        // First collect all agreement alerts to enrich with invoice line data
        const agreementAlerts = ((dbAlerts || []) as DbPriceAlert[]).filter((a) => a.alert_type === 'agreement');

        if (agreementAlerts.length > 0) {
          // Prepare a batched query to invoice_lines to fetch real line details
          const productCodes = Array.from(new Set(agreementAlerts.map((a: any) => a.product_code).filter(Boolean)));
          const allLocationIds = Array.from(
            new Set(
              agreementAlerts
                .flatMap((a: any) => (a.affected_locations || []).map((l: any) => l.location_id))
                .filter(Boolean)
            )
          );

          // Compute min/max dates to bound the query (dates may include time; compare by date part later)
          const dates = agreementAlerts.map((a) => a.date).filter(Boolean as any);
          const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d: string) => new Date(d).getTime()))) : null;
          const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d: string) => new Date(d).getTime()))) : null;

          // Only query when we have at least one filterable dimension
          let linesForAgreements: any[] = [];
          if (productCodes.length > 0 || allLocationIds.length > 0 || (minDate && maxDate)) {
            let linesQuery = supabase
              .from('invoice_lines')
              .select(`
                invoice_number,
                invoice_date,
                product_code,
                description,
                quantity,
                unit_type,
                unit_price,
                unit_price_after_discount,
                supplier_id,
                suppliers(name),
                location_id,
                locations(name)
              `)
              .eq('organization_id', currentOrganization.id);

            if (currentBusinessUnit && currentBusinessUnit.id) {
              linesQuery = linesQuery.eq('business_unit_id', currentBusinessUnit.id);
            }
            if (productCodes.length > 0) {
              linesQuery = linesQuery.in('product_code', productCodes);
            }
            if (allLocationIds.length > 0) {
              linesQuery = linesQuery.in('location_id', allLocationIds);
            }
            if (minDate && maxDate) {
              // Bound by the min/max date from alerts
              linesQuery = linesQuery.gte('invoice_date', minDate.toISOString()).lte('invoice_date', maxDate.toISOString());
            }

            const { data: agreementLines, error: agreementLinesError } = await (linesQuery as unknown as Promise<{ data: InvoiceLineRow[] | null; error: unknown }>);
            if (agreementLinesError) {
              console.error('Error fetching invoice lines for agreement violations:', agreementLinesError);
            } else if (agreementLines) {
              linesForAgreements = agreementLines;
            }
          }

          // Helper to compare dates by YYYY-MM-DD
          const toDateKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

          agreementAlerts.forEach((alert: DbPriceAlert) => {
            const violationKey = `${alert.product_code}|${alert.supplier_name}|agreement`;

            // Expected price from alert
            const agreementPrice = alert.expected_price || alert.min_price || 0;
            const affectedLocations: Array<{ location_id: string; location_name: string }> = alert.affected_locations || [] as any;

            // Filter candidate lines matching this alert
            const dateKey = toDateKey(alert.date);
            const locationIdSet = new Set(affectedLocations.map((l: any) => l.location_id).filter(Boolean));

            const matchingLines = (linesForAgreements as InvoiceLineRow[]).filter((line) => {
              // Match date (by day), product code, location, and supplier name when available
              const sameDay = toDateKey(line.invoice_date) === dateKey;
              const sameProduct = line.product_code === alert.product_code;
              const sameLocation = locationIdSet.size === 0 ? true : locationIdSet.has(line.location_id || '');
              const sameSupplier = (line.suppliers?.name || '').trim() === (alert.supplier_name || '').trim();
              return sameDay && sameProduct && sameLocation && sameSupplier;
            });

            // Build violations from matching lines; if none, fall back to affected_locations minimal record
            let violations: AgreementViolation['violations'] = [];
            let supplierId: string = '';
            let unitType: string = '';

            if (matchingLines.length > 0) {
              violations = matchingLines.map((line) => {
                let price = getPriceValue(line.unit_price_after_discount as any, line.unit_price as any) || 0;
                const qty = Number(line.quantity) || 0;
                
                // Handle credit notes: they should reduce overspend calculations
                const documentType = line.document_type || '';
                if (documentType.toLowerCase().includes('kreditnota') || 
                    documentType.toLowerCase().includes('credit')) {
                  // For credit notes, we want to subtract the absolute value
                  price = -Math.abs(price);
                }
                // If price is already negative from ETL processing, keep it negative
                else if (price < 0) {
                  // Price is already negative from ETL processing - keep it negative
                }
                
                const overspendAmount = Math.max(0, (price - agreementPrice) * qty);
                supplierId = supplierId || line.supplier_id || '';
                unitType = unitType || line.unit_type || '';
                return {
                  date: new Date(line.invoice_date),
                  restaurant: line.locations?.name || '-',
                  quantity: qty,
                  actualPrice: price,
                  overspendAmount,
                  invoiceNumber: line.invoice_number || '',
                };
              });
            } else {
              // Fallback: create one violation per affected location with minimal info
              violations = affectedLocations.map((loc) => ({
                date: new Date(alert.date),
                restaurant: loc.location_name || '-',
                quantity: 1,
                actualPrice: (alert.actual_price || alert.max_price || 0) as number,
                overspendAmount: Math.max(0, ((alert.actual_price || alert.max_price || 0) as number) - agreementPrice),
                invoiceNumber: '',
              }));
            }

            const totalOverspend = violations.reduce((sum, v) => sum + (v.overspendAmount || 0), 0);

            // Build simple chart data: base is agreement price, variation is actual price when above base
            const byDateUnit = new Map<string, { variationPrice: number; basePrice: number }>();
            violations.forEach(v => {
              const key = `${toDateKey(v.date)}|${unitType || ''}`;
              const existing = byDateUnit.get(key);
              const variationPrice = Math.max(v.actualPrice, agreementPrice);
              const basePrice = agreementPrice;
              if (!existing || variationPrice > existing.variationPrice) {
                byDateUnit.set(key, { variationPrice, basePrice });
              }
            });
            const chartData = Array.from(byDateUnit.entries()).map(([key, val]) => {
              const [dateStr, unit] = key.split('|');
              const priceDifference = Math.max(0, val.variationPrice - val.basePrice);
              return {
                date: new Date(dateStr),
                unitType: unit,
                basePrice: val.basePrice,
                variationPrice: priceDifference > 0 ? val.variationPrice : null,
                priceDifference,
                hasVariation: priceDifference > 0,
              };
            }).sort((a, b) => a.date.getTime() - b.date.getTime());

            agreementViolationsMap.set(violationKey, {
              productCode: alert.product_code || '',
              description: alert.description || '',
              supplier: alert.supplier_name || '',
              supplierId,
              unitType,
              agreementPrice,
              violations,
              totalOverspend,
              chartData,
            });
          });
        }

        // 3. Additionally, derive agreement violations directly from active price negotiations
        // This ensures violations show even if price_alerts rows were not created yet
        let negotiationsQuery = supabase
          .from('price_negotiations')
          .select(`
            id,
            organization_id,
            business_unit_id,
            product_code,
            supplier_id,
            supplier,
            description,
            unit_type,
            target_price,
            effective_date,
            status
          `)
          .eq('organization_id', currentOrganization.id)
          .in('status', ['active']);

        if (currentBusinessUnit && currentBusinessUnit.id) {
          negotiationsQuery = negotiationsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        const { data: negotiations, error: negotiationsError } = await negotiationsQuery as unknown as { data: NegotiationRow[] | null; error: any };
        if (negotiationsError) {
          console.error('Error fetching price negotiations:', negotiationsError);
        }

        if (negotiations && negotiations.length > 0) {
          const negProductCodes = Array.from(new Set(negotiations.map((n) => n.product_code).filter(Boolean)));
          const negSupplierIds = Array.from(new Set(negotiations.map((n) => n.supplier_id).filter(Boolean)));

          // Bound by selected date range and each negotiation's effective_date
          let linesQuery = supabase
            .from('invoice_lines')
            .select(`
              invoice_number,
              invoice_date,
              product_code,
              description,
              quantity,
              unit_type,
              unit_price,
              unit_price_after_discount,
              supplier_id,
              suppliers(name),
              location_id,
              locations(name)
            `)
            .eq('organization_id', currentOrganization.id);

          if (currentBusinessUnit && currentBusinessUnit.id) {
            linesQuery = linesQuery.eq('business_unit_id', currentBusinessUnit.id);
          }
          if (negProductCodes.length > 0) {
            linesQuery = linesQuery.in('product_code', negProductCodes);
          }
          // Supplier filter by id only if we have ids (names vary)
          if (negSupplierIds.length > 0) {
            linesQuery = linesQuery.in('supplier_id', negSupplierIds);
          }
          // Apply global filters from the UI as well
          if (dateRange?.start && dateRange?.end) {
            linesQuery = linesQuery
              .gte('invoice_date', dateRange.start)
              .lte('invoice_date', dateRange.end);
          }
          if (restaurants.length > 0) {
            linesQuery = linesQuery.in('location_id', restaurants);
          }
          if (suppliers.length > 0) {
            linesQuery = linesQuery.in('supplier_id', suppliers);
          }
          if (categories.length > 0) {
            linesQuery = linesQuery.in('category_id', categories);
          }
          if (documentType === 'Faktura') {
            linesQuery = linesQuery.in('document_type', ['Faktura', 'Invoice']);
          } else if (documentType === 'Kreditnota') {
            linesQuery = linesQuery.in('document_type', ['Kreditnota', 'Credit note']);
          }
          if (productCodeFilter === 'with_codes') {
            linesQuery = linesQuery.not('product_code', 'is', null).neq('product_code', '');
          } else if (productCodeFilter === 'without_codes') {
            linesQuery = linesQuery.or('product_code.is.null,product_code.eq.');
          }

          const { data: negLines, error: negLinesError } = await (linesQuery as unknown as Promise<{ data: InvoiceLineRow[] | null; error: unknown }>);
          if (negLinesError) {
            console.error('Error fetching invoice lines for negotiations:', negLinesError);
          }

          const toDateKey = (d: string | Date | null) => (d ? new Date(d as any).toISOString().slice(0, 10) : null);

          (negotiations || []).forEach((neg) => {
            const agreementPrice = Number(neg.target_price as any) || 0;
            const effKey = toDateKey(neg.effective_date);

            // Filter candidate lines per negotiation
            const candidateLines = (negLines || []).filter((line) => {
              if (!line) return false;
              if (line.product_code !== neg.product_code) return false;
              // Prefer supplier_id match when available; if negotiation supplier_id is null, try name match
              const supplierMatches = neg.supplier_id
                ? line.supplier_id === neg.supplier_id
                : (line.suppliers?.name || '').trim() === (neg.supplier || '').trim();
              if (!supplierMatches) return false;

              // Respect negotiation effective_date: only lines on/after effective date
              if (effKey) {
                const lineKey = toDateKey(line.invoice_date);
                if (!lineKey || lineKey < effKey) return false;
              }
              return true;
            });

            // Build violations from candidate lines whose price exceeds agreement
            const violations: AgreementViolation['violations'] = [];
            let supplierId: string = neg.supplier_id || '';
            let unitType: string = neg.unit_type || '';

            candidateLines.forEach((line) => {
              let price = getPriceValue(line.unit_price_after_discount as any, line.unit_price as any) || 0;
              const qty = Number(line.quantity) || 0;
              
              // Handle credit notes: they should reduce overspend calculations
              const documentType = line.document_type || '';
              if (documentType.toLowerCase().includes('kreditnota') || 
                  documentType.toLowerCase().includes('credit')) {
                // For credit notes, we want to subtract the absolute value
                price = -Math.abs(price);
              }
              // If price is already negative from ETL processing, keep it negative
              else if (price < 0) {
                // Price is already negative from ETL processing - keep it negative
              }
              
              if (price > agreementPrice) {
                // Update missing details from first matching line if needed
                supplierId = supplierId || line.supplier_id || '';
                unitType = unitType || line.unit_type || '';

                violations.push({
                  date: new Date(line.invoice_date),
                  restaurant: line.locations?.name || '-',
                  quantity: qty,
                  actualPrice: price,
                  overspendAmount: (price - agreementPrice) * qty,
                  invoiceNumber: line.invoice_number || '',
                });
              }
            });

            if (violations.length > 0) {
              const key = `${neg.product_code}|${neg.supplier || ''}|agreement`;
              const totalOverspend = violations.reduce((s, v) => s + v.overspendAmount, 0);

              // Build chart data from negotiation-based violations
              const byDateUnit = new Map<string, { variationPrice: number; basePrice: number }>();
              violations.forEach(v => {
                const keyDU = `${(v.date.toISOString()).slice(0,10)}|${unitType || ''}`;
                const existing = byDateUnit.get(keyDU);
                const variationPrice = Math.max(v.actualPrice, agreementPrice);
                const basePrice = agreementPrice;
                if (!existing || variationPrice > existing.variationPrice) {
                  byDateUnit.set(keyDU, { variationPrice, basePrice });
                }
              });
              const chartData = Array.from(byDateUnit.entries()).map(([keyStr, val]) => {
                const [dateStr, unit] = keyStr.split('|');
                const priceDifference = Math.max(0, val.variationPrice - val.basePrice);
                return {
                  date: new Date(dateStr),
                  unitType: unit,
                  basePrice: val.basePrice,
                  variationPrice: priceDifference > 0 ? val.variationPrice : null,
                  priceDifference,
                  hasVariation: priceDifference > 0,
                };
              }).sort((a, b) => a.date.getTime() - b.date.getTime());

              agreementViolationsMap.set(key, {
                productCode: neg.product_code,
                description: neg.description || '',
                supplier: neg.supplier || '',
                supplierId,
                unitType,
                agreementPrice,
                violations,
                totalOverspend,
                chartData,
              });
            }
          });
        }

        // Sort variations by total overpaid amount
        const sortedVariations = processedVariations.sort((a, b) => b.totalOverpaid - a.totalOverpaid);
        setPriceVariations(sortedVariations);
        
        // Sort agreement violations by total overspend
        const sortedViolations = Array.from(agreementViolationsMap.values())
          .sort((a, b) => b.totalOverspend - a.totalOverspend);
        setAgreementViolations(sortedViolations);
        
        // Calculate total potential savings
        const variationSavings = sortedVariations.reduce((sum, v) => sum + v.totalOverpaid, 0);
        const agreementSavings = sortedViolations.reduce((sum, v) => sum + v.totalOverspend, 0);
        
        setTotalSavings({
          variations: variationSavings,
          agreements: agreementSavings,
          total: variationSavings + agreementSavings,
        });

        // Cache the result for next time
        setCachedData({
          priceVariations: sortedVariations,
          agreementViolations: sortedViolations,
          totalSavings: {
            variations: variationSavings,
            agreements: agreementSavings,
            total: variationSavings + agreementSavings,
          },
        });

      } catch (err) {
        console.error('Error fetching price alerts:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }, [currentOrganization, currentBusinessUnit, dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, priceVariationSettings, getCachedData, setCachedData]);

  useEffect(() => {
    fetchPriceAlerts();
  }, [fetchPriceAlerts]);

  const resolveAlert = async (alertId: string, reason: string, note: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_reason: reason,
          resolution_note: note
        })
        .eq('id', alertId);

      if (error) throw error;
      
      // Update local state
      setPriceVariations(prev => 
        prev.filter(variation => variation.id !== alertId)
      );
      
      toast.success('Price alert resolved successfully');
    } catch (err) {
      console.error('Error resolving price alert:', err);
      toast.error('Failed to resolve price alert');
      throw err;
    }
  };

  return {
    priceVariations,
    agreementViolations,
    totalSavings,
    isLoading,
    error,
    resolveAlert
  };
};
