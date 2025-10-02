import React from 'react';
import { 
  Activity, 
  LogIn, 
  UserPlus, 
  Building, 
  Briefcase, 
  MapPin, 
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'login' | 'user' | 'organization' | 'business_unit' | 'location' | 'invitation';
  action: string;
  primaryText: string;
  secondaryText?: string;
  tertiaryText?: string;
  time: string;
  absoluteTime: string;
  icon: React.ComponentType<any>;
  status?: 'success' | 'warning' | 'error';
}

interface UserActivityLogProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export const UserActivityLog: React.FC<UserActivityLogProps> = ({
  activities,
  loading = false
}) => {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
          <Activity className="w-4 h-4 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>
        <div className="ml-auto">
          <span className="text-sm text-gray-500">
            {activities.length} activities
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
            <p className="text-gray-500">
              Activity will appear here as users interact with the system.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`flex items-start space-x-4 p-4 rounded-lg border-l-4 ${getStatusColor(activity.status)} bg-gray-50 hover:bg-gray-100 transition-colors duration-200`}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <activity.icon className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action} <span className="text-gray-700">{activity.primaryText}</span>
                      </p>
                      {activity.secondaryText && (
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.secondaryText}
                        </p>
                      )}
                      {activity.tertiaryText && (
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.tertiaryText}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusIcon(activity.status)}
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{activity.time}</p>
                        <p className="text-xs text-gray-400">{activity.absoluteTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Summary */}
      {activities.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {activities.filter(a => a.type === 'login').length}
              </p>
              <p className="text-sm text-gray-500">Logins</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {activities.filter(a => a.type === 'user').length}
              </p>
              <p className="text-sm text-gray-500">User Actions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {activities.filter(a => a.type === 'organization').length}
              </p>
              <p className="text-sm text-gray-500">Organizations</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {activities.filter(a => a.type === 'invitation').length}
              </p>
              <p className="text-sm text-gray-500">Invitations</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


