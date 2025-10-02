import React from 'react';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { Pagination } from '@/components/shared/ui/Pagination';
import { formatCurrency } from '@/utils/format';
import { useTableColumns } from '@/hooks/ui/useTableColumns';
import { ArrowUpDown } from 'lucide-react';

interface PivotTableProps {
  data: {
    rows: string[];
    columns: string[];
    data: Map<string, Map<string, number>>;
    products: Map<string, {
      description: string;
      productCode: string;
      spend: number;
    }>;
  };
  paxData: Array<{ restaurant: string; pax: number }>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sortField: 'totalSpend' | 'spendPerPax' | string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: 'totalSpend' | 'spendPerPax' | string) => void;
  paginatedRows: string[];
  totalItems: number;
}

export const PivotTable: React.FC<PivotTableProps> = ({
  data,
  paxData,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDirection,
  onSortChange,
  paginatedRows,
  totalItems
}) => {
  const { columns, handleColumnResize } = useTableColumns([
    { id: 'product', width: 250, minWidth: 160, maxWidth: 300 },
    ...data.columns.map(restaurant => ({
      id: `restaurant-${restaurant}`,
      width: 150,
      minWidth: 120,
      maxWidth: 220
    })),
    { id: 'total', width: 150, minWidth: 120, maxWidth: 200 }
  ], [data.columns.length, data.columns.join()]);

  // Sort the paginated rows based on the current sort field
  const sortedPaginatedRows = React.useMemo(() => {
    if (!paginatedRows || paginatedRows.length === 0) return paginatedRows;
    
    return [...paginatedRows].sort((productKeyA, productKeyB) => {
      const productA = data.products.get(productKeyA);
      const productB = data.products.get(productKeyB);
      
      if (!productA || !productB) return 0;
      
      let valueA: number;
      let valueB: number;
      
      if (sortField === 'totalSpend') {
        // Sort by total spend across all restaurants
        const restaurantValuesA = data.data.get(productKeyA) || new Map();
        const restaurantValuesB = data.data.get(productKeyB) || new Map();
        valueA = Array.from(restaurantValuesA.values()).reduce((sum, val) => sum + val, 0);
        valueB = Array.from(restaurantValuesB.values()).reduce((sum, val) => sum + val, 0);
      } else if (sortField === 'spendPerPax') {
        // Sort by average spend per PAX
        const restaurantValuesA = data.data.get(productKeyA) || new Map();
        const restaurantValuesB = data.data.get(productKeyB) || new Map();
        const totalSpendA = Array.from(restaurantValuesA.values()).reduce((sum, val) => sum + val, 0);
        const totalSpendB = Array.from(restaurantValuesB.values()).reduce((sum, val) => sum + val, 0);
        
        const totalPaxA = data.columns.reduce((sum, restaurant) => {
          const restaurantSpend = restaurantValuesA.get(restaurant) || 0;
          if (restaurantSpend > 0) {
            const restaurantPax = paxData.filter(p => p.restaurant === restaurant).reduce((sum, p) => sum + p.pax, 0);
            return sum + restaurantPax;
          }
          return sum;
        }, 0);
        
        const totalPaxB = data.columns.reduce((sum, restaurant) => {
          const restaurantSpend = restaurantValuesB.get(restaurant) || 0;
          if (restaurantSpend > 0) {
            const restaurantPax = paxData.filter(p => p.restaurant === restaurant).reduce((sum, p) => sum + p.pax, 0);
            return sum + restaurantPax;
          }
          return sum;
        }, 0);
        
        valueA = totalPaxA > 0 ? totalSpendA / totalPaxA : 0;
        valueB = totalPaxB > 0 ? totalSpendB / totalPaxB : 0;
      } else if (data.columns.includes(sortField)) {
        // Sort by specific restaurant spend
        const restaurantValuesA = data.data.get(productKeyA) || new Map();
        const restaurantValuesB = data.data.get(productKeyB) || new Map();
        valueA = restaurantValuesA.get(sortField) || 0;
        valueB = restaurantValuesB.get(sortField) || 0;
      } else {
        return 0;
      }
      
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }, [paginatedRows, sortField, sortDirection, data, paxData]);

  // Use paginatedRows from parent component instead of internal pagination

  if (!data?.products || !data?.columns) {
    return (
      <div className="mt-8 bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white shadow-md rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900">Product Analysis by Restaurant</h2>
        <p className="mt-1 text-sm text-gray-500">Spend per Pax / Total Spend</p>
      </div>

      <div className="w-full overflow-x-auto">
        <ResizableTable
          columns={columns}
          onColumnResize={handleColumnResize}
          className="min-w-full divide-y divide-gray-200"
        >
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              {data.columns.map(restaurant => (
                <th
                  key={`restaurant-${restaurant}`}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-700"
                  onClick={() => onSortChange(restaurant)}
                >
                  {restaurant}
                  <ArrowUpDown
                    className={`inline w-4 h-4 ml-1 transition-transform duration-150 ${
                      sortDirection === 'asc' ? 'rotate-180' : ''
                    } ${sortField === restaurant ? 'text-emerald-600' : 'text-gray-400'}`}
                  />
                </th>
              ))}
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-700"
                onClick={() => onSortChange('spendPerPax')}
              >
                Avg Spend per PAX & Total Spend 
                <ArrowUpDown
                  className={`inline w-4 h-4 ml-1 transition-transform duration-150 ${
                    sortDirection === 'asc' ? 'rotate-180' : ''
                  } ${sortField ? 'text-emerald-600' : 'text-gray-400'}`}
                />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPaginatedRows.map(productKey => {
              const product = data.products.get(productKey);
              const productCode = product?.productCode || '';
              const description = product?.description || '';
              const restaurantValues = data.data.get(productKey) || new Map();

              const restaurantMetrics = new Map(
                data.columns.map(restaurant => {
                  const totalSpend = restaurantValues.get(restaurant) || 0;
                  const restaurantPax = paxData.filter(p => p.restaurant === restaurant).reduce((sum, p) => sum + p.pax, 0);
                  const spendPerPax = restaurantPax > 0 ? totalSpend / restaurantPax : 0;
                  return [restaurant, { spendPerPax, totalSpend }];
                })
              );

              const totalSpend = Array.from(restaurantMetrics.values())
                .reduce((sum, m) => sum + m.totalSpend, 0);

              // Fix: Only calculate PAX for restaurants that actually bought this product
              const totalPax = data.columns.reduce((sum, restaurant) => {
                const restaurantSpend = restaurantValues.get(restaurant) || 0;
                // Only include PAX if this restaurant actually bought the product
                if (restaurantSpend > 0) {
                  const restaurantPax = paxData.filter(p => p.restaurant === restaurant).reduce((sum, p) => sum + p.pax, 0);
                  return sum + restaurantPax;
                }
                return sum;
              }, 0);

              const avgSpendPerPax = totalPax > 0 ? totalSpend / totalPax : 0;

              return (
                <tr key={productKey} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {description}
                      <div className="text-xs text-gray-500">
                        {productCode}
                      </div>
                    </div>
                  </td>

                  {data.columns.map(restaurant => {
                    const metrics = restaurantMetrics.get(restaurant)!;
                    const isAboveAverage = metrics.spendPerPax > avgSpendPerPax;
                    const percentDiff = avgSpendPerPax
                      ? ((metrics.spendPerPax - avgSpendPerPax) / avgSpendPerPax) * 100
                      : 0;
                    const isSignificant = Math.abs(percentDiff) > 5;

                    return (
                      <td key={`restaurant-${restaurant}`} className="px-6 py-4 whitespace-nowrap">
                        {metrics.totalSpend > 0 ? (
                          <div className={`text-sm ${
                            isSignificant
                              ? isAboveAverage
                                ? 'text-red-600 bg-red-100'
                                : 'text-emerald-700 bg-emerald-50'
                              : 'text-gray-900'
                          } rounded-md px-2 py-1`}>
                            <div className="flex items-center gap-1">
                              <span>{metrics.spendPerPax === 0 ? '-' : `${formatCurrency(metrics.spendPerPax)}/PAX`}</span>
                              {isSignificant && (
                                <span className={`text-xs ${
                                  isAboveAverage ? 'text-red-600' : 'text-emerald-600'
                                }`}>
                                  ({isAboveAverage ? '+' : ''}{percentDiff.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                             {formatCurrency(Math.round(metrics.totalSpend))} total
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 text-center">-</div>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-6 py-4 whitespace-nowrap bg-gray-50">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 px-2 py-1 rounded-md">
                        <div>{formatCurrency(avgSpendPerPax)}/PAX</div>
                        <div className="text-xs text-gray-500">
                         {formatCurrency(Math.round(totalSpend))} total
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Column Totals Row */}
            {(() => {
              // Calculate totals for each restaurant column
              const columnTotals = data.columns.map(restaurant => {
                let totalSpend = 0;
                
                // Sum up all products for this restaurant
                sortedPaginatedRows.forEach(productKey => {
                  const restaurantValues = data.data.get(productKey) || new Map();
                  const restaurantSpend = restaurantValues.get(restaurant) || 0;
                  totalSpend += restaurantSpend;
                });
                
                // Get PAX for this restaurant (should be the same across all products)
                const restaurantPax = paxData.find(p => p.restaurant === restaurant)?.pax || 0;
                const totalSpendPerPax = restaurantPax > 0 ? totalSpend / restaurantPax : 0;
                return { restaurant, totalSpend, totalPax: restaurantPax, totalSpendPerPax };
              });
              
              // Calculate grand total
              const grandTotalSpend = columnTotals.reduce((sum, col) => sum + col.totalSpend, 0);
              const grandTotalPax = columnTotals.reduce((sum, col) => sum + col.totalPax, 0);
              const grandTotalSpendPerPax = grandTotalPax > 0 ? grandTotalSpend / grandTotalPax : 0;
              
              return (
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      Total
                    </div>
                  </td>
                  
                  {columnTotals.map(({ restaurant, totalSpend, totalSpendPerPax }) => (
                    <td key={`total-${restaurant}`} className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 px-2 py-1 rounded-md">
                          <div>{formatCurrency(totalSpendPerPax)}/PAX</div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(Math.round(totalSpend))} total
                          </div>
                        </div>
                      </div>
                    </td>
                  ))}
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 px-2 py-1 rounded-md">
                        <div>{formatCurrency(grandTotalSpendPerPax)}/PAX</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(Math.round(grandTotalSpend))} total
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </ResizableTable>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
};

