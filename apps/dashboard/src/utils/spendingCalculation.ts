/**
 * Unified spending calculation utility
 * This ensures both COGS Dashboard and Deep Dive Analysis use exactly the same logic
 */

import { getPriceValue } from './getPriceValue';

export interface SpendingCalculationResult {
  totalSpend: number;
  recordCount: number;
  recordsUsingPriceAfterDiscount: number;
  recordsUsingTotalPrice: number;
  sumPriceAfterDiscount: number;
  sumTotalPrice: number;
}

/**
 * Calculate total spending using the standard logic:
 * Use getPriceValue to properly handle negative values (credits/refunds)
 */
export function calculateSpending(spendingData: Array<{ 
  total_price_after_discount?: string | number | null; 
  total_price?: string | number | null;
  document_type?: string;
  quantity?: number;
}>): SpendingCalculationResult {
  let totalSpend = 0;
  let recordsUsingPriceAfterDiscount = 0;
  let recordsUsingTotalPrice = 0;
  let sumPriceAfterDiscount = 0;
  let sumTotalPrice = 0;

  spendingData?.forEach(item => {
    const priceAfterDiscount = parseFloat(String(item.total_price_after_discount || '0'));
    const totalPrice = parseFloat(String(item.total_price || '0'));
    const documentType = item.document_type || '';
    const quantity = item.quantity || 0;
    
    sumPriceAfterDiscount += priceAfterDiscount;
    sumTotalPrice += totalPrice;
    
    // Use getPriceValue to properly handle negative values
    let spend = getPriceValue(
      item.total_price_after_discount ? parseFloat(String(item.total_price_after_discount)) : null,
      item.total_price ? parseFloat(String(item.total_price)) : null
    );
    
    // Handle credit notes: they should reduce total spending
    // Credit notes are identified by document type or already negative prices from ETL processing
    if (documentType.toLowerCase().includes('kreditnota') || 
        documentType.toLowerCase().includes('credit')) {
      // For credit notes, we want to subtract the absolute value
      spend = -Math.abs(spend);
    }
    // If price is already negative from ETL processing, keep it negative
    else if (spend < 0) {
      // Price is already negative from ETL processing - keep it negative
    }
    
    totalSpend += spend;
    
    if (priceAfterDiscount !== null && priceAfterDiscount !== undefined && !isNaN(priceAfterDiscount)) {
      recordsUsingPriceAfterDiscount++;
    } else if (totalPrice !== null && totalPrice !== undefined && !isNaN(totalPrice)) {
      recordsUsingTotalPrice++;
    }
  });

  return {
    totalSpend,
    recordCount: spendingData?.length || 0,
    recordsUsingPriceAfterDiscount,
    recordsUsingTotalPrice,
    sumPriceAfterDiscount,
    sumTotalPrice
  };
}

