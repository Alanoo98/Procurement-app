import React from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  LogIn, 
  Building, 
  Briefcase,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose
}) => {
  if (!isOpen || !user) return null;

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityStatus = (lastLogin: string) => {
    if (!lastLogin || lastLogin === 'Unknown') return { status: 'inactive', color: 'text-gray-500', bg: 'bg-gray-100' };
    
    const lastLoginDate = new Date(lastLogin);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays <= 1) return { status: 'very active', color: 'text-green-600', bg: 'bg-green-100' };
    if (diffInDays <= 7) return { status: 'active', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (diffInDays <= 30) return { status: 'inactive', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'very inactive', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const activityStatus = getActivityStatus(user.last_login);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
              <p className="text-sm text-gray-500">Comprehensive user information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{user.user_name || 'Not provided'}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{user.user_email || 'Not provided'}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{user.organizations?.name || 'Not assigned'}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{formatDate(user.created_at)}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Status</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${activityStatus.bg.replace('bg-', 'bg-').replace('-100', '-500')}`}></div>
                  <span className={`text-sm font-medium ${activityStatus.color}`}>
                    {activityStatus.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <LogIn className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Last Login</span>
                </div>
                <p className="text-sm text-gray-600">{formatDate(user.last_login)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(user.last_login)}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Account Created</span>
                </div>
                <p className="text-sm text-gray-600">{formatDate(user.created_at)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(user.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {user.organizations && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                    <p className="text-sm text-gray-900">{user.organizations.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Slug</label>
                    <p className="text-sm text-gray-900">{user.organizations.slug}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


