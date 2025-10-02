import React, { useState } from 'react';
import { Building, ChevronDown, ChevronUp, Check, MapPin } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBusinessUnitsWithLocations } from '@/hooks/utils';

interface BusinessUnitSelectorProps {
  className?: string;
}

export const BusinessUnitSelector: React.FC<BusinessUnitSelectorProps> = ({ className = '' }) => {
  const { currentBusinessUnit, switchBusinessUnit } = useOrganization();
  const { groupedBusinessUnits, sortedCountries, isLoading } = useBusinessUnitsWithLocations();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getCountryFlag = (country: string) => {
    const flagMap: Record<string, string> = {
      'DK': '🇩🇰',
      'NO': '🇳🇴', 
      'UK': '🇬🇧',
      'SE': '🇸🇪',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'Other': '🌍',
    };
    return flagMap[country] || '🌍';
  };

  const getCountryName = (country: string) => {
    const nameMap: Record<string, string> = {
      'DK': 'Denmark',
      'NO': 'Norway',
      'UK': 'United Kingdom', 
      'SE': 'Sweden',
      'DE': 'Germany',
      'FR': 'France',
      'Other': 'Other',
    };
    return nameMap[country] || country;
  };

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <button
          disabled
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg border border-gray-300"
        >
          <Building className="h-4 w-4" />
          <span>Loading...</span>
        </button>
      </div>
    );
  }

  const totalBusinessUnits = Object.values(groupedBusinessUnits).flat().length;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
      >
        <Building className="h-4 w-4 text-gray-500" />
        <span className="max-w-[200px] truncate">
          {currentBusinessUnit ? currentBusinessUnit.name : 'All Business Units'}
        </span>
        {isDropdownOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-20 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 text-sm text-gray-700 border-b bg-gray-50">
              <div className="font-medium">Select Business Unit</div>
              <div className="text-xs text-gray-500">{totalBusinessUnits} business units</div>
            </div>
            
            {/* All Business Units Option */}
            <button
              onClick={() => {
                switchBusinessUnit(null);
                setIsDropdownOpen(false);
              }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b"
            >
              <span className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">All Business Units</span>
              </span>
              {currentBusinessUnit === null && (
                <Check className="h-4 w-4 text-emerald-500" />
              )}
            </button>

            {/* Grouped Business Units by Country */}
            {sortedCountries.map(country => {
              const businessUnits = groupedBusinessUnits[country];
              const countryName = getCountryName(country);
              const flag = getCountryFlag(country);

              return (
                <div key={country} className="border-b last:border-b-0">
                  {/* Country Header */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                    <span className="flex items-center gap-2">
                      <span className="text-base">{flag}</span>
                      <span>{countryName}</span>
                      <span className="text-gray-400">({businessUnits.length})</span>
                    </span>
                  </div>

                  {/* Business Units in this Country */}
                  {businessUnits.map(bu => (
                    <button
                      key={bu.id}
                      onClick={() => {
                        switchBusinessUnit(bu.id);
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-6 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{bu.name}</span>
                        {bu.locations.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" />
                            <span>{bu.locations.length}</span>
                          </span>
                        )}
                      </span>
                      {currentBusinessUnit?.id === bu.id && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              );
            })}

            {/* No business units message */}
            {totalBusinessUnits === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No business units found</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


