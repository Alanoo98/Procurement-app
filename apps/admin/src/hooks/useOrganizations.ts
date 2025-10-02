import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OrganizationWithStats } from '../types/database';
import { toast } from 'react-hot-toast';

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch organizations with user and business unit counts
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_users(count),
          business_units(count)
        `);

      if (orgsError) throw orgsError;

      // Transform the data to include counts
      const organizationsWithStats: OrganizationWithStats[] = orgsData?.map(org => ({
        ...org,
        user_count: org.organization_users?.[0]?.count || 0,
        business_unit_count: org.business_units?.[0]?.count || 0,
        location_count: 0, // We'll need to fetch this separately or add a view
      })) || [];

      setOrganizations(organizationsWithStats);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (organization: any) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert(organization)
        .select()
        .single();

      if (error) throw error;

      toast.success('Organization created successfully');
      await fetchOrganizations();
      return data;
    } catch (err: any) {
      toast.error('Failed to create organization');
      throw err;
    }
  };

  const updateOrganization = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Organization updated successfully');
      await fetchOrganizations();
      return data;
    } catch (err: any) {
      toast.error('Failed to update organization');
      throw err;
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Organization deleted successfully');
      await fetchOrganizations();
    } catch (err: any) {
      toast.error('Failed to delete organization');
      throw err;
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  };
};
