// Query configuration and cache utilities
export const QUERY_KEYS = {
  // COGS Dashboard
  COGS_DASHBOARD: 'cogs-dashboard',
  COGS_ANALYSIS: 'cogs-analysis',
  
  // Product Analysis
  PRODUCT_SPENDING_ANALYSIS: 'product-spending-analysis',
  PRODUCT_ACROSS_LOCATIONS: 'product-across-locations',
  AVAILABLE_FILTERS: 'available-filters',
  
  // Location and Metrics
  LOCATION_METRICS: 'location-metrics',
  EFFICIENCY_DATA: 'efficiency-data',
  TIME_BASED_EFFICIENCY: 'time-based-efficiency',
  
  // Documents and Data
  DOCUMENTS: 'documents',
  CURRENCIES: 'currencies',
  
  // Budget Management
  MONTHLY_REVENUE: 'monthly-revenue',
  MONTHLY_BUDGET: 'monthly-budget',
  
  // PAX Data
  PAX_DATA: 'pax-data',
  
  // Locations
  LOCATIONS: 'locations',
} as const;

// Cache time configurations (in milliseconds)
export const CACHE_TIMES = {
  // Short cache for frequently changing data
  SHORT: 5 * 60 * 1000, // 5 minutes
  
  // Medium cache for moderately stable data
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  
  // Long cache for stable reference data
  LONG: 60 * 60 * 1000, // 1 hour
  
  // Very long cache for rarely changing data
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Stale time configurations (how long data is considered fresh)
export const STALE_TIMES = {
  // Very fresh for real-time data
  VERY_FRESH: 30 * 1000, // 30 seconds
  
  // Fresh for frequently updated data
  FRESH: 2 * 60 * 1000, // 2 minutes
  
  // Moderately fresh for stable data
  MODERATE: 10 * 60 * 1000, // 10 minutes
  
  // Stale for reference data
  STALE: 30 * 60 * 1000, // 30 minutes
} as const;

// Helper function to create query keys with parameters
export const createQueryKey = (baseKey: string, params?: Record<string, unknown>) => {
  if (!params) return [baseKey];
  
  // Sort params to ensure consistent cache keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, unknown>);
    
  return [baseKey, sortedParams];
};
