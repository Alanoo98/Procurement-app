import { useAuth } from '@/contexts/AuthContext';

export type Permission = 
  | 'view_dashboard'
  | 'manage_suppliers'
  | 'manage_locations'
  | 'manage_users'
  | 'manage_organizations'
  | 'view_analytics'
  | 'manage_invitations'
  | 'manage_settings'
  | 'view_all_data'
  | 'manage_all_data';

interface RolePermissions {
  [key: string]: Permission[];
}

const ROLE_PERMISSIONS: RolePermissions = {
  'super-admin': [
    'view_dashboard',
    'manage_suppliers',
    'manage_locations',
    'manage_users',
    'manage_organizations',
    'view_analytics',
    'manage_invitations',
    'manage_settings',
    'view_all_data',
    'manage_all_data',
  ],
  'admin': [
    'view_dashboard',
    'manage_suppliers',
    'manage_locations',
    'manage_users',
    'view_analytics',
    'manage_invitations',
    'manage_settings',
  ],
  'user': [
    'view_dashboard',
    'view_analytics',
  ],
};

export const useRoleAccess = () => {
  const { currentRole, currentOrganization } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!currentRole || !currentOrganization) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[currentRole] || [];
    return rolePermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users');
  };

  const canManageOrganization = (): boolean => {
    return hasPermission('manage_organizations');
  };

  const canManageInvitations = (): boolean => {
    return hasPermission('manage_invitations');
  };

  const canViewAllData = (): boolean => {
    return hasPermission('view_all_data');
  };

  const canManageAllData = (): boolean => {
    return hasPermission('manage_all_data');
  };

  const isSuperAdmin = (): boolean => {
    return currentRole === 'super-admin';
  };

  const isAdmin = (): boolean => {
    return currentRole === 'admin' || currentRole === 'super-admin';
  };

  const isUser = (): boolean => {
    return currentRole === 'user';
  };

  return {
    currentRole,
    currentOrganization,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageUsers,
    canManageOrganization,
    canManageInvitations,
    canViewAllData,
    canManageAllData,
    isSuperAdmin,
    isAdmin,
    isUser,
  };
};
