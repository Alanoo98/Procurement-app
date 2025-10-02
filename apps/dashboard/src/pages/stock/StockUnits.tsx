import React, { useState, useEffect } from 'react';
import { useStock } from '@/contexts/StockContext';
import { useLocations } from '@/hooks/data/useLocations';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  Plus, 
  Warehouse, 
  MapPin, 
  Edit3, 
  Trash2, 
  Search,
  Package
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface StockUnitFormData {
  name: string;
  description: string;
  location_id: string;
}

export const StockUnits: React.FC = () => {
  const { 
    stockUnits, 
    loadingStockUnits,
    createStockUnit,
    updateStockUnit,
    deleteStockUnit,
    purchasableByLocation,
    fetchPurchasableForLocation,
    unitProducts,
    addProductsToUnit,
    removeProductFromUnit
  } = useStock();
  
  const { data: locations } = useLocations();
  const { currentOrganization } = useOrganization();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [assigningUnit, setAssigningUnit] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  
  const [formData, setFormData] = useState<StockUnitFormData>({
    name: '',
    description: '',
    location_id: ''
  });

  const [filteredUnits, setFilteredUnits] = useState(stockUnits);
  const [selectedAssignLocation, setSelectedAssignLocation] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Filter units based on search and filters
  useEffect(() => {
    let filtered = stockUnits;

    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(unit => unit.location_id === selectedLocation);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(unit => 
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.description && unit.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredUnits(filtered);
  }, [stockUnits, selectedLocation, searchTerm]);

  const handleCreateUnit = async () => {
    if (!formData.name || !formData.location_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createStockUnit(formData);
      setFormData({
        name: '',
        description: '',
        location_id: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating stock unit:', error);
    }
  };

  const handleUpdateUnit = async (unitId: string) => {
    try {
      await updateStockUnit(unitId, formData);
      setEditingUnit(null);
      setFormData({
        name: '',
        description: '',
        location_id: ''
      });
    } catch (error) {
      console.error('Error updating stock unit:', error);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (window.confirm('Are you sure you want to delete this stock unit?')) {
      try {
        await deleteStockUnit(unitId);
      } catch (error) {
        console.error('Error deleting stock unit:', error);
      }
    }
  };

  const getLocationName = (locationId: string) => {
    const location = locations?.find(l => l.location_id === locationId);
    return location?.name || 'Unknown Location';
  };

  const openAssignModal = async (unitId: string, locationId: string) => {
    setAssigningUnit(unitId);
    setSelectedAssignLocation(locationId);
    await fetchPurchasableForLocation(locationId);
    setSelectedProducts((unitProducts[unitId] || []).map(p => p.product_code));
  };

  if (loadingStockUnits) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock units...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Stock Units</h1>
              <p className="mt-2 text-gray-600">
                Manage storage units within locations (kitchen, freezer, winebar, etc.)
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stock Unit
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="Search stock units..."
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
                {locations?.map((location) => (
                  <option key={location.location_id} value={location.location_id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Stock Unit</h3>
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
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter stock unit name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter description (optional)"
                      rows={3}
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
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUnit}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Unit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Units List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Stock Units ({filteredUnits.length})
            </h3>
            
            {filteredUnits.length === 0 ? (
              <div className="text-center py-8">
                <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No stock units found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding a new stock unit.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products Assigned
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Warehouse className="h-5 w-5 text-gray-400 mr-3" />
                            <div className="text-sm font-medium text-gray-900">
                              {unit.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {unit.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {getLocationName(unit.location_id)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(unitProducts[unit.id]?.length || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(unit.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openAssignModal(unit.id, unit.location_id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Assign Products"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => setEditingUnit(unit.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Unit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Unit"
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

        {/* Assign Products Modal */}
        {assigningUnit && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Products to Unit</h3>
                <button onClick={() => setAssigningUnit(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-600">Location: {getLocationName(selectedAssignLocation)}</div>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded-md">
                {(purchasableByLocation[selectedAssignLocation] || []).map((p) => {
                  const checked = selectedProducts.includes(p.product_code);
                  return (
                    <label key={`${p.location_id}-${p.product_code}`} className={cn('flex items-center justify-between px-3 py-2 border-b last:border-b-0', checked ? 'bg-blue-50' : '')}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          setSelectedProducts(prev => e.target.checked ? [...prev, p.product_code] : prev.filter(c => c !== p.product_code));
                        }} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.description}</div>
                          <div className="text-xs text-gray-500">{p.product_code} {p.latest_price ? `• Latest: ${p.latest_price}` : ''}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setAssigningUnit(null)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={async () => {
                  await addProductsToUnit(assigningUnit, selectedAssignLocation, selectedProducts);
                  setAssigningUnit(null);
                }} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
