import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, X, Save, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCogsDashboard } from '@/hooks/metrics/useCogsDashboard';
import { useSaveMonthlyRevenue } from '@/hooks/metrics/useCogsAnalysis';
import { useSaveBudget } from '@/hooks/metrics/useBudgetManagement';
import { useProductSpendingAnalysis } from '@/hooks/metrics/useProductSpendingAnalysis';
import { useAvailableFilters } from '@/hooks/metrics/useAvailableFilters';
import { formatCurrencyByCode } from '@/utils/currency';
import { ErrorState, LoadingState } from '@/components/shared/ui/EmptyStates';
import { ProductLocationBreakdown } from '@/components/features/products/ProductLocationBreakdown';

export const CogsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  const { data: dashboardData, isLoading, error } = useCogsDashboard(selectedYear, selectedMonth);
  
  const { saveRevenue, isLoading: savingRevenue } = useSaveMonthlyRevenue();
  const { saveBudget, isLoading: savingBudget } = useSaveBudget();
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<{
    location_id: string;
    location_name: string;
    year: number;
    month: number;
    type: 'revenue' | 'budget';
  } | null>(null);
  const [revenueInput, setRevenueInput] = useState<string>('');
  const [revenueBudgetInput, setRevenueBudgetInput] = useState<string>('');
  const [cogsBudgetInput, setCogsBudgetInput] = useState<string>('');
  const [currencyInput, setCurrencyInput] = useState<string>('DKK');
  const [notesInput, setNotesInput] = useState<string>('');
  
  // Deep dive analysis state
  const [selectedLocationForDeepDive, setSelectedLocationForDeepDive] = useState<string | null>(null);
  
  // Filter state for deep dive analysis
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  
  // Expandable filter state
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isSuppliersExpanded, setIsSuppliersExpanded] = useState(false);
  
  // Expandable product rows state
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  const { data: deepDiveData, isLoading: deepDiveLoading, error: deepDiveError } = useProductSpendingAnalysis(
    selectedLocationForDeepDive,
    selectedYear,
    selectedMonth,
    selectedCategories,
    selectedSuppliers
  );

  // Get all available categories and suppliers for the selected location and month
  const { data: availableFilters } = useAvailableFilters(
    selectedLocationForDeepDive,
    selectedYear,
    selectedMonth
  );

  // Helper functions for multi-select
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    // Auto-expand categories section when selecting
    if (!isCategoriesExpanded) {
      setIsCategoriesExpanded(true);
    }
  };

  const toggleSupplier = (supplier: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplier) 
        ? prev.filter(s => s !== supplier)
        : [...prev, supplier]
    );
    // Auto-expand suppliers section when selecting
    if (!isSuppliersExpanded) {
      setIsSuppliersExpanded(true);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSuppliers([]);
  };

  const toggleProductExpansion = (productKey: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productKey)) {
        newSet.delete(productKey);
      } else {
        newSet.add(productKey);
      }
      return newSet;
    });
  };

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
  }, [selectedYear, selectedMonth]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateMonth('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateMonth('next');
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedYear, selectedMonth, navigateMonth]);

  const handleEditRevenue = (item: { location_id: string; location_name: string; year: number; month: number; revenue_amount?: number | null; currency?: string }) => {
    setEditingItem({
      location_id: item.location_id,
      location_name: item.location_name,
      year: item.year,
      month: item.month,
      type: 'revenue'
    });
    setRevenueInput(item.revenue_amount?.toString() || '');
    setCurrencyInput(item.currency || 'DKK');
    setNotesInput('');
  };

  const handleEditBudget = (item: { location_id: string; location_name: string; year: number; month: number; revenue_budget?: number | null; cogs_budget?: number | null; currency?: string }) => {
    setEditingItem({
      location_id: item.location_id,
      location_name: item.location_name,
      year: item.year,
      month: item.month,
      type: 'budget'
    });
    setRevenueBudgetInput(item.revenue_budget?.toString() || '');
    setCogsBudgetInput(item.cogs_budget?.toString() || '');
    setCurrencyInput(item.currency || 'DKK');
    setNotesInput('');
  };

  const handleSaveRevenue = async () => {
    if (!editingItem || !revenueInput) return;

    try {
      await saveRevenue({
        location_id: editingItem.location_id,
        year: editingItem.year,
        month: editingItem.month,
        revenue_amount: parseFloat(revenueInput),
        currency: currencyInput,
        notes: notesInput.trim() || undefined
      });
      
      setEditingItem(null);
      setRevenueInput('');
      setNotesInput('');
    } catch (error) {
      console.error('Error saving revenue:', error);
    }
  };

  const handleSaveBudget = async () => {
    if (!editingItem || !revenueBudgetInput || !cogsBudgetInput) return;

    try {
      await saveBudget({
        location_id: editingItem.location_id,
        year: editingItem.year,
        month: editingItem.month,
        revenue_budget: parseFloat(revenueBudgetInput),
        cogs_budget: parseFloat(cogsBudgetInput),
        currency: currencyInput,
        notes: notesInput.trim() || undefined
      });

      setEditingItem(null);
      setRevenueBudgetInput('');
      setCogsBudgetInput('');
      setCurrencyInput('DKK');
      setNotesInput('');
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setRevenueInput('');
    setRevenueBudgetInput('');
    setCogsBudgetInput('');
    setCurrencyInput('DKK');
    setNotesInput('');
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Exiting edit mode, cancel any open edits
      handleCancelEdit();
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1];
  };

  const getCogsColor = (percentage: number | null, variance: number | null) => {
    if (percentage === null) return 'text-gray-500 bg-gray-50';
    if (variance === null) return 'text-gray-500 bg-gray-50';
    
    // Variance-based logic: lower is better
    if (variance <= 0) return 'text-green-600 bg-green-50'; // Excellent: at or below target
    if (variance <= 0.5) return 'text-yellow-600 bg-yellow-50'; // Good: within 0.5% of target
    return 'text-red-600 bg-red-50'; // Bad: more than 0.5% above target
  };

  const getCogsStatus = (percentage: number | null, variance: number | null) => {
    if (percentage === null) return 'No Revenue';
    if (variance === null) return 'No Target';
    
    // Variance-based logic: lower is better
    if (variance <= 0) return 'Excellent'; // At or below target
    if (variance <= 0.5) return 'Good'; // Within 0.5% of target
    return 'Bad'; // More than 0.5% above target
  };

  if (error) {
    return (
      <div className="p-8">
        <ErrorState 
          title="Error Loading COGS Dashboard"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">COGS Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor Cost of Goods Sold by location and month
            </p>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {getMonthName(selectedMonth)} {selectedYear}
              </div>
            </div>
            
            <button
              onClick={() => navigateMonth('next')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading COGS data..." size="lg" />
      ) : (
        <div className="space-y-6">

          {/* COGS Table */}
           <div className="bg-white rounded-lg shadow-sm border">
             <div className="px-6 py-4 border-b border-gray-200">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-medium text-gray-900">COGS Analysis by Location</h3>
                 <button
                   onClick={toggleEditMode}
                   className={`px-3 py-1 text-sm rounded-md transition-colors ${
                     isEditMode 
                       ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                       : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                   }`}
                 >
                   {isEditMode ? 'Exit Edit' : 'Edit Data'}
                 </button>
               </div>
             </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300">
                      Metric
                    </th>
                     {dashboardData?.map((item) => (
                       <th key={item.location_id} className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                         <div className="max-w-36 truncate font-bold text-center" title={item.location_name}>
                           {item.location_name}
                         </div>
                       </th>
                     ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Revenue Row */}
                  <tr className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        Revenue
                      </div>
                    </td>
                     {dashboardData?.map((item) => (
                       <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                         {isEditMode ? (
                           <button
                             onClick={() => handleEditRevenue(item)}
                             className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                           >
                             {item.revenue_amount ? (
                               formatCurrencyByCode(item.revenue_amount, item.currency)
                             ) : (
                               <span className="text-gray-400">Click to set revenue</span>
                             )}
                           </button>
                         ) : (
                           <div className="text-sm text-gray-900">
                             {item.revenue_amount ? (
                               formatCurrencyByCode(item.revenue_amount, item.currency)
                             ) : (
                               <span className="text-gray-400">Not set</span>
                             )}
                           </div>
                         )}
                       </td>
                     ))}
                  </tr>

                  {/* Revenue Budget Row */}
                  <tr className="hover:bg-gray-50 border-t-2 border-gray-300">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        Revenue Budget
                      </div>
                    </td>
                     {dashboardData?.map((item) => (
                       <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                         {isEditMode ? (
                           <button
                             onClick={() => handleEditBudget(item)}
                             className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                           >
                             {item.revenue_budget ? (
                               formatCurrencyByCode(item.revenue_budget, item.currency)
                             ) : (
                               <span className="text-gray-400">Click to set budget</span>
                             )}
                           </button>
                         ) : (
                           <div className="text-sm text-gray-900">
                             {item.revenue_budget ? (
                               formatCurrencyByCode(item.revenue_budget, item.currency)
                             ) : (
                               <span className="text-gray-400">Not set</span>
                             )}
                           </div>
                         )}
                       </td>
                     ))}
                  </tr>

                  {/* Spending Row */}
                  <tr className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        Spending
                      </div>
                    </td>
                    {dashboardData?.map((item) => (
                      <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                        <div className="text-sm text-gray-900">
                          {item.total_spend > 0 ? (
                            formatCurrencyByCode(item.total_spend, item.currency)
                          ) : (
                            <span className="text-gray-400">No spending</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* COGS Budget Row */}
                  <tr className="hover:bg-gray-50 border-t-2 border-gray-300">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        COGS Budget
                      </div>
                    </td>
                     {dashboardData?.map((item) => (
                       <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                         {isEditMode ? (
                           <button
                             onClick={() => handleEditBudget(item)}
                             className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                           >
                             {item.cogs_budget ? (
                               formatCurrencyByCode(item.cogs_budget, item.currency)
                             ) : (
                               <span className="text-gray-400">Click to set budget</span>
                             )}
                           </button>
                         ) : (
                           <div className="text-sm text-gray-900">
                             {item.cogs_budget ? (
                               formatCurrencyByCode(item.cogs_budget, item.currency)
                             ) : (
                               <span className="text-gray-400">Not set</span>
                             )}
                           </div>
                         )}
                       </td>
                     ))}
                  </tr>

                  {/* COGS % Row */}
                  <tr className="hover:bg-gray-50 border-t-2 border-gray-300">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        COGS %
                      </div>
                    </td>
                    {dashboardData?.map((item) => (
                      <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCogsColor(item.cogs_percentage, item.cogs_percentage_vs_target)}`}>
                          {item.cogs_percentage !== null ? (
                            <>
                              {item.cogs_percentage.toFixed(1)}%
                              <span className="ml-1 text-xs opacity-75">
                                ({getCogsStatus(item.cogs_percentage, item.cogs_percentage_vs_target)})
                              </span>
                            </>
                          ) : (
                            getCogsStatus(item.cogs_percentage, item.cogs_percentage_vs_target)
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Target COGS % Row */}
                  <tr className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        Target COGS %
                      </div>
                    </td>
                    {dashboardData?.map((item) => (
                      <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                        <div className="text-sm text-gray-900">
                          {item.target_cogs_percentage ? (
                            <span className="font-medium text-blue-600">
                              {item.target_cogs_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                   {/* Variance Row */}
                   <tr className="hover:bg-gray-50">
                     <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                       <div className="text-sm font-medium text-gray-900">
                         Variance
                       </div>
                     </td>
                    {dashboardData?.map((item) => (
                      <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                        <div className="text-sm">
                     {item.cogs_percentage_vs_target !== null && item.cogs_percentage_vs_target !== undefined ? (
                       <span className={`font-medium ${
                         item.cogs_percentage_vs_target <= 0 ? 'text-green-600' : 'text-red-600'
                       }`}>
                         {item.cogs_percentage_vs_target > 0 ? '+' : ''}{item.cogs_percentage_vs_target.toFixed(1)}pp
                       </span>
                     ) : (
                       <span className="text-gray-400">N/A</span>
                     )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Spend per PAX Row - Separated with border */}
                  <tr className="hover:bg-gray-50 border-t-4 border-gray-300">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r-2 border-gray-300">
                      <div className="text-sm font-medium text-gray-900">
                        Spend per PAX
                      </div>
                    </td>
                    {dashboardData?.map((item) => (
                      <td key={item.location_id} className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                        <div className="text-sm">
                          {item.spend_per_pax !== null ? (
                            <span className="font-semibold text-blue-600">
                              {item.spend_per_pax.toFixed(1)} {item.currency === 'GBP' ? '£' : 'kr'}
                            </span>
                          ) : (
                            <span className="text-gray-400">No PAX data</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Deep Dive Analysis Section */}
      {dashboardData && dashboardData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Deep Dive Analysis</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Product-level breakdown of COGS spending for detailed analysis
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Select Location:</label>
                <select
                  value={selectedLocationForDeepDive || ''}
                  onChange={(e) => setSelectedLocationForDeepDive(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Choose a location...</option>
                  {dashboardData?.map((item) => (
                    <option key={item.location_id} value={item.location_id}>
                      {item.location_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Filters for Deep Dive Analysis */}
            {selectedLocationForDeepDive && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  {/* Categories Filter */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        Categories ({selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'All'})
                      </span>
                      {isCategoriesExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    
                    {isCategoriesExpanded && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2 mt-3">
                          {availableFilters?.categories?.map((category) => (
                            <label key={category} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(category)}
                                onChange={() => toggleCategory(category)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{category}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suppliers Filter */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setIsSuppliersExpanded(!isSuppliersExpanded)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        Suppliers ({selectedSuppliers.length > 0 ? `${selectedSuppliers.length} selected` : 'All'})
                      </span>
                      {isSuppliersExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    
                    {isSuppliersExpanded && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2 mt-3 max-h-32 overflow-y-auto">
                          {availableFilters?.suppliers?.map((supplier) => (
                            <label key={supplier} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSuppliers.includes(supplier)}
                                onChange={() => toggleSupplier(supplier)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{supplier}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clear Filters Button */}
                  {(selectedCategories.length > 0 || selectedSuppliers.length > 0) && (
                    <div>
                      <button
                        onClick={clearAllFilters}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedLocationForDeepDive ? (
            <div className="p-6">
              {deepDiveLoading ? (
                <LoadingState message="Loading product breakdown..." size="md" />
              ) : deepDiveError ? (
                <ErrorState 
                  message="Failed to load product breakdown" 
                  onRetry={() => window.location.reload()}
                />
              ) : deepDiveData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Revenue</div>
                          <div className="text-3xl font-bold text-blue-900 mt-2">
                            {deepDiveData.total_revenue ? 
                              formatCurrencyByCode(deepDiveData.total_revenue, deepDiveData.currency) : 
                              'Not set'
                            }
                          </div>
                        </div>
                        <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">₽</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Total Spending</div>
                          <div className="text-3xl font-bold text-orange-900 mt-2">
                            {formatCurrencyByCode(deepDiveData.total_spend, deepDiveData.currency)}
                          </div>
                        </div>
                        <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">$</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-green-700 uppercase tracking-wide">COGS %</div>
                          <div className="text-3xl font-bold text-green-900 mt-2">
                            {deepDiveData.cogs_percentage ? 
                              `${deepDiveData.cogs_percentage.toFixed(1)}%` : 
                              'N/A'
                            }
                          </div>
                        </div>
                        <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Products</div>
                          <div className="text-3xl font-bold text-purple-900 mt-2">
                            {deepDiveData.products.length}
                          </div>
                        </div>
                        <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">#</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Breakdown Table */}
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                            <div className="flex items-center">
                              <span className="mr-2">#</span>
                              Product Details
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            <div className="flex flex-col">
                              <span>Total Spend</span>
                              <span className="text-xs font-normal text-gray-500">({deepDiveData.currency})</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Spend per PAX
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            % of Total Spend
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            % of Revenue
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Invoice Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {(() => {
                          // Calculate the maximum percentages for relative bar scaling
                          const maxTotalSpendPercentage = Math.max(...deepDiveData.products.map(p => Math.abs(p.percentage_of_total_spend)));
                          const maxRevenuePercentage = Math.max(...deepDiveData.products.map(p => Math.abs(p.percentage_of_revenue)));
                          
                          return deepDiveData.products.map((product, index) => {
                            const productKey = `${product.product_code || product.description}-${index}`;
                            const isExpanded = expandedProducts.has(productKey);
                            
                            return (
                              <React.Fragment key={productKey}>
                                <tr className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                  <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap border-r border-gray-200">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8 mr-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                          index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 
                                          index < 10 ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' : 
                                          'bg-gray-200 text-gray-600'
                                        }`}>
                                          {index + 1}
                                        </div>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-900 truncate">
                                          {product.description || 'No Description'}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {(product.product_code || 'No Code') + ' | ' + ((product as { supplier_name?: string }).supplier_name || 'Unknown Supplier')}
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 ml-2 flex items-center gap-1">
                                        <button
                                          onClick={() => toggleProductExpansion(productKey)}
                                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                          title="View across locations"
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => navigate(`/product-efficiency/${product.product_code || 'unknown'}/${selectedLocationForDeepDive}`, {
                                            state: {
                                              returnTo: '/cogs-analysis',
                                              returnContext: {
                                                year: selectedYear,
                                                month: selectedMonth,
                                                locationId: selectedLocationForDeepDive
                                              }
                                            }
                                          })}
                                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                          title="View product details"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                product.category_name 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {product.category_name || 'No Category'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-bold text-gray-900">
                                {formatCurrencyByCode(product.total_spend, deepDiveData.currency)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.invoice_count} {product.invoice_count === 1 ? 'invoice' : 'invoices'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {(product.spend_per_pax || 0).toFixed(1)} {deepDiveData.currency === 'GBP' ? '£' : 'kr'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${product.percentage_of_total_spend < 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                                    style={{ width: maxTotalSpendPercentage > 0 ? `${(Math.abs(product.percentage_of_total_spend) / maxTotalSpendPercentage) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
                                  {product.percentage_of_total_spend.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${product.percentage_of_revenue < 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
                                    style={{ width: maxRevenuePercentage > 0 ? `${(Math.abs(product.percentage_of_revenue) / maxRevenuePercentage) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
                                  {product.percentage_of_revenue.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                product.invoice_count > 10 ? 'bg-green-100 text-green-800' :
                                product.invoice_count > 5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {product.invoice_count}
                              </span>
                            </td>
                                </tr>
                                
                                {/* Expandable Location Breakdown */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="px-0 py-0">
                                      <ProductLocationBreakdown
                                        productCode={product.product_code}
                                        productDescription={product.description}
                                        year={selectedYear}
                                        month={selectedMonth}
                                        selectedLocationId={selectedLocationForDeepDive}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Key Insights */}
                  {deepDiveData.products.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Key Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Top Product:</span>
                          <span className="ml-2 text-gray-600">
                            {deepDiveData.products[0].product_code || deepDiveData.products[0].description} 
                            ({deepDiveData.products[0].percentage_of_total_spend.toFixed(1)}% of spending)
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Top 3 Products:</span>
                          <span className="ml-2 text-gray-600">
                            {deepDiveData.products.slice(0, 3).reduce((sum, p) => sum + p.percentage_of_total_spend, 0).toFixed(1)}% of total spending
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No spending data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No product spending data found for this location and month.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a location</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a location from the dropdown above to see detailed product spending analysis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Unified Revenue/Budget Input Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingItem.type === 'revenue' ? 'Revenue Data' : 'Budget Targets'} - {editingItem.location_name}
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                {getMonthName(editingItem.month)} {editingItem.year}
              </p>
              
              <div className="space-y-4">
                {editingItem.type === 'revenue' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Revenue Amount
                      </label>
                      <input
                        type="number"
                        value={revenueInput}
                        onChange={(e) => setRevenueInput(e.target.value)}
                        placeholder="Enter monthly revenue"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Revenue Budget
                      </label>
                      <input
                        type="number"
                        value={revenueBudgetInput}
                        onChange={(e) => setRevenueBudgetInput(e.target.value)}
                        placeholder="Enter revenue budget target"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        COGS Budget
                      </label>
                      <input
                        type="number"
                        value={cogsBudgetInput}
                        onChange={(e) => setCogsBudgetInput(e.target.value)}
                        placeholder="Enter COGS budget target"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {revenueBudgetInput && cogsBudgetInput && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          Target COGS %: <span className="font-medium">
                            {((parseFloat(cogsBudgetInput) / parseFloat(revenueBudgetInput)) * 100).toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="DKK">Danish Krone (kr)</option>
                    <option value="NOK">Norwegian Krone (kr)</option>
                    <option value="GBP">British Pound Sterling (£)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Add any notes..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingItem.type === 'revenue' ? handleSaveRevenue : handleSaveBudget}
                  disabled={
                    savingRevenue || savingBudget || 
                    (editingItem.type === 'revenue' ? !revenueInput : (!revenueBudgetInput || !cogsBudgetInput))
                  }
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    editingItem.type === 'revenue' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {savingRevenue || savingBudget ? 'Saving...' : 
                   editingItem.type === 'revenue' ? 'Save Revenue' : 'Save Budget'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
