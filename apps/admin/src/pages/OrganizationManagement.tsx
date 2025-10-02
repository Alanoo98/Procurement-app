import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Users,
  Settings,
  Eye,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { useOrganizations } from '../hooks/useOrganizations';
import { CreateOrganizationForm } from '../components/forms/CreateOrganizationForm';
import { EditOrganizationForm } from '../components/forms/EditOrganizationForm';

export const OrganizationManagement: React.FC = () => {
  const { 
    organizations, 
    loading, 
    error, 
    createOrganization, 
    updateOrganization, 
    deleteOrganization 
  } = useOrganizations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    // For now, we'll consider all organizations as active since we don't have a status field
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`;
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrganization(orgId);
      } catch (error) {
        console.error('Failed to delete organization:', error);
      }
    }
  };

  const handleToggleStatus = async (orgId: string) => {
    // This would need to be implemented based on your business logic
    console.log('Toggle status for organization:', orgId);
  };

  const handleEditOrganization = (org: any) => {
    setEditingOrg(org);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
            <p className="text-gray-600">Manage organizations and their settings</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading organizations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
            <p className="text-gray-600">Manage organizations and their settings</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-600">Manage organizations and their settings</p>
        </div>
        <button 
          onClick={() => setShowAddOrg(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search organizations..."
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
            
            <div className="flex items-end">
              <button className="btn btn-secondary w-full">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>
      </div>

             {/* Organizations Grid */}
       {filteredOrganizations.length === 0 ? (
         <div className="text-center py-12">
           <Building2 className="mx-auto h-12 w-12 text-gray-400" />
           <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
           <p className="mt-1 text-sm text-gray-500">
             {organizations.length === 0 
               ? "Get started by creating your first organization."
               : "Try adjusting your search criteria."
             }
           </p>
           <div className="mt-6">
             <button 
               onClick={() => setShowAddOrg(true)}
               className="btn btn-primary"
             >
               <Plus className="w-4 h-4 mr-2" />
               Add Organization
             </button>
           </div>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredOrganizations.map((org) => (
          <div key={org.id} className="card">
            <div className="card-content">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-500">/{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
                               <div className="mt-4">
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-500">Status</span>
                   <span className={getStatusBadge('active')}>
                     Active
                   </span>
                 </div>
                 
                 <div className="mt-3 grid grid-cols-2 gap-4">
                   <div className="flex items-center text-sm">
                     <Users className="w-4 h-4 text-gray-400 mr-2" />
                     <span className="text-gray-500">{org.user_count} users</span>
                   </div>
                   <div className="flex items-center text-sm">
                     <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                     <span className="text-gray-500">{org.business_unit_count} units</span>
                   </div>
                 </div>
                 
                 <div className="mt-3 text-sm text-gray-500">
                   <p>Created: {new Date(org.created_at).toLocaleDateString()}</p>
                   <p>Slug: {org.slug}</p>
                 </div>
               </div>
              
              <div className="mt-4 flex justify-between">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditOrganization(org)}
                    className="text-primary-600 hover:text-primary-900"
                    title="Edit organization"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-900" title="View details">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-900" title="Settings">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => handleDeleteOrganization(org.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete organization"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
                     </div>
         ))}
         </div>
       )}

      {/* Add Organization Form */}
      {showAddOrg && (
        <CreateOrganizationForm onClose={() => setShowAddOrg(false)} />
      )}

      {/* Edit Organization Form */}
      {editingOrg && (
        <EditOrganizationForm 
          organization={editingOrg} 
          onClose={() => setEditingOrg(null)} 
        />
      )}
    </div>
  );
};
