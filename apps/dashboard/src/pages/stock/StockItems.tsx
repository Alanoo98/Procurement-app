import React, { useState, useEffect } from 'react';
import { useStock } from '@/contexts/StockContext';
import { useLocations } from '@/hooks/data/useLocations';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataAccess } from '@/hooks/auth/useDataAccess';
import { 
  Plus, 
  Package, 
  MapPin, 
  Warehouse, 
  Edit3, 
  Trash2, 
  Search,
  Filter,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface StockItemFormData {
  product_code: string;
  product_description: string;
  location_id: string;
  stock_unit_id: string;
  current_quantity: number;
}

export const StockItems: React.FC = () => {
  const { 
    stockItems, 
    stockUnits,
    loadingStockItems, 
    loadingStockUnits,
    createStockItem,
    updateStockItem,
    deleteStockItem,
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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedStockUnit, setSelectedStockUnit] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  
  const [formData, setFormData] = useState<StockItemFormData>({
    product_code: '',
    product_description: '',
    location_id: '',
    stock_unit_id: '',
    current_quantity: 0
  });

  const [filteredItems, setFilteredItems] = useState(stockItems);

  // Filter items based on search and filters
  useEffect(() => {
    let filtered = isAdmin
      ? stockItems
      : stockItems.filter(item => (access.accessibleLocations || []).some(l => l.location_id === item.location_id));

    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location_id === selectedLocation);
    }

    // Filter by stock unit
    if (selectedStockUnit !== 'all') {
      filtered = filtered.filter(item => item.stock_unit_id === selectedStockUnit);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by low stock
    if (lowStockOnly) {
      filtered = filtered.filter(item => item.current_quantity < 10); // TODO: Make threshold configurable
    }

    setFilteredItems(filtered);
  }, [stockItems, selectedLocation, selectedStockUnit, searchTerm, lowStockOnly]);

  const handleCreateItem = async () => {
    if (!formData.product_code || !formData.product_description || !formData.location_id || !formData.stock_unit_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createStockItem(formData);
      setFormData({
        product_code: '',
        product_description: '',
        location_id: '',
        stock_unit_id: '',
        current_quantity: 0
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating stock item:', error);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    try {
      await updateStockItem(itemId, formData);
      setEditingItem(null);
      setFormData({
        product_code: '',
        product_description: '',
        location_id: '',
        stock_unit_id: '',
        current_quantity: 0
      });
    } catch (error) {
      console.error('Error updating stock item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this stock item?')) {
      try {
        await deleteStockItem(itemId);
      } catch (error) {
        console.error('Error deleting stock item:', error);
      }
    }
  };

  const getStockUnitName = (stockUnitId: string) => {
    const unit = stockUnits.find(u => u.id === stockUnitId);
    return unit?.name || 'Unknown Unit';
  };

  const getLocationName = (locationId: string) => {
    const location = locations?.find(l => l.location_id === locationId);
    return location?.name || 'Unknown Location';
  };

  const isLowStock = (quantity: number) => quantity < 10; // TODO: Make threshold configurable

  if (loadingStockItems || loadingStockUnits) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock items...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Stock Items</h1>
              <p className="mt-2 text-gray-600">
                Manage inventory items and their stock levels across locations
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stock Item
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Locations</option>
              {availableLocations?.map((location) => (
                  <option key={location.location_id} value={location.location_id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Unit
              </label>
              <select
                value={selectedStockUnit}
                onChange={(e) => setSelectedStockUnit(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Units</option>
                {stockUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Low stock only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Stock Item</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Code *
                    </label>
                    <input
                      type="text"
                      value={formData.product_code}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter product code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Description *
                    </label>
                    <input
                      type="text"
                      value={formData.product_description}
                      onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter product description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
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
                      Stock Unit *
                    </label>
                    <select
                      value={formData.stock_unit_id}
                      onChange={(e) => setFormData({ ...formData, stock_unit_id: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a stock unit</option>
                      {stockUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.current_quantity}
                      onChange={(e) => setFormData({ ...formData, current_quantity: Number(e.target.value) })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      min="0"
                      step="0.01"
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
                    onClick={handleCreateItem}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Items List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Stock Items ({filteredItems.length})
            </h3>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No stock items found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding a new stock item.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
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
                        Stock Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.product_description}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.product_code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {getLocationName(item.location_id)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Warehouse className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {getStockUnitName(item.stock_unit_id)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {isLowStock(item.current_quantity) ? (
                              <AlertTriangle className="h-4 w-4 text-red-400 mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                            )}
                            <span className={`text-sm font-medium ${
                              isLowStock(item.current_quantity) ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {item.current_quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.last_count_date ? new Date(item.last_count_date).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Item"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
