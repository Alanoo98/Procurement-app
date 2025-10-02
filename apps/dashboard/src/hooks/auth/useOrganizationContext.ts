import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: any;
}

export interface BusinessUnit {
  id: string;
  name: string;
  type?: string;
  organization_id: string;
}

interface OrgUser {
  organization_id: string;
  role: string;
  organizations: Organization;
}

export const useOrganizationContext = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [currentBusinessUnit, setCurrentBusinessUnit] = useState<BusinessUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user's organizations
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchOrganizations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: orgUsers, error: orgUsersError } = await supabase
          .from('organization_users')
          .select('organization_id, role, organizations(id, name, slug, settings)')
          .eq('user_id', user.id);

        if (orgUsersError) throw orgUsersError;

        const orgs = (orgUsers as OrgUser[]).map((ou) => ou.organizations) || [];
        setOrganizations(orgs);

        const savedOrgId = localStorage.getItem('currentOrganizationId');
        const defaultOrg = orgs.length > 0 ? orgs[0] : null;

        if (savedOrgId && orgs.some((org) => org.id === savedOrgId)) {
          setCurrentOrganization(orgs.find((org) => org.id === savedOrgId) || defaultOrg);
        } else {
          setCurrentOrganization(defaultOrg);
          if (defaultOrg) {
            localStorage.setItem('currentOrganizationId', defaultOrg.id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching organizations:', err.message ?? err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]);

  // Fetch business units for selected organization
  useEffect(() => {
    if (!currentOrganization) {
      setBusinessUnits([]);
      setCurrentBusinessUnit(null);
      return;
    }

    const fetchBusinessUnits = async () => {
      try {
        const { data: buData, error: buError } = await supabase
          .from('business_units')
          .select('*')
          .eq('organization_id', currentOrganization.id);

        if (buError) throw buError;

        setBusinessUnits(buData || []);

        const savedBuId = localStorage.getItem(`currentBusinessUnitId_${currentOrganization.id}`);

        if (savedBuId && buData && buData.some((bu) => bu.id === savedBuId)) {
          setCurrentBusinessUnit(buData.find((bu) => bu.id === savedBuId) || null);
        } else {
          // Default to null (All Business Units) instead of first business unit
          setCurrentBusinessUnit(null);
          // Clear any saved business unit ID to ensure we start fresh
          localStorage.removeItem(`currentBusinessUnitId_${currentOrganization.id}`);
        }
      } catch (err) {
        console.error('Error fetching business units:', err);
      }
    };

    fetchBusinessUnits();
  }, [currentOrganization]);

  const switchOrganization = useCallback((orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', org.id);
      setCurrentBusinessUnit(null);
    }
  }, [organizations]);

  const switchBusinessUnit = useCallback((buId: string | null) => {
    if (!currentOrganization) return;

    if (buId === null) {
      setCurrentBusinessUnit(null);
      localStorage.removeItem(`currentBusinessUnitId_${currentOrganization.id}`);
      return;
    }

    const bu = businessUnits.find((b) => b.id === buId);
    if (bu) {
      setCurrentBusinessUnit(bu);
      localStorage.setItem(`currentBusinessUnitId_${currentOrganization.id}`, bu.id);
    }
  }, [currentOrganization, businessUnits]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    organizations,
    currentOrganization,
    businessUnits,
    currentBusinessUnit,
    isLoading,
    error,
    switchOrganization,
    switchBusinessUnit,
  }), [
    organizations,
    currentOrganization,
    businessUnits,
    currentBusinessUnit,
    isLoading,
    error,
    switchOrganization,
    switchBusinessUnit,
  ]);
};
