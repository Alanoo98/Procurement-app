import React, { createContext, useContext } from 'react';
import { useOrganizationContext, Organization, BusinessUnit } from '@/hooks/auth';

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  businessUnits: BusinessUnit[];
  currentBusinessUnit: BusinessUnit | null;
  isLoading: boolean;
  error: Error | null;
  switchOrganization: (orgId: string) => void;
  switchBusinessUnit: (buId: string | null) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const organizationContext = useOrganizationContext();

  return (
    <OrganizationContext.Provider value={organizationContext}>
      {children}
    </OrganizationContext.Provider>
  );
};


