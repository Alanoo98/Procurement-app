import React from 'react';
import { Filter, X, Search, Plus, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Select from 'react-select';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrganizationSelector } from '@/components/shared/forms/OrganizationSelector';
import { LocationSelector } from '@/components/shared/forms/LocationSelector';

import { NotificationCenter } from '@/components/shared/layout/NotificationCenter';
import { toast } from 'sonner';

export const GlobalFilters: React.FC = () => {
  const {
    dateRange,
    restaurants, // stores selected location_id[]
    suppliers,   // stores selected supplier_id[]
    categories,  // stores selected category_id[]
    documentType,
    productSearch,
    productCodeFilter,
    setDateRange,
    setRestaurants,
    setSuppliers,
    setCategories,
    setDocumentType,
    addProductSearchTerm,
    removeProductSearchTerm,
    setProductSearchMode,
    setProductCodeFilter,
    clearFilters,
    isFiltersOpen,
    toggleFilters
  } = useFilterStore();

  const [supplierList, setSupplierList] = React.useState<Array<{ supplier_id: string; name: string }>>([]);
  const [categoryList, setCategoryList] = React.useState<Array<{ category_id: string; category_name: string }>>([]);
  const [newSearchTerm, setNewSearchTerm] = React.useState('');
  const [showSearchHelp, setShowSearchHelp] = React.useState(false);
  const { currentOrganization, currentBusinessUnit } = useOrganization();

  // Format date as YYYY-MM-DD in local time (avoid UTC off-by-one)
  const formatLocalYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Ensure a sensible default date range (> 1 month) when none is selected
  React.useEffect(() => {
    if (!dateRange) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 5, 1); // start of 6 months ago
      const end = new Date(today.getFullYear(), today.getMonth(), 0); // end of previous month
      setDateRange({ start: formatLocalYMD(start), end: formatLocalYMD(end) });
    }
  }, []);

  // Fetch Suppliers
  React.useEffect(() => {
    if (!currentOrganization) return;
    
    const fetchSuppliers = async () => {
      try {
        if (currentBusinessUnit) {
          // First, get supplier IDs linked to this business unit
          const { data: supplierBusinessUnits, error: sbuError } = await supabase
            .from('supplier_business_units')
            .select('supplier_id')
            .eq('business_unit_id', currentBusinessUnit.id);

          if (sbuError) {
            console.error('Error loading supplier business units:', sbuError);
            return;
          }

          const supplierIds = supplierBusinessUnits?.map(sbu => sbu.supplier_id) || [];
          
          if (supplierIds.length === 0) {
            setSupplierList([]);
            return;
          }

          // Then get suppliers using the array of IDs
          const { data: suppliersData, error: suppliersError } = await supabase
            .from('suppliers')
            .select('supplier_id, name')
            .eq('organization_id', currentOrganization.id)
            .in('supplier_id', supplierIds)
            .order('name');

          if (suppliersError) {
            console.error('Error loading suppliers:', suppliersError);
          } else {
            setSupplierList(suppliersData || []);
          }
        } else {
          // If no business unit is selected, get all suppliers for the organization
          const { data: suppliersData, error: suppliersError } = await supabase
            .from('suppliers')
            .select('supplier_id, name')
            .eq('organization_id', currentOrganization.id)
            .order('name');

          if (suppliersError) {
            console.error('Error loading suppliers:', suppliersError);
          } else {
            setSupplierList(suppliersData || []);
          }
        }
      } catch (error) {
        console.error('Error in fetchSuppliers:', error);
      }
    };

    fetchSuppliers();
  }, [currentOrganization, currentBusinessUnit]);

  // Fetch Categories
  React.useEffect(() => {
    if (!currentOrganization) return;
    
    const fetchCategories = async () => {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('product_categories')
          .select('category_id, category_name')
          .eq('organization_id', currentOrganization.id)
          .order('category_name');

        if (categoriesError) {
          console.error('Error loading categories:', categoriesError);
        } else {
          setCategoryList(categoriesData || []);
        }
      } catch (error) {
        console.error('Error in fetchCategories:', error);
      }
    };

    fetchCategories();
  }, [currentOrganization]);

  const supplierOptions = supplierList.map((s) => ({
    value: s.supplier_id,
    label: s.name
  }));

  const categoryOptions = categoryList.map((c) => ({
    value: c.category_id,
    label: c.category_name
  }));

  const handleAddSearchTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSearchTerm.trim()) {
      addProductSearchTerm(newSearchTerm.trim());
      setNewSearchTerm('');
      toast.success(`Added search term: ${newSearchTerm.trim()}`);
    }
  };

  return (
    <div className="mb-4">
      {/* Header with toggle and organization selector */}
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={toggleFilters}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
        >
          <Filter className="h-4 w-4" />
          Filters
          {(dateRange || restaurants.length > 0 || suppliers.length > 0 || categories.length > 0 || documentType !== 'all' || productCodeFilter !== 'all' || (productSearch?.terms?.length ?? 0) > 0) && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Active</span>
          )}
        </button>
        
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <OrganizationSelector />
        </div>
      </div>

      {/* Collapsible filters panel */}
      {isFiltersOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Filters header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Filter Options</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          </div>

          {/* Filters content */}
          <div className="p-4">
            {/* Main filters row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-4">
              {/* Date Range - Improved */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date Range</label>
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="date"
                      value={dateRange?.start || ''}
                      onChange={(e) => setDateRange(e.target.value ? {
                        start: e.target.value,
                        end: dateRange?.end || e.target.value
                      } : null)}
                      className="form-input text-xs py-1.5 w-full"
                      placeholder="Start date"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateRange?.end || ''}
                      onChange={(e) => setDateRange(e.target.value ? {
                        start: dateRange?.start || e.target.value,
                        end: e.target.value
                      } : null)}
                      min={dateRange?.start || undefined}
                      className="form-input text-xs py-1.5 w-full"
                      placeholder="End date"
                    />
                  </div>
                  {/* Quick range selectors */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                      onClick={() => {
                        const today = new Date();
                        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1); // start of previous month
                        const end = new Date(today.getFullYear(), today.getMonth(), 0); // end of previous month (day 0 of current month = last day of previous month)
                        setDateRange({ start: formatLocalYMD(start), end: formatLocalYMD(end) });
                      }}
                    >
                      1M
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                      onClick={() => {
                        const today = new Date();
                        const start = new Date(today.getFullYear(), today.getMonth() - 3, 1); // start of 3 months ago
                        const end = new Date(today.getFullYear(), today.getMonth(), 0); // end of previous month
                        setDateRange({ start: formatLocalYMD(start), end: formatLocalYMD(end) });
                      }}
                    >
                      3M
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                      onClick={() => {
                        const today = new Date();
                        const start = new Date(today.getFullYear(), today.getMonth() - 6, 1); // start of 6 months ago
                        const end = new Date(today.getFullYear(), today.getMonth(), 0); // end of previous month
                        setDateRange({ start: formatLocalYMD(start), end: formatLocalYMD(end) });
                      }}
                    >
                      6M
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                      onClick={() => {
                        const today = new Date();
                        const start = new Date(today.getFullYear(), today.getMonth() - 12, 1); // start of 12 months ago
                        const end = new Date(today.getFullYear(), today.getMonth(), 0); // end of previous month
                        setDateRange({ start: formatLocalYMD(start), end: formatLocalYMD(end) });
                      }}
                    >
                      12M
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                      onClick={() => {
                        const today = new Date();
                        const start = new Date(today.getFullYear(), 0, 1); // start of year
                        const end = new Date(today.getFullYear(), today.getMonth(), 0); // end of previous month
                        setDateRange({ start: formatLocalYMD(start), end: formatLocalYMD(end) });
                      }}
                    >
                      YTD
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[11px] rounded border border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => setDateRange(null)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Locations</label>
                <LocationSelector
                  isMulti
                  value={restaurants}
                  onChange={(value) => setRestaurants(Array.isArray(value) ? value : [])}
                  placeholder="Select locations..."
                />
              </div>

              {/* Suppliers */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Suppliers</label>
                <Select
                  isMulti
                  options={supplierOptions}
                  value={supplierOptions.filter(option => suppliers.includes(option.value))}
                  onChange={(selected) => setSuppliers(selected ? selected.map(s => s.value) : [])}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Select..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '32px',
                      fontSize: '12px',
                      zIndex: 10
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      fontSize: '12px'
                    }),
                    option: (base) => ({
                      ...base,
                      fontSize: '12px'
                    }),
                    multiValue: (base) => ({
                      ...base,
                      fontSize: '11px'
                    })
                  }}
                />
              </div>

              {/* Categories */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Categories</label>
                <Select
                  isMulti
                  options={categoryOptions}
                  value={categoryOptions.filter(option => categories.includes(option.value))}
                  onChange={(selected) => setCategories(selected ? selected.map(c => c.value) : [])}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Select..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '32px',
                      fontSize: '12px',
                      zIndex: 10
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      fontSize: '12px'
                    }),
                    option: (base) => ({
                      ...base,
                      fontSize: '12px'
                    }),
                    multiValue: (base) => ({
                      ...base,
                      fontSize: '11px'
                    })
                  }}
                />
              </div>

              {/* Document Type */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as 'all' | 'Faktura' | 'Kreditnota')}
                  className="form-select text-xs py-1.5"
                >
                  <option value="all">All types</option>
                  <option value="Faktura">Faktura</option>
                  <option value="Kreditnota">Kreditnota</option>
                </select>
              </div>

              {/* Product Codes - Compact toggle */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Product Codes</label>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="productCodeFilter"
                      value="all"
                      checked={productCodeFilter === 'all'}
                      onChange={(e) => setProductCodeFilter(e.target.value as 'all' | 'with_codes' | 'without_codes')}
                      className="form-radio h-3 w-3"
                    />
                    <span>All</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="productCodeFilter"
                      value="with_codes"
                      checked={productCodeFilter === 'with_codes'}
                      onChange={(e) => setProductCodeFilter(e.target.value as 'all' | 'with_codes' | 'without_codes')}
                      className="form-radio h-3 w-3"
                    />
                    <span>With codes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="productCodeFilter"
                      value="without_codes"
                      checked={productCodeFilter === 'without_codes'}
                      onChange={(e) => setProductCodeFilter(e.target.value as 'all' | 'with_codes' | 'without_codes')}
                      className="form-radio h-3 w-3"
                    />
                    <span>Without codes</span>
                  </label>
                </div>
              </div>

              {/* Product Search - Compact */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Product Search</label>
                  <button
                    type="button"
                    onClick={() => setShowSearchHelp(!showSearchHelp)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                
                <form onSubmit={handleAddSearchTerm} className="flex gap-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <input
                      type="text"
                      value={newSearchTerm}
                      onChange={(e) => setNewSearchTerm(e.target.value)}
                      placeholder="Add term..."
                      className="form-input text-xs pl-6 py-1.5 w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-2 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newSearchTerm.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </form>

                {/* Search mode selector */}
                <select
                  value={productSearch?.mode ?? 'OR'}
                  onChange={(e) => setProductSearchMode(e.target.value as 'AND' | 'OR')}
                  className="form-select text-xs py-1"
                >
                  <option value="OR">Match Any (OR)</option>
                  <option value="AND">Match All (AND)</option>
                </select>
              </div>
            </div>

            {/* Search terms display */}
            {productSearch?.terms?.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600">Search Terms:</span>
                  <span className="text-xs text-gray-500">({productSearch.mode === 'AND' ? 'All' : 'Any'} must match)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {productSearch.terms.map((term, index) => (
                    <button
                      key={`${term}-${index}`}
                      onClick={() => removeProductSearchTerm(term)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        term.startsWith('-')
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      } hover:opacity-80 transition-opacity`}
                    >
                      {term}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Help tooltip */}
            {showSearchHelp && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                  <p className="font-medium mb-1">Search Tips:</p>
                  <ul className="space-y-0.5">
                    <li>• Add multiple search terms</li>
                    <li>• Use minus (-) to exclude terms</li>
                    <li>• Example: "kylling -frozen"</li>
                    <li>• Search applies to descriptions, codes, and supplier names</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

