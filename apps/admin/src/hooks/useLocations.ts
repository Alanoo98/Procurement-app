import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LocationWithDetails } from '../types/database';
import { toast } from 'react-hot-toast';

export const useLocations = () => {
  const [locations, setLocations] = useState<LocationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch locations with organization and business unit details
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select(`
          *,
          organizations (*),
          business_units (*)
        `)
        .order('created_at', { ascending: false });

      if (locationsError) throw locationsError;

      // Transform the data to include organization and business unit details
      const locationsWithDetails: LocationWithDetails[] = locationsData?.map((location: any) => ({
        ...location,
        organization: location.organizations,
        business_unit: location.business_units,
      })) || [];

      setLocations(locationsWithDetails);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async (location: any) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select(`
          *,
          organizations (*),
          business_units (*)
        `)
        .single();

      if (error) throw error;

      toast.success('Location created successfully');
      await fetchLocations();
      return data;
    } catch (err: any) {
      toast.error('Failed to create location');
      throw err;
    }
  };

  const updateLocation = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('location_id', id)
        .select(`
          *,
          organizations (*),
          business_units (*)
        `)
        .single();

      if (error) throw error;

      toast.success('Location updated successfully');
      await fetchLocations();
      return data;
    } catch (err: any) {
      toast.error('Failed to update location');
      throw err;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('location_id', id);

      if (error) throw error;

      toast.success('Location deleted successfully');
      await fetchLocations();
    } catch (err: any) {
      toast.error('Failed to delete location');
      throw err;
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
};
