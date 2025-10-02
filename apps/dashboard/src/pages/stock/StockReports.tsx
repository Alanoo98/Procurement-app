import React from 'react';
import { useStock } from '@/contexts/StockContext';
import { useLocations } from '@/hooks/data/useLocations';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

export const StockReports: React.FC = () => {
  const { stockItems, stockCounts, deliveryRecords } = useStock();
  const { data: locations } = useLocations();

  // Calculate stock metrics
  const totalItems = stockItems.length;
  const totalValue = stockItems.reduce((sum, item) => sum + (item.current_quantity * 0), 0); // TODO: Add price calculation
  const lowStockItems = stockItems.filter(item => item.current_quantity < 10).length;
  const averageStockLevel = totalItems > 0 ? stockItems.reduce((sum, item) => sum + item.current_quantity, 0) / totalItems : 0;

  // Calculate location metrics
  const locationMetrics = locations?.map(location => {
    const locationItems = stockItems.filter(item => item.location_id === location.location_id);
    const locationValue = locationItems.reduce((sum, item) => sum + (item.current_quantity * 0), 0);
    const locationLowStock = locationItems.filter(item => item.current_quantity < 10).length;
    
    return {
      location_id: location.location_id,
      name: location.name,
      itemCount: locationItems.length,
      totalValue: locationValue,
      lowStockCount: locationLowStock,
      averageStock: locationItems.length > 0 ? locationItems.reduce((sum, item) => sum + item.current_quantity, 0) / locationItems.length : 0
    };
  }) || [];

  // Calculate recent activity
  const recentCounts = stockCounts.filter(count => {
    const countDate = new Date(count.count_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return countDate >= weekAgo;
  }).length;

  const recentDeliveries = deliveryRecords.filter(record => {
    const deliveryDate = new Date(record.delivery_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return deliveryDate >= weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stock Reports</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive analytics and insights for stock management
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Stock Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalItems}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Value
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(totalValue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Low Stock Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {lowStockItems}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Average Stock Level
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {averageStockLevel.toFixed(1)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-900">Stock counts this week</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{recentCounts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="text-sm text-gray-900">Deliveries this week</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{recentDeliveries}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Stock Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">Items in good stock</span>
                  <span className="text-sm font-medium text-green-600">
                    {totalItems - lowStockItems}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">Items needing attention</span>
                  <span className="text-sm font-medium text-red-600">
                    {lowStockItems}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${totalItems > 0 ? ((totalItems - lowStockItems) / totalItems) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Stock by Location
            </h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Low Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locationMetrics.map((location) => (
                    <tr key={location.location_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {location.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.itemCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(location.totalValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          location.lowStockCount > 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {location.lowStockCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.averageStock.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
