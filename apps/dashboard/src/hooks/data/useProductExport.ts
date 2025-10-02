import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFilterStore } from '@/store/filterStore';

export interface ExportProduct {
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  locations: string[];
  categoryName?: string;
  categoryId?: string;
  totalQuantity: number;
  totalSpend: number;
  latestPrice: number;
  previousPrice?: number;
  lastPurchaseDate?: string;
  purchaseCount: number;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeMetrics: boolean;
  includePriceHistory: boolean;
  includeLocations: boolean;
  includeCategories: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  suppliers?: string[];
  locations?: string[];
  categories?: string[];
  // Optional: limit export to specific UI-selected products (product_code|supplier_id keys)
  productKeys?: string[];
  // Optional: apply client-side search term as an additional filter
  searchTerm?: string;
}

export const useProductExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { currentOrganization } = useOrganization();
  const { dateRange, restaurants, suppliers, categories } = useFilterStore();

  const fetchProductsForExport = async (options: ExportOptions): Promise<ExportProduct[]> => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // First, fetch categories and category mappings separately (same approach as useProductMetrics)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('category_id, category_name')
        .eq('organization_id', currentOrganization.id);

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }

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

      // Create maps for category lookups
      const categoriesMap = new Map(
        (categoriesData || []).map(category => [category.category_id, category.category_name])
      );

      const productCategoryMap = new Map<string, string>();
      (categoryMappingsData || []).forEach((mapping: any) => {
        const productKey = `${mapping.variant_product_name}|${mapping.variant_product_code || ''}`;
        const categoryName = mapping.product_categories?.category_name;
        if (categoryName) {
          productCategoryMap.set(productKey, categoryName);
        }
      });

      // Build the base query for invoice lines - order by date to get latest prices
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
          location_id,
          category_id,
          suppliers(name),
          locations(name)
        `)
        .eq('organization_id', currentOrganization.id)
        .not('description', 'is', null)
        .not('description', 'eq', '')
        .order('invoice_date', { ascending: false });

      // Apply date range filter
      const startDate = options.dateRange?.start || dateRange?.start;
      const endDate = options.dateRange?.end || dateRange?.end;
      
      if (startDate) {
        query = query.gte('invoice_date', startDate);
      }
      if (endDate) {
        query = query.lte('invoice_date', endDate);
      }

      // Apply supplier filter
      const supplierIds = options.suppliers || suppliers;
      if (supplierIds && supplierIds.length > 0) {
        query = query.in('supplier_id', supplierIds);
      }

      // Apply location filter
      const locationIds = options.locations || restaurants;
      if (locationIds && locationIds.length > 0) {
        query = query.in('location_id', locationIds);
      }

      setExportProgress(25);

      const { data: invoiceLinesData, error: invoiceLinesError } = await query;

      if (invoiceLinesError) {
        throw new Error(`Failed to fetch invoice lines: ${invoiceLinesError.message}`);
      }

      setExportProgress(50);

      // Process the data to create product summaries with latest and previous prices
      const productsMap = new Map<string, ExportProduct>();
      const productPriceHistory = new Map<string, number[]>();

      // First pass: collect all prices for each product to determine latest and previous
      invoiceLinesData?.forEach((line: {
        product_code: string | null;
        description: string;
        supplier_id: string;
        quantity: number | null;
        unit_type: string | null;
        unit_price: number | null;
        unit_price_after_discount: number | null;
        total_price: number | null;
        total_price_after_discount: number | null;
        invoice_date: string | null;
        location_id: string | null;
        category_id: string | null;
        suppliers?: { name: string } | null;
        locations?: { name: string } | null;
        product_categories?: { category_name: string } | null;
      }) => {
        const productKey = `${line.product_code || ''}|${line.description}|${line.supplier_id}`;
        const unitPrice = line.unit_price_after_discount || line.unit_price || 0;
        
        if (unitPrice > 0) {
          if (!productPriceHistory.has(productKey)) {
            productPriceHistory.set(productKey, []);
          }
          productPriceHistory.get(productKey)!.push(unitPrice);
        }
      });

      // Second pass: build product summaries
      invoiceLinesData?.forEach((line: {
        product_code: string | null;
        description: string;
        supplier_id: string;
        quantity: number | null;
        unit_type: string | null;
        unit_price: number | null;
        unit_price_after_discount: number | null;
        total_price: number | null;
        total_price_after_discount: number | null;
        invoice_date: string | null;
        location_id: string | null;
        category_id: string | null;
        suppliers?: { name: string } | null;
        locations?: { name: string } | null;
      }) => {
        const productKey = `${line.product_code || ''}|${line.description}|${line.supplier_id}`;
        
        if (!productsMap.has(productKey)) {
          const prices = productPriceHistory.get(productKey) || [];
          const latestPrice = prices.length > 0 ? prices[0] : 0; // First price (most recent due to ordering)
          const previousPrice = prices.length > 1 ? prices[1] : undefined; // Second price
          
          // Get category information - check both manual mappings and invoice line category_id
          const productKeyForMapping = `${line.description}|${line.product_code || ''}`;
          let categoryName = productCategoryMap.get(productKeyForMapping);
          
          // If no manual mapping found, check if invoice line has category_id
          if (!categoryName && line.category_id) {
            categoryName = categoriesMap.get(line.category_id);
          }
          
          productsMap.set(productKey, {
            productCode: line.product_code || '',
            description: line.description,
            supplier: (line.suppliers as any)?.name || 'Unknown',
            supplierId: line.supplier_id,
            locations: [],
            categoryName: categoryName,
            categoryId: line.category_id,
            totalQuantity: 0,
            totalSpend: 0,
            latestPrice,
            previousPrice,
            lastPurchaseDate: undefined,
            purchaseCount: 0,
          });
        }

        const product = productsMap.get(productKey)!;
        
        // Update quantities and spend
        product.totalQuantity += line.quantity || 0;
        product.totalSpend += line.total_price_after_discount || 0;
        product.purchaseCount += 1;

        // Update locations
        if (line.locations?.name && !product.locations.includes(line.locations.name)) {
          product.locations.push(line.locations.name);
        }

        // Update last purchase date (most recent due to ordering)
        if (line.invoice_date && !product.lastPurchaseDate) {
          product.lastPurchaseDate = line.invoice_date;
        }
      });

      setExportProgress(75);

      // Convert to array
      let products = Array.from(productsMap.values());

      // If specific product keys are provided, filter down to just those
      if (options.productKeys && options.productKeys.length > 0) {
        const keySet = new Set(options.productKeys);
        // Support both keyed by productCode|supplierId and description|supplierId (for products without codes)
        products = products.filter(p => {
          const byCode = `${p.productCode || ''}|${p.supplierId || ''}`;
          const byDescription = `${p.description}|${p.supplierId || ''}`;
          return keySet.has(byCode) || keySet.has(byDescription);
        });
      }

      // Apply additional search term filter if provided (to match UI filtering)
      if (options.searchTerm && options.searchTerm.trim().length > 0) {
        const q = options.searchTerm.trim().toLowerCase();
        products = products.filter(p =>
          (p.description || '').toLowerCase().includes(q) ||
          (p.productCode || '').toLowerCase().includes(q) ||
          (p.supplier || '').toLowerCase().includes(q)
        );
      }

      setExportProgress(100);
      return products;

    } catch (error) {
      console.error('Error fetching products for export:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (products: ExportProduct[], options: ExportOptions): string => {
    const headers = [
      'Product Code',
      'Description',
      'Supplier',
      'Category',
      'Total Quantity',
      'Total Spend',
      'Latest Price',
      'Previous Price',
      'Locations',
      'Purchase Count',
      'Last Purchase Date'
    ];

    const rows = products.map(product => [
      product.productCode,
      product.description,
      product.supplier,
      product.categoryName || '',
      product.totalQuantity.toString(),
      product.totalSpend.toFixed(2),
      product.latestPrice.toFixed(2),
      product.previousPrice ? product.previousPrice.toFixed(2) : '',
      product.locations.join('; '),
      product.purchaseCount.toString(),
      product.lastPurchaseDate || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  };

  const exportToJSON = (products: ExportProduct[], options: ExportOptions): string => {
    return JSON.stringify(products, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportProducts = async (options: ExportOptions) => {
    try {
      const products = await fetchProductsForExport(options);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const orgName = currentOrganization?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'organization';
      
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'csv':
          content = exportToCSV(products, options);
          filename = `products_export_${orgName}_${timestamp}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = exportToJSON(products, options);
          filename = `products_export_${orgName}_${timestamp}.json`;
          mimeType = 'application/json';
          break;
        case 'excel':
          // For Excel, we'll export as CSV for now (can be enhanced with a proper Excel library)
          content = exportToCSV(products, options);
          filename = `products_export_${orgName}_${timestamp}.csv`;
          mimeType = 'text/csv';
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      downloadFile(content, filename, mimeType);
      
      return {
        success: true,
        productCount: products.length,
        filename
      };

    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  return {
    exportProducts,
    isExporting,
    exportProgress,
    fetchProductsForExport
  };
};
