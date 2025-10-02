import React from 'react';
import { TrendingUp, Users, LogIn, UserPlus } from 'lucide-react';

interface UserTrendsChartProps {
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  newUsers: number;
  loading?: boolean;
}

export const UserTrendsChart: React.FC<UserTrendsChartProps> = ({
  totalUsers,
  activeUsers,
  recentLogins,
  newUsers,
  loading = false
}) => {
  const trends = [
    {
      name: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: '+12%' // Mock trend data
    },
    {
      name: 'Active Users',
      value: activeUsers,
      icon: LogIn,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: '+8%'
    },
    {
      name: 'Recent Logins',
      value: recentLogins,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: '+15%'
    },
    {
      name: 'New Users',
      value: newUsers,
      icon: UserPlus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: '+5%'
    }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">User Trends</h3>
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
        <h3 className="text-lg font-medium text-gray-900">User Trends</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trends.map((trend, index) => (
          <div key={index} className="p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trend.bgColor}`}>
                <trend.icon className={`w-5 h-5 ${trend.color}`} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{trend.value}</p>
                <p className="text-sm text-green-600 font-medium">{trend.trend}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">{trend.name}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${trend.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`}
                  style={{ width: `${Math.min((trend.value / Math.max(totalUsers, 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500">Activity Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {totalUsers > 0 ? Math.round((recentLogins / totalUsers) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500">Login Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};


