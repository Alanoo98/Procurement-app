/**
 * Utility function to get the effective price value, prioritizing the after-discount value if available
 * @param afterDiscount The price after discount (may be null or undefined)
 * @param original The original price
 * @returns The effective price value
 */
export const getPriceValue = (afterDiscount: number | null | undefined, original: number | null | undefined): number => {
  // If afterDiscount is a valid number (including 0 and negative values), use it
  if (afterDiscount !== null && afterDiscount !== undefined && !isNaN(afterDiscount)) {
    return afterDiscount;
  }
  
  // Otherwise, use original price or default to 0
  return original !== null && original !== undefined && !isNaN(original) ? original : 0;
};