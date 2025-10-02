import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface BusinessUnitWithLocations {
  id: string;
  name: string;
  type: string | null;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  locations: Array<{
    location_id: string;
    name: string;
    address: string | null;
    country: string | null;
    business_unit_id: string | null;
  }>;
  countries: string[];
  primaryCountry: string | null;
}

export interface GroupedBusinessUnits {
  [country: string]: BusinessUnitWithLocations[];
}

export const useBusinessUnitsWithLocations = () => {
  const { currentOrganization } = useOrganization();
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitWithLocations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBusinessUnitsWithLocations = async () => {
      if (!currentOrganization) {
        setBusinessUnits([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch business units with their locations
        const { data: businessUnitsData, error: buError } = await supabase
          .from('business_units')
          .select(`
            *,
            locations (
              location_id,
              name,
              address,
              country,
              business_unit_id
            )
          `)
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true)
          .order('name');

        if (buError) throw buError;

        // Process the data to include country information
        const processedBusinessUnits: BusinessUnitWithLocations[] = (businessUnitsData || []).map(bu => {
          const locations = bu.locations || [];
          const countries = [...new Set(locations.map(loc => loc.country).filter(Boolean))] as string[];
          const primaryCountry = countries.length > 0 ? countries[0] : null;

          return {
            ...bu,
            locations,
            countries,
            primaryCountry,
          };
        });

        setBusinessUnits(processedBusinessUnits);
      } catch (err) {
        console.error('Error fetching business units with locations:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessUnitsWithLocations();
  }, [currentOrganization]);

  // Group business units by country
  const groupedBusinessUnits = useMemo((): GroupedBusinessUnits => {
    const grouped: GroupedBusinessUnits = {};

    businessUnits.forEach(bu => {
      if (bu.primaryCountry) {
        if (!grouped[bu.primaryCountry]) {
          grouped[bu.primaryCountry] = [];
        }
        grouped[bu.primaryCountry].push(bu);
      } else {
        // Business units without a country go to "Other"
        if (!grouped['Other']) {
          grouped['Other'] = [];
        }
        grouped['Other'].push(bu);
      }
    });

    // Sort business units within each country group
    Object.keys(grouped).forEach(country => {
      grouped[country].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [businessUnits]);

  // Get sorted country list
  const sortedCountries = useMemo(() => {
    const countries = Object.keys(groupedBusinessUnits);
    return countries.sort((a, b) => {
      // Put "Other" at the end
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [groupedBusinessUnits]);

  return {
    businessUnits,
    groupedBusinessUnits,
    sortedCountries,
    isLoading,
    error,
  };
};
