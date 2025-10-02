import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { getPriceValue } from '@/utils/getPriceValue';

type ProductMetric = {
  id: string;
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  active: boolean;
  totalQuantity: number;
  totalSpend: number;
  unitTypes: Array<{
    type: string;
    quantity: number;
    spend: number;
    latestPrice: number;
  }>;
  locations: string[];
  locationCount: number;
  hasAgreement: boolean;
  categoryName?: string;
  categoryId?: string;
};

type InvoiceLine = {
  product_code: string;
  description: string;
  supplier_id: string;
  variant_supplier_name?: string;
  quantity: number;
  unit_type: string;
  unit_price: number;
  unit_price_after_discount: number;
  total_price: number;
  total_price_after_discount: number;
  invoice_date: string;
  location_id: string;
  suppliers: { name: string }[] | null;
  locations: { name: string }[] | null;
  category_id?: string;
};

type UnitTypeData = {
  type: string;
  quantity: number;
  spend: number;
  latestPrice: number;
  latestDate: string;
};

export const useProductMetrics = () => {
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

  const [data, setData] = useState<ProductMetric[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProductMetrics = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);
      
      // If we have product search terms, show a toast to indicate filtering is in progress
      if (productSearch?.terms?.length > 0) {
        toast.info(`Filtering products by ${productSearch.terms.length} search terms...`);
      }
      
      setError(null);

      try {
        // First, get all unique supplier IDs from invoice lines
        let supplierIdsQuery = supabase
          .from('invoice_lines')
          .select('supplier_id')
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          supplierIdsQuery = supplierIdsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        if (dateRange?.start && dateRange?.end) {
          supplierIdsQuery = supplierIdsQuery
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        if (restaurants.length > 0) {
          supplierIdsQuery = supplierIdsQuery.in('location_id', restaurants);
        }

        if (suppliers.length > 0) {
          supplierIdsQuery = supplierIdsQuery.in('supplier_id', suppliers);
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

        // Fetch category mappings (the manual mappings users create)
        const { data: categoryMappingsData, error: categoryMappingsError } = await supabase
          .from('product_category_mappings')
          .select(`
            variant_product_name,
            variant_product_code,
            variant_supplier_name,
            category_id,
            product_categories(category_name)
          `)
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true);

        if (categoryMappingsError) {
          console.error('Error fetching category mappings:', categoryMappingsError);
        }

        // Fetch categories for invoice lines that have category_id
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('product_categories')
          .select('category_id, category_name')
          .eq('organization_id', currentOrganization.id);

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
        }

        // Create a map of category IDs to names
        const categoriesMap = new Map(
          (categoriesData || []).map(category => [category.category_id, category.category_name])
        );
        

        // Create a map of product -> category name from manual mappings
        const productCategoryMap = new Map<string, string>();
        type CategoryMappingRow = {
          variant_product_name: string;
          variant_product_code: string | null;
          product_categories?: { category_name?: string } | null;
        };
        const mappingRows = ((categoryMappingsData || []) as unknown as CategoryMappingRow[]);
        mappingRows.forEach((mapping: CategoryMappingRow) => {
          const productKey = `${mapping.variant_product_name}|${mapping.variant_product_code || ''}`;
          const categoryName = mapping.product_categories?.category_name;
          if (categoryName) {
            productCategoryMap.set(productKey, categoryName);
          }
        });

        // Generate product metrics from invoice lines data (category-based system)
        const productsMap = new Map();
        
        // Get all unique products from invoice lines with filters applied
        let invoiceLinesQuery = supabase
          .from('invoice_lines')
          .select(`
            product_code,
            description,
            supplier_id,
            variant_supplier_name,
            quantity,
            unit_type,
            unit_price,
            unit_price_after_discount,
            total_price,
            total_price_after_discount,
            invoice_date,
            location_id,
            category_id,
            suppliers(name),
            locations(name)
          `)
          .eq('organization_id', currentOrganization.id)
          .not('description', 'is', null)
          .not('description', 'eq', '');

        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          invoiceLinesQuery = invoiceLinesQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Apply date range filter
        if (dateRange?.start && dateRange?.end) {
          invoiceLinesQuery = invoiceLinesQuery
            .gte('invoice_date', dateRange.start)
            .lte('invoice_date', dateRange.end);
        }

        // Apply restaurant filter
        if (restaurants.length > 0) {
          invoiceLinesQuery = invoiceLinesQuery.in('location_id', restaurants);
        }

        // Apply supplier filter
        if (suppliers.length > 0) {
          invoiceLinesQuery = invoiceLinesQuery.in('supplier_id', suppliers);
        }

        // Apply category filter
        if (categories.length > 0) {
          invoiceLinesQuery = invoiceLinesQuery.in('category_id', categories);
        }

        // Apply document type filter
        if (documentType === 'Faktura') {
          invoiceLinesQuery = invoiceLinesQuery.in('document_type', ['Faktura', 'Invoice']);
        } else if (documentType === 'Kreditnota') {
          invoiceLinesQuery = invoiceLinesQuery.in('document_type', ['Kreditnota', 'Credit note']);
        }

        // Apply product code filter
        if (productCodeFilter === 'with_codes') {
          invoiceLinesQuery = invoiceLinesQuery.not('product_code', 'is', null).neq('product_code', '');
        } else if (productCodeFilter === 'without_codes') {
          invoiceLinesQuery = invoiceLinesQuery.or('product_code.is.null,product_code.eq.');
        }

        // Fetch all data using pagination (Supabase hard limit is 1000 rows)
        let allInvoiceLines: InvoiceLine[] = [];
        {
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;
          while (hasMore) {
            const offset = page * pageSize;
            const { data: pageRows, error: pageError } = await invoiceLinesQuery.range(offset, offset + pageSize - 1);
            if (pageError) {
              console.error('Error fetching invoice lines for product metrics:', pageError);
              break;
            }
            if (!pageRows || pageRows.length === 0) {
              hasMore = false;
            } else {
              allInvoiceLines = allInvoiceLines.concat(pageRows);
              if (pageRows.length < pageSize) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }
        }

        if (allInvoiceLines.length > 0) {
          // Group by product_code + supplier_id combination
          // For products without codes, use description + supplier_id
          allInvoiceLines.forEach((line: InvoiceLine) => {
            const productCode = line.product_code || '';
            const key = productCode ? `${productCode}|${line.supplier_id}` : `${line.description}|${line.supplier_id}`;
            
            if (!productsMap.has(key)) {
              productsMap.set(key, {
                product_id: key, // Use the combination as ID
                product_code: productCode,
                description: line.description,
                supplier_id: line.supplier_id,
                active: true, // Assume active for now
                invoiceLines: []
              });
            }
            productsMap.get(key).invoiceLines.push(line);
          });
        }

        // Use the filtered invoice lines data directly
        const rows = allInvoiceLines || [];

        // Get price agreements for comparison
        let agreementsQuery = supabase
          .from('price_negotiations')
          .select('product_code, supplier, supplier_id')
          .eq('organization_id', currentOrganization.id)
          .in('status', ['active', 'resolved', 'open', 'in_progress']); // Include all negotiation statuses

        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          agreementsQuery = agreementsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        const { data: agreements } = await agreementsQuery;

        // Create multiple lookup sets for better matching
        const agreementSet = new Set(
          agreements?.map(a => `${a.product_code}|${a.supplier}`) || []
        );
        
        // Also create a set for supplier_id matching (in case supplier names don't match exactly)
        const agreementBySupplierIdSet = new Set(
          agreements?.map(a => `${a.product_code}|${a.supplier_id}`) || []
        );
        
        // Debug logging
        console.log('Price negotiations found:', agreements?.length || 0);
        if (agreements && agreements.length > 0) {
          console.log('Sample negotiations:', agreements.slice(0, 3));
          console.log('Agreement set keys:', Array.from(agreementSet));
          console.log('Agreement by supplier ID set keys:', Array.from(agreementBySupplierIdSet));
        }

        // Process and aggregate the data
        const productMap = new Map<string, {
          id: string;
          productCode: string;
          description: string;
          supplier: string;
          supplierId: string;
          active: boolean;
          totalQuantity: number;
          totalSpend: number;
          unitTypes: Map<string, UnitTypeData>;
          locations: Set<string>;
          hasAgreement: boolean;
          categoryName?: string;
          categoryId?: string;
        }>();

        (rows || []).forEach((row: InvoiceLine) => {
          // Use the same key format as in the productsMap creation
          const productCode = row.product_code || '';
          const supplierId = row.supplier_id || 'null';
          const key = productCode ? `${productCode}|${supplierId}` : `${row.description}|${supplierId}`;
          
          // Use variant_supplier_name if available, otherwise use joined suppliers table, then fall back to suppliersMap
          const supplierName = row.variant_supplier_name || 
            row.suppliers?.[0]?.name || 
            (row.supplier_id ? (suppliersMap.get(row.supplier_id) || 'Unknown Supplier') : 'No Supplier');
          const locationName = row.locations?.[0]?.name || '-';
          const effectivePrice = getPriceValue(row.unit_price_after_discount, row.unit_price);
          const effectiveTotal = getPriceValue(row.total_price_after_discount, row.total_price);

          // Get product info (may be undefined if not created yet)

          if (!productMap.has(key)) {
            // If product doesn't exist in products table, we need to create it first
            // Note: Products not in the products table will be excluded from toggles until migration
            
            // Get category information - check both manual mappings and invoice line category_id
            const productKey = `${row.description}|${productCode}`;
            let categoryName = productCategoryMap.get(productKey);
            
            // If no manual mapping found, check if invoice line has category_id
            if (!categoryName && row.category_id) {
              categoryName = categoriesMap.get(row.category_id);
              
            }
            
            productMap.set(key, {
              id: key, // Use the key directly (either productCode|supplierId or description|supplierId)
              productCode: productCode,
              description: row.description || 'Unnamed Product',
              supplier: supplierName,
              supplierId: row.supplier_id,
              active: true, // Always active now
              totalQuantity: 0,
              totalSpend: 0,
              unitTypes: new Map(),
              locations: new Set(),
              hasAgreement: agreementSet.has(`${productCode}|${supplierName}`) || 
                           agreementBySupplierIdSet.has(`${productCode}|${row.supplier_id}`),
              categoryName: categoryName,
              categoryId: row.category_id
            });
            
            // Debug logging for agreement matching
            const hasAgreementByName = agreementSet.has(`${productCode}|${supplierName}`);
            const hasAgreementById = agreementBySupplierIdSet.has(`${productCode}|${row.supplier_id}`);
            const finalHasAgreement = hasAgreementByName || hasAgreementById;
            
            if (finalHasAgreement) {
              console.log('Found agreement for:', {
                productCode,
                supplierName,
                supplierId: row.supplier_id,
                hasAgreementByName,
                hasAgreementById
              });
            }
            
            // Debug logging
            if (row.description === 'Chefs Fried Garlic') {
              console.log('Chefs Fried Garlic - Key:', key, 'ProductCode:', productCode, 'Description:', row.description);
            }
            
          }

          const product = productMap.get(key)!;
          product.totalQuantity += row.quantity || 0;
          product.totalSpend += effectiveTotal || 0;
          product.locations.add(locationName);

          // Track unit types
          const unitType = row.unit_type || '-';
          if (!product.unitTypes.has(unitType)) {
            product.unitTypes.set(unitType, {
              type: unitType,
              quantity: 0,
              spend: 0,
              latestPrice: 0,
              latestDate: ''
            });
          }

          const unitTypeData = product.unitTypes.get(unitType)!;
          unitTypeData.quantity += row.quantity || 0;
          unitTypeData.spend += effectiveTotal || 0;

          // Track latest price and date
          const currentDate = row.invoice_date;
          if (!unitTypeData.latestDate || currentDate > unitTypeData.latestDate) {
            unitTypeData.latestPrice = effectivePrice;
            unitTypeData.latestDate = currentDate;
          }
        });

        // Process unit types with latest price
        const processedProducts: ProductMetric[] = Array.from(productMap.values()).map(product => {
          const unitTypesArray = Array.from(product.unitTypes.values()).map(unitType => {
            return {
              type: unitType.type,
              quantity: unitType.quantity,
              spend: unitType.spend,
              latestPrice: unitType.latestPrice
            };
          });

          return {
            id: product.id,
            productCode: product.productCode,
            description: product.description,
            supplier: product.supplier,
            supplierId: product.supplierId,
            active: true, // Always active now
            totalQuantity: product.totalQuantity,
            totalSpend: product.totalSpend,
            unitTypes: unitTypesArray,
            locations: Array.from(product.locations),
            locationCount: product.locations.size,
            hasAgreement: product.hasAgreement,
            categoryName: product.categoryName,
            categoryId: product.categoryId
          };
        });


        // Apply product search filter
        let filteredProducts = processedProducts;
        if (productSearch?.terms?.length > 0) {
          console.log('Applying product search filter:', productSearch);
          const includedTerms: string[] = [];
          const excludedTerms: string[] = [];
          
          productSearch.terms.forEach(term => {
            if (term.startsWith('-')) {
              excludedTerms.push(term.slice(1).toLowerCase());
            } else {
              includedTerms.push(term.toLowerCase());
            }
          });

          filteredProducts = processedProducts.filter(product => {
            // Search in description, product code, and supplier name
            const description = (product.description || '').toLowerCase();
            const code = (product.productCode || '').toLowerCase();
            const supplier = (product.supplier || '').toLowerCase();
            
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

        console.log(`Found ${filteredProducts.length} products after filtering`);
        
        // Count products with agreements
        const productsWithAgreements = filteredProducts.filter(p => p.hasAgreement);
        console.log(`Products with agreements: ${productsWithAgreements.length}`);
        
        setData(filteredProducts);
      } catch (err) {
        console.error('Error fetching product metrics:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductMetrics();
  }, [dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit]);

  return { data, isLoading, error };
};
