import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCachedData } from './useCachedData';
import { keys } from '@/lib/cache';

export interface LocationWithCountry {
  location_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  organization_id: string;
  business_unit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupedLocations {
  [country: string]: LocationWithCountry[];
}

export const useGroupedLocations = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  
  const { data: locations, loading, error, refetch } = useCachedData<LocationWithCountry[]>({
    key: currentOrganization ? keys.locations(currentOrganization.id, currentBusinessUnit?.id) : '',
    fetcher: async () => {
      if (!currentOrganization) {
        return [];
      }

      let query = supabase
        .from('locations')
        .select('*')
        .eq('organization_id', currentOrganization.id);
        
      // Filter by business unit if selected
      if (currentBusinessUnit && currentBusinessUnit.id) {
        query = query.eq('business_unit_id', currentBusinessUnit.id);
      }
      
      const { data, error } = await query.order('name');

      if (error) throw error;
      return data || [];
    },
    ttl: 15 * 60 * 1000, // 15 minutes
    enabled: !!currentOrganization,
  });

  // Group locations by country
  const groupedLocations = useMemo((): GroupedLocations => {
    const grouped: GroupedLocations = {};
    
    (locations || []).forEach(location => {
      const country = location.country || 'Unknown';
      if (!grouped[country]) {
        grouped[country] = [];
      }
      grouped[country].push(location);
    });
    
    return grouped;
  }, [locations]);

  // Sort countries alphabetically
  const sortedCountries = useMemo(() => {
    return Object.keys(groupedLocations).sort();
  }, [groupedLocations]);

  // Create options for react-select
  const locationOptions = useMemo(() => {
    const options: Array<{
      value: string;
      label: string;
      country: string;
      location: LocationWithCountry;
    }> = [];

    sortedCountries.forEach(country => {
      const countryLocations = groupedLocations[country];
      countryLocations.forEach(location => {
        options.push({
          value: location.location_id,
          label: location.name,
          country: country,
          location: location,
        });
      });
    });

    return options;
  }, [groupedLocations, sortedCountries]);

  return {
    locations: locations || [],
    groupedLocations,
    sortedCountries,
    locationOptions,
    isLoading: loading,
    error,
    refetch,
  };
};
