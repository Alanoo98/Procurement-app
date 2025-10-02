import React from 'react';
import { X } from 'lucide-react';
import { CaseOfConcernFilterOptions, ConcernStatus, ConcernPriority, ConcernType } from '../../types';

interface CaseOfConcernFiltersProps {
  filters: CaseOfConcernFilterOptions;
  onFiltersChange: (filters: CaseOfConcernFilterOptions) => void;
  users: Array<{ id: string; email: string; name?: string }>;
}

const statusOptions: Array<{ value: ConcernStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: Array<{ value: ConcernPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const concernTypeOptions: Array<{ value: ConcernType; label: string }> = [
  { value: 'product', label: 'Product' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'spend_per_pax', label: 'Spend per PAX' },
  { value: 'price_variation', label: 'Price Variation' },
  { value: 'efficiency', label: 'Efficiency' },
  { value: 'quality', label: 'Quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

export const CaseOfConcernFilters: React.FC<CaseOfConcernFiltersProps> = ({
  filters,
  onFiltersChange,
  users,
}) => {
  const handleArrayFilterChange = (field: keyof CaseOfConcernFilterOptions, value: string, checked: boolean) => {
    const currentValues = filters[field] as string[] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    onFiltersChange({
      ...filters,
      [field]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleDateFilterChange = (field: 'date_from' | 'date_to', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof CaseOfConcernFilterOptions];
    return value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true);
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="space-y-2">
            {statusOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status?.includes(option.value) || false}
                  onChange={(e) => handleArrayFilterChange('status', option.value, e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <div className="space-y-2">
            {priorityOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.priority?.includes(option.value) || false}
                  onChange={(e) => handleArrayFilterChange('priority', option.value, e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="space-y-2">
            {concernTypeOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.concern_type?.includes(option.value) || false}
                  onChange={(e) => handleArrayFilterChange('concern_type', option.value, e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Assigned To Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.assigned_to?.includes('') || false}
                onChange={(e) => handleArrayFilterChange('assigned_to', '', e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Unassigned</span>
            </label>
            {users.map(user => (
              <label key={user.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.assigned_to?.includes(user.id) || false}
                  onChange={(e) => handleArrayFilterChange('assigned_to', user.id, e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 truncate">
                  {user.name || user.email}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-2">
              Created From
            </label>
            <input
              type="date"
              id="date_from"
              value={filters.date_from || ''}
              onChange={(e) => handleDateFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-2">
              Created To
            </label>
            <input
              type="date"
              id="date_to"
              value={filters.date_to || ''}
              onChange={(e) => handleDateFilterChange('date_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
