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

export const useSupplierMetricsAnalysis = () => {
  const {
    dateRange,
    restaurants,
    suppliers,
    documentType,
    productSearch,
    productCodeFilter,
  } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();

  const [data, setData] = useState<SupplierMetric[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);

      // First, get all unique supplier IDs from invoice lines (excluding redundant suppliers)
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

      // Fetch supplier details (EXCLUDING redundant suppliers for analysis)
      // Note: We only fetch mapped suppliers (not null supplier_id) and exclude redundant ones
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

      // Get only non-redundant supplier IDs for invoice data
      const nonRedundantSupplierIds = (suppliersData || []).map(s => s.supplier_id);

      // Create a map of supplier details
      const suppliersMap = new Map(
        (suppliersData || []).map(supplier => [
          supplier.supplier_id, 
          { name: supplier.name, address: supplier.address, tax_id: supplier.tax_id, active: supplier.active }
        ])
      );

      // Now fetch invoice lines data (only for non-redundant suppliers)
      let invoiceQuery = supabase
        .from('invoice_lines')
        .select(`
          supplier_id,
          invoice_number, product_code, description,
          total_price, total_price_after_discount
        `)
        .eq('organization_id', currentOrganization.id)
        .in('supplier_id', nonRedundantSupplierIds); // Only non-redundant suppliers
        
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
        const name = supplierInfo?.name || '-';
        const address = supplierInfo?.address || '';
        const taxId = supplierInfo?.tax_id || '';
        const total = getPriceValue(row.total_price_after_discount, row.total_price);

        if (!grouped[id]) {
          grouped[id] = {
            supplier_id: id,
            name,
            address,
            tax_id: taxId,
            invoice_numbers: new Set(),
            total_spend: 0,
            product_totals: new Map<string, { description: string; spend: number }>(),
          };
        }

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
            .slice(0, 3)
            .map(([, { description, spend }]) => `${description} (${spend.toFixed(0)} kr)`)
            .join(', ');

          return {
            supplier_id: entry.supplier_id,
            name: entry.name,
            address: entry.address,
            tax_id: entry.tax_id,
            invoice_count: entry.invoice_numbers.size,
            total_spend: entry.total_spend,
            product_count: entry.product_totals.size,
            top_products: topProducts,
          };
        });

      setData(result);
      setLoading(false);
    };

    fetch();
  }, [dateRange, restaurants, suppliers, documentType, productSearch, productCodeFilter, currentOrganization, currentBusinessUnit]);

  return { data, isLoading, error };
};
