import React, { useState, useEffect } from 'react';
import { useStock } from '@/contexts/StockContext';
import { useLocations } from '@/hooks/data/useLocations';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataAccess } from '@/hooks/auth/useDataAccess';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Package, 
  CheckCircle, 
  Send, 
  Edit3, 
  Trash2,
  Save,
  X
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface StockCountFormData {
  location_id: string;
  count_date: string;
  items: Array<{
    stock_item_id: string;
    counted_quantity: number;
    notes?: string;
  }>;
}

export const StockCounts: React.FC = () => {
  const { 
    stockCounts, 
    stockItems, 
    loadingStockCounts, 
    loadingStockItems,
    createStockCount,
    updateStockCount,
    confirmStockCount,
    sendStockCount,
    getStockItemsByLocation
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
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCount, setEditingCount] = useState<string | null>(null);
  const [formData, setFormData] = useState<StockCountFormData>({
    location_id: '',
    count_date: new Date().toISOString().split('T')[0],
    items: []
  });

  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [filteredCounts, setFilteredCounts] = useState(stockCounts);

  // Filter counts by location
  useEffect(() => {
    const inScopeCounts = isAdmin
      ? stockCounts
      : stockCounts.filter(c => (access.accessibleLocations || []).some(l => l.location_id === c.location_id));

    if (selectedLocation === 'all') {
      setFilteredCounts(inScopeCounts);
    } else {
      setFilteredCounts(inScopeCounts.filter(count => count.location_id === selectedLocation));
    }
  }, [stockCounts, selectedLocation, access.accessibleLocations, isAdmin]);

  // Default selection for non-admins with a single accessible location
  useEffect(() => {
    if (!isAdmin && selectedLocation === 'all' && availableLocations && availableLocations.length === 1) {
      setSelectedLocation(availableLocations[0].location_id);
    }
  }, [isAdmin, availableLocations, selectedLocation]);

  const handleCreateCount = async () => {
    if (!formData.location_id || !formData.count_date) {
      alert('Please select a location and count date');
      return;
    }

    try {
      const countId = await createStockCount({
        location_id: formData.location_id,
        count_date: formData.count_date,
        status: 'draft',
        created_by: 'current-user-id' // TODO: Get from auth context
      });

      // Add items to the count
      if (formData.items.length > 0) {
        // TODO: Implement adding items to stock count
        console.log('Adding items to count:', formData.items);
      }

      setFormData({
        location_id: '',
        count_date: new Date().toISOString().split('T')[0],
        items: []
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating stock count:', error);
    }
  };

  const handleUpdateCount = async (countId: string) => {
    try {
      await updateStockCount(countId, {
        count_date: formData.count_date,
        // TODO: Update items as well
      });
      setEditingCount(null);
      setFormData({
        location_id: '',
        count_date: new Date().toISOString().split('T')[0],
        items: []
      });
    } catch (error) {
      console.error('Error updating stock count:', error);
    }
  };

  const handleConfirmCount = async (countId: string) => {
    try {
      await confirmStockCount(countId);
    } catch (error) {
      console.error('Error confirming stock count:', error);
    }
  };

  const handleSendCount = async (countId: string) => {
    try {
      await sendStockCount(countId);
    } catch (error) {
      console.error('Error sending stock count:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'sent': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit3 className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loadingStockCounts || loadingStockItems) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock counts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Counts</h1>
              <p className="mt-2 text-gray-600">
                Manage stock counting sessions and track inventory levels
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Stock Count
            </button>
          </div>
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

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create Stock Count</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a location</option>
                      {locations?.map((location) => (
                        <option key={location.location_id} value={location.location_id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Count Date
                    </label>
                    <input
                      type="date"
                      value={formData.count_date}
                      onChange={(e) => setFormData({ ...formData, count_date: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCount}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Count
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Counts List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Stock Counts ({filteredCounts.length})
            </h3>
            
            {filteredCounts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No stock counts</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new stock count.
                </p>
              </div>
            ) : (
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
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCounts.map((count) => (
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
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(count.status)}`}>
                            {getStatusIcon(count.status)}
                            <span className="ml-1">{count.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {count.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {count.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleConfirmCount(count.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Confirm Count"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCount(count.id)}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Edit Count"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {count.status === 'confirmed' && (
                              <button
                                onClick={() => handleSendCount(count.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Send Count"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
