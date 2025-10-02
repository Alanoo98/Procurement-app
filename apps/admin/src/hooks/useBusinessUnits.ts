import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BusinessUnitWithStats } from '../types/database';
import { toast } from 'react-hot-toast';

export const useBusinessUnits = () => {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessUnits = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch business units with organization details and counts
      const { data: businessUnitsData, error: businessUnitsError } = await supabase
        .from('business_units')
        .select(`
          *,
          organizations (*),
          locations(count)
        `);

      if (businessUnitsError) throw businessUnitsError;

      // Transform the data to include counts
      const businessUnitsWithStats: BusinessUnitWithStats[] = businessUnitsData?.map(unit => ({
        ...unit,
        organization: unit.organizations,
        location_count: unit.locations?.[0]?.count || 0,
        user_count: 0, // We'll need to fetch this separately or add a view
      })) || [];

      setBusinessUnits(businessUnitsWithStats);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch business units');
    } finally {
      setLoading(false);
    }
  };

  const createBusinessUnit = async (businessUnit: any) => {
    try {
      const { data, error } = await supabase
        .from('business_units')
        .insert(businessUnit)
        .select()
        .single();

      if (error) throw error;

      toast.success('Business unit created successfully');
      await fetchBusinessUnits();
      return data;
    } catch (err: any) {
      toast.error('Failed to create business unit');
      throw err;
    }
  };

  const updateBusinessUnit = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('business_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Business unit updated successfully');
      await fetchBusinessUnits();
      return data;
    } catch (err: any) {
      toast.error('Failed to update business unit');
      throw err;
    }
  };

  const deleteBusinessUnit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('business_units')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Business unit deleted successfully');
      await fetchBusinessUnits();
    } catch (err: any) {
      toast.error('Failed to delete business unit');
      throw err;
    }
  };

  useEffect(() => {
    fetchBusinessUnits();
  }, []);

  return {
    businessUnits,
    loading,
    error,
    refetch: fetchBusinessUnits,
    createBusinessUnit,
    updateBusinessUnit,
    deleteBusinessUnit,
  };
};
