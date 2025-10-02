import React, { useState } from 'react';
import { 
  Mail, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useInvitations } from '../hooks/useInvitations';
import { SendInvitationForm } from '../components/forms/SendInvitationForm';

export const InvitationManagement: React.FC = () => {
  const { 
    invitations, 
    loading, 
    error, 
    createInvitation, 
    updateInvitation, 
    deleteInvitation,
    resendInvitation,
    cancelInvitation
  } = useInvitations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [showSendInvitation, setShowSendInvitation] = useState(false);

  // Get unique organizations for filter
  const uniqueOrganizations = Array.from(new Set(invitations.map(inv => inv.organization_id)));

  const filteredInvitations = invitations.filter(invitation => {
    const matchesSearch = invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invitation.invited_by.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invitation.status === statusFilter;
    const matchesRole = roleFilter === 'all' || invitation.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[role as keyof typeof styles]}`;
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (window.confirm('Are you sure you want to delete this invitation?')) {
      try {
        await deleteInvitation(invitationId);
      } catch (error) {
        console.error('Failed to delete invitation:', error);
      }
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  if (loading) {
    return (      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invitation Management</h1>
            <p className="text-gray-600">Manage user invitations and access requests</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading invitations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invitation Management</h1>
            <p className="text-gray-600">Manage user invitations and access requests</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Invitation Management</h1>
          <p className="text-gray-600">Manage user invitations and access requests</p>
        </div>
        <button 
          onClick={() => setShowSendInvitation(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Send Invitation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accepted</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(i => i.status === 'accepted').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expired</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(i => i.status === 'expired').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Cancelled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(i => i.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>
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
                  placeholder="Search invitations..."
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
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
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
                <option value="admin">Admin</option>
                <option value="member">Member</option>
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
          </div>
        </div>
      </div>

             {/* Invitations Table */}
       <div className="card">
         <div className="card-content p-0">
           {filteredInvitations.length === 0 ? (
             <div className="text-center py-12">
               <Mail className="mx-auto h-12 w-12 text-gray-400" />
               <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations found</h3>
               <p className="mt-1 text-sm text-gray-500">
                 {invitations.length === 0 
                   ? "Get started by sending your first invitation."
                   : "Try adjusting your search or filter criteria."
                 }
               </p>
               <div className="mt-6">
                 <button 
                   onClick={() => setShowSendInvitation(true)}
                   className="btn btn-primary"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Send Invitation
                 </button>
               </div>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Invitation
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Organization
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Role
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Status
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Sent By
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Expires
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Actions
                     </th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {filteredInvitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                                                 <div className="ml-4">
                           <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                           <div className="text-sm text-gray-500">Sent: {new Date(invitation.sent_at).toLocaleDateString()}</div>
                         </div>
                      </div>
                    </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       Organization ID: {invitation.organization_id}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className={getRoleBadge(invitation.role)}>
                         {invitation.role}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                         {getStatusIcon(invitation.status)}
                         <span className={`ml-2 ${getStatusBadge(invitation.status)}`}>
                           {invitation.status}
                         </span>
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {invitation.invited_by}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {new Date(invitation.expires_at).toLocaleDateString()}
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {invitation.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Resend invitation"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel invitation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Delete invitation"
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

      {/* Send Invitation Form */}
      {showSendInvitation && (
        <SendInvitationForm onClose={() => setShowSendInvitation(false)} />
      )}
    </div>
  );
};
