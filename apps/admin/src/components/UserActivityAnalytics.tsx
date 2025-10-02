import React from 'react';
import { 
  Users, 
  LogIn, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  UserPlus,
  Activity
} from 'lucide-react';

interface UserActivityAnalyticsProps {
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  newUsers: number;
  averageSessionDuration: number;
  loading?: boolean;
}

export const UserActivityAnalytics: React.FC<UserActivityAnalyticsProps> = ({
  totalUsers,
  activeUsers,
  recentLogins,
  newUsers,
  averageSessionDuration,
  loading = false
}) => {
  const activityRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const loginRate = totalUsers > 0 ? Math.round((recentLogins / totalUsers) * 100) : 0;

  const metrics = [
    {
      name: 'User Activity Rate',
      value: `${activityRate}%`,
      description: `${activeUsers} of ${totalUsers} users active`,
      icon: Activity,
      color: activityRate > 50 ? 'text-green-600' : activityRate > 25 ? 'text-yellow-600' : 'text-red-600',
      bgColor: activityRate > 50 ? 'bg-green-100' : activityRate > 25 ? 'bg-yellow-100' : 'bg-red-100'
    },
    {
      name: 'Login Rate (24h)',
      value: `${loginRate}%`,
      description: `${recentLogins} users logged in today`,
      icon: LogIn,
      color: loginRate > 30 ? 'text-green-600' : loginRate > 15 ? 'text-yellow-600' : 'text-red-600',
      bgColor: loginRate > 30 ? 'bg-green-100' : loginRate > 15 ? 'bg-yellow-100' : 'bg-red-100'
    },
    {
      name: 'New Users (7d)',
      value: newUsers.toString(),
      description: 'New registrations this week',
      icon: UserPlus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Avg Session',
      value: `${averageSessionDuration}m`,
      description: 'Average session duration',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">User Activity Analytics</h3>
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
          <TrendingUp className="w-4 h-4 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">User Activity Analytics</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metric.bgColor}`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">{metric.name}</p>
              <p className="text-xs text-gray-500">{metric.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Status Indicators */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Recent Logins</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New Users</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};


