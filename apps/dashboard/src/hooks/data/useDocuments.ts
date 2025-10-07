import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFilterStore } from '@/store/filterStore';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';
import { getPriceValue } from '@/utils/getPriceValue';

interface RawInvoiceLine {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  delivery_date?: string;
  document_type: string;
  supplier_id: string;
  location_id: string;
  quantity: number;
  unit_price: number;
  unit_price_after_discount: number;
  total_price: number;
  total_price_after_discount: number;
  total_tax: number;
  extracted_data_id: string;
  product_code?: string;
  description?: string;
  suppliers?: { name: string; address?: string };
  locations?: { name: string; address?: string };
}

interface DocumentData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  delivery_date?: string;
  document_type: string;
  supplier_id: string;
  location_id: string;
  total_quantity: number;
  total_effective_price: number;
  total_discount_saved: number;
  total_tax: number;
  total_price: number;
  total_amount: number;
  line_count: number;
  product_codes: string[];
  product_descriptions: string[];
  suppliers?: { name: string; address?: string };
  locations?: { name: string; address?: string };
}

  export const useDocuments = () => {
    const { currentOrganization, currentBusinessUnit } = useOrganization();
    const {
      dateRange,
      restaurants,
      suppliers,
      categories,
      documentType,
      productCodeFilter,
    } = useFilterStore();

    return useQuery({
      queryKey: createQueryKey(QUERY_KEYS.DOCUMENTS, {
        organizationId: currentOrganization?.id,
        businessUnitId: currentBusinessUnit?.id,
        dateRange,
        restaurants: restaurants.sort(),
        suppliers: suppliers.sort(),
        categories: categories.sort(),
        documentType,
        productCodeFilter,
      }),
      queryFn: async (): Promise<DocumentData[]> => {
        if (!currentOrganization) return [];

        try {
          // Cursor-based fetch via RPC (no OFFSET); post-filter doc type and product code
          let allRows: RawInvoiceLine[] = [];
          let hasMore = true;
          const pageSize = 1000;
          let afterInvoiceDate: string | null = null;
          let afterCreatedAt: string | null = null;
          let afterId: string | null = null;

          while (hasMore) {
            const { data, error } = await supabase.rpc<any>('invoice_lines_list', {
              p_org: currentOrganization.id,
              p_start_date: dateRange?.start ?? null,
              p_end_date: dateRange?.end ?? null,
              p_location_ids: restaurants.length > 0 ? restaurants : null,
              p_supplier_ids: suppliers.length > 0 ? suppliers : null,
              p_category_ids: categories.length > 0 ? categories : null,
              p_search: null,
              p_limit: pageSize,
              p_after_invoice_date: afterInvoiceDate,
              p_after_created_at: afterCreatedAt,
              p_after_id: afterId
            });
            if (error) throw error;
            const pageRows = (data || []) as Array<any>;

            // Document type filter (client-side, minimal cost on small page)
            const docFiltered = pageRows.filter(r => {
              if (documentType === 'Faktura') return ['Faktura', 'Invoice'].includes(r.document_type);
              if (documentType === 'Kreditnota') return ['Kreditnota', 'Credit note'].includes(r.document_type);
              return true;
            });

            // Product code filter (client-side)
            const codeFiltered = docFiltered.filter(r => {
              if (productCodeFilter === 'with_codes') return r.product_code && r.product_code !== '';
              if (productCodeFilter === 'without_codes') return !r.product_code || r.product_code === '';
              return true;
            });

            const mapped: RawInvoiceLine[] = codeFiltered.map(r => ({
              id: r.id,
              invoice_number: r.invoice_number,
              invoice_date: r.invoice_date,
              due_date: r.due_date,
              delivery_date: r.delivery_date,
              document_type: r.document_type,
              supplier_id: r.supplier_id,
              location_id: r.location_id,
              quantity: Number(r.quantity || 0),
              unit_price: Number(r.unit_price || 0),
              unit_price_after_discount: Number(r.unit_price_after_discount || 0),
              total_price: Number(r.total_price || 0),
              total_price_after_discount: Number(r.total_price_after_discount || 0),
              total_tax: Number(r.total_tax || 0),
              extracted_data_id: r.extracted_data_id,
              product_code: r.product_code || undefined,
              description: r.description || undefined,
              suppliers: r.supplier_name ? { name: r.supplier_name } : undefined,
              locations: r.location_name ? { name: r.location_name } : undefined
            }));

            allRows = allRows.concat(mapped);

            if (!pageRows.length || pageRows.length < pageSize) {
              hasMore = false;
            } else {
              const last = pageRows[pageRows.length - 1];
              afterInvoiceDate = last.cursor?.invoice_date ?? null;
              afterCreatedAt = last.cursor?.created_at ?? null;
              afterId = last.cursor?.id ?? null;
            }
          }

          const rows: RawInvoiceLine[] = allRows;

          // Group by invoice number to aggregate line items
          const grouped: Record<string, DocumentData> = {};

          for (const row of rows) {
            const key = row.invoice_number;
            
            if (!grouped[key]) {
              grouped[key] = {
                invoice_number: key,
                invoice_date: row.invoice_date,
                due_date: row.due_date,
                delivery_date: row.delivery_date,
                document_type: row.document_type,
                supplier_id: row.supplier_id,
                location_id: row.location_id,
                total_quantity: 0,
                total_effective_price: 0,
                total_discount_saved: 0,
                total_tax: 0,
                total_price: 0,
                total_amount: 0,
                line_count: 0,
                product_codes: [],
                product_descriptions: [],
                suppliers: row.suppliers || { name: '', address: '' },
                locations: row.locations || { name: '', address: '' },
              };
            }

            const total = getPriceValue(row.total_price_after_discount, row.total_price);
            const originalTotal = Number(Number(row.total_price || 0).toFixed(2));
            
            // Calculate savings from unit prices if total_price is not available
            const unitPrice = Number(Number(row.unit_price || 0).toFixed(2));
            const unitPriceAfterDiscount = Number(Number(row.unit_price_after_discount || 0).toFixed(2));
            const quantity = Number(row.quantity) || 0;
            
            // Calculate original and discounted totals from unit prices
            const originalTotalFromUnit = Number((unitPrice * quantity).toFixed(2));
            const discountedTotalFromUnit = Number((unitPriceAfterDiscount * quantity).toFixed(2));
            
            // Use total_price if available, otherwise use calculated values
            const effectiveOriginalTotal = originalTotal > 0 ? Number(Number(originalTotal).toFixed(2)) : originalTotalFromUnit;
            const effectiveDiscountedTotal = Number(total) > 0 ? Number(Number(total).toFixed(2)) : discountedTotalFromUnit;
            const effectiveSavings = Number(Math.max(0, (effectiveOriginalTotal - effectiveDiscountedTotal)).toFixed(2));
            
            // Debug logging for invoice 382163
            if (row.invoice_number === '382163') {
              console.log('Documents calculation for 382163:', {
                invoice_number: row.invoice_number,
                total_price_after_discount: row.total_price_after_discount,
                total_price: row.total_price,
                unit_price: row.unit_price,
                unit_price_after_discount: row.unit_price_after_discount,
                quantity: row.quantity,
                total: total,
                originalTotal: originalTotal,
                originalTotalFromUnit: originalTotalFromUnit,
                discountedTotalFromUnit: discountedTotalFromUnit,
                effectiveOriginalTotal: effectiveOriginalTotal,
                effectiveDiscountedTotal: effectiveDiscountedTotal,
                effectiveSavings: effectiveSavings
              });
            }
            
            grouped[key].total_quantity += quantity;
            grouped[key].total_effective_price += effectiveDiscountedTotal;
            grouped[key].total_discount_saved += effectiveSavings;
            // Only set total_tax once per invoice (it's the same for all line items)
            if (grouped[key].total_tax === 0) {
              grouped[key].total_tax = Number(row.total_tax) || 0;
            }
            grouped[key].total_price += effectiveOriginalTotal;
            grouped[key].line_count += 1;
            
            // Collect unique product codes and descriptions
            // Use same grouping logic as Products page: productCode|supplierId or description|supplierId
            const productCode = row.product_code || '';
            const supplierId = row.supplier_id || 'null';
            const productIdentifier = productCode ? `${productCode}|${supplierId}` : `${row.description}|${supplierId}`;
            if (!grouped[key].product_codes.includes(productIdentifier)) {
              grouped[key].product_codes.push(productIdentifier);
            }
            if (row.description && !grouped[key].product_descriptions.includes(row.description)) {
              grouped[key].product_descriptions.push(row.description);
            }
          }

          // Fetch total_amount from extracted_data for each unique extracted_data_id
          const uniqueExtractedDataIds = [...new Set(rows.map(row => row.extracted_data_id))];
          
          if (uniqueExtractedDataIds.length > 0) {
            const { data: extractedData, error: extractedError } = await supabase
              .from('extracted_data')
              .select('id, data')
              .in('id', uniqueExtractedDataIds);
            
            if (extractedError) {
              console.error('Error fetching extracted data:', extractedError);
            } else if (extractedData) {
              // Create maps of extracted_data_id to total_amount and subtotal
              const totalAmountMap = new Map<string, number>();
              const subtotalMap = new Map<string, number>();
              
              // Helper function to parse numbers with dynamic format detection
              const parseDynamicNumber = (text: string): number => {
                if (!text) return 0;
                
                // Remove all spaces and currency symbols
                let cleanText = text.replace(/\s/g, '').replace(/kr\.?/g, '').replace(/k/g, '');
                
                // Count dots and commas to determine format
                const dotCount = (cleanText.match(/\./g) || []).length;
                const commaCount = (cleanText.match(/,/g) || []).length;
                
                // If there's a comma at the end with 2 digits, it's likely decimal separator (Norwegian format)
                const commaAtEnd = cleanText.match(/,(\d{2})$/);
                
                if (commaAtEnd && dotCount > 0) {
                  // Norwegian format: 1.276.981,00 -> 1276981.00
                  cleanText = cleanText.replace(',', '.');
                  cleanText = cleanText.replace(/\.(?=\d{3})/g, '');
                } else if (commaCount > 0 && dotCount === 0) {
                  // Comma as decimal separator: 1234,56 -> 1234.56
                  cleanText = cleanText.replace(',', '.');
                } else if (dotCount > 0 && commaCount === 0) {
                  // Could be either format, check if last dot is followed by 2 digits
                  const lastDotMatch = cleanText.match(/\.(\d{2})$/);
                  if (lastDotMatch) {
                    // Dot as decimal separator: 1234.56 -> 1234.56
                    // Remove other dots as thousands separators
                    cleanText = cleanText.replace(/\.(?=\d{3})/g, '');
                  } else {
                    // All dots are thousands separators: 1.234.567 -> 1234567
                    cleanText = cleanText.replace(/\./g, '');
                  }
                }
                
                const result = parseFloat(cleanText);
                console.log('Dynamic parsing:', text, '->', cleanText, '->', result);
                return result;
              };
              
              for (const ed of extractedData) {
                try {
                  const data = typeof ed.data === 'string' ? JSON.parse(ed.data) : ed.data;
                  if (data && Array.isArray(data)) {
                    // Find the total_amount and subtotal fields in the extracted data
                    const totalAmountField = data.find((item: { label: string; ocr_text: string }) => item.label === 'total_amount');
                    const subtotalField = data.find((item: { label: string; ocr_text: string }) => item.label === 'subtotal');
                    
                    if (totalAmountField && totalAmountField.ocr_text) {
                      const totalAmount = parseDynamicNumber(totalAmountField.ocr_text);
                      console.log('Documents table - Parsed total_amount:', totalAmount, 'from:', totalAmountField.ocr_text);
                      if (!isNaN(totalAmount) && totalAmount !== 0) {
                        totalAmountMap.set(ed.id, totalAmount);
                      }
                    }
                    
                    if (subtotalField && subtotalField.ocr_text) {
                      const subtotal = parseDynamicNumber(subtotalField.ocr_text);
                      console.log('Documents table - Parsed subtotal:', subtotal, 'from:', subtotalField.ocr_text);
                      if (!isNaN(subtotal) && subtotal !== 0) {
                        subtotalMap.set(ed.id, subtotal);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error parsing extracted data:', error);
                }
              }
              
              // Update the grouped data with total_amount and subtotal
              for (const doc of Object.values(grouped)) {
                // Find the extracted_data_id for this invoice
                const row = rows.find(r => r.invoice_number === doc.invoice_number);
                if (row) {
                  // Update total_amount from extracted data
                  if (totalAmountMap.has(row.extracted_data_id)) {
                    const extractedTotal = totalAmountMap.get(row.extracted_data_id) || 0;
                    console.log('Documents table - Setting total_amount for', doc.invoice_number, ':', extractedTotal);
                    doc.total_amount = extractedTotal;
                  } else {
                    console.log('Documents table - No extracted total_amount for', doc.invoice_number, ', using calculated:', doc.total_effective_price);
                  }
                  
                  // Update subtotal from extracted data
                  if (subtotalMap.has(row.extracted_data_id)) {
                    const extractedSubtotal = subtotalMap.get(row.extracted_data_id) || 0;
                    console.log('Documents table - Setting subtotal for', doc.invoice_number, ':', extractedSubtotal);
                    // Override the calculated total_effective_price with extracted subtotal
                    doc.total_effective_price = extractedSubtotal;
                  } else {
                    console.log('Documents table - No extracted subtotal for', doc.invoice_number, ', using calculated:', doc.total_effective_price);
                  }
                }
              }
            }
          }

           const result = Object.values(grouped);
           return result;
         } catch (err) {
           console.error('Error fetching documents:', err);
           throw err;
         }
       },
       enabled: !!currentOrganization,
       staleTime: STALE_TIMES.FRESH, // Data is fresh for 2 minutes
       gcTime: CACHE_TIMES.MEDIUM, // Keep in cache for 15 minutes
       refetchOnWindowFocus: false,
     });
   };
