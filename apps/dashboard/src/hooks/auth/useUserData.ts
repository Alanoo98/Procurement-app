import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserProfile, 
  OrganizationUser, 
  BusinessUnitUser, 
  LocationUser,
  Organization
} from '@/contexts/AuthContext';
import { useCachedData } from '../data/useCachedData';
import { keys } from '@/lib/cache';

interface UserData {
  userProfile: UserProfile | null;
  organizations: OrganizationUser[];
  currentOrganization: Organization | null;
  currentRole: 'owner' | 'admin' | 'member' | null;
  accessibleBusinessUnits: BusinessUnitUser[];
  accessibleLocations: LocationUser[];
}

export const useUserData = (userId: string | null) => {
  const { data, loading, error, refetch } = useCachedData<UserData>({
    key: userId ? keys.user(userId) : '',
    fetcher: async () => {
      if (!userId) throw new Error('No user ID provided');
      return await loadUserData(userId);
    },
    ttl: 30 * 60 * 1000, // 30 minutes
    enabled: !!userId,
  });

  const loadUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('Profile loading error:', error);
      return null;
    }
    
    return profile;
  }, []);

  const loadUserOrganizations = useCallback(async (userId: string): Promise<OrganizationUser[]> => {
    const { data: orgUsers, error } = await supabase
      .from('organization_users')
      .select(`
        organization_id,
        user_id,
        role,
        created_at,
        organizations (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.warn('Organization loading error:', error);
      return [];
    }

    return (orgUsers as unknown as OrganizationUser[]) || [];
  }, []);

  const loadBusinessUnitAccess = useCallback(async (userId: string): Promise<BusinessUnitUser[]> => {
    const { data: businessUnitUsers, error } = await supabase
      .from('user_business_unit_access')
      .select(`
        *,
        business_units (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      console.warn('Business unit access loading error:', error);
      return [];
    }

    return (businessUnitUsers as BusinessUnitUser[]) || [];
  }, []);

  const loadLocationAccess = useCallback(async (userId: string): Promise<LocationUser[]> => {
    const { data: locationUsers, error } = await supabase
      .from('user_location_access')
      .select(`
        *,
        locations (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      console.warn('Location access loading error:', error);
      return [];
    }

    return (locationUsers as LocationUser[]) || [];
  }, []);

  const loadUserData = useCallback(async (userId: string): Promise<UserData> => {
    console.log('Loading user data for:', userId);
    
    // Load all user data in parallel
    const [profile, organizations, businessUnitAccess, locationAccess] = await Promise.all([
      loadUserProfile(userId),
      loadUserOrganizations(userId),
      loadBusinessUnitAccess(userId),
      loadLocationAccess(userId),
    ]);

    // Determine current organization and role
    let currentOrganization: Organization | null = null;
    let currentRole: 'owner' | 'admin' | 'member' | null = null;

    if (organizations.length > 0) {
      // Use primary organization from profile, or first available
      if (profile?.organization_id) {
        const primaryOrg = organizations.find(ou => ou.organization_id === profile.organization_id);
        if (primaryOrg) {
          currentOrganization = primaryOrg.organizations as Organization;
          currentRole = primaryOrg.role as 'owner' | 'admin' | 'member';
        }
      }
      
      // Fallback to first organization
      if (!currentOrganization && organizations.length > 0) {
        currentOrganization = organizations[0].organizations as Organization;
        currentRole = organizations[0].role as 'owner' | 'admin' | 'member';
      }
    }

    console.log('User data loading completed');

    return {
      userProfile: profile,
      organizations,
      currentOrganization,
      currentRole,
      accessibleBusinessUnits: businessUnitAccess,
      accessibleLocations: locationAccess,
    };
  }, [loadUserProfile, loadUserOrganizations, loadBusinessUnitAccess, loadLocationAccess]);

  const switchOrganization = useCallback(async (organizationId: string, userId: string) => {
    try {
      const organization = data?.organizations.find(ou => ou.organization_id === organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Update user profile with new primary organization
      const { error } = await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Clear cache and refetch
      refetch();

      return true;
    } catch (error) {
      console.error('Error switching organization:', error);
      return false;
    }
  }, [data?.organizations, refetch]);

  return {
    userProfile: data?.userProfile || null,
    organizations: data?.organizations || [],
    currentOrganization: data?.currentOrganization || null,
    currentRole: data?.currentRole || null,
    accessibleBusinessUnits: data?.accessibleBusinessUnits || [],
    accessibleLocations: data?.accessibleLocations || [],
    loading,
    error: error?.message || null,
    switchOrganization: (organizationId: string) => switchOrganization(organizationId, userId!),
    refreshUserData: refetch,
  };
};
