import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, BarChart3, Plus, Save, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCogsAnalysis, useMonthlyRevenue, useSaveMonthlyRevenue } from '@/hooks/metrics/useCogsAnalysis';
import { useLocationMetrics } from '@/hooks/metrics/useLocationMetrics';
import { formatCurrencyByCode } from '@/utils/currency';
import { formatCurrency } from '@/utils/format';
import { ErrorState, LoadingState, NoDataState } from '@/components/shared/ui/EmptyStates';

export const CogsAnalysis: React.FC = () => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [revenueInput, setRevenueInput] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('DKK');
  const [notes, setNotes] = useState<string>('');
  const [showRevenueForm, setShowRevenueForm] = useState<boolean>(false);

  // Simple filters for COGS Analysis
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  const { data: cogsData, isLoading: cogsLoading, error: cogsError } = useCogsAnalysis(
    selectedLocationId, 
    selectedYear, 
    selectedMonth,
    selectedCategory,
    selectedSupplier
  );

  const { data: monthlyRevenue, isLoading: revenueLoading } = useMonthlyRevenue();
  const { data: locationMetrics } = useLocationMetrics();
  const { saveRevenue, isLoading: savingRevenue, error: saveError } = useSaveMonthlyRevenue();

  // Extract unique categories and suppliers from COGS data for filter options
  const availableCategories = React.useMemo(() => {
    if (!cogsData?.product_breakdown) return [];
    const categories = new Set<string>();
    cogsData.product_breakdown.forEach(product => {
      if (product.category_name) {
        categories.add(product.category_name);
      }
    });
    return Array.from(categories).sort();
  }, [cogsData]);

  const availableSuppliers = React.useMemo(() => {
    if (!cogsData?.product_breakdown) return [];
    const suppliers = new Set<string>();
    cogsData.product_breakdown.forEach(product => {
      // For now, we'll use a simple approach to extract supplier names
      // This could be enhanced to use actual supplier data from the database
      if (product.description) {
        // Look for common supplier patterns in the description
        const supplierMatch = product.description.match(/([A-Z][a-z]+ & [A-Z][a-z]+ [A-Z]+|[A-Z][a-z]+ [A-Z]+)/);
        if (supplierMatch) {
          suppliers.add(supplierMatch[1]);
        }
      }
    });
    return Array.from(suppliers).sort();
  }, [cogsData]);

  // Check if revenue data exists for selected location/month
  const existingRevenue = monthlyRevenue.find(
    r => r.location_id === selectedLocationId && 
         r.year === selectedYear && 
         r.month === selectedMonth
  );

  useEffect(() => {
    if (existingRevenue) {
      setRevenueInput(existingRevenue.revenue_amount.toString());
      setSelectedCurrency(existingRevenue.currency);
      setNotes(existingRevenue.notes || '');
      setShowRevenueForm(false);
    } else {
      setRevenueInput('');
      setNotes('');
      setShowRevenueForm(true);
      // Set default currency
      if (!selectedCurrency) {
        setSelectedCurrency('DKK');
      }
    }
  }, [existingRevenue, selectedLocationId, selectedYear, selectedMonth, selectedCurrency]);

  const handleSaveRevenue = async () => {
    if (!selectedLocationId || !revenueInput || !selectedCurrency) {
      return;
    }

    try {
      await saveRevenue({
        location_id: selectedLocationId,
        year: selectedYear,
        month: selectedMonth,
        revenue_amount: parseFloat(revenueInput),
        currency: selectedCurrency,
        notes: notes.trim() || undefined
      });
      
      setShowRevenueForm(false);
    } catch (error) {
      console.error('Error saving revenue:', error);
    }
  };

  const handleEditRevenue = () => {
    setShowRevenueForm(true);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    const newYear = currentDate.getFullYear();
    const newMonth = currentDate.getMonth() + 1;
    
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  };

  const getCogsColor = (percentage: number) => {
    if (percentage <= 25) return 'text-green-600 bg-green-50';
    if (percentage <= 35) return 'text-yellow-600 bg-yellow-50';
    if (percentage <= 45) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getCogsStatus = (percentage: number) => {
    if (percentage <= 25) return 'Excellent';
    if (percentage <= 35) return 'Good';
    if (percentage <= 45) return 'Fair';
    return 'Needs Attention';
  };

  if (cogsError) {
    return (
      <div className="p-8">
        <ErrorState 
          title="Error Loading COGS Analysis"
          message={cogsError.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">COGS Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze Cost of Goods Sold (COGS) percentage and product breakdown by month
        </p>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {getMonthName(selectedMonth)} {selectedYear}
              </h2>
            </div>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Selection</h3>
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>Debug Info:</strong> Categories: {availableCategories.length}, Suppliers: {availableSuppliers.length}, Selected Category: "{selectedCategory}", Selected Supplier: "{selectedSupplier}"
        </div>
        <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 rounded text-center font-bold text-red-800">
          🚨 FILTERS SHOULD BE VISIBLE HERE! 🚨
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">Select a restaurant</option>
              {locationMetrics?.map((location) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.location_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">All Categories ({availableCategories.length})</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">All Suppliers ({availableSuppliers.length})</option>
              {availableSuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {selectedLocationId && (
              <button
                onClick={() => setShowRevenueForm(!showRevenueForm)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {existingRevenue ? 'Edit Revenue' : 'Add Revenue'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Input Form */}
      {showRevenueForm && selectedLocationId && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {existingRevenue ? 'Edit' : 'Add'} Monthly Revenue
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this revenue data"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSaveRevenue}
              disabled={!revenueInput || savingRevenue}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {savingRevenue ? 'Saving...' : 'Save Revenue'}
            </button>
            <button
              onClick={() => setShowRevenueForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {saveError && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {saveError.message}
            </div>
          )}
        </div>
      )}

      {/* COGS Analysis Results */}
      {selectedLocationId && !showRevenueForm && (
        <>
          {cogsLoading ? (
            <LoadingState message="Loading COGS analysis..." size="lg" />
          ) : !cogsData ? (
            <NoDataState 
              context="cogs"
              suggestion="Add monthly revenue data to start analyzing COGS percentages."
            />
          ) : (
            <div className="space-y-6">
              {/* COGS Overview */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    COGS Analysis - {cogsData.location_name}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {getMonthName(cogsData.month)} {cogsData.year}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrencyByCode(cogsData.revenue_amount, cogsData.currency)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cogsData.currency}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Total Spend</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrencyByCode(cogsData.total_spend, cogsData.currency)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cogsData.currency}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">COGS %</span>
                    </div>
                    <div className={`text-2xl font-bold ${getCogsColor(cogsData.cogs_percentage).split(' ')[0]}`}>
                      {cogsData.cogs_percentage.toFixed(1)}%
                    </div>
                    <div className={`text-xs font-medium ${getCogsColor(cogsData.cogs_percentage)} px-2 py-1 rounded-full inline-block mt-1`}>
                      {getCogsStatus(cogsData.cogs_percentage)}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Products</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {cogsData.product_breakdown.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Breakdown Table */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Product Breakdown</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Individual product spending and percentage of total COGS
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Spend
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % of COGS
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Spend per PAX
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoices
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Calculate the maximum percentage for relative bar scaling
                        const maxPercentage = Math.max(...cogsData.product_breakdown.map(p => Math.abs(p.spend_percentage)));
                        
                        return cogsData.product_breakdown.map((product, index) => (
                        <tr key={product.product_code || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              {product.product_code && (
                                <div className="text-sm font-medium text-gray-900">
                                  #{product.product_code}
                                </div>
                              )}
                              <div className="text-sm text-gray-500">
                                {product.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.category_name || 'Uncategorized'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrencyByCode(product.total_spend, cogsData.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {product.spend_percentage.toFixed(1)}%
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${product.spend_percentage < 0 ? 'bg-red-500' : 'bg-emerald-600'}`}
                                  style={{ 
                                    width: maxPercentage > 0 ? `${(Math.abs(product.spend_percentage) / maxPercentage) * 100}%` : '0%',
                                    minWidth: product.spend_percentage !== 0 ? '2px' : '0px'
                                  }}
                                  title={`${product.spend_percentage.toFixed(1)}% (relative to max: ${maxPercentage.toFixed(1)}%)`}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrencyByCode(product.avg_price, cogsData.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrencyByCode(product.spend_per_pax, cogsData.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.invoice_count}
                            </div>
                          </td>
                        </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedLocationId && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Restaurant</h3>
          <p className="text-gray-500">
            Choose a restaurant and month to analyze COGS percentage and product breakdown.
          </p>
        </div>
      )}
    </div>
  );
};
