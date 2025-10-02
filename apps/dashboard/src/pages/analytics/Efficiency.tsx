import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OverallMetrics } from '@/components/features/analytics/efficiency/OverallMetrics';
import { PivotTable } from '@/components/features/analytics/efficiency/PivotTable';
import { RestaurantMetrics } from '@/components/features/analytics/efficiency/RestaurantMetrics';
import { useEfficiencyData } from '@/hooks/metrics';
import { useTimeBasedEfficiency } from '@/hooks/metrics/useTimeBasedEfficiency';
import { ErrorState, LoadingState, NoDataState } from '@/components/shared/ui/EmptyStates';
import { formatCurrency } from '@/utils/format';
import { usePagination } from '@/hooks/ui/usePagination';

export const Efficiency: React.FC = () => {
  const navigate = useNavigate();
  
  
  const {
    efficiencyMetrics,
    pivotData,
    overallMetrics,
    paxData,
    isLoading,
    error
  } = useEfficiencyData();

  const {
    efficiencyMetrics: timeBasedMetrics,
    isLoading: timeBasedLoading,
    error: timeBasedError
  } = useTimeBasedEfficiency();

  const [pivotSortField, setPivotSortField] = useState<'totalSpend' | 'spendPerPax' | string>('totalSpend');
  const [pivotSortDirection, setPivotSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('location-comparison');
  
  // Pivot table pagination
  const pivotTableData = React.useMemo(() => {
    if (!pivotData?.rows) return [];
    return pivotData.rows;
  }, [pivotData]);
  
  const { 
    currentPage: pivotPage, 
    pageSize: pivotPageSize, 
    goToPage: setPivotPage, 
    changePageSize: changePivotPageSize,
    paginatedItems: pivotPaginatedRows,
    totalItems: pivotTotalItems
  } = usePagination(pivotTableData, 10);
  
  // Time-based analysis state
  const [timeBasedPage, setTimeBasedPage] = useState(1);
  const timeBasedPageSize = 20;
  const [timeBasedSortField, setTimeBasedSortField] = useState<'efficiencyScore' | 'totalSpend' | 'dataPoints'>('efficiencyScore');
  const [timeBasedSortDirection, setTimeBasedSortDirection] = useState<'asc' | 'desc'>('desc');
  const [timeBasedFilter, setTimeBasedFilter] = useState<'all' | 'declining' | 'improving' | 'stable'>('all');

  const handlePivotSortChange = (field: 'totalSpend' | 'spendPerPax' | string) => {
    if (pivotSortField === field) {
      setPivotSortDirection(pivotSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPivotSortField(field);
      setPivotSortDirection('asc'); // First click goes to ascending
    }
  };


  const handleViewProductChart = (productCode: string, locationId: string) => {
    const encodedProductCode = encodeURIComponent(productCode);
    const encodedLocationId = encodeURIComponent(locationId);
    navigate(`/product-efficiency/${encodedProductCode}/${encodedLocationId}`, {
      state: { from: '/efficiency' }
    });
  };

  if (error || timeBasedError) {
    return (
      <div className="p-8">
        <ErrorState 
          title="Error Loading Efficiency Data"
          message={error?.message || timeBasedError?.message || 'Unknown error'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Efficiency Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and analyze procurement efficiency across restaurants using real database data
        </p>
        
      </div>

      <div className="w-full">
        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('location-comparison')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeTab === 'location-comparison'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-emerald-600'
            }`}
          >
            Location Comparison
          </button>
          <button
            onClick={() => setActiveTab('time-based')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeTab === 'time-based'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-emerald-600'
            }`}
          >
            Time-Based Analysis
          </button>
        </div>
        
        {activeTab === 'location-comparison' && (
          <div className="mt-6">
            {isLoading ? (
              <LoadingState message="Loading efficiency data..." size="lg" />
            ) : efficiencyMetrics.length === 0 && !pivotData.rows.length ? (
              <NoDataState 
                context="efficiency"
                suggestion="Import data to start analyzing procurement efficiency across your locations."
              />
            ) : (
              <>
                <OverallMetrics metrics={overallMetrics} />

                <PivotTable
                  data={pivotData}
                  paxData={paxData}
                  page={pivotPage}
                  pageSize={pivotPageSize}
                  onPageChange={setPivotPage}
                  onPageSizeChange={changePivotPageSize}
                  sortField={pivotSortField}
                  sortDirection={pivotSortDirection}
                  onSortChange={handlePivotSortChange}
                  paginatedRows={pivotPaginatedRows}
                  totalItems={pivotTotalItems}
                />
                
                {efficiencyMetrics.length > 0 && (
                  <div className="mt-6">
                    <RestaurantMetrics
                      metrics={efficiencyMetrics}
                      overallAvgSpendPerPax={overallMetrics.avgSpendPerPax}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {activeTab === 'time-based' && (
          <div className="mt-6">
            {timeBasedLoading ? (
              <LoadingState message="Loading time-based efficiency data..." size="lg" />
            ) : timeBasedMetrics.length === 0 ? (
              <NoDataState 
                context="efficiency"
                suggestion="Select a longer time interval for the time-based analysis to work properly. Minimum 3 months recommended for reliable trend analysis."
              />
            ) : (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Time-Based Efficiency Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700">Products Analyzed</div>
                      <div className="text-2xl font-bold text-gray-900">{timeBasedMetrics.length}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700">Avg Efficiency Score</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {timeBasedMetrics.length > 0 
                          ? Math.round(timeBasedMetrics.reduce((sum, m) => sum + m.efficiencyScore, 0) / timeBasedMetrics.length)
                          : 0}%
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700">Total Spend Analyzed</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {timeBasedMetrics.reduce((sum, m) => sum + m.timeSeries.reduce((s, p) => s + p.totalSpend, 0), 0).toLocaleString('da-DK', {
                          style: 'currency',
                          currency: 'DKK'
                        })}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700">Declining Trends</div>
                      <div className="text-2xl font-bold text-red-600">
                        {timeBasedMetrics.filter(m => m.trendDirection === 'declining').length}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Filters and Controls */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">All Products Analysis</h3>
                    <div className="flex gap-4">
                      <select
                        value={timeBasedFilter}
                        onChange={(e) => setTimeBasedFilter(e.target.value as 'all' | 'declining' | 'improving' | 'stable')}
                        className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                      >
                        <option value="all">All Products</option>
                        <option value="declining">Declining Trends</option>
                        <option value="improving">Improving Trends</option>
                        <option value="stable">Stable Trends</option>
                      </select>
                      <select
                        value={`${timeBasedSortField}-${timeBasedSortDirection}`}
                        onChange={(e) => {
                          const [field, direction] = e.target.value.split('-');
                          setTimeBasedSortField(field as 'efficiencyScore' | 'totalSpend' | 'dataPoints');
                          setTimeBasedSortDirection(direction as 'asc' | 'desc');
                        }}
                        className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                      >
                        <option value="efficiencyScore-asc">Efficiency (Low to High)</option>
                        <option value="efficiencyScore-desc">Efficiency (High to Low)</option>
                        <option value="totalSpend-desc">Total Spend (High to Low)</option>
                        <option value="totalSpend-asc">Total Spend (Low to High)</option>
                        <option value="dataPoints-desc">Data Points (High to Low)</option>
                        <option value="dataPoints-asc">Data Points (Low to High)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efficiency
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trend
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              Data Quality
                              <div className="relative inline-block group">
                                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap w-48" style={{zIndex: 9999}}>
                                  <div className="text-left">
                                    <div className="font-semibold mb-1">Data Quality</div>
                                    <div className="mb-1">Points = Number of months with data</div>
                                    <div className="text-gray-300">
                                      • Good: 12+ months<br/>
                                      • Fair: 7-11 months<br/>
                                      • Limited: 2-6 months
                                    </div>
                                  </div>
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Spend
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          // Filter and sort data
                          let filteredData = timeBasedMetrics;
                          
                          if (timeBasedFilter !== 'all') {
                            filteredData = filteredData.filter(m => m.trendDirection === timeBasedFilter);
                          }
                          
                          filteredData = filteredData.sort((a, b) => {
                            let aVal, bVal;
                            switch (timeBasedSortField) {
                              case 'efficiencyScore':
                                aVal = a.efficiencyScore;
                                bVal = b.efficiencyScore;
                                break;
                              case 'totalSpend':
                                aVal = a.timeSeries.reduce((sum, point) => sum + point.totalSpend, 0);
                                bVal = b.timeSeries.reduce((sum, point) => sum + point.totalSpend, 0);
                                break;
                              case 'dataPoints':
                                aVal = a.timeSeries.length;
                                bVal = b.timeSeries.length;
                                break;
                              default:
                                aVal = a.efficiencyScore;
                                bVal = b.efficiencyScore;
                            }
                            
                            return timeBasedSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                          });
                          
                          // Pagination
                          const startIndex = (timeBasedPage - 1) * timeBasedPageSize;
                          const endIndex = startIndex + timeBasedPageSize;
                          const paginatedData = filteredData.slice(startIndex, endIndex);
                          
                          return paginatedData.map((metric) => (
                            <tr key={`${metric.productCode}-${metric.locationId}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{metric.description}</div>
                                  <div className="text-sm text-gray-500">{metric.productCode}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{metric.locationName}</div>
                                <div className="text-sm text-gray-500">{metric.unitType}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  metric.efficiencyScore >= 80 ? 'text-green-800 bg-green-100' :
                                  metric.efficiencyScore >= 60 ? 'text-yellow-800 bg-yellow-100' :
                                  metric.efficiencyScore >= 40 ? 'text-orange-800 bg-orange-100' :
                                  'text-red-800 bg-red-100'
                                }`}>
                                  {metric.efficiencyScore.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`flex items-center gap-1 text-sm ${
                                  metric.trendDirection === 'improving' ? 'text-green-600' :
                                  metric.trendDirection === 'declining' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {metric.trendDirection === 'improving' ? '↗' : 
                                   metric.trendDirection === 'declining' ? '↘' : '→'}
                                  <span className="capitalize">{metric.trendDirection}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{metric.timeSeries.length} points</div>
                                <div className={`text-xs ${
                                  metric.dataQualityFactor >= 0.8 ? 'text-green-600' :
                                  metric.dataQualityFactor >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {metric.dataQualityFactor >= 0.8 ? 'Good' : 
                                   metric.dataQualityFactor >= 0.5 ? 'Fair' : 'Limited'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {formatCurrency(metric.timeSeries.reduce((sum, point) => sum + point.totalSpend, 0))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleViewProductChart(metric.productCode, metric.locationId)}
                                  className="text-emerald-600 hover:text-emerald-900"
                                >
                                  View Charts
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {(() => {
                    const filteredData = timeBasedFilter !== 'all' 
                      ? timeBasedMetrics.filter(m => m.trendDirection === timeBasedFilter)
                      : timeBasedMetrics;
                    const totalPages = Math.ceil(filteredData.length / timeBasedPageSize);
                    
                    if (totalPages <= 1) return null;
                    
                    return (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {((timeBasedPage - 1) * timeBasedPageSize) + 1} to {Math.min(timeBasedPage * timeBasedPageSize, filteredData.length)} of {filteredData.length} results
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTimeBasedPage(Math.max(1, timeBasedPage - 1))}
                            disabled={timeBasedPage === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm">
                            Page {timeBasedPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setTimeBasedPage(Math.min(totalPages, timeBasedPage + 1))}
                            disabled={timeBasedPage === totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

