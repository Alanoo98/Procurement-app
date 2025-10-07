/**
 * UNIFIED INTELLIGENT CACHING SYSTEM
 * 
 * This single file handles ALL caching needs:
 * - Simple caching for basic data
 * - Intelligent subset caching for filtered data
 * - Automatic cache management
 */

interface FilterSet {
  dateRange?: { start: string; end: string };
  restaurants?: string[];
  suppliers?: string[];
  categories?: string[];
  documentType?: string;
  productSearch?: Record<string, unknown>;
  productCodeFilter?: string;
}

interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  filters?: FilterSet; // For intelligent caching
}

class UnifiedCache {
  private store = new Map<string, CacheItem<unknown>>();
  private defaultTTL = 30 * 60 * 1000; // 30 minutes
  private storageKey = 'procurement-cache';

  constructor() {
    // Disabled localStorage persistence to prevent storage bloat
    // Memory-only caching is safer for large datasets
    // this.loadFromStorage();
  }

  /**
   * Load cache from localStorage on initialization
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, item] of Object.entries(data)) {
          // Check if item is still valid (not expired)
          const cacheItem = item as CacheItem<unknown>;
          if (Date.now() - cacheItem.timestamp < cacheItem.ttl) {
            this.store.set(key, cacheItem);
          }
        }
        console.log('🔄 Loaded cache from localStorage:', this.store.size, 'items');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data: Record<string, CacheItem<unknown>> = {};
      for (const [key, item] of this.store.entries()) {
        data[key] = item;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save cache to localStorage:', error);
    }
  }

  /**
   * SIMPLE CACHING - For basic data without filters
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
    // Disabled localStorage persistence to prevent storage bloat
    // this.saveToStorage();
  }

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.store.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * INTELLIGENT CACHING - For filtered data with subset detection
   */
  setIntelligent<T>(key: string, data: T, filters: FilterSet, ttl?: number): void {
    this.store.set(key, {
      data,
      filters,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
    // Disabled localStorage persistence to prevent storage bloat
    // this.saveToStorage();
  }

  getIntelligent<T>(key: string, requestedFilters: FilterSet): T | null {
    const entry = this.store.get(key);
    if (!entry || !entry.filters) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    // Check if requested filters are a subset of cached data
    if (this.isSubset(requestedFilters, entry.filters)) {
      console.log(`🎯 Intelligent cache hit: ${key} - serving subset from larger dataset`);
      return this.filterData(entry.data as unknown[], requestedFilters, entry.filters) as T;
    }

    return null;
  }

  /**
   * Check if requested filters are a subset of cached data
   */
  private isSubset(requested: FilterSet, cached: FilterSet): boolean {
    // Date range subset check
    if (requested.dateRange && cached.dateRange) {
      const reqStart = new Date(requested.dateRange.start);
      const reqEnd = new Date(requested.dateRange.end);
      const cacheStart = new Date(cached.dateRange.start);
      const cacheEnd = new Date(cached.dateRange.end);
      
      if (reqStart < cacheStart || reqEnd > cacheEnd) {
        return false;
      }
    }

    // Restaurants subset check
    if (requested.restaurants && cached.restaurants) {
      if (!requested.restaurants.every(r => cached.restaurants!.includes(r))) {
        return false;
      }
    }

    // Suppliers subset check
    if (requested.suppliers && cached.suppliers) {
      if (!requested.suppliers.every(s => cached.suppliers!.includes(s))) {
        return false;
      }
    }

    // Categories subset check
    if (requested.categories && cached.categories) {
      if (!requested.categories.every(c => cached.categories!.includes(c))) {
        return false;
      }
    }

    // Document type exact match
    if (requested.documentType && cached.documentType) {
      if (requested.documentType !== cached.documentType) {
        return false;
      }
    }

    // Product search exact match
    if (requested.productSearch && cached.productSearch) {
      if (JSON.stringify(requested.productSearch) !== JSON.stringify(cached.productSearch)) {
        return false;
      }
    }

    // Product code filter exact match
    if (requested.productCodeFilter && cached.productCodeFilter) {
      if (requested.productCodeFilter !== cached.productCodeFilter) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter data based on requested filters
   */
  private filterData<T>(data: T[], requested: FilterSet, cached: FilterSet): T[] {
    let filtered = [...data];

    // Apply date range filtering
    if (requested.dateRange && cached.dateRange) {
      const reqStart = new Date(requested.dateRange.start);
      const reqEnd = new Date(requested.dateRange.end);
      
      filtered = filtered.filter((item: unknown) => {
        const record = item as Record<string, unknown>;
        if (!record.invoice_date) return true;
        const itemDate = new Date(record.invoice_date as string);
        return itemDate >= reqStart && itemDate <= reqEnd;
      });
    }

    // Apply restaurant filtering
    if (requested.restaurants && cached.restaurants) {
      filtered = filtered.filter((item: unknown) => {
        const record = item as Record<string, unknown>;
        return requested.restaurants!.includes(record.location_id as string);
      });
    }

    // Apply supplier filtering
    if (requested.suppliers && cached.suppliers) {
      filtered = filtered.filter((item: unknown) => {
        const record = item as Record<string, unknown>;
        return requested.suppliers!.includes(record.supplier_id as string);
      });
    }

    // Apply category filtering
    if (requested.categories && cached.categories) {
      filtered = filtered.filter((item: unknown) => {
        const record = item as Record<string, unknown>;
        return requested.categories!.includes(record.category_id as string);
      });
    }

    return filtered;
  }

  // Basic cache operations
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
    // Disabled localStorage persistence to prevent storage bloat
    // this.saveToStorage();
  }

  clear(): void {
    this.store.clear();
    // Disabled localStorage persistence to prevent storage bloat
    // this.saveToStorage();
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
    // Disabled localStorage persistence to prevent storage bloat
    // this.saveToStorage();
  }

  // Get cache statistics
  getStats() {
    const entries = Array.from(this.store.entries());
    return {
      totalEntries: entries.length,
      entries: entries.map(([key, entry]) => ({
        key,
        dataSize: Array.isArray(entry.data) ? entry.data.length : 'unknown',
        filters: entry.filters,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
      })),
    };
  }

  // Clear localStorage cache (useful for debugging)
  clearStorage(): void {
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ Cleared localStorage cache');
  }

  // Get localStorage cache size
  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.stringify(JSON.parse(stored)).length : 0;
    } catch {
      return 0;
    }
  }
}

// Global unified cache instance
export const cache = new UnifiedCache();

// Cache key helpers
export const keys = {
  user: (id: string) => `user:${id}`,
  orgs: (userId: string) => `orgs:${userId}`,
  locations: (orgId: string, buId?: string) => `locations:${orgId}:${buId || 'all'}`,
  suppliers: (orgId: string) => `suppliers:${orgId}`,
  products: (orgId: string, filters?: string) => `products:${orgId}:${filters || 'all'}`,
  dashboard: (orgId: string, buId?: string) => `dashboard:${orgId}:${buId || 'all'}`,
} as const;

// Intelligent cache helpers
export const createIntelligentCacheKey = (
  dataType: string,
  orgId: string,
  filters: FilterSet,
  buId?: string
): string => {
  const filterHash = JSON.stringify({
    orgId,
    buId,
    ...filters,
  });
  return `${dataType}:${btoa(filterHash)}`;
};

export const getIntelligentCache = <T>(
  dataType: string,
  orgId: string,
  filters: FilterSet,
  buId?: string
): T | null => {
  const key = createIntelligentCacheKey(dataType, orgId, filters, buId);
  return cache.getIntelligent<T>(key, filters);
};

export const setIntelligentCache = <T>(
  dataType: string,
  orgId: string,
  filters: FilterSet,
  data: T,
  ttl?: number,
  buId?: string
): void => {
  const key = createIntelligentCacheKey(dataType, orgId, filters, buId);
  cache.setIntelligent(key, data, filters, ttl);
};
