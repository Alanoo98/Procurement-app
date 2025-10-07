/**
 * CACHING TEMPLATE FOR HOOKS
 * 
 * Use this template to add intelligent caching to any data hook.
 * This ensures consistent performance across your entire app.
 */

import { useCallback, useMemo } from 'react';
import { cache } from '@/lib/cache';

/**
 * Template for adding caching to any hook
 * 
 * @param hookName - Name of the hook (e.g., 'products', 'suppliers')
 * @param params - Parameters that affect the cache key
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 */
export function createCachingHelpers<T>(
  hookName: string,
  params: Record<string, any>,
  ttl: number = 5 * 60 * 1000
) {
  // Create cache key based on parameters
  const cacheKey = useMemo(() => {
    const paramHash = JSON.stringify(params);
    return `${hookName}:${btoa(paramHash)}`;
  }, [hookName, params]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    return cache.get<T>(cacheKey);
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: T) => {
    if (!cacheKey) return;
    cache.set(cacheKey, data, ttl);
  }, [cacheKey, ttl]);

  // Clear cache (useful for invalidation)
  const clearCache = useCallback(() => {
    if (cacheKey) {
      cache.delete(cacheKey);
    }
  }, [cacheKey]);

  return {
    cacheKey,
    getCachedData,
    setCachedData,
    clearCache,
  };
}

/**
 * EXAMPLE: How to use this template in a hook
 * 
 * export const useMyData = () => {
 *   const { currentOrganization } = useOrganization();
 *   const [data, setData] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 * 
 *   // Create caching helpers
 *   const { getCachedData, setCachedData, clearCache } = createCachingHelpers(
 *     'mydata',
 *     { orgId: currentOrganization?.id },
 *     10 * 60 * 1000 // 10 minutes
 *   );
 * 
 *   const fetchData = async () => {
 *     // Check cache first
 *     const cached = getCachedData();
 *     if (cached) {
 *       setData(cached);
 *       setLoading(false);
 *       return;
 *     }
 * 
 *     // Fetch from API
 *     setLoading(true);
 *     try {
 *       const result = await apiCall();
 *       setData(result);
 *       setCachedData(result); // Cache the result
 *     } catch (err) {
 *       setError(err);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   // CRUD operations should clear cache
 *   const addItem = async (item) => {
 *     await apiAdd(item);
 *     clearCache(); // Clear cache when data changes
 *     fetchData(); // Refetch
 *   };
 * 
 *   return { data, loading, error, addItem };
 * };
 */
