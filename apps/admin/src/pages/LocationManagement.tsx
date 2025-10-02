import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Building2,
  Briefcase,
  Globe,
  Loader2
} from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import { CreateLocationForm } from '../components/forms/CreateLocationForm';

export const LocationManagement: React.FC = () => {
  const { 
    locations, 
    loading, 
    error, 
    createLocation, 
    updateLocation, 
    deleteLocation 
  } = useLocations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>('all');
  const [showAddLocation, setShowAddLocation] = useState(false);

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.organization.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.business_unit.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = countryFilter === 'all' || location.country === countryFilter;
    const matchesOrganization = organizationFilter === 'all' || location.organization.name === organizationFilter;
    const matchesBusinessUnit = businessUnitFilter === 'all' || location.business_unit.name === businessUnitFilter;
    
    return matchesSearch && matchesCountry && matchesOrganization && matchesBusinessUnit;
  });

  const handleDeleteLocation = async (locationId: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteLocation(locationId);
      } catch (error) {
        console.error('Failed to delete location:', error);
      }
    }
  };

  // Get unique values for filters
  const uniqueCountries = Array.from(new Set(locations.map(loc => loc.country))).sort();
  const uniqueOrganizations = Array.from(new Set(locations.map(loc => loc.organization.name))).sort();
  const uniqueBusinessUnits = Array.from(new Set(locations.map(loc => loc.business_unit.name))).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
            <p className="text-gray-600">Manage locations within business units</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading locations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
            <p className="text-gray-600">Manage locations within business units</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
          <p className="text-gray-600">Manage locations within business units</p>
        </div>
        <button 
          onClick={() => setShowAddLocation(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Locations</p>
                <p className="text-2xl font-semibold text-gray-900">{locations.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Countries</p>
                <p className="text-2xl font-semibold text-gray-900">{uniqueCountries.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Organizations</p>
                <p className="text-2xl font-semibold text-gray-900">{uniqueOrganizations.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Business Units</p>
                <p className="text-2xl font-semibold text-gray-900">{uniqueBusinessUnits.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Countries</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <select
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Organizations</option>
                {uniqueOrganizations.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Unit</label>
              <select
                value={businessUnitFilter}
                onChange={(e) => setBusinessUnitFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Business Units</option>
                {uniqueBusinessUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button className="btn btn-secondary w-full">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <div className="card">
        <div className="card-content p-0">
          {filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {locations.length === 0 
                  ? "Get started by adding your first location."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              <div className="mt-6">
                <button 
                  onClick={() => setShowAddLocation(true)}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
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
                  {filteredLocations.map((location) => (
                    <tr key={location.location_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            <div className="text-sm text-gray-500">{location.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          {location.organization.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                          {location.business_unit.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 text-gray-400 mr-2" />
                          {location.country}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(location.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteLocation(location.location_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add Location Form */}
      {showAddLocation && (
        <CreateLocationForm onClose={() => setShowAddLocation(false)} />
      )}
    </div>
  );
};
