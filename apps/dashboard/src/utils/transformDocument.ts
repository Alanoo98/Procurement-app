import { getPriceValue } from './getPriceValue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const transformDocument = (rows: any[]) => {
  if (!rows.length) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = rows[0] as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = rows.map((r: any) => {
    let unitPrice = getPriceValue(r.unit_price_after_discount, r.unit_price) ? Number(Number(getPriceValue(r.unit_price_after_discount, r.unit_price)).toFixed(2)) : 0;
    const quantity = Number(r.quantity) || 0;
    
    // Handle credit notes: they should show negative values in the UI
    const documentType = r.document_type || '';
    if (documentType.toLowerCase().includes('kreditnota') || 
        documentType.toLowerCase().includes('credit')) {
      // For credit notes, we want to show negative values
      unitPrice = -Math.abs(unitPrice);
    }
    // If price is already negative from ETL processing, keep it negative
    else if (unitPrice < 0) {
      // Price is already negative from ETL processing - keep it negative
    }
    
    // Use the raw database values for totals - no calculations, no fallbacks
    let totalAfterDiscount = r.total_price_after_discount !== null && r.total_price_after_discount !== undefined ? Number(Number(r.total_price_after_discount).toFixed(2)) : null;
    let totalOriginal = r.total_price !== null && r.total_price !== undefined ? Number(Number(r.total_price).toFixed(2)) : null;
    
    // Apply credit note logic to totals as well
    if (documentType.toLowerCase().includes('kreditnota') || 
        documentType.toLowerCase().includes('credit')) {
      if (totalAfterDiscount !== null) totalAfterDiscount = -Math.abs(totalAfterDiscount);
      if (totalOriginal !== null) totalOriginal = -Math.abs(totalOriginal);
    }
    // If totals are already negative from ETL processing, keep them negative
    else {
      if (totalAfterDiscount !== null && totalAfterDiscount < 0) {
        // Already negative from ETL processing - keep it negative
      }
      if (totalOriginal !== null && totalOriginal < 0) {
        // Already negative from ETL processing - keep it negative
      }
    }
    
    console.log('Item data from database:', {
      description: r.description,
      quantity,
      unitPrice,
      totalAfterDiscount,
      totalOriginal,
      unit_price_after_discount: r.unit_price_after_discount,
      unit_price: r.unit_price,
      total_price_after_discount: r.total_price_after_discount,
      total_price: r.total_price
    });
    
    return {
      id: r.id,
      description: r.description,
      productCode: r.product_code,
      quantity: r.quantity,
      unitType: r.unit_type,
      unitSubtype: r.unit_subtype,
      subquantity: r.sub_quantity,
      unitPrice: unitPrice || null,
      unitPriceOriginal: r.unit_price ? Number(Number(r.unit_price).toFixed(2)) : null,
      total: totalAfterDiscount,
      totalOriginal: totalOriginal,
      hasDiscount: r.unit_price_after_discount !== null && r.unit_price_after_discount !== r.unit_price,
    };
  });

  // Use total_amount and subtotal from extracted data if available, otherwise calculate from line items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extractedTotal = rows.length > 0 ? (rows[0] as any).total_amount : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extractedSubtotal = rows.length > 0 ? (rows[0] as any).subtotal : null;
  
  // Take total_tax from the first row (it's the same for all line items in an invoice)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tax = rows.length > 0 ? (rows[0] as any).total_tax || null : null;
  
  // Handle credit notes for extracted values
  const documentType = rows.length > 0 ? (rows[0] as any).document_type || '' : '';
  if (documentType.toLowerCase().includes('kreditnota') || 
      documentType.toLowerCase().includes('credit')) {
    // For credit notes, make extracted values negative
    if (extractedTotal !== null) extractedTotal = -Math.abs(extractedTotal);
    if (extractedSubtotal !== null) extractedSubtotal = -Math.abs(extractedSubtotal);
    if (tax !== null) tax = -Math.abs(tax);
  }
  // If values are already negative from ETL processing, keep them negative
  else {
    if (extractedTotal !== null && extractedTotal < 0) {
      // Already negative from ETL processing - keep it negative
    }
    if (extractedSubtotal !== null && extractedSubtotal < 0) {
      // Already negative from ETL processing - keep it negative
    }
    if (tax !== null && tax < 0) {
      // Already negative from ETL processing - keep it negative
    }
  }
  
  // Calculate totals from line items as fallback
  const calculatedTotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
  const calculatedSubtotal = items.reduce((sum, i) => sum + ((i.unitPrice || 0) * (i.quantity || 0)), 0);
  
  // Use extracted values if they exist, otherwise use calculated values
  // The ETL pipeline now handles the parsing and validation of extracted totals
  const total = extractedTotal && extractedTotal !== 0 ? extractedTotal : calculatedTotal;
  
  const full = (extractedSubtotal && extractedSubtotal !== 0) ? extractedSubtotal : calculatedSubtotal;
  
  // Debug logging
  console.log('TransformDocument Debug:', {
    extractedTotal,
    extractedSubtotal,
    calculatedTotal,
    calculatedSubtotal,
    tax,
    finalTotal: total,
    finalSubtotal: full,
    calculationMethod: extractedTotal && extractedTotal > 0 ? 'extracted' : 'calculated',
    items: items.map(i => ({ 
      description: i.description, 
      quantity: i.quantity, 
      unitPrice: i.unitPrice, 
      total: i.total,
      totalOriginal: i.totalOriginal
    }))
  });

  return {
    invoiceNumber: first.invoice_number,
    documentType: first.document_type,
    dates: {
      invoice: first.invoice_date,
      due: first.due_date,
    },
    supplier: first.suppliers ?? { name: "—", address: null, tax_id: null },
    receiver: first.locations ?? { name: "—", address: null },
    items,
    amounts: {
      subtotal: full,
      tax: tax,
      total: total
    },
  };
};