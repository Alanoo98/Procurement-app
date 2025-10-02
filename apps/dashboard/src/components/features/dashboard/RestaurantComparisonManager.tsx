import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocationComparisons, LocationComparisonGroup, CreateComparisonGroupData } from '@/hooks/metrics/useRestaurantComparisons';
import { useLocations } from '@/hooks/data';
import { toast } from 'sonner';

interface LocationComparisonManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationComparisonManager: React.FC<LocationComparisonManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    comparisonGroups, 
    isLoading: groupsLoading, 
    createComparisonGroup, 
    updateComparisonGroup, 
    deleteComparisonGroup,
    refresh
  } = useLocationComparisons();
  const { data: locations, isLoading: locationsLoading } = useLocations();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationIds: [] as string[],
  });

  // Get all location IDs that are already in any group
  const getLocationGroups = (locationId: string) => {
    return comparisonGroups
      .filter(group => group.locations.some(loc => loc.location_id === locationId))
      .map(group => group.name);
  };

  useEffect(() => {
    if (editingId) {
      const group = comparisonGroups.find(g => g.id === editingId);
      if (group) {
        setFormData({
          name: group.name,
          description: group.description || '',
          locationIds: group.locations.map(l => l.location_id),
        });
      }
    } else {
      setFormData({
        name: '',
        description: '',
        locationIds: [],
      });
    }
  }, [editingId, comparisonGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a comparison group name');
      return;
    }
    
    if (formData.locationIds.length < 2) {
      toast.error('Please select at least 2 locations to compare');
      return;
    }

    try {
      if (editingId) {
        await updateComparisonGroup(editingId, {
          name: formData.name,
          description: formData.description,
        }, formData.locationIds);
      } else {
        const createData: CreateComparisonGroupData = {
          name: formData.name,
          description: formData.description,
          locationIds: formData.locationIds,
        };
        await createComparisonGroup(createData);
      }
      
      setEditingId(null);
      setFormData({ name: '', description: '', locationIds: [] });
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleEdit = (group: LocationComparisonGroup) => {
    setEditingId(group.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this comparison group?')) {
      try {
        await deleteComparisonGroup(id);
      } catch {
        // Error handling is done in the hook
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', locationIds: [] });
  };

  const toggleLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter(id => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Location Comparison Groups
            <button
              onClick={refresh}
              className="ml-2 text-gray-400 hover:text-emerald-600 transition-colors"
              title="Refresh groups"
              type="button"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingId ? 'Edit Comparison Group' : 'Create New Comparison Group'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="e.g., Basso Locations"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="e.g., Compare pricing across Basso locations"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Locations <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                    {locationsLoading ? (
                      <div className="text-gray-500">Loading locations...</div>
                    ) : (
                      <div className="space-y-2">
                        {locations?.map(location => {
                          const locationGroups = getLocationGroups(location.location_id);
                          const isSelected = formData.locationIds.includes(location.location_id);
                          const isInOtherGroups = locationGroups.length > 0 && !isSelected;
                          
                          return (
                            <label key={location.location_id} className="flex items-start">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLocation(location.location_id)}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                              />
                              <div className="ml-2 flex-1">
                                <span className={`text-sm ${isInOtherGroups ? 'text-gray-500' : 'text-gray-700'}`}>
                                  {location.name}
                                </span>
                                {isInOtherGroups && (
                                  <div className="text-xs text-emerald-600 mt-1">
                                    Already in: {locationGroups.join(', ')}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Select at least 2 locations to enable price comparison analysis. 
                    Locations can be in multiple groups.
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={groupsLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {groupsLoading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Existing Groups Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Existing Comparison Groups
              </h3>
              
              {groupsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading comparison groups...</p>
                </div>
              ) : comparisonGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No comparison groups created yet.</p>
                  <p className="text-sm">Create your first group to start analyzing price inefficiencies.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comparisonGroups.map(group => (
                    <div
                      key={group.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{group.name}</h4>
                          {group.description && (
                            <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                          )}
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Locations: {group.member_count}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created: {new Date(group.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(group)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 

