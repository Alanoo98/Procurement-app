import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useSessionManager } from '@/hooks/auth';
import { useUserData } from '@/hooks/auth';
import { cache } from '@/lib/cache';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  organizations: Organization;
}

export interface BusinessUnit {
  id: string;
  organization_id: string;
  name: string;
  type: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  location_id: string;
  name: string;
  address: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnitUser {
  id: string;
  user_id: string;
  organization_id: string;
  business_unit_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  permissions: any;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  business_units: BusinessUnit;
}

export interface LocationUser {
  id: string;
  user_id: string;
  organization_id: string;
  location_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  permissions: any;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  locations: {
    location_id: string;
    name: string;
    address: string | null;
    organization_id: string;
    business_unit_id: string | null;
    country: string | null;
  };
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  business_unit_access: Array<{
    business_unit_id: string;
    role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    expires_at?: string;
  }>;
  location_access: Array<{
    location_id: string;
    role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    expires_at?: string;
  }>;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  userProfile: UserProfile | null;
  organizations: OrganizationUser[];
  currentOrganization: Organization | null;
  currentRole: 'owner' | 'admin' | 'member' | null;
  accessibleBusinessUnits: BusinessUnitUser[];
  accessibleLocations: LocationUser[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, organizationId?: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  createInvitation: (
    email: string, 
    role: 'owner' | 'admin' | 'member',
    businessUnitAccess?: Array<{ business_unit_id: string; role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'; expires_at?: string }>,
    locationAccess?: Array<{ location_id: string; role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'; expires_at?: string }>
  ) => Promise<OrganizationInvitation>;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
  getOrganizations: () => Promise<Organization[]>;
  getBusinessUnits: () => Promise<BusinessUnit[]>;
  getLocations: () => Promise<Location[]>;
  grantBusinessUnitAccess: (userId: string, businessUnitId: string, role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer', expiresAt?: string) => Promise<void>;
  grantLocationAccess: (userId: string, locationId: string, role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer', expiresAt?: string) => Promise<void>;
  revokeBusinessUnitAccess: (userId: string, businessUnitId: string) => Promise<void>;
  revokeLocationAccess: (userId: string, locationId: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

// Explicitly export the AuthContext to ensure all components reference the same instance
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use session manager hook
  const { user, session, loading: sessionLoading, initialized } = useSessionManager();
  
  // Use user data hook
  const {
    userProfile,
    organizations,
    currentOrganization,
    currentRole,
    accessibleBusinessUnits,
    accessibleLocations,
    loading: userDataLoading,
    switchOrganization: switchOrg,
    refreshUserData,
  } = useUserData(user?.id || null);

  // Combined loading state
  const loading = sessionLoading || (!initialized && userDataLoading);
  const emailVerified = !!user?.email_confirmed_at;

  // Authentication methods

  const validateEmail = (email: string): boolean => {
    // Allow any valid email format for now
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const signUp = useCallback(async (email: string, password: string, organizationId?: string, fullName?: string) => {
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          organization_id: organizationId,
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw error;
    }

    // Account creation success - only show for new signups, not regular usage
    toast.success('Account created! Please check your email and click the verification link to continue.');
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    
    // Clear all cache on sign out
    cache.clear();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      throw error;
    }

    toast.success('Password reset email sent!');
  }, []);

  const resendVerification = useCallback(async () => {
    if (!user?.email) {
      throw new Error('No user email found');
    }

    // Clear any existing session first to ensure a fresh verification email
    await supabase.auth.signOut({ scope: 'local' });
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    toast.success('Verification email sent! Please check your inbox.');
  }, [user?.email]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    if (!user) {
      throw new Error('No user found');
    }

    const success = await switchOrg(organizationId);
    if (success) {
      toast.success(`Switched to ${currentOrganization?.name || 'organization'}`);
    } else {
      throw new Error('Failed to switch organization');
    }
  }, [user, switchOrg, currentOrganization?.name]);

  const createInvitation = useCallback(async (
    email: string, 
    role: 'owner' | 'admin' | 'member',
    businessUnitAccess: Array<{ business_unit_id: string; role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'; expires_at?: string }> = [],
    locationAccess: Array<{ location_id: string; role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'; expires_at?: string }> = []
  ): Promise<OrganizationInvitation> => {
    if (!currentOrganization || !user) {
      throw new Error('No organization selected or user not found');
    }

    if (!['owner', 'admin'].includes(currentRole || '')) {
      throw new Error('Insufficient permissions to create invitations');
    }

    const { data, error } = await supabase.rpc('create_organization_invitation', {
      p_organization_id: currentOrganization.id,
      p_email: email,
      p_role: role,
      p_business_unit_access: businessUnitAccess,
      p_location_access: locationAccess,
    });

    if (error) {
      throw error;
    }

    // Get the created invitation
    const { data: invitation } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('id', data)
      .single();

    if (!invitation) {
      throw new Error('Failed to create invitation');
    }

    toast.success(`Invitation sent to ${email}`);
    return invitation as OrganizationInvitation;
  }, [currentOrganization, user, currentRole]);

  const acceptInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    if (!user) {
      throw new Error('No user found');
    }

    const { data, error } = await supabase.rpc('accept_organization_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) {
      throw error;
    }

    if (data) {
      // Refresh user data to include new organization
      refreshUserData();
      toast.success('Invitation accepted successfully!');
    }

    return data;
  }, [user, refreshUserData]);

  const getOrganizations = useCallback(async (): Promise<Organization[]> => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return data || [];
  }, []);

  const getBusinessUnits = useCallback(async (): Promise<BusinessUnit[]> => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    return data || [];
  }, [currentOrganization]);

  const getLocations = useCallback(async (): Promise<Location[]> => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    return data || [];
  }, [currentOrganization]);

  const grantBusinessUnitAccess = useCallback(async (
    userId: string, 
    businessUnitId: string, 
    role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer', 
    expiresAt?: string
  ): Promise<void> => {
    if (!['owner', 'admin'].includes(currentRole || '')) {
      throw new Error('Insufficient permissions to grant business unit access');
    }

    const { error } = await supabase.rpc('grant_business_unit_access', {
      p_user_id: userId,
      p_business_unit_id: businessUnitId,
      p_role: role,
      p_expires_at: expiresAt || null,
    });

    if (error) {
      throw error;
    }

    toast.success('Business unit access granted successfully');
  }, [currentRole]);

  const grantLocationAccess = useCallback(async (
    userId: string, 
    locationId: string, 
    role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer', 
    expiresAt?: string
  ): Promise<void> => {
    if (!['owner', 'admin'].includes(currentRole || '')) {
      throw new Error('Insufficient permissions to grant location access');
    }

    const { error } = await supabase.rpc('grant_location_access', {
      p_user_id: userId,
      p_location_id: locationId,
      p_role: role,
      p_expires_at: expiresAt || null,
    });

    if (error) {
      throw error;
    }

    toast.success('Location access granted successfully');
  }, [currentRole]);

  const revokeBusinessUnitAccess = useCallback(async (userId: string, businessUnitId: string): Promise<void> => {
    if (!['owner', 'admin'].includes(currentRole || '')) {
      throw new Error('Insufficient permissions to revoke business unit access');
    }

    const { error } = await supabase.rpc('revoke_business_unit_access', {
      p_user_id: userId,
      p_business_unit_id: businessUnitId,
    });

    if (error) {
      throw error;
    }

    toast.success('Business unit access revoked successfully');
  }, [currentRole]);

  const revokeLocationAccess = useCallback(async (userId: string, locationId: string): Promise<void> => {
    if (!['owner', 'admin'].includes(currentRole || '')) {
      throw new Error('Insufficient permissions to revoke location access');
    }

    const { error } = await supabase.rpc('revoke_location_access', {
      p_user_id: userId,
      p_location_id: locationId,
    });

    if (error) {
      throw error;
    }

    toast.success('Location access revoked successfully');
  }, [currentRole]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('No user found');
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    // Refresh user data
    refreshUserData();
    toast.success('Profile updated successfully!');
  }, [user, refreshUserData]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    loading,
    emailVerified,
    userProfile,
    organizations,
    currentOrganization,
    currentRole,
    accessibleBusinessUnits,
    accessibleLocations,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendVerification,
    switchOrganization,
    createInvitation,
    acceptInvitation,
    getOrganizations,
    getBusinessUnits,
    getLocations,
    grantBusinessUnitAccess,
    grantLocationAccess,
    revokeBusinessUnitAccess,
    revokeLocationAccess,
    updateUserProfile,
  }), [
    user,
    session,
    loading,
    emailVerified,
    userProfile,
    organizations,
    currentOrganization,
    currentRole,
    accessibleBusinessUnits,
    accessibleLocations,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendVerification,
    switchOrganization,
    createInvitation,
    acceptInvitation,
    getOrganizations,
    getBusinessUnits,
    getLocations,
    grantBusinessUnitAccess,
    grantLocationAccess,
    revokeBusinessUnitAccess,
    revokeLocationAccess,
    updateUserProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


