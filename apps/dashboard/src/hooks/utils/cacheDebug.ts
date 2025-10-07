/**
 * Cache Debug Utilities
 * Use these to monitor and debug caching performance
 */

import { cache } from '@/lib/cache';

export const cacheDebug = {
  // Get all cache keys
  getAllKeys: () => {
    // Access the private store through the cache instance
    const store = (cache as any).store;
    return Array.from(store.keys());
  },

  // Get cache statistics
  getStats: () => {
    const store = (cache as any).store;
    const keys = Array.from(store.keys());
    const now = Date.now();
    
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const key of keys) {
      const item = store.get(key);
      if (item && (now - item.timestamp) <= item.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalKeys: keys.length,
      validEntries,
      expiredEntries,
      keys: keys.slice(0, 10), // Show first 10 keys
    };
  },

  // Clear all cache
  clearAll: () => {
    cache.clear();
    console.log('🧹 All cache cleared');
  },

  // Clear cache by pattern
  clearPattern: (pattern: string) => {
    cache.clearPattern(pattern);
    console.log(`🧹 Cache cleared for pattern: ${pattern}`);
  },

  // Log cache status
  logStatus: () => {
    const stats = cacheDebug.getStats();
    console.log('📊 Cache Status:', stats);
    return stats;
  },
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).cacheDebug = cacheDebug;
}
