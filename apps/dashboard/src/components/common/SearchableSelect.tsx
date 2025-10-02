import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string, option: SearchableSelectOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  maxHeight?: string;
  isLoading?: boolean;
  onSearch?: (searchTerm: string) => Promise<SearchableSelectOption[]>;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
  required = false,
  className = "",
  maxHeight = "200px",
  isLoading = false,
  onSearch
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchableSelectOption[]>(options);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setFilteredOptions(options);
      } else if (onSearch) {
        // Use external search function
        try {
          const searchResults = await onSearch(searchTerm);
          setFilteredOptions(searchResults);
        } catch (error) {
          console.error('Search error:', error);
          setFilteredOptions(options);
        }
      } else {
        // Use local filtering
        const filtered = options.filter(option =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOptions(filtered);
      }
      setSelectedIndex(-1);
    };

    performSearch();
  }, [searchTerm, options, onSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          const selectedOption = filteredOptions[selectedIndex];
          handleSelect(selectedOption);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value, option);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`
          w-full rounded-md border border-gray-300 shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
          ${required && !value ? 'border-red-300' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {selectedOption.label}
                </div>
                {selectedOption.description && (
                  <div className="text-xs text-gray-500 truncate">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>
          </div>
          
          <div 
            className="overflow-y-auto"
            style={{ maxHeight }}
            role="listbox"
          >
            {isLoading ? (
              <div className="p-3 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                {searchTerm ? 'No options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={`
                    px-3 py-2 cursor-pointer text-sm
                    ${index === selectedIndex ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-gray-50'}
                    ${option.value === value ? 'bg-emerald-100 text-emerald-900' : ''}
                  `}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
