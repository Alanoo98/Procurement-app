import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES, createQueryKey } from '@/hooks/utils/queryConfig';

export interface Location {
  location_id: string;
  name: string;
  address?: string;
  organization_id: string;
}

export const useLocations = () => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.LOCATIONS, {
      organizationId: currentOrganization?.id,
    }),
    queryFn: async (): Promise<Location[]> => {
      if (!currentOrganization) {
        return [];
      }

      const { data, error } = await supabase
        .from('locations')
        .select('location_id, name, address, organization_id')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!currentOrganization,
    staleTime: STALE_TIMES.STALE, // Locations don't change often
    gcTime: CACHE_TIMES.LONG, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
  });
};