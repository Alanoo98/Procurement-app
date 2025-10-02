import { useAuth } from '@/contexts/AuthContext';

export type AccessLevel = 'admin' | 'manager' | 'viewer';

export interface AccessCheck {
  hasAccess: boolean;
  level: AccessLevel | null;
  isExpired: boolean;
}

export const useAccessControl = () => {
  const { 
    currentRole, 
    currentOrganization, 
    accessibleBusinesses, 
    accessibleLocations 
  } = useAuth();

  // Check if user has access to a specific business
  const hasBusinessAccess = (businessId: string): AccessCheck => {
    if (!currentOrganization) {
      return { hasAccess: false, level: null, isExpired: false };
    }

    // Super admins have access to all businesses in their organization
    if (currentRole === 'super-admin') {
      return { hasAccess: true, level: 'admin', isExpired: false };
    }

    // Check specific business access
    const businessAccess = accessibleBusinesses.find(
      access => access.business_id === businessId && access.is_active
    );

    if (!businessAccess) {
      return { hasAccess: false, level: null, isExpired: false };
    }

    const isExpired = businessAccess.expires_at 
      ? new Date(businessAccess.expires_at) < new Date()
      : false;

    return {
      hasAccess: !isExpired,
      level: businessAccess.role as AccessLevel,
      isExpired
    };
  };

  // Check if user has access to a specific location
  const hasLocationAccess = (locationId: string): AccessCheck => {
    if (!currentOrganization) {
      return { hasAccess: false, level: null, isExpired: false };
    }

    // Super admins have access to all locations in their organization
    if (currentRole === 'super-admin') {
      return { hasAccess: true, level: 'admin', isExpired: false };
    }

    // Check specific location access
    const locationAccess = accessibleLocations.find(
      access => access.location_id === locationId && access.is_active
    );

    if (!locationAccess) {
      return { hasAccess: false, level: null, isExpired: false };
    }

    const isExpired = locationAccess.expires_at 
      ? new Date(locationAccess.expires_at) < new Date()
      : false;

    return {
      hasAccess: !isExpired,
      level: locationAccess.role as AccessLevel,
      isExpired
    };
  };

  // Check if user can manage (admin/manager level) a specific business
  const canManageBusiness = (businessId: string): boolean => {
    const access = hasBusinessAccess(businessId);
    return access.hasAccess && ['admin', 'manager'].includes(access.level || '');
  };

  // Check if user can manage (admin/manager level) a specific location
  const canManageLocation = (locationId: string): boolean => {
    const access = hasLocationAccess(locationId);
    return access.hasAccess && ['admin', 'manager'].includes(access.level || '');
  };

  // Check if user can view a specific business
  const canViewBusiness = (businessId: string): boolean => {
    const access = hasBusinessAccess(businessId);
    return access.hasAccess;
  };

  // Check if user can view a specific location
  const canViewLocation = (locationId: string): boolean => {
    const access = hasLocationAccess(locationId);
    return access.hasAccess;
  };

  // Get all accessible business IDs
  const getAccessibleBusinessIds = (): string[] => {
    if (currentRole === 'super-admin') {
      // Super admins can access all businesses in their organization
      return accessibleBusinesses.map(access => access.business_id);
    }
    
    return accessibleBusinesses
      .filter(access => {
        const isExpired = access.expires_at 
          ? new Date(access.expires_at) < new Date()
          : false;
        return access.is_active && !isExpired;
      })
      .map(access => access.business_id);
  };

  // Get all accessible location IDs
  const getAccessibleLocationIds = (): string[] => {
    if (currentRole === 'super-admin') {
      // Super admins can access all locations in their organization
      return accessibleLocations.map(access => access.location_id);
    }
    
    return accessibleLocations
      .filter(access => {
        const isExpired = access.expires_at 
          ? new Date(access.expires_at) < new Date()
          : false;
        return access.is_active && !isExpired;
      })
      .map(access => access.location_id);
  };

  // Check if user has any business access
  const hasAnyBusinessAccess = (): boolean => {
    return getAccessibleBusinessIds().length > 0;
  };

  // Check if user has any location access
  const hasAnyLocationAccess = (): boolean => {
    return getAccessibleLocationIds().length > 0;
  };

  // Get user's role for a specific business
  const getBusinessRole = (businessId: string): AccessLevel | null => {
    const access = hasBusinessAccess(businessId);
    return access.hasAccess ? access.level : null;
  };

  // Get user's role for a specific location
  const getLocationRole = (locationId: string): AccessLevel | null => {
    const access = hasLocationAccess(locationId);
    return access.hasAccess ? access.level : null;
  };

  // Check if user can perform a specific action on a business
  const canPerformBusinessAction = (
    businessId: string, 
    action: 'view' | 'edit' | 'delete' | 'manage'
  ): boolean => {
    const access = hasBusinessAccess(businessId);
    
    if (!access.hasAccess) return false;

    switch (action) {
      case 'view':
        return true;
      case 'edit':
      case 'manage':
        return ['admin', 'manager'].includes(access.level || '');
      case 'delete':
        return access.level === 'admin';
      default:
        return false;
    }
  };

  // Check if user can perform a specific action on a location
  const canPerformLocationAction = (
    locationId: string, 
    action: 'view' | 'edit' | 'delete' | 'manage'
  ): boolean => {
    const access = hasLocationAccess(locationId);
    
    if (!access.hasAccess) return false;

    switch (action) {
      case 'view':
        return true;
      case 'edit':
      case 'manage':
        return ['admin', 'manager'].includes(access.level || '');
      case 'delete':
        return access.level === 'admin';
      default:
        return false;
    }
  };

  // Get access summary for debugging
  const getAccessSummary = () => {
    return {
      currentRole,
      currentOrganization: currentOrganization?.name,
      accessibleBusinesses: accessibleBusinesses.length,
      accessibleLocations: accessibleLocations.length,
      businessIds: getAccessibleBusinessIds(),
      locationIds: getAccessibleLocationIds(),
    };
  };

  return {
    // Basic access checks
    hasBusinessAccess,
    hasLocationAccess,
    canViewBusiness,
    canViewLocation,
    canManageBusiness,
    canManageLocation,
    
    // Role checks
    getBusinessRole,
    getLocationRole,
    
    // Action-based checks
    canPerformBusinessAction,
    canPerformLocationAction,
    
    // Utility functions
    getAccessibleBusinessIds,
    getAccessibleLocationIds,
    hasAnyBusinessAccess,
    hasAnyLocationAccess,
    getAccessSummary,
    
    // Raw data
    accessibleBusinesses,
    accessibleLocations,
    currentRole,
    currentOrganization,
  };
};
