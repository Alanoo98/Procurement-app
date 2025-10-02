import { useState, useEffect, useCallback } from 'react';
import { cache } from '@/lib/cache';

interface UseCachedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  enabled?: boolean;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clear: () => void;
}

/**
 * Simple, clean hook for cached data
 * No complex logic, just works
 */
export function useCachedData<T>({
  key,
  fetcher,
  ttl,
  enabled = true,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = cache.get<T>(key);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    // Fetch from API
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      cache.set(key, result, ttl);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  const refetch = useCallback(async () => {
    cache.delete(key);
    await fetchData();
  }, [key, fetchData]);

  const clear = useCallback(() => {
    cache.delete(key);
    setData(null);
    setError(null);
  }, [key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, clear };
}
