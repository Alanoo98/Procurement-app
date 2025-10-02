import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPriceValue } from '@/utils/getPriceValue';
import { useProductMappingStore } from '@/store/productMappingStore';

type ProductConsolidationOpportunity = {
  id: string;
  productCode: string;
  description: string;
  unitType: string;
  currentSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    totalSpend: number;
    avgUnitPrice: number;
    totalQuantity: number;
    locationCount: number;
    locations: string[];
  }>;
  bestSupplier: {
    supplierId: string;
    supplierName: string;
    avgUnitPrice: number;
  };
  potentialSavings: number;
  totalCurrentSpend: number;
  savingsPercentage: number;
  locationCount: number;
  totalQuantity: number;
  isMapped: boolean;
  mappedProductCode?: string;
};

type InvoiceLine = {
  product_code: string;
  description: string;
  supplier_id: string;
  quantity: number;
  unit_type: string;
  unit_price: number;
  unit_price_after_discount: number;
  total_price: number;
  total_price_after_discount: number;
  invoice_date: string;
  location_id: string;
};

export const useSupplierConsolidation = () => {
  const { dateRange, restaurants: locationIds, suppliers, documentType, productCodeFilter } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const { getMappedProduct } = useProductMappingStore();
  const [data, setData] = useState<ProductConsolidationOpportunity[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentOrganization) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchConsolidationOpportunities = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch suppliers and locations as before
        let supplierIdsQuery = supabase
          .from('invoice_lines')
          .select('supplier_id')
          .eq('organization_id', currentOrganization.id);
        if (currentBusinessUnit) supplierIdsQuery = supplierIdsQuery.eq('business_unit_id', currentBusinessUnit.id);
        if (dateRange?.start && dateRange?.end) supplierIdsQuery = supplierIdsQuery.gte('invoice_date', dateRange.start).lte('invoice_date', dateRange.end);
        if (locationIds.length > 0) supplierIdsQuery = supplierIdsQuery.in('location_id', locationIds);
        if (suppliers.length > 0) supplierIdsQuery = supplierIdsQuery.in('supplier_id', suppliers);
        if (documentType === 'Faktura') supplierIdsQuery = supplierIdsQuery.in('document_type', ['Faktura', 'Invoice']);
        else if (documentType === 'Kreditnota') supplierIdsQuery = supplierIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
        
        // Apply product code filter
        if (productCodeFilter === 'with_codes') {
          supplierIdsQuery = supplierIdsQuery.not('product_code', 'is', null).neq('product_code', '');
        } else if (productCodeFilter === 'without_codes') {
          supplierIdsQuery = supplierIdsQuery.or('product_code.is.null,product_code.eq.');
        }
        
        const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;
        if (supplierIdsError) throw supplierIdsError;
        const uniqueSupplierIds = [...new Set((supplierIdsData || []).map((row: { supplier_id: string }) => row.supplier_id))].filter(id => id !== null);
        
        // Fetch supplier details (only if we have valid supplier IDs)
        let suppliersData: Array<{ supplier_id: string; name: string }> = [];
        let suppliersError = null;
        
        if (uniqueSupplierIds.length > 0) {
          const { data, error } = await supabase
            .from('suppliers')
            .select('supplier_id, name')
            .eq('organization_id', currentOrganization.id)
            .in('supplier_id', uniqueSupplierIds);
          
          suppliersData = data || [];
          suppliersError = error;
        }
        if (suppliersError) throw suppliersError;
        const suppliersMap = new Map((suppliersData || []).map(supplier => [supplier.supplier_id, supplier.name]));
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('location_id, name')
          .eq('organization_id', currentOrganization.id);
        if (locationsError) throw locationsError;
        const locationsMap = new Map((locationsData || []).map((location: { location_id: string; name: string }) => [location.location_id, location.name]));

        // Fetch invoice lines
        let query = supabase
          .from('invoice_lines')
          .select(`
            product_code,
            description,
            supplier_id,
            quantity,
            unit_type,
            unit_price,
            unit_price_after_discount,
            total_price,
            total_price_after_discount,
            invoice_date,
            location_id
          `)
          .eq('organization_id', currentOrganization.id);
        if (currentBusinessUnit) query = query.eq('business_unit_id', currentBusinessUnit.id);
        if (dateRange?.start && dateRange?.end) query = query.gte('invoice_date', dateRange.start).lte('invoice_date', dateRange.end);
        if (locationIds.length > 0) query = query.in('location_id', locationIds);
        if (suppliers.length > 0) query = query.in('supplier_id', suppliers);
        if (documentType === 'Faktura') query = query.in('document_type', ['Faktura', 'Invoice']);
        else if (documentType === 'Kreditnota') query = query.in('document_type', ['Kreditnota', 'Credit note']);
        const { data: rows, error } = await query;
        if (error) throw error;

        // Group by product (product_code + unit_type)
        const productMap = new Map<string, {
          productCode: string;
          description: string;
          unitType: string;
          suppliers: Map<string, {
            supplierId: string;
            supplierName: string;
            totalSpend: number;
            totalQuantity: number;
            totalPrice: number;
            locations: Set<string>;
            pricePoints: number[];
          }>;
        }>();

        (rows || []).forEach((row: InvoiceLine) => {
          const productKey = `${row.product_code}|${row.unit_type}`;
          const supplierId = row.supplier_id;
          const supplierName = suppliersMap.get(supplierId) || '-';
          const effectivePrice = getPriceValue(row.unit_price_after_discount, row.unit_price);
          const effectiveTotal = getPriceValue(row.total_price_after_discount, row.total_price);
          const locationName = locationsMap.get(row.location_id) || '-';

          if (!productMap.has(productKey)) {
            productMap.set(productKey, {
              productCode: row.product_code,
              description: row.description,
              unitType: row.unit_type,
              suppliers: new Map(),
            });
          }
          const product = productMap.get(productKey)!;
          if (!product.suppliers.has(supplierId)) {
            product.suppliers.set(supplierId, {
              supplierId,
              supplierName,
              totalSpend: 0,
              totalQuantity: 0,
              totalPrice: 0,
              locations: new Set(),
              pricePoints: [],
            });
          }
          const supplierData = product.suppliers.get(supplierId)!;
          supplierData.totalSpend += effectiveTotal || 0;
          supplierData.totalQuantity += row.quantity || 0;
          supplierData.totalPrice += (effectivePrice || 0) * (row.quantity || 0);
          supplierData.locations.add(locationName as string);
          if (effectivePrice) supplierData.pricePoints.push(effectivePrice);
        });

        // Find consolidation opportunities (products with multiple suppliers and price difference)
        const opportunities: ProductConsolidationOpportunity[] = [];
        productMap.forEach((product, productKey) => {
          if (product.suppliers.size > 1) {
            const suppliers = Array.from(product.suppliers.values());
            // Find the supplier with the lowest average unit price
            const bestSupplier = suppliers.reduce((best, current) => {
              const bestAvgPrice = best.totalQuantity > 0 ? best.totalPrice / best.totalQuantity : Infinity;
              const currentAvgPrice = current.totalQuantity > 0 ? current.totalPrice / current.totalQuantity : Infinity;
              return currentAvgPrice < bestAvgPrice ? current : best;
            });
            const bestAvgPrice = bestSupplier.totalQuantity > 0 ? bestSupplier.totalPrice / bestSupplier.totalQuantity : 0;
            const allAvgPrices = suppliers.map(s => s.totalQuantity > 0 ? s.totalPrice / s.totalQuantity : 0);
            const uniquePrices = Array.from(new Set(allAvgPrices.map(p => p.toFixed(2))));
            if (uniquePrices.length <= 1) {
              // All suppliers have the same price, skip this product
              return;
            }
            const totalCurrentSpend = suppliers.reduce((sum, s) => sum + s.totalSpend, 0);
            const totalQuantity = suppliers.reduce((sum, s) => sum + s.totalQuantity, 0);
            const allLocations = new Set<string>();
            suppliers.forEach(s => s.locations.forEach(loc => allLocations.add(loc)));
            // Calculate potential savings
            const potentialSavings = suppliers.reduce((savings, supplier) => {
              const supplierAvgPrice = supplier.totalQuantity > 0 ? supplier.totalPrice / supplier.totalQuantity : 0;
              const priceDifference = supplierAvgPrice - bestAvgPrice;
              return savings + (priceDifference * supplier.totalQuantity);
            }, 0);
            const savingsPercentage = totalCurrentSpend > 0 ? (potentialSavings / totalCurrentSpend) * 100 : 0;
            // Check if this product is mapped
            const mappedProductCode = getMappedProduct(product.productCode);
            const isMapped = !!mappedProductCode;
            opportunities.push({
              id: productKey,
              productCode: product.productCode,
              description: product.description,
              unitType: product.unitType,
              currentSuppliers: suppliers.map(s => ({
                supplierId: s.supplierId,
                supplierName: s.supplierName,
                totalSpend: s.totalSpend,
                avgUnitPrice: s.totalQuantity > 0 ? s.totalPrice / s.totalQuantity : 0,
                totalQuantity: s.totalQuantity,
                locationCount: s.locations.size,
                locations: Array.from(s.locations),
              })),
              bestSupplier: {
                supplierId: bestSupplier.supplierId,
                supplierName: bestSupplier.supplierName,
                avgUnitPrice: bestAvgPrice,
              },
              potentialSavings,
              totalCurrentSpend,
              savingsPercentage,
              locationCount: allLocations.size,
              totalQuantity,
              isMapped,
              mappedProductCode: mappedProductCode || undefined,
            });
          }
        });
        opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
        setData(opportunities);
      } catch (err) {
        setError(err as Error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchConsolidationOpportunities();
  }, [currentOrganization, currentBusinessUnit, dateRange, locationIds, suppliers, documentType, productCodeFilter, getMappedProduct]);
  return { data, isLoading, error };
}; 
