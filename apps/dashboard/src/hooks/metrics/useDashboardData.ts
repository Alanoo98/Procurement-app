import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPriceValue } from '@/utils/getPriceValue';

type DashboardMetrics = {
  totalSpend: number;
  totalSavings: number;
  uniqueSuppliers: number;
  totalInvoices: number;
  priceAlerts: number;
  consolidationOpportunities: number;
  productTargets: number;
  supplierSpend: Array<{
    name: string;
    value: number;
  }>;
  monthlySpend: Array<{
    month: string;
    amount: number;
  }>;
  priceVariations: Array<{
    id: string;
    productCode: string;
    description: string;
    supplier: string;
    unitType: string;
    variations: Array<{
      date: Date;
      restaurants: Array<{
        name: string;
        price: number;
        invoiceNumber: string;
      }>;
      priceDifference: number;
    }>;
  }>;
};

type InvoiceLine = {
  invoice_number: string;
  invoice_date: string | null;
  document_type: string;
  product_code: string;
  description: string;
  quantity: number;
  unit_type: string;
  unit_price: number;
  unit_price_after_discount: number;
  total_price: number;
  total_price_after_discount: number;
  supplier_id: string;
  location_id: string;
  locations: { name: string }[] | null;
};

export const useDashboardData = () => {
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

  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);
      setError(null);

      try {
        // First, get all unique supplier IDs from invoice lines
        let supplierIdsQuery = supabase
          .from('invoice_lines')
          .select('supplier_id')
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected (only if currentBusinessUnit is not null)
        if (currentBusinessUnit && currentBusinessUnit.id) {
          supplierIdsQuery = supplierIdsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        if (dateRange?.start && dateRange?.end) {
          supplierIdsQuery = supplierIdsQuery
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        if (restaurants.length > 0) {
          supplierIdsQuery = supplierIdsQuery.in('location_id', restaurants);
        } else {
          // When no locations are selected, only show mapped locations (not null) - same as main query
          supplierIdsQuery = supplierIdsQuery.not('location_id', 'is', null);
        }

        if (suppliers.length > 0) {
          supplierIdsQuery = supplierIdsQuery.in('supplier_id', suppliers);
        }

        if (categories.length > 0) {
          supplierIdsQuery = supplierIdsQuery.in('category_id', categories);
        }

        if (documentType === 'Faktura') {
          supplierIdsQuery = supplierIdsQuery.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          supplierIdsQuery = supplierIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
        }

        const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;

        if (supplierIdsError) throw supplierIdsError;

        // Get unique supplier IDs, filtering out null values
        const uniqueSupplierIds = [...new Set((supplierIdsData || []).map(row => row.supplier_id))].filter(id => id !== null);

        // Fetch supplier details (only if we have valid supplier IDs)
        let suppliersData: Array<{ supplier_id: string; name: string }> = [];
        let suppliersError = null;
        
        if (uniqueSupplierIds.length > 0) {
          // Fetch supplier details (excluding redundant suppliers from analysis)
          // Note: We only fetch mapped suppliers (not null supplier_id) and exclude redundant ones
          const { data, error } = await supabase
            .from('suppliers')
            .select('supplier_id, name')
            .eq('organization_id', currentOrganization.id)
            .in('supplier_id', uniqueSupplierIds)
            .eq('active', true); // Only include active suppliers in analysis
          
          suppliersData = data || [];
          suppliersError = error;
        }

        if (suppliersError) throw suppliersError;

        // Create a map of supplier names
        const suppliersMap = new Map(
          (suppliersData || []).map(supplier => [supplier.supplier_id, supplier.name])
        );

        // Build base query for invoice lines
        let query = supabase 
          .from('invoice_lines')
          .select(`
            invoice_number,
            invoice_date,
            document_type,
            product_code,
            description,
            quantity,
            unit_type,
            unit_price,
            unit_price_after_discount,
            total_price,
            total_price_after_discount,
            supplier_id,
            location_id,
            locations!left(name)
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
          // When no locations are selected, only show mapped locations (not null)
          query = query.not('location_id', 'is', null);
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

        // Fetch all data using pagination (Supabase has a hard limit of 1000 rows per query)
        let allRows: InvoiceLine[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
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

        const invoiceLines = allRows;

        // Process the data
        let filteredLines = (invoiceLines || []) as InvoiceLine[];

        // Apply product search filter if specified
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

          filteredLines = filteredLines.filter(line => {
            const description = (line.description || '').toLowerCase();
            const code = (line.product_code || '').toLowerCase();
            const supplier = suppliersMap.get(line.supplier_id) || '-';
            const supplierLower = supplier.toLowerCase();
            
            // Check excluded terms first
            const hasExclusion = excludedTerms.some(term =>
              description.includes(term) || code.includes(term) || supplierLower.includes(term)
            );
            
            if (hasExclusion) return false;

            // Check included terms
            if (includedTerms.length > 0) {
              const matches = includedTerms.map(term => 
                description.includes(term) || code.includes(term) || supplierLower.includes(term)
              );

              return productSearch.mode === 'AND'
                ? matches.every(Boolean)
                : matches.some(Boolean);
            }

            return true;
          });
        }

        // Calculate metrics
        const totalSpend = filteredLines.reduce((sum, line) => 
          sum + getPriceValue(line.total_price_after_discount, line.total_price), 0
        );

        // Calculate total savings from discounts
        const totalSavings = filteredLines.reduce((sum, line) => {
          const unitPrice = Number(Number(line.unit_price || 0).toFixed(2));
          const unitPriceAfterDiscount = Number(Number(line.unit_price_after_discount || 0).toFixed(2));
          const quantity = Number(line.quantity) || 0;
          const totalPrice = Number(Number(line.total_price || 0).toFixed(2));
          const totalPriceAfterDiscount = Number(Number(line.total_price_after_discount || 0).toFixed(2));
          
          // Calculate original and discounted totals
          const originalTotalFromUnit = Number((unitPrice * quantity).toFixed(2));
          const discountedTotalFromUnit = Number((unitPriceAfterDiscount * quantity).toFixed(2));
          
          // Use total_price if available, otherwise use calculated values
          const effectiveOriginalTotal = totalPrice > 0 ? Number(Number(totalPrice).toFixed(2)) : originalTotalFromUnit;
          const effectiveDiscountedTotal = totalPriceAfterDiscount > 0 ? Number(Number(totalPriceAfterDiscount).toFixed(2)) : discountedTotalFromUnit;
          
          return sum + Math.max(0, Number((effectiveOriginalTotal - effectiveDiscountedTotal).toFixed(2)));
        }, 0);

        const uniqueSuppliers = new Set(filteredLines.map(line => line.supplier_id)).size;
        const totalInvoices = new Set(filteredLines.map(line => line.invoice_number)).size;

        // Calculate supplier spend
        const supplierSpendMap = new Map<string, number>();
        filteredLines.forEach(line => {
          const supplierName = suppliersMap.get(line.supplier_id) || '-';
          const spend = getPriceValue(line.total_price_after_discount, line.total_price);
          supplierSpendMap.set(supplierName, (supplierSpendMap.get(supplierName) || 0) + spend);
        });

        const supplierSpend = Array.from(supplierSpendMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        // Calculate monthly spend
        const monthlySpendMap = new Map<string, number>();
        filteredLines.forEach(line => {
          // Skip lines without invoice date
          if (!line.invoice_date) return;
          
          const month = line.invoice_date.slice(0, 7); // YYYY-MM format
          const spend = getPriceValue(line.total_price_after_discount, line.total_price);
          monthlySpendMap.set(month, (monthlySpendMap.get(month) || 0) + spend);
        });

        const monthlySpend = Array.from(monthlySpendMap.entries())
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Calculate price variations (same-day price differences)
        const priceVariationsMap = new Map<string, {
          id: string;
          productCode: string;
          description: string;
          supplier: string;
          supplierId: string;
          unitType: string;
          dateVariations: Map<string, Array<{
            price: number;
            name: string;
            invoiceNumber: string;
          }>>;
        }>();
        
        // Group by product, date, and unit type
        filteredLines.forEach(line => {
          // Skip lines without invoice date
          if (!line.invoice_date) {
            return;
          }
          
          // Use consistent product grouping logic: productCode|supplierId or description|supplierId
          const productCode = line.product_code || '';
          const supplierId = line.supplier_id || 'null';
          const productIdentifier = productCode ? productCode : line.description || 'unknown';
          const productKey = `${productIdentifier}|${supplierId}|${line.unit_type}`;
          const dateKey = line.invoice_date;
          const effectivePrice = getPriceValue(line.unit_price_after_discount, line.unit_price);
          
          if (!priceVariationsMap.has(productKey)) {
            priceVariationsMap.set(productKey, {
              id: productKey,
              productCode: productCode,
              description: line.description || '',
              supplier: suppliersMap.get(line.supplier_id) || '-',
              supplierId: line.supplier_id,
              unitType: line.unit_type || '',
              dateVariations: new Map(),
            });
          }
          
          const product = priceVariationsMap.get(productKey)!;
          
          if (!product.dateVariations.has(dateKey)) {
            product.dateVariations.set(dateKey, []);
          }
          
          product.dateVariations.get(dateKey)!.push({
            price: effectivePrice,
            name: line.locations?.[0]?.name || '-',
            invoiceNumber: line.invoice_number,
          });
        });
        
        // Process variations
        const priceVariations: Array<{
          id: string;
          productCode: string;
          description: string;
          supplier: string;
          unitType: string;
          variations: Array<{
            date: Date;
            restaurants: Array<{
              name: string;
              price: number;
              invoiceNumber: string;
            }>;
            priceDifference: number;
          }>;
        }> = [];
        const minPriceDifference = 5; // Minimum price difference to consider a variation
        
        priceVariationsMap.forEach(product => {
          const variations: Array<{
            date: Date;
            restaurants: Array<{
              name: string;
              price: number;
              invoiceNumber: string;
            }>;
            priceDifference: number;
          }> = [];
          
          product.dateVariations.forEach((pricePoints, dateKey: string) => {
            if (pricePoints.length > 1) {
              const prices = pricePoints.map((p) => p.price);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              const priceDifference = maxPrice - minPrice;
              
              if (priceDifference >= minPriceDifference) {
                variations.push({
                  date: new Date(dateKey),
                  restaurants: pricePoints,
                  priceDifference,
                });
              }
            }
          });
          
          if (variations.length > 0) {
            priceVariations.push({
              id: product.id,
              productCode: product.productCode,
              description: product.description,
              supplier: product.supplier,
              unitType: product.unitType,
              variations: variations.sort((a, b) => b.date.getTime() - a.date.getTime()),
            });
          }
        });

        // Count price alerts from the price_alerts table
        let alertsQuery = supabase
          .from('price_alerts')
          .select('id', { count: 'exact', head: true });
          
        // Apply organization filter
        alertsQuery = alertsQuery
          .eq('organization_id', currentOrganization.id)
          .is('resolved_at', null);
          
        // Apply business unit filter if selected (only if currentBusinessUnit is not null)
        if (currentBusinessUnit && currentBusinessUnit.id) {
          alertsQuery = alertsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }
        
        const { count: priceAlertsCount, error: alertsError } = await alertsQuery;

        if (alertsError) throw alertsError;

        // Count product targets
        let targetsQuery = supabase
          .from('product_targets')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected (only if currentBusinessUnit is not null)
        if (currentBusinessUnit && currentBusinessUnit.id) {
          targetsQuery = targetsQuery.eq('location_id', currentBusinessUnit.id);
        }
        
        const { count: productTargetsCount, error: targetsError } = await targetsQuery;

        if (targetsError) throw targetsError;

        // Calculate consolidation opportunities
        const productSupplierMap = new Map<string, Set<string>>();
        filteredLines.forEach(line => {
          // Skip products without product codes for consolidation analysis
          if (!line.product_code || line.product_code.trim() === '') {
            return;
          }
          
          const productCode = line.product_code;
          if (!productSupplierMap.has(productCode)) {
            productSupplierMap.set(productCode, new Set());
          }
          productSupplierMap.get(productCode)!.add(line.supplier_id);
        });

        const consolidationOpportunities = Array.from(productSupplierMap.values())
          .filter(suppliers => suppliers.size > 1).length;

        setData({
          totalSpend,
          totalSavings,
          uniqueSuppliers,
          totalInvoices,
          priceAlerts: priceAlertsCount || priceVariations.length, // Fallback to calculated variations
          consolidationOpportunities,
          productTargets: productTargetsCount || 0,
          supplierSpend,
          monthlySpend,
          priceVariations: priceVariations.sort((a, b) => b.variations.length - a.variations.length).slice(0, 5),
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit]);

  return { data, isLoading, error };
};
