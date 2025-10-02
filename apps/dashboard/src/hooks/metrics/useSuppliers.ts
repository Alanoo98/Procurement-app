import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPriceValue } from '@/utils/getPriceValue';

type SupplierMetric = {
  supplier_id: string;
  name: string;
  address: string;
  tax_id: string;
  active: boolean;
  invoice_count: number;
  total_spend: number;
  product_count: number;
  top_products: string;
};

type GroupedSupplier = {
  supplier_id: string;
  name: string;
  address: string;
  tax_id: string;
  invoice_numbers: Set<string>;
  total_spend: number;
  product_totals: Map<string, { description: string; spend: number }>;
};

export const useSupplierMetrics = () => {
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

  const [data, setData] = useState<SupplierMetric[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Kept for potential manual refresh hook-ups
  const fetchData = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);

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

    if (categories.length > 0) {
      supplierIdsQuery = supplierIdsQuery.in('category_id', categories);
    }

    if (documentType === 'Faktura') {
      supplierIdsQuery = supplierIdsQuery.in('document_type', ['Faktura', 'Invoice']);
    } else if (documentType === 'Kreditnota') {
      supplierIdsQuery = supplierIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
    }

    // Apply product code filter
    if (productCodeFilter === 'with_codes') {
      supplierIdsQuery = supplierIdsQuery.not('product_code', 'is', null).neq('product_code', '');
    } else if (productCodeFilter === 'without_codes') {
      supplierIdsQuery = supplierIdsQuery.or('product_code.is.null,product_code.eq.');
    }

    const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;

    if (supplierIdsError) {
      setError(supplierIdsError);
      setData([]);
      setLoading(false);
      return;
    }

    // Get unique supplier IDs, filtering out null values
    const uniqueSupplierIds = [...new Set((supplierIdsData || []).map(row => row.supplier_id))].filter(id => id !== null);

    if (uniqueSupplierIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    // Get supplier details
    const { data: suppliersData, error: suppliersError } = await supabase
      .from('suppliers')
      .select('supplier_id, name, address, tax_id, active')
      .eq('organization_id', currentOrganization.id)
      .in('supplier_id', uniqueSupplierIds)
      .eq('active', true); // Only include active suppliers in analysis

    if (suppliersError) {
      setError(suppliersError);
      setData([]);
      setLoading(false);
      return;
    }

    // Create a map for quick supplier lookup
    const suppliersMap = new Map(
      (suppliersData || []).map(supplier => [
        supplier.supplier_id, 
        { name: supplier.name, address: supplier.address, tax_id: supplier.tax_id, active: supplier.active }
      ])
    );

    // Get invoice lines data for the suppliers
    let invoiceLinesQuery = supabase
      .from('invoice_lines')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .in('supplier_id', uniqueSupplierIds);

    // Apply business unit filter if selected
    if (currentBusinessUnit) {
      invoiceLinesQuery = invoiceLinesQuery.eq('business_unit_id', currentBusinessUnit.id);
    }

    if (dateRange?.start && dateRange?.end) {
      invoiceLinesQuery = invoiceLinesQuery
        .gte('invoice_date', dateRange.start)
        .lte('invoice_date', dateRange.end);
    }

    if (restaurants.length > 0) {
      invoiceLinesQuery = invoiceLinesQuery.in('location_id', restaurants);
    }

    if (suppliers.length > 0) {
      invoiceLinesQuery = invoiceLinesQuery.in('supplier_id', suppliers);
    }

    if (categories.length > 0) {
      invoiceLinesQuery = invoiceLinesQuery.in('category_id', categories);
    }

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

    // Apply product search filter
    if (productSearch) {
      invoiceLinesQuery = invoiceLinesQuery.ilike('description', `%${productSearch}%`);
    }

    const { data: invoiceLinesData, error: invoiceLinesError } = await invoiceLinesQuery;

    if (invoiceLinesError) {
      setError(invoiceLinesError);
      setData([]);
      setLoading(false);
      return;
    }

    // Group by supplier
    const grouped: Record<string, GroupedSupplier> = {};

    for (const row of (invoiceLinesData || [])) {
      const id = row.supplier_id;
      const supplierInfo = suppliersMap.get(id);
      
      // Initialize grouped entry if it doesn't exist
      if (!grouped[id]) {
        if (!supplierInfo) {
          // Handle missing supplier info gracefully
          console.warn(`Missing supplier info for supplier_id: ${id}`);
          
          // Create a more user-friendly message
          let displayName = '';
          if (id === null) {
            displayName = '[Unmapped Supplier - Needs Mapping]';
          } else {
            displayName = '[Unmapped Supplier - Add to Suppliers Table]';
          }
          
          grouped[id] = {
            supplier_id: id,
            name: displayName,
            address: '⚠️ This supplier needs to be mapped in Settings',
            tax_id: '',
            invoice_numbers: new Set(),
            total_spend: 0,
            product_totals: new Map<string, { description: string; spend: number }>(),
          };
        } else {
          // Use actual supplier info
          grouped[id] = {
            supplier_id: id,
            name: supplierInfo.name,
            address: supplierInfo.address || '',
            tax_id: supplierInfo.tax_id || '',
            invoice_numbers: new Set(),
            total_spend: 0,
            product_totals: new Map<string, { description: string; spend: number }>(),
          };
        }
      }
      
      const total = getPriceValue(row.total_price_after_discount, row.total_price);

      grouped[id].invoice_numbers.add(row.invoice_number);
      grouped[id].total_spend += total;

      const productKey = row.product_code ?? row.description ?? '-';
      if (!grouped[id].product_totals.has(productKey)) {
        grouped[id].product_totals.set(productKey, {
          description: row.description ?? row.product_code ?? 'Unnamed product',
          spend: 0,
          });
        }

      grouped[id].product_totals.get(productKey)!.spend += total;
    }

    const result = Object.values(grouped)
      .map((entry: GroupedSupplier) => {
        const topProducts = Array.from(entry.product_totals.entries())
          .sort((a, b) => b[1].spend - a[1].spend)
          .slice(0, 5)
          .map(([, { description, spend }]) => {
            const cleanDescription = (description || '')
              .replace(/\r?\n+/g, ' ')
              .replace(/,+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            return `${cleanDescription} (${spend.toFixed(0)} kr)`;
          })
          .join(', ');

        return {
          supplier_id: entry.supplier_id,
          name: entry.name,
          address: entry.address,
          tax_id: entry.tax_id,
          active: suppliersMap.get(entry.supplier_id)?.active ?? true,
          invoice_count: entry.invoice_numbers.size,
          total_spend: entry.total_spend,
          product_count: entry.product_totals.size,
          top_products: topProducts,
        };
      })
      // Don't filter out redundant suppliers - show all suppliers for management
      // The redundant status is handled by the toggle button in the UI

    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    const fetch = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);

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

      if (categories.length > 0) {
        supplierIdsQuery = supplierIdsQuery.in('category_id', categories);
      }

      if (documentType === 'Faktura') {
        supplierIdsQuery = supplierIdsQuery.in('document_type', ['Faktura', 'Invoice']);
      } else if (documentType === 'Kreditnota') {
        supplierIdsQuery = supplierIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
      }

      // Apply product code filter
      if (productCodeFilter === 'with_codes') {
        supplierIdsQuery = supplierIdsQuery.not('product_code', 'is', null).neq('product_code', '');
      } else if (productCodeFilter === 'without_codes') {
        supplierIdsQuery = supplierIdsQuery.or('product_code.is.null,product_code.eq.');
      }

      const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;

      if (supplierIdsError) {
        setError(supplierIdsError);
        setData([]);
        setLoading(false);
        return;
      }

      // Get unique supplier IDs, filtering out null values
      const uniqueSupplierIds = [...new Set((supplierIdsData || []).map(row => row.supplier_id))].filter(id => id !== null);

      if (uniqueSupplierIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Fetch supplier details for ALL suppliers that exist in invoice lines
      // Use a more robust query to ensure we get all suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('supplier_id, name, address, tax_id, active')
        .eq('organization_id', currentOrganization.id)
        .in('supplier_id', uniqueSupplierIds);

      if (suppliersError) {
        setError(suppliersError);
        setData([]);
        setLoading(false);
        return;
      }

      // Create a map of supplier details
      const suppliersMap = new Map(
        (suppliersData || []).map(supplier => [
          supplier.supplier_id, 
          { name: supplier.name, address: supplier.address, tax_id: supplier.tax_id, active: supplier.active }
        ])
      );
      
      // Debug logging (temporary - remove after fixing data integrity)
      console.log(`Found ${uniqueSupplierIds.length} unique supplier IDs in invoice lines`);
      console.log(`Fetched ${suppliersData?.length || 0} supplier details from database`);
      console.log(`Suppliers map has ${suppliersMap.size} entries`);

      // Now fetch invoice lines data
      let invoiceQuery = supabase
        .from('invoice_lines')
        .select(`
          supplier_id,
          invoice_number, product_code, description,
          total_price, total_price_after_discount
        `)
        .eq('organization_id', currentOrganization.id);
        
      // Apply business unit filter if selected
      if (currentBusinessUnit) {
        invoiceQuery = invoiceQuery.eq('business_unit_id', currentBusinessUnit.id);
      }

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

      // Fetch all data using pagination (Supabase has a hard limit of 1000 rows per query)
      let allRows: Array<{
        supplier_id: string;
        invoice_number: string;
        product_code: string | null;
        description: string | null;
        total_price: number | null;
        total_price_after_discount: number | null;
      }> = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const offset = page * pageSize;
        
        const { data: pageRows, error: pageError } = await invoiceQuery
          .range(offset, offset + pageSize - 1);

        if (pageError) {
          setError(pageError);
          setData([]);
          setLoading(false);
          return;
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

      const rows = allRows;

      const grouped: Record<string, GroupedSupplier> = {};

      for (const row of (rows || [])) {
        const id = row.supplier_id;
        const supplierInfo = suppliersMap.get(id);
        
        // Initialize grouped entry if it doesn't exist
        if (!grouped[id]) {
          if (!supplierInfo) {
            // Handle missing supplier info gracefully
            console.warn(`Missing supplier info for supplier_id: ${id}`);
            
            // Create a more user-friendly message
            let displayName = '';
            if (id === null) {
              displayName = '[Unmapped Supplier - Needs Mapping]';
            } else {
              displayName = '[Unmapped Supplier - Add to Suppliers Table]';
            }
            
            grouped[id] = {
              supplier_id: id,
              name: displayName,
              address: '⚠️ This supplier needs to be mapped in Settings',
              tax_id: '',
              invoice_numbers: new Set(),
              total_spend: 0,
              product_totals: new Map<string, { description: string; spend: number }>(),
            };
          } else {
            // Use actual supplier info
            grouped[id] = {
              supplier_id: id,
              name: supplierInfo.name,
              address: supplierInfo.address || '',
              tax_id: supplierInfo.tax_id || '',
              invoice_numbers: new Set(),
              total_spend: 0,
              product_totals: new Map<string, { description: string; spend: number }>(),
            };
          }
        }
        
        const total = getPriceValue(row.total_price_after_discount, row.total_price);

        grouped[id].invoice_numbers.add(row.invoice_number);
        grouped[id].total_spend += total;

        const productKey = row.product_code ?? row.description ?? '-';
        if (!grouped[id].product_totals.has(productKey)) {
          grouped[id].product_totals.set(productKey, {
            description: row.description ?? row.product_code ?? 'Unnamed product',
            spend: 0,
          });
        }

        grouped[id].product_totals.get(productKey)!.spend += total;
      }

      const result = Object.values(grouped)
        .map((entry: GroupedSupplier) => {
          const topProducts = Array.from(entry.product_totals.entries())
            .sort((a, b) => b[1].spend - a[1].spend)
            .slice(0, 5)
            .map(([, { description, spend }]) => {
              const cleanDescription = (description || '')
                .replace(/\r?\n+/g, ' ')
                .replace(/,+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              return `${cleanDescription} (${spend.toFixed(0)} kr)`;
            })
            .join(', ');

          return {
            supplier_id: entry.supplier_id,
            name: entry.name,
            address: entry.address,
            tax_id: entry.tax_id,
            active: suppliersMap.get(entry.supplier_id)?.active ?? true,
            invoice_count: entry.invoice_numbers.size,
            total_spend: entry.total_spend,
            product_count: entry.product_totals.size,
            top_products: topProducts,
          };
        })
        // Don't filter out redundant suppliers - show all suppliers for management
        // The redundant status is handled by the toggle button in the UI

      setData(result);
      setLoading(false);
    };

    fetch();
  }, [dateRange, restaurants, suppliers, categories, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    // Trigger the useEffect to refetch data
    const fetch = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);

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

      if (categories.length > 0) {
        supplierIdsQuery = supplierIdsQuery.in('category_id', categories);
      }

      if (documentType === 'Faktura') {
        supplierIdsQuery = supplierIdsQuery.in('document_type', ['Faktura', 'Invoice']);
      } else if (documentType === 'Kreditnota') {
        supplierIdsQuery = supplierIdsQuery.in('document_type', ['Kreditnota', 'Credit note']);
      }

      // Apply product code filter
      if (productCodeFilter === 'with_codes') {
        supplierIdsQuery = supplierIdsQuery.not('product_code', 'is', null).neq('product_code', '');
      } else if (productCodeFilter === 'without_codes') {
        supplierIdsQuery = supplierIdsQuery.or('product_code.is.null,product_code.eq.');
      }

      const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;

      if (supplierIdsError) {
        setError(supplierIdsError);
        setData([]);
        setLoading(false);
        return;
      }

      // Get unique supplier IDs, filtering out null values
      const uniqueSupplierIds = [...new Set((supplierIdsData || []).map(row => row.supplier_id))].filter(id => id !== null);

      if (uniqueSupplierIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Get supplier details
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('supplier_id, name, address, tax_id, active')
        .eq('organization_id', currentOrganization.id)
        .in('supplier_id', uniqueSupplierIds)
        .eq('active', true); // Only include active suppliers in analysis

      if (suppliersError) {
        setError(suppliersError);
        setData([]);
        setLoading(false);
        return;
      }

      // Create a map for quick supplier lookup
      const suppliersMap = new Map(
        (suppliersData || []).map(supplier => [
          supplier.supplier_id, 
          { name: supplier.name, address: supplier.address, tax_id: supplier.tax_id, active: supplier.active }
        ])
      );

      // Get invoice lines data for the suppliers
      let invoiceLinesQuery = supabase
        .from('invoice_lines')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .in('supplier_id', uniqueSupplierIds);

      // Apply business unit filter if selected
      if (currentBusinessUnit) {
        invoiceLinesQuery = invoiceLinesQuery.eq('business_unit_id', currentBusinessUnit.id);
      }

      if (dateRange?.start && dateRange?.end) {
        invoiceLinesQuery = invoiceLinesQuery
          .gte('invoice_date', dateRange.start)
          .lte('invoice_date', dateRange.end);
      }

      if (restaurants.length > 0) {
        invoiceLinesQuery = invoiceLinesQuery.in('location_id', restaurants);
      }

      if (suppliers.length > 0) {
        invoiceLinesQuery = invoiceLinesQuery.in('supplier_id', suppliers);
      }

      if (categories.length > 0) {
        invoiceLinesQuery = invoiceLinesQuery.in('category_id', categories);
      }

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

      // Apply product search filter
      if (productSearch) {
        invoiceLinesQuery = invoiceLinesQuery.ilike('description', `%${productSearch}%`);
      }

      const { data: invoiceLinesData, error: invoiceLinesError } = await invoiceLinesQuery;

      if (invoiceLinesError) {
        setError(invoiceLinesError);
        setData([]);
        setLoading(false);
        return;
      }

      // Group by supplier
      const grouped: Record<string, GroupedSupplier> = {};

      for (const row of (invoiceLinesData || [])) {
        const id = row.supplier_id;
        const supplierInfo = suppliersMap.get(id);
        
        // Initialize grouped entry if it doesn't exist
        if (!grouped[id]) {
          if (!supplierInfo) {
            // Handle missing supplier info gracefully
            console.warn(`Missing supplier info for supplier_id: ${id}`);
            
            // Create a more user-friendly message
            let displayName = '';
            if (id === null) {
              displayName = '[Unmapped Supplier - Needs Mapping]';
            } else {
              displayName = '[Unmapped Supplier - Add to Suppliers Table]';
            }
            
            grouped[id] = {
              supplier_id: id,
              name: displayName,
              address: '⚠️ This supplier needs to be mapped in Settings',
              tax_id: '',
              invoice_numbers: new Set(),
              total_spend: 0,
              product_totals: new Map<string, { description: string; spend: number }>(),
            };
          } else {
            // Use actual supplier info
            grouped[id] = {
              supplier_id: id,
              name: supplierInfo.name,
              address: supplierInfo.address || '',
              tax_id: supplierInfo.tax_id || '',
              invoice_numbers: new Set(),
              total_spend: 0,
              product_totals: new Map<string, { description: string; spend: number }>(),
            };
          }
        }
        
        const total = getPriceValue(row.total_price_after_discount, row.total_price);

        grouped[id].invoice_numbers.add(row.invoice_number);
        grouped[id].total_spend += total;

        const productKey = row.product_code ?? row.description ?? '-';
        if (!grouped[id].product_totals.has(productKey)) {
          grouped[id].product_totals.set(productKey, {
            description: row.description ?? row.product_code ?? 'Unnamed product',
            spend: 0,
            });
          }

        grouped[id].product_totals.get(productKey)!.spend += total;
      }

      const result = Object.values(grouped)
        .map((entry: GroupedSupplier) => {
          const topProducts = Array.from(entry.product_totals.entries())
            .sort((a, b) => b[1].spend - a[1].spend)
            .slice(0, 5)
            .map(([, { description, spend }]) => {
              const cleanDescription = (description || '')
                .replace(/\r?\n+/g, ' ')
                .replace(/,+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              return `${cleanDescription} (${spend.toFixed(0)} kr)`;
            })
            .join(', ');

          return {
            supplier_id: entry.supplier_id,
            name: entry.name,
            address: entry.address,
            tax_id: entry.tax_id,
            active: suppliersMap.get(entry.supplier_id)?.active ?? true,
            invoice_count: entry.invoice_numbers.size,
            total_spend: entry.total_spend,
            product_count: entry.product_totals.size,
            top_products: topProducts,
          };
        })
        // Don't filter out redundant suppliers - show all suppliers for management
        // The redundant status is handled by the toggle button in the UI

      setData(result);
      setLoading(false);
    };

    fetch();
  };

  return { data, isLoading, error, refetch, fetchData };
};
