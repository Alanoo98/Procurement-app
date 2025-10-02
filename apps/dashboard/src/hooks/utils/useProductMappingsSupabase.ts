import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface ProductMapping {
  id: string;
  source_code: string;
  target_code: string;
  created_at?: string;
  updated_at?: string;
  organization_id?: string;
  business_unit_id?: string;
}

export const useProductMappingsSupabase = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all mappings for the current org/business unit
  const fetchMappings = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('product_mappings')
        .select('*')
        .eq('organization_id', currentOrganization.id);
      if (currentBusinessUnit) {
        query = query.eq('business_unit_id', currentBusinessUnit.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setMappings(data || []);
    } catch (err) {
      setError(err as Error);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, currentBusinessUnit]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // Add a new mapping (variant -> standard)
  const addMapping = async (source_code: string, target_code: string) => {
    if (!currentOrganization) return;
    const { error } = await supabase.from('product_mappings').insert([
      {
        source_code,
        target_code,
        organization_id: currentOrganization.id,
        business_unit_id: currentBusinessUnit?.id || null,
      },
    ]);
    if (error) throw error;
    await fetchMappings();
  };

  // Remove a mapping by id
  const removeMapping = async (id: string) => {
    const { error } = await supabase.from('product_mappings').delete().eq('id', id);
    if (error) throw error;
    await fetchMappings();
  };

  // Normalize a product name to its standard name
  const normalizeProductName = (name: string): string => {
    const mapping = mappings.find((m) => m.source_code.toLowerCase() === name.toLowerCase());
    return mapping ? mapping.target_code : name;
  };

  // Get all unique standard names (target_code)
  const getStandardNames = () => {
    return Array.from(new Set(mappings.map((m) => m.target_code)));
  };

  // Get all variants for a standard name
  const getVariantsForStandard = (target_code: string) => {
    return mappings.filter((m) => m.target_code === target_code);
  };

  return {
    mappings,
    isLoading,
    error,
    fetchMappings,
    addMapping,
    removeMapping,
    normalizeProductName,
    getStandardNames,
    getVariantsForStandard,
  };
}; 
