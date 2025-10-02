import React from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { Pagination } from '@/components/shared/ui/Pagination';
import { useTableColumns } from '@/hooks/ui/useTableColumns';

interface RestaurantMetricsProps {
  metrics: Array<{
    locationId: string;
    locationName: string;
    totalSpend: number;
    totalPax: number;
    spendPerPax: number;
    productMetrics: Map<string, {
      productCode: string;
      description: string;
      totalSpend: number;
      spendPerPax: number;
      quantity: number;
      unitType: string;
    }>; 
  }>;
  overallAvgSpendPerPax: number;
}

export const RestaurantMetrics: React.FC<RestaurantMetricsProps> = ({
  metrics,
  overallAvgSpendPerPax,
}) => {
  const [expandedRestaurant, setExpandedRestaurant] = React.useState<string | null>(null);
  const [productPage, setProductPage] = React.useState<Record<string, number>>({});
  const productPageSize = 10;
  const [sortField, setSortField] = React.useState<'totalSpend' | 'spendPerPax' | 'efficiency' | 'quantity'>('totalSpend');
  const [sortDirection, setSortDirection] = React.useState<'desc' | 'asc'>('desc');

  const { columns, handleColumnResize } = useTableColumns([
    { id: 'product', width: 300 },
    { id: 'quantity', width: 150 },
    { id: 'totalSpend', width: 150 },
    { id: 'spendPerPax', width: 200 },
    { id: 'efficiency', width: 200 }
  ]);

  // Calculate average spendPerPax per product across all restaurants
  const globalProductAverages = new Map<string, { avgSpendPerPax: number }>();
  const productTotals = new Map<string, { totalSpend: number; totalPax: number }>();

  metrics.forEach(metric => {
    metric.productMetrics.forEach((product, key) => {
      if (!productTotals.has(key)) {
        productTotals.set(key, { totalSpend: 0, totalPax: 0 });
      }
      const totals = productTotals.get(key)!;
      totals.totalSpend += product.totalSpend;
      totals.totalPax += metric.totalPax;
    });
  });

  productTotals.forEach((totals, key) => {
    globalProductAverages.set(key, {
      avgSpendPerPax: totals.totalPax > 0 ? totals.totalSpend / totals.totalPax : 0
    });
  });

  return (
    <div className="space-y-6">
      {metrics.map((metric) => (
        <div key={metric.locationId} className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedRestaurant(
                  expandedRestaurant === metric.locationId ? null : metric.locationId
                )
              }
            >
              <div>
                <div className="text-lg font-medium text-gray-900">
                  {metric.locationName}
                </div>
                <div className="text-sm text-gray-500">
                  {metric.totalPax.toLocaleString()} PAX · {formatCurrency(metric.spendPerPax)}/PAX
                  {overallAvgSpendPerPax && (
                    <span
                      className={`ml-2 ${
                        metric.spendPerPax > overallAvgSpendPerPax
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      ({((metric.spendPerPax - overallAvgSpendPerPax) / overallAvgSpendPerPax * 100).toFixed(1)}% vs avg)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Spend</div>
                  <div className="text-lg font-medium text-gray-900">
                    {formatCurrency(metric.totalSpend)}
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    metric.spendPerPax < overallAvgSpendPerPax
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {metric.spendPerPax < overallAvgSpendPerPax ? 'Efficient' : 'Review Needed'}
                </div>
                <div>
                  {expandedRestaurant === metric.locationId ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {expandedRestaurant === metric.locationId && (
              <div className="mt-4">
                <div className="overflow-x-auto">
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
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-700"
                          onClick={() => {
                            if (sortField === 'quantity') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('quantity');
                              setSortDirection('desc');
                            }
                          }}
                        >
                          Quantity
                          {sortField === 'quantity' && (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="inline w-4 h-4 ml-1 text-emerald-600" />
                            ) : (
                              <ChevronDown className="inline w-4 h-4 ml-1 text-emerald-600" />
                            )
                          )}
                        </th>
                        {['totalSpend', 'spendPerPax', 'efficiency'].map(field => (
                          <th
                            key={field}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-700"
                            onClick={() => {
                              if (sortField === field) {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField(field as typeof sortField);
                                setSortDirection('desc');
                              }
                            }}
                          >
                            {field === 'totalSpend' && 'Total Spend'}
                            {field === 'spendPerPax' && 'Spend per PAX'}
                            {field === 'efficiency' && 'Efficiency'}
                            {sortField === field && (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="inline w-4 h-4 ml-1 text-emerald-600" />
                              ) : (
                                <ChevronDown className="inline w-4 h-4 ml-1 text-emerald-600" />
                              )
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.from(metric.productMetrics.entries())
                        .sort(([keyA, a], [keyB, b]) => {
                          const getValue = (product: typeof a, key: string) => {
                            if (sortField === 'efficiency') {
                              const avg = globalProductAverages.get(key)?.avgSpendPerPax || 0;
                              return avg > 0 ? (product.spendPerPax - avg) / avg : 0;
                            }
                            if (sortField === 'quantity') return product.quantity;
                            return sortField === 'totalSpend' ? product.totalSpend : product.spendPerPax;
                          };
                          const valA = getValue(a, keyA);
                          const valB = getValue(b, keyB);
                          return sortDirection === 'desc' ? valB - valA : valA - valB;
                        })
                        .slice(
                          ((productPage[metric.locationId] || 1) - 1) * productPageSize,
                          (productPage[metric.locationId] || 1) * productPageSize
                        )
                        .map(([key, product]) => {
                          const avg = globalProductAverages.get(key)?.avgSpendPerPax || 0;
                          const percentDiff = avg > 0 ? ((product.spendPerPax - avg) / avg) * 100 : 0;
                          const getEfficiencyColor = (diff: number) => {
                            if (diff <= -5) return 'bg-emerald-100 text-emerald-800';
                            if (diff >= 5) return 'bg-red-100 text-red-800';
                            return 'bg-amber-100 text-amber-800';
                          };
                          return (
                            <tr key={`${product.productCode}-${product.unitType}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Package className="h-5 w-5 text-gray-400 mr-2" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {product.description}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {product.productCode}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {product.quantity.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(Math.round(product.totalSpend))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(product.spendPerPax)}
                                  <div className="text-xs text-gray-500">
                                    vs. {formatCurrency(avg)} avg.
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  getEfficiencyColor(percentDiff)
                                }`}>
                                  {percentDiff <= -5 ? 'Efficient' : percentDiff >= 5 ? 'High Spend' : 'Average'}
                                  <span className="ml-1">
                                    ({percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%)
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </ResizableTable>
                  <div className="p-4 border-t border-gray-200">
                    <Pagination
                      currentPage={productPage[metric.locationId] || 1}
                      totalItems={metric.productMetrics.size}
                      pageSize={productPageSize}
                      onPageChange={(page) => setProductPage(prev => ({ ...prev, [metric.locationId]: page }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

