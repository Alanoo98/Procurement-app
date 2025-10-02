/**
 * Clean, unified caching system for the procurement app
 * Simple, efficient, and easy to use
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private store = new Map<string, CacheItem<any>>();
  private defaultTTL = 30 * 60 * 1000; // 30 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.store.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

// Global cache instance
export const cache = new Cache();

// Cache key helpers
export const keys = {
  user: (id: string) => `user:${id}`,
  orgs: (userId: string) => `orgs:${userId}`,
  locations: (orgId: string, buId?: string) => `locations:${orgId}:${buId || 'all'}`,
  suppliers: (orgId: string) => `suppliers:${orgId}`,
  products: (orgId: string, filters?: string) => `products:${orgId}:${filters || 'all'}`,
  dashboard: (orgId: string, buId?: string) => `dashboard:${orgId}:${buId || 'all'}`,
} as const;
