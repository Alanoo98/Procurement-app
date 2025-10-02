import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Building2,
  MapPin,
  Users,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { useBusinessUnits } from '../hooks/useBusinessUnits';
import { CreateBusinessUnitForm } from '../components/forms/CreateBusinessUnitForm';
import { EditBusinessUnitForm } from '../components/forms/EditBusinessUnitForm';



export const BusinessUnitManagement: React.FC = () => {
  const { 
    businessUnits, 
    loading, 
    error, 
    createBusinessUnit, 
    updateBusinessUnit, 
    deleteBusinessUnit 
  } = useBusinessUnits();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [showAddUnit, setShowAddUnit] = useState(false);

  const filteredBusinessUnits = businessUnits.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.organization.name.toLowerCase().includes(searchTerm.toLowerCase());
    // For now, we'll consider all business units as active since we don't have a status field
    const matchesStatus = true; // statusFilter === 'all' || unit.status === statusFilter;
    const matchesType = typeFilter === 'all' || unit.type === typeFilter;
    const matchesOrg = organizationFilter === 'all' || unit.organization.name === organizationFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesOrg;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`;
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      Regional: 'bg-blue-100 text-blue-800',
      Brand: 'bg-purple-100 text-purple-800',
      Support: 'bg-orange-100 text-orange-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`;
  };

  const handleDeleteBusinessUnit = async (unitId: string) => {
    if (window.confirm('Are you sure you want to delete this business unit?')) {
      try {
        await deleteBusinessUnit(unitId);
      } catch (error) {
        console.error('Failed to delete business unit:', error);
      }
    }
  };

  const handleToggleStatus = (unitId: string) => {
    // This would need to be implemented based on your business logic
    console.log('Toggle status for business unit:', unitId);
  };

  const uniqueOrganizations = Array.from(new Set(businessUnits.map(unit => unit.organization.name)));
  const uniqueTypes = Array.from(new Set(businessUnits.map(unit => unit.type)));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Unit Management</h1>
            <p className="text-gray-600">Manage business units and their configurations</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading business units...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Unit Management</h1>
            <p className="text-gray-600">Manage business units and their configurations</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Business Unit Management</h1>
          <p className="text-gray-600">Manage business units and their configurations</p>
        </div>
        <button 
          onClick={() => setShowAddUnit(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Business Unit
        </button>
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
                  placeholder="Search business units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
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
            
            <div className="flex items-end">
              <button className="btn btn-secondary w-full">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Units Table */}
      <div className="card">
        <div className="card-content p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBusinessUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{unit.name}</div>
                          <div className="text-sm text-gray-500">{unit.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.organization.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getTypeBadge(unit.type)}>
                        {unit.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge('active')}>
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        {unit.location_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        {unit.user_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-600 hover:text-primary-900">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(unit.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Building2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteBusinessUnit(unit.id)}
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
        </div>
      </div>

      {/* Add Business Unit Form */}
      {showAddUnit && (
        <CreateBusinessUnitForm onClose={() => setShowAddUnit(false)} />
      )}
    </div>
  );
};
