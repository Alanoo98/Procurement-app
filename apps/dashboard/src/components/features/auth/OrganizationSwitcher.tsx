import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OrganizationSwitcherProps {
  className?: string;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ className = '' }) => {
  const { 
    currentOrganization, 
    organizations, 
    switchOrganization, 
    currentRole 
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitch = async (organizationId: string) => {
    try {
      await switchOrganization(organizationId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching organization:', error);
    }
  };

  if (!currentOrganization || organizations.length <= 1) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Building2 className="h-5 w-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          {currentOrganization?.name || 'No Organization'}
        </span>
        {currentRole && (
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
            {currentRole}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
      >
        <Building2 className="h-5 w-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          {currentOrganization.name}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {currentRole && (
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
            {currentRole}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {organizations.map((orgUser) => (
              <button
                key={orgUser.organization_id}
                onClick={() => handleSwitch(orgUser.organization_id)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {orgUser.organizations.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {orgUser.role}
                    </div>
                  </div>
                </div>
                {currentOrganization.id === orgUser.organization_id && (
                  <Check className="h-4 w-4 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

