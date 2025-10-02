import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  UserX,
  Loader2
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { CreateUserForm } from '../components/forms/CreateUserForm';
import { CreateUserWithAuthForm } from '../components/forms/CreateUserWithAuthForm';
import { EditUserForm } from '../components/forms/EditUserForm';
import { UserDetailsModal } from '../components/UserDetailsModal';

export const UserManagement: React.FC = () => {
  console.log('UserManagement rendering');
  
  const { 
    users, 
    loading, 
    error, 
    deleteUser 
  } = useUsers();
  
  console.log('UserManagement state:', { users, loading, error });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddUserWithAuth, setShowAddUserWithAuth] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.organizations.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`;
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[role as keyof typeof styles]}`;
  };

  const handleDeleteUser = async (organizationId: string, userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(organizationId, userId);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleToggleStatus = async (organizationId: string, userId: string) => {
    // This would need to be implemented based on your business logic
    console.log('Toggle status for user:', organizationId, userId);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
  };

  const handleViewUser = (user: any) => {
    setViewingUser(user);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage users, roles, and permissions</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage users, roles, and permissions</p>
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowAddUserWithAuth(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User (Full Auth)
          </button>
          <button 
            onClick={() => setShowAddUser(true)}
            className="btn btn-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User (Basic)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name or email..."
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
                <option value="pending">Pending</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
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

             {/* Users Table */}
       <div className="card">
         <div className="card-content p-0">
           {filteredUsers.length === 0 ? (
             <div className="text-center py-12">
               <Users className="mx-auto h-12 w-12 text-gray-400" />
               <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
               <p className="mt-1 text-sm text-gray-500">
                 {users.length === 0 
                   ? "Get started by adding your first user."
                   : "Try adjusting your search or filter criteria."
                 }
               </p>
               <div className="mt-6 flex space-x-2">
                 <button 
                   onClick={() => setShowAddUserWithAuth(true)}
                   className="btn btn-primary"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Add User (Full Auth)
                 </button>
                 <button 
                   onClick={() => setShowAddUser(true)}
                   className="btn btn-secondary"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Add User (Basic)
                 </button>
               </div>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       User
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Organization
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Role
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Last Login
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Activity
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Actions
                     </th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {filteredUsers.map((user) => (
                     <tr key={`${user.organization_id}-${user.user_id}`} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <div className="flex-shrink-0 h-10 w-10">
                             <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                               <Users className="h-5 w-5 text-primary-600" />
                             </div>
                           </div>
                           <div className="ml-4">
                             <div className="text-sm font-medium text-gray-900">{user.user_name || 'Unknown User'}</div>
                             <div className="text-sm text-gray-500">{user.user_email || 'No email'}</div>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                         {user.organizations.name}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={getRoleBadge(user.role)}>
                           {user.role}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {user.last_login || 'Never'}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center space-x-2">
                           <div className={`w-2 h-2 rounded-full ${
                             user.last_login && new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                               ? 'bg-green-500' 
                               : 'bg-gray-400'
                           }`}></div>
                           <span className="text-sm text-gray-600">
                             {user.last_login && new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                               ? 'Active'
                               : 'Inactive'
                             }
                           </span>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <div className="flex items-center space-x-2">
                           <button 
                             onClick={() => handleViewUser(user)}
                             className="text-blue-600 hover:text-blue-900"
                             title="View user details"
                           >
                             <Users className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleEditUser(user)}
                             className="text-primary-600 hover:text-primary-900"
                             title="Edit user"
                           >
                             <Edit className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleToggleStatus(user.organization_id, user.user_id)}
                             className="text-gray-600 hover:text-gray-900"
                             title="Toggle user status"
                           >
                             <UserX className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDeleteUser(user.organization_id, user.user_id)}
                             className="text-red-600 hover:text-red-900"
                             title="Delete user"
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

      {/* Add User Form */}
      {showAddUser && (
        <CreateUserForm onClose={() => setShowAddUser(false)} />
      )}

      {/* Add User with Full Auth Form */}
      {showAddUserWithAuth && (
        <CreateUserWithAuthForm onClose={() => setShowAddUserWithAuth(false)} />
      )}

      {/* Edit User Form */}
      {editingUser && (
        <EditUserForm 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
        />
      )}

      {/* User Details Modal */}
      {viewingUser && (
        <UserDetailsModal 
          user={viewingUser} 
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)} 
        />
      )}
    </div>
  );
};
