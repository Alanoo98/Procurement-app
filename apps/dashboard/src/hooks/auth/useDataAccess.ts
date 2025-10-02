import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DataAccessConfig {
  requireOrganization?: boolean;
  requireBusinessUnit?: boolean;
  requireLocation?: boolean;
  allowedRoles?: string[];
}

export const useDataAccess = (config: DataAccessConfig = {}) => {
  const {
    user,
    currentOrganization,
    currentRole,
    accessibleBusinessUnits,
    accessibleLocations,
    userProfile,
  } = useAuth();

  const access = useMemo(() => {
    // Check if user is authenticated
    if (!user || !userProfile) {
      return {
        hasAccess: false,
        reason: 'User not authenticated',
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
      };
    }

    // Check organization requirement
    if (config.requireOrganization && !currentOrganization) {
      return {
        hasAccess: false,
        reason: 'No organization selected',
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
      };
    }

    // Check role requirements
    if (config.allowedRoles && currentRole && !config.allowedRoles.includes(currentRole)) {
      return {
        hasAccess: false,
        reason: `Insufficient role. Required: ${config.allowedRoles.join(', ')}, Current: ${currentRole}`,
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
      };
    }

    // Determine permissions based on role
    const canRead = ['owner', 'admin', 'member', 'manager', 'viewer'].includes(currentRole || '');
    const canWrite = ['owner', 'admin', 'member', 'manager'].includes(currentRole || '');
    const canDelete = ['owner', 'admin'].includes(currentRole || '');
    const canManage = ['owner', 'admin'].includes(currentRole || '');

    return {
      hasAccess: true,
      reason: null,
      canRead,
      canWrite,
      canDelete,
      canManage,
      user,
      currentOrganization,
      currentRole,
      accessibleBusinessUnits,
      accessibleLocations,
      userProfile,
    };
  }, [
    user,
    userProfile,
    currentOrganization,
    currentRole,
    accessibleBusinessUnits,
    accessibleLocations,
    config.requireOrganization,
    config.allowedRoles,
  ]);

  return access;
};

// Hook for business unit access
export const useBusinessUnitAccess = (businessUnitId?: string) => {
  const { accessibleBusinessUnits, currentRole } = useAuth();

  return useMemo(() => {
    if (!businessUnitId) {
      return {
        hasAccess: ['owner', 'admin'].includes(currentRole || ''),
        role: currentRole,
        canRead: ['owner', 'admin', 'member', 'manager', 'viewer'].includes(currentRole || ''),
        canWrite: ['owner', 'admin', 'member', 'manager'].includes(currentRole || ''),
        canDelete: ['owner', 'admin'].includes(currentRole || ''),
      };
    }

    const access = accessibleBusinessUnits.find(
      (bu) => bu.business_unit_id === businessUnitId
    );

    if (!access) {
      return {
        hasAccess: false,
        role: null,
        canRead: false,
        canWrite: false,
        canDelete: false,
      };
    }

    const role = access.role;
    return {
      hasAccess: true,
      role,
      canRead: ['owner', 'admin', 'member', 'manager', 'viewer'].includes(role),
      canWrite: ['owner', 'admin', 'member', 'manager'].includes(role),
      canDelete: ['owner', 'admin'].includes(role),
    };
  }, [businessUnitId, accessibleBusinessUnits, currentRole]);
};

// Hook for location access
export const useLocationAccess = (locationId?: string) => {
  const { accessibleLocations, currentRole } = useAuth();

  return useMemo(() => {
    if (!locationId) {
      return {
        hasAccess: ['owner', 'admin'].includes(currentRole || ''),
        role: currentRole,
        canRead: ['owner', 'admin', 'member', 'manager', 'viewer'].includes(currentRole || ''),
        canWrite: ['owner', 'admin', 'member', 'manager'].includes(currentRole || ''),
        canDelete: ['owner', 'admin'].includes(currentRole || ''),
      };
    }

    const access = accessibleLocations.find(
      (loc) => loc.location_id === locationId
    );

    if (!access) {
      return {
        hasAccess: false,
        role: null,
        canRead: false,
        canWrite: false,
        canDelete: false,
      };
    }

    const role = access.role;
    return {
      hasAccess: true,
      role,
      canRead: ['owner', 'admin', 'member', 'manager', 'viewer'].includes(role),
      canWrite: ['owner', 'admin', 'member', 'manager'].includes(role),
      canDelete: ['owner', 'admin'].includes(role),
    };
  }, [locationId, accessibleLocations, currentRole]);
};
