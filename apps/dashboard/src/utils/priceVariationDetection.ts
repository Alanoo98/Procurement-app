import { PriceVariationSettings } from '../types';

export interface PricePoint {
  price: number;
  quantity: number;
  restaurant: string;
  invoiceNumber: string;
  date: Date;
}

export interface PriceVariationResult {
  hasVariation: boolean;
  variationPercentage: number;
  previousPrice: number;
  currentPrice: number;
  priceDifference: number;
  overpaidAmount: number;
}

/**
 * Detects price variations based on percentage changes from previous prices
 * This function compares current prices to historical prices within the specified period
 */
export const detectPercentageBasedVariations = (
  pricePoints: PricePoint[],
  settings: PriceVariationSettings
): PriceVariationResult => {
  if (pricePoints.length < 2) {
    return {
      hasVariation: false,
      variationPercentage: 0,
      previousPrice: 0,
      currentPrice: 0,
      priceDifference: 0,
      overpaidAmount: 0,
    };
  }

  // Sort price points by date (newest first)
  const sortedPoints = [...pricePoints].sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Get the most recent price as current price
  const currentPricePoint = sortedPoints[0];
  const currentPrice = currentPricePoint.price;
  
  // Find the most recent previous price (not from the same day)
  const currentDate = new Date(currentPricePoint.date);
  currentDate.setHours(0, 0, 0, 0);
  
  let previousPrice = 0;
  let previousPricePoint: PricePoint | null = null;
  
  for (let i = 1; i < sortedPoints.length; i++) {
    const pointDate = new Date(sortedPoints[i].date);
    pointDate.setHours(0, 0, 0, 0);
    
    // Check if this is a different day
    if (pointDate.getTime() !== currentDate.getTime()) {
      previousPrice = sortedPoints[i].price;
      previousPricePoint = sortedPoints[i];
      break;
    }
  }
  
  // If no previous price found, no variation
  if (previousPrice === 0 || !previousPricePoint) {
    return {
      hasVariation: false,
      variationPercentage: 0,
      previousPrice: 0,
      currentPrice,
      priceDifference: 0,
      overpaidAmount: 0,
    };
  }
  
  // Calculate percentage variation
  const priceDifference = currentPrice - previousPrice;
  const variationPercentage = Math.abs((priceDifference / previousPrice) * 100);
  
  // Check if variation exceeds threshold
  const hasVariation = variationPercentage >= settings.minPriceVariationPercentage;
  
  // Calculate overpaid amount (only if price increased)
  const overpaidAmount = priceDifference > 0 ? priceDifference * currentPricePoint.quantity : 0;
  
  return {
    hasVariation,
    variationPercentage,
    previousPrice,
    currentPrice,
    priceDifference,
    overpaidAmount,
  };
};

/**
 * Detects price variations based on fixed amount differences (legacy method)
 */
export const detectFixedAmountVariations = (
  pricePoints: PricePoint[],
  settings: PriceVariationSettings
): PriceVariationResult => {
  if (pricePoints.length < 2) {
    return {
      hasVariation: false,
      variationPercentage: 0,
      previousPrice: 0,
      currentPrice: 0,
      priceDifference: 0,
      overpaidAmount: 0,
    };
  }

  // Group by date and find variations within the same day
  const dateGroups = new Map<string, PricePoint[]>();
  pricePoints.forEach(point => {
    const dateKey = point.date.toISOString().split('T')[0];
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(point);
  });

  let maxVariation = 0;
  let maxVariationData: {
    basePrice: number;
    maxPrice: number;
    priceDifference: number;
    overpaidAmount: number;
  } | null = null;

  // Check each date group for variations
  dateGroups.forEach(groupPoints => {
    if (groupPoints.length > 1) {
      const prices = groupPoints.map(p => p.price);
      const basePrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceDifference = maxPrice - basePrice;
      
      if (priceDifference >= settings.minPriceDifference) {
        // Calculate overpaid amount
        const overpaidAmount = groupPoints.reduce((total, point) => {
          return total + (point.price - basePrice) * point.quantity;
        }, 0);
        
        if (priceDifference > maxVariation) {
          maxVariation = priceDifference;
          maxVariationData = {
            basePrice,
            maxPrice,
            priceDifference,
            overpaidAmount,
          };
        }
      }
    }
  });

  if (!maxVariationData) {
    return {
      hasVariation: false,
      variationPercentage: 0,
      previousPrice: 0,
      currentPrice: 0,
      priceDifference: 0,
      overpaidAmount: 0,
    };
  }

  return {
    hasVariation: true,
    variationPercentage: (maxVariationData.priceDifference / maxVariationData.basePrice) * 100,
    previousPrice: maxVariationData.basePrice,
    currentPrice: maxVariationData.maxPrice,
    priceDifference: maxVariationData.priceDifference,
    overpaidAmount: maxVariationData.overpaidAmount,
  };
};

/**
 * Main function to detect price variations based on settings
 */
export const detectPriceVariations = (
  pricePoints: PricePoint[],
  settings: PriceVariationSettings
): PriceVariationResult => {
  if (settings.usePercentageBased) {
    return detectPercentageBasedVariations(pricePoints, settings);
  } else {
    return detectFixedAmountVariations(pricePoints, settings);
  }
};






