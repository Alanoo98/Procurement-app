import React, { useMemo, useCallback } from 'react';
import Select, { components, GroupBase, MultiValueProps, OptionProps, SingleValueProps } from 'react-select';
import { MapPin } from 'lucide-react';
import { useGroupedLocations } from '@/hooks/data';

interface LocationOption {
  value: string;
  label: string;
  country: string;
  group: string;
}

interface LocationSelectorProps {
  isMulti?: boolean;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  className?: string;
  classNamePrefix?: string;
  styles?: Record<string, unknown>;
}

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

// Custom Option component with country flag
const Option = (props: OptionProps<LocationOption, boolean, GroupBase<LocationOption>>) => {
  const { data, isSelected } = props;
  
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        <span className="text-base">{getCountryFlag(data.country)}</span>
        <MapPin className="h-3 w-3 text-gray-400" />
        <span className="flex-1">{data.label}</span>
        {isSelected && (
          <span className="text-emerald-500 text-sm">✓</span>
        )}
      </div>
    </components.Option>
  );
};

// Custom SingleValue component
const SingleValue = (props: SingleValueProps<LocationOption, false, GroupBase<LocationOption>>) => {
  const { data } = props;
  
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        <span className="text-base">{getCountryFlag(data.country)}</span>
        <MapPin className="h-3 w-3 text-gray-400" />
        <span>{data.label}</span>
      </div>
    </components.SingleValue>
  );
};

// Custom MultiValue component
const MultiValue = (props: MultiValueProps<LocationOption, boolean, GroupBase<LocationOption>>) => {
  const { data } = props;
  
  return (
    <components.MultiValue {...props}>
      <div className="flex items-center gap-1">
        <span className="text-sm">{getCountryFlag(data.country)}</span>
        <span className="text-xs">{data.label}</span>
      </div>
    </components.MultiValue>
  );
};

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  isMulti = false,
  value,
  onChange,
  placeholder = "Select locations...",
  className = "react-select-container",
  classNamePrefix = "react-select",
  styles,
}) => {
  const { locationOptions, isLoading } = useGroupedLocations();

  // Group options by country
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, LocationOption[]> = {};
    
    locationOptions.forEach(option => {
      if (!groups[option.group]) {
        groups[option.group] = [];
      }
      groups[option.group].push(option);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
      })
      .map(country => ({
        label: `${getCountryFlag(country)} ${getCountryName(country)} (${groups[country].length})`,
        options: groups[country],
      }));
  }, [locationOptions]);

  const handleChange = useCallback((selectedOption: LocationOption | LocationOption[] | null) => {
    if (isMulti) {
      const values = selectedOption ? selectedOption.map((option: LocationOption) => option.value) : [];
      onChange(values);
    } else {
      const value = selectedOption ? selectedOption.value : '';
      onChange(value);
    }
  }, [isMulti, onChange]);

  const getValue = useMemo(() => {
    if (isMulti) {
      const values = Array.isArray(value) ? value : [];
      return locationOptions.filter(option => values.includes(option.value));
    } else {
      const singleValue = typeof value === 'string' ? value : '';
      return locationOptions.find(option => option.value === singleValue) || null;
    }
  }, [isMulti, value, locationOptions]);

  const defaultStyles = useMemo(() => ({
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      fontSize: '12px',
      zIndex: 10
    }),
    menu: (base: Record<string, unknown>) => ({
      ...base,
      zIndex: 9999,
      fontSize: '12px'
    }),
    option: (base: Record<string, unknown>) => ({
      ...base,
      fontSize: '12px'
    }),
    multiValue: (base: Record<string, unknown>) => ({
      ...base,
      fontSize: '11px'
    }),
    groupHeading: (base: Record<string, unknown>) => ({
      ...base,
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
    }),
  }), []);

  return (
    <Select
      isMulti={isMulti}
      options={groupedOptions}
      value={getValue}
      onChange={handleChange}
      placeholder={isLoading ? "Loading locations..." : placeholder}
      isLoading={isLoading}
      className={className}
      classNamePrefix={classNamePrefix}
      styles={styles || defaultStyles}
      components={{
        Option,
        SingleValue,
        MultiValue,
      }}
      isClearable
      isSearchable
      menuPlacement="auto"
    />
  );
};


