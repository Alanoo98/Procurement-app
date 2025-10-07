import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cache } from '@/lib/cache';

export interface ProductDisplay {
  product_id: string;
  product_code: string;
  description: string;
  supplier_id: string;
  supplier_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAllProducts = () => {
  const [data, setData] = useState<ProductDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentOrganization } = useOrganization();

  // Create cache key
  const cacheKey = useMemo(() => {
    if (!currentOrganization) return '';
    return `products:${currentOrganization.id}`;
  }, [currentOrganization]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    return cache.get<ProductDisplay[]>(cacheKey);
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: ProductDisplay[]) => {
    if (!cacheKey) return;
    cache.set(cacheKey, data, 15 * 60 * 1000); // 15 minutes cache
  }, [cacheKey]);

  const fetchData = async () => {
    if (!currentOrganization) {
      setData([]);
      setLoading(false);
      return;
    }

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Update to work with new category system
      // For now, return empty data since we're using categories instead of individual products
      const products: ProductDisplay[] = [];
      setData(products);
      setCachedData(products); // Cache the result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrganization, getCachedData, setCachedData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
