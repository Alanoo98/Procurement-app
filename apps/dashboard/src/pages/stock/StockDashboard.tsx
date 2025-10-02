import React, { useState, useEffect } from 'react';
import { useStock } from '@/contexts/StockContext';
import { useLocations } from '@/hooks/data/useLocations';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataAccess } from '@/hooks/auth/useDataAccess';
import { 
  Package, 
  ClipboardList, 
  Truck, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  MapPin,
  Warehouse
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface StockOverview {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  pendingCounts: number;
  recentDeliveries: number;
}

interface LocationStockSummary {
  location_id: string;
  location_name: string;
  item_count: number;
  total_value: number;
  low_stock_count: number;
  last_count_date?: string;
}

export const StockDashboard: React.FC = () => {
  const { 
    stockItems, 
    stockCounts, 
    deliveryRecords, 
    loadingStockItems, 
    loadingStockCounts, 
    loadingDeliveryRecords 
  } = useStock();
  
  const { data: locations } = useLocations();
  const { currentOrganization } = useOrganization();
  const access = useDataAccess();
  const isAdmin = ['owner', 'admin', 'super-admin'].includes(access.currentRole || '');

  const availableLocations = React.useMemo(() => {
    if (!locations) return [] as typeof locations;
    if (isAdmin) return locations;
    const allowedIds = new Set((access.accessibleLocations || []).map(l => l.location_id));
    return locations.filter(l => allowedIds.has(l.location_id));
  }, [locations, access.accessibleLocations, isAdmin]);
  
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [overview, setOverview] = useState<StockOverview>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    pendingCounts: 0,
    recentDeliveries: 0
  });
  
  const [locationSummaries, setLocationSummaries] = useState<LocationStockSummary[]>([]);

  // Calculate overview metrics
  useEffect(() => {
    if (!stockItems.length && !stockCounts.length && !deliveryRecords.length) {
      setOverview({
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        pendingCounts: 0,
        recentDeliveries: 0
      });
      return;
    }

    const inScopeItems = isAdmin
      ? stockItems
      : stockItems.filter(item => (access.accessibleLocations || []).some(l => l.location_id === item.location_id));

    const filteredItems = selectedLocation === 'all'
      ? inScopeItems
      : inScopeItems.filter(item => item.location_id === selectedLocation);

    const totalItems = filteredItems.length;
    const totalValue = filteredItems.reduce((sum, item) => sum + (item.current_quantity * 0), 0); // TODO: Add price calculation
    const lowStockItems = filteredItems.filter(item => item.current_quantity < 10).length; // TODO: Make threshold configurable
    const pendingCounts = stockCounts.filter(count => count.status === 'draft').length;
    const recentDeliveries = deliveryRecords.filter(record => {
      const deliveryDate = new Date(record.delivery_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return deliveryDate >= weekAgo;
    }).length;

    setOverview({
      totalItems,
      totalValue,
      lowStockItems,
      pendingCounts,
      recentDeliveries
    });
  }, [stockItems, stockCounts, deliveryRecords, selectedLocation]);

  // Calculate location summaries
  useEffect(() => {
    if (!availableLocations || !stockItems.length) {
      setLocationSummaries([]);
      return;
    }

    const summaries = availableLocations.map(location => {
      const locationItems = stockItems.filter(item => item.location_id === location.location_id);
      const itemCount = locationItems.length;
      const totalValue = locationItems.reduce((sum, item) => sum + (item.current_quantity * 0), 0); // TODO: Add price calculation
      const lowStockCount = locationItems.filter(item => item.current_quantity < 10).length; // TODO: Make threshold configurable
      
      // Find last count date for this location
      const lastCount = stockCounts
        .filter(count => count.location_id === location.location_id)
        .sort((a, b) => new Date(b.count_date).getTime() - new Date(a.count_date).getTime())[0];
      
      return {
        location_id: location.location_id,
        location_name: location.name,
        item_count: itemCount,
        total_value: totalValue,
        low_stock_count: lowStockCount,
        last_count_date: lastCount?.count_date
      };
    });

    setLocationSummaries(summaries);
  }, [availableLocations, stockItems, stockCounts]);

  // Default selection for non-admins with a single accessible location
  useEffect(() => {
    if (!isAdmin && selectedLocation === 'all' && availableLocations && availableLocations.length === 1) {
      setSelectedLocation(availableLocations[0].location_id);
    }
  }, [isAdmin, availableLocations, selectedLocation]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'sent': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loadingStockItems || loadingStockCounts || loadingDeliveryRecords) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stock Management Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor stock levels, track counts, and manage deliveries across all locations
          </p>
        </div>

        {/* Location Filter */}
        <div className="mb-6">
          <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Location
          </label>
          <select
            id="location-filter"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {isAdmin && <option value="all">All Locations</option>}
            {availableLocations?.map((location) => (
              <option key={location.location_id} value={location.location_id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                      {overview.totalItems}
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
                      {formatCurrency(overview.totalValue)}
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
                      {overview.lowStockItems}
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
                  <ClipboardList className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Counts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overview.pendingCounts}
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
                  <Truck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Recent Deliveries
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overview.recentDeliveries}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Stock Summary */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Stock Summary by Location
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
                      Last Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locationSummaries.map((summary) => (
                    <tr key={summary.location_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {summary.location_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.item_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(summary.total_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          summary.low_stock_count > 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {summary.low_stock_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(summary.last_count_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Stock Counts */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Stock Counts
            </h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items Counted
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockCounts.slice(0, 10).map((count) => (
                    <tr key={count.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {count.location?.name || 'Unknown Location'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(count.count_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(count.status)}`}>
                          {count.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {count.items?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Deliveries
            </h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveryRecords.slice(0, 10).map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {record.location?.name || 'Unknown Location'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(record.delivery_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
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
