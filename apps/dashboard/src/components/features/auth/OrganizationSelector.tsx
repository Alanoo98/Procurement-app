import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth, Organization } from '@/contexts/AuthContext';

interface OrganizationSelectorProps {
  selectedOrganizationId: string | null;
  onOrganizationSelect: (organizationId: string | null) => void;
  disabled?: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  selectedOrganizationId,
  onOrganizationSelect,
  disabled = false,
}) => {
  const { getOrganizations } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error('Error loading organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [getOrganizations]);

  const selectedOrganization = organizations.find(org => org.id === selectedOrganizationId);

  const handleSelect = (organizationId: string | null) => {
    onOrganizationSelect(organizationId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Organization
        </label>
        <div className="relative">
          <div className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-gray-100 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Organization
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-left bg-white disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
        >
          <div className="flex items-center">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <span className="text-gray-900">
              {selectedOrganization ? selectedOrganization.name : 'Select an organization'}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
              >
                <span className="text-gray-500">No organization selected</span>
                {selectedOrganizationId === null && (
                  <Check className="h-4 w-4 text-emerald-500" />
                )}
              </button>
              
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelect(org.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-sm text-gray-500">{org.slug}</div>
                  </div>
                  {selectedOrganizationId === org.id && (
                    <Check className="h-4 w-4 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        {selectedOrganizationId === null 
          ? 'You can request access to an organization after signup'
          : 'You will be added to this organization after email verification'
        }
      </p>
    </div>
  );
};

