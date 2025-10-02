import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

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

  const fetchData = async () => {
    if (!currentOrganization) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

             // TODO: Update to work with new category system
      // For now, return empty data since we're using categories instead of individual products
      setData([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrganization]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
