/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';

type ProductTransaction = {
  invoiceNumber: string;
  invoiceDate: Date;
  location: string;
  locationId: string;
  quantity: number;
  unitType: string;
  unitPrice: number;
  total: number;
  documentType: string;
};

type ProductDetailData = {
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  totalQuantity: number;
  totalSpend: number;
  transactions: ProductTransaction[];
  locations: string[];
  locationIds: string[]; // Add location IDs for efficiency analysis
  unitTypes: Array<{
    type: string;
    quantity: number;
    spend: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    priceHistory: Array<{
      date: Date;
      prices: Array<{
        price: number;
        quantity: number;
        location: string;
        invoiceNumber: string;
      }>;
      avgPrice: number;
      minPrice: number;
      maxPrice: number;
    }>;
  }>;
  priceAgreement?: {
    price: number;
    unitType: string;
    startDate?: Date;
    endDate?: Date;
  };
};

export const useProductDetail = (productCode: string, supplierId: string | null) => {
  const { dateRange, restaurants: locationIds, suppliers, documentType } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [data, setData] = useState<ProductDetailData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentOrganization) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchProductDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        let actualSupplierId = supplierId;
        
        
        // Use the supplier ID that was passed in (from the new category system)
        // The productCode might actually be a description if the product has no code
        actualSupplierId = supplierId;
        
        // If we don't have a supplierId, we'll handle it gracefully
        // Some products might not have suppliers assigned
        
        // Check if supplierId looks like a UUID (only if it exists)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = actualSupplierId ? uuidRegex.test(actualSupplierId) : false;
        
        if (actualSupplierId && !isUuid) {
          // If it's not a UUID, treat it as a supplier name and look up the ID
          const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .select('supplier_id')
            .eq('organization_id', currentOrganization.id)
            .eq('name', actualSupplierId)
            .single();
            
          if (supplierError || !supplierData) {
            throw new Error(`Supplier not found: ${actualSupplierId}`);
          }
          
          actualSupplierId = supplierData.supplier_id;
        }

        // Build query for invoice lines
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
            suppliers(name),
            locations(name)
          `)
          .eq('organization_id', currentOrganization.id);
          
        // Only filter by supplier if we have a supplier ID
        if (actualSupplierId) {
          query = query.eq('supplier_id', actualSupplierId);
        }
          
        // Handle product identification - productCode might be a product_code, description, or a grouped key
        if (productCode && productCode.trim() !== '') {
          // Check if this is a grouped key from the Products page (format: "productCode|supplierId" or "description|supplierId")
          if (productCode.includes('|')) {
            const [productIdentifier, keySupplierId] = productCode.split('|');
            
            // Update the supplier ID if it was provided in the key
            if (keySupplierId && keySupplierId !== 'null') {
              actualSupplierId = keySupplierId;
            }
            
            // If product identifier is empty, this is a bug - the URL should contain the description
            // For now, we'll show an error or handle it gracefully
            if (productIdentifier.trim() === '') {
              throw new Error('Invalid product URL: missing product identifier');
            }
            
            // Check if the product identifier looks like a product code or description
            const isLikelyProductCode = (
              productIdentifier.length <= 20 && 
              /^[0-9A-Za-z\s\-_]+$/.test(productIdentifier) &&
              (productIdentifier.length <= 10 || /^[0-9]/.test(productIdentifier))
            );
            
            if (isLikelyProductCode) {
              // Treat as product_code
              query = query.eq('product_code', productIdentifier);
            } else {
              // Treat as description (for products without codes)
              query = query.eq('description', productIdentifier);
            }
          } else {
            // Original logic for non-grouped keys
            const isLikelyProductCode = (
              productCode.length <= 20 && 
              /^[0-9A-Za-z\s\-_]+$/.test(productCode) &&
              (productCode.length <= 10 || /^[0-9]/.test(productCode))
            );
            
            if (isLikelyProductCode) {
              // Treat as product_code
              query = query.eq('product_code', productCode);
            } else {
              // Treat as description (for products without codes)
              query = query.eq('description', productCode);
            }
          }
        } else {
          // If no product code, find records where product_code is null or empty
          query = query.or('product_code.is.null,product_code.eq.');
        }
          
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          query = query.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Apply filters
        if (dateRange?.start && dateRange?.end) {
          query = query
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        if (locationIds.length > 0) {
          query = query.in('location_id', locationIds);
        } else {
          // When no locations are selected, only show mapped locations (not null)
          query = query.not('location_id', 'is', null);
        }

        if (documentType === 'Faktura') {
          query = query.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          query = query.in('document_type', ['Kreditnota', 'Credit note']);
        }

        const { data: rows, error } = await query.order('invoice_date', { ascending: false });

        if (error) {
          throw error;
        }
        if (!rows || rows.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }

        // Get price agreement if exists
        let agreementQuery = supabase
          .from('price_negotiations')
          .select('*');
        
        // Apply organization filter
        agreementQuery = agreementQuery.eq('organization_id', currentOrganization.id);
        
        // Only filter by supplier if we have supplier data (matches negotiation.supplier)
        const supplierNameForAgreement = (rows[0] as any).suppliers?.name;
        if (supplierNameForAgreement) {
          agreementQuery = agreementQuery.eq('supplier', supplierNameForAgreement);
        }
        
        // Ensure product_code match uses the identifier part if URL contained a grouped key
        const productIdentifierForAgreement = productCode?.includes('|')
          ? productCode.split('|')[0]
          : productCode;
        if (productIdentifierForAgreement && productIdentifierForAgreement.trim() !== '') {
          agreementQuery = agreementQuery.eq('product_code', productIdentifierForAgreement);
        } else {
          agreementQuery = agreementQuery.or('product_code.is.null,product_code.eq.');
        }
        
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          agreementQuery = agreementQuery.eq('business_unit_id', currentBusinessUnit.id);
        }
        
        const { data: agreement } = await agreementQuery.maybeSingle();


        // Process the data
        const supplierName = rows.length > 0 ? ((rows[0] as any).suppliers?.name || 'No Supplier') : 'No Supplier';
        const description = rows.length > 0 ? (rows[0].description || '') : '';
        
        let totalQuantity = 0;
        let totalSpend = 0;
        const uniqueLocations = new Set<string>();
        const uniqueLocationIds = new Set<string>();
        const unitTypesMap = new Map();
        
        const transactions: ProductTransaction[] = rows.map(row => {
          const effectivePrice = row.unit_price_after_discount ?? row.unit_price ?? 0;
          const effectiveTotal = row.total_price_after_discount ?? row.total_price ?? 0;
          const locationName = (row as any).locations?.name || '-';
          
          totalQuantity += row.quantity || 0;
          totalSpend += effectiveTotal || 0;
          uniqueLocations.add(locationName);
          uniqueLocationIds.add(row.location_id);

          // Track by unit type
          const unitType = row.unit_type || '-';
          if (!unitTypesMap.has(unitType)) {
            unitTypesMap.set(unitType, {
              type: unitType,
              quantity: 0,
              spend: 0,
              originalSpend: 0,
              prices: [],
              pricesByDate: new Map()
            });
          }

          const unitData = unitTypesMap.get(unitType);
          unitData.quantity += row.quantity || 0;
          unitData.spend += effectiveTotal || 0;
          unitData.originalSpend += row.total_price || 0;
          unitData.prices.push(effectivePrice);

          // Group by date for price history
          const dateKey = row.invoice_date;
          if (!unitData.pricesByDate.has(dateKey)) {
            unitData.pricesByDate.set(dateKey, []);
          }
          unitData.pricesByDate.get(dateKey).push({
            price: effectivePrice,
            quantity: row.quantity || 0,
            location: locationName,
            invoiceNumber: row.invoice_number
          });

          return {
            invoiceNumber: row.invoice_number,
            invoiceDate: new Date(row.invoice_date),
            location: locationName,
            locationId: row.location_id,
            quantity: row.quantity || 0,
            unitType: row.unit_type || '-',
            unitPrice: effectivePrice,
            total: effectiveTotal,
            documentType: row.document_type || '-'
          };
        });

        // Process unit types
        const unitTypes = Array.from(unitTypesMap.values()).map(unitData => {
          const avgPrice = unitData.quantity > 0 ? unitData.spend / unitData.quantity : 0;
          const minPrice = unitData.prices.length > 0 ? Math.min(...unitData.prices) : 0;
          const maxPrice = unitData.prices.length > 0 ? Math.max(...unitData.prices) : 0;

          // Create price history
          const priceHistory = (Array.from(unitData.pricesByDate.entries()) as any[])
            .map(([date, prices]: [any, any]) => {
              const dayPrices = prices.map((p: any) => p.price);
              const totalQuantity = prices.reduce((sum: any, p: any) => sum + p.quantity, 0);
              const totalValue = prices.reduce((sum: any, p: any) => sum + (p.price * p.quantity), 0);
              return {
                date: new Date(date),
                prices,
                avgPrice: totalQuantity > 0 ? totalValue / totalQuantity : 0,
                minPrice: dayPrices.length > 0 ? Math.min(...dayPrices) : 0,
                maxPrice: dayPrices.length > 0 ? Math.max(...dayPrices) : 0
              };
            })
            .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

          return {
            type: unitData.type,
            quantity: unitData.quantity,
            spend: unitData.spend,
            avgPrice,
            minPrice,
            maxPrice,
            priceHistory
          };
        });

        const productDetail: ProductDetailData = {
          productCode: productCode || 'No Product Code',
          description,
          supplier: supplierName,
          supplierId: actualSupplierId || '',
          totalQuantity,
          totalSpend,
          transactions,
          locations: Array.from(uniqueLocations),
          locationIds: Array.from(uniqueLocationIds),
          unitTypes,
          priceAgreement: agreement ? {
            // Use target_price from negotiations as the negotiated price
            price: Number((agreement as any).target_price) || 0,
            unitType: (agreement as any).unit_type || (rows[0] as any).unit_type || '-',
            // Negotiations have effective_date; surface it as startDate
            startDate: (agreement as any).effective_date ? new Date((agreement as any).effective_date) : undefined,
            endDate: undefined
          } : undefined
        };

        setData(productDetail);
      } catch (err) {
        console.error('Error fetching product detail:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productCode, supplierId, dateRange, locationIds, suppliers, documentType, currentOrganization, currentBusinessUnit]);

  return { data, isLoading, error };
};
