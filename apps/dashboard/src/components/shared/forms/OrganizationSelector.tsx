import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { BusinessUnitSelector } from './BusinessUnitSelector';

export const OrganizationSelector: React.FC = () => {
  const { 
    organizations, 
    currentOrganization, 
    switchOrganization
  } = useOrganization();
  
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  if (!currentOrganization) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Organization Selector */}
      <div className="relative">
        <button
          onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="max-w-[150px] truncate">{currentOrganization.name}</span>
          {isOrgDropdownOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {isOrgDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOrgDropdownOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-20">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                <div className="font-medium">Select Organization</div>
              </div>
              
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOrgDropdownOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="truncate">{org.name}</span>
                  </span>
                  {currentOrganization.id === org.id && (
                    <Check className="h-4 w-4 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Business Unit Selector */}
      <BusinessUnitSelector />
    </div>
  );
};

