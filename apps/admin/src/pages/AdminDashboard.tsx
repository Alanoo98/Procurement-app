import React from 'react';
import { Users, Building2, Briefcase, MapPin, Mail, Activity, Loader2, UserPlus, Building, MapPinIcon, Send, LogIn, TrendingUp, AlertTriangle, CheckCircle, Clock, Server, HardDrive, Settings } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useOrganizations } from '../hooks/useOrganizations';
import { useBusinessUnits } from '../hooks/useBusinessUnits';
import { useLocations } from '../hooks/useLocations';
import { useInvitations } from '../hooks/useInvitations';
import { useUserActivity } from '../hooks/useUserActivity';
import { useSystemMetrics } from '../hooks/useSystemMetrics';
import { useUserSessions } from '../hooks/useUserSessions';
import { UserActivityAnalytics } from '../components/UserActivityAnalytics';
import { UserTrendsChart } from '../components/UserTrendsChart';
import { UserActivityLog } from '../components/UserActivityLog';

export const AdminDashboard: React.FC = () => {
  const { users, loading: usersLoading } = useUsers();
  const { organizations, loading: orgsLoading } = useOrganizations();
  const { businessUnits, loading: unitsLoading } = useBusinessUnits();
  const { locations, loading: locationsLoading } = useLocations();
  const { invitations, loading: invitationsLoading } = useInvitations();
  const { loginStats, getRecentLogins, getMostActiveUsers, loading: activityLoading } = useUserActivity();
  const { systemMetrics, performanceMetrics, getUptimeStatus, loading: metricsLoading } = useSystemMetrics();
  const { sessionStats, getActiveUsers, getNewUsers, loading: sessionsLoading } = useUserSessions();

  const isLoading = usersLoading || orgsLoading || unitsLoading || locationsLoading || invitationsLoading || activityLoading || metricsLoading || sessionsLoading;

  // Calculate real statistics - NO MOCK DATA
  const stats = [
    { 
      name: 'Total Users', 
      value: users.length.toString(), 
      icon: Users,
      description: `${loginStats.totalUsers} registered users`
    },
    { 
      name: 'Active Users (7d)', 
      value: loginStats.activeUsers.toString(), 
      icon: LogIn,
      description: `${Math.round((loginStats.activeUsers / Math.max(loginStats.totalUsers, 1)) * 100)}% of total users`
    },
    { 
      name: 'Recent Logins (24h)', 
      value: loginStats.recentLogins.toString(), 
      icon: Activity,
      description: 'Users logged in today'
    },
    { 
      name: 'Organizations', 
      value: organizations.length.toString(), 
      icon: Building2,
      description: 'Active organizations'
    },
    { 
      name: 'Business Units', 
      value: businessUnits.length.toString(), 
      icon: Briefcase,
      description: 'Total business units'
    },
    { 
      name: 'Locations', 
      value: locations.length.toString(), 
      icon: MapPin,
      description: 'Registered locations'
    },
    { 
      name: 'Pending Invitations', 
      value: invitations.filter(inv => inv.status === 'pending').length.toString(), 
      icon: Mail,
      description: 'Awaiting acceptance'
    },
    { 
      name: 'Avg Session Duration', 
      value: `${loginStats.averageSessionDuration}m`, 
      icon: Clock,
      description: 'Average user session'
    },
  ];

  // System health metrics - only show if we have real data
  const systemStats = systemMetrics.systemUptime > 0 ? [
    {
      name: 'System Uptime',
      value: `${systemMetrics.systemUptime}%`,
      icon: Server,
      status: getUptimeStatus()
    },
    {
      name: 'Response Time',
      value: `${systemMetrics.averageResponseTime}ms`,
      icon: Clock,
      status: systemMetrics.averageResponseTime < 200 ? 'good' : 'warning'
    },
    {
      name: 'Error Rate',
      value: `${systemMetrics.errorRate}%`,
      icon: AlertTriangle,
      status: systemMetrics.errorRate < 1 ? 'good' : 'warning'
    },
    {
      name: 'Storage Used',
      value: `${systemMetrics.storageUsed}GB`,
      icon: HardDrive,
      status: systemMetrics.storageUsed < 5 ? 'good' : 'warning'
    }
  ] : [];

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  // Generate recent activity from real data with enhanced information
  const recentActivity = [
    // Recent logins
    ...getRecentLogins(2).map((user, index) => ({
      id: `login-${index}`,
      type: 'login',
      action: 'User logged in',
      primaryText: user.email,
      secondaryText: `Last seen: ${formatRelativeTime(user.last_sign_in_at)}`,
      tertiaryText: user.user_metadata?.full_name ? `Name: ${user.user_metadata.full_name}` : undefined,
      time: formatRelativeTime(user.last_sign_in_at),
      absoluteTime: new Date(user.last_sign_in_at).toLocaleDateString(),
      icon: LogIn
    })),
    // User registrations
    ...users.slice(0, 1).map((user, index) => ({
      id: `user-${index}`,
      type: 'user',
      action: 'User registered',
      primaryText: user.user_name || user.user_email || user.user_id,
      secondaryText: `${user.role} in ${user.organizations?.name || 'Unknown Organization'}`,
      tertiaryText: user.user_email ? `Email: ${user.user_email}` : undefined,
      time: formatRelativeTime(user.created_at),
      absoluteTime: new Date(user.created_at).toLocaleDateString(),
      icon: UserPlus
    })),
    // Organizations
    ...organizations.slice(0, 1).map((org, index) => ({
      id: `org-${index}`,
      type: 'organization',
      action: 'Organization created',
      primaryText: org.name,
      secondaryText: `Slug: ${org.slug}`,
      tertiaryText: org.settings ? 'Custom settings configured' : 'Default settings',
      time: formatRelativeTime(org.created_at),
      absoluteTime: new Date(org.created_at).toLocaleDateString(),
      icon: Building
    })),
    // Business units
    ...businessUnits.slice(0, 1).map((unit, index) => ({
      id: `unit-${index}`,
      type: 'business_unit',
      action: 'Business unit added',
      primaryText: unit.name,
      secondaryText: `${unit.type} in ${unit.organization?.name || 'Unknown Organization'}`,
      tertiaryText: unit.settings ? 'Custom configuration' : 'Default configuration',
      time: formatRelativeTime(unit.created_at),
      absoluteTime: new Date(unit.created_at).toLocaleDateString(),
      icon: Briefcase
    })),
    // Locations
    ...locations.slice(0, 1).map((location, index) => ({
      id: `location-${index}`,
      type: 'location',
      action: 'Location added',
      primaryText: location.name,
      secondaryText: `${location.address}, ${location.country}`,
      tertiaryText: `Business Unit: ${location.business_unit?.name || 'Unknown'}`,
      time: formatRelativeTime(location.created_at),
      absoluteTime: new Date(location.created_at).toLocaleDateString(),
      icon: MapPinIcon
    })),
    // Invitations
    ...invitations.slice(0, 1).map((invitation, index) => ({
      id: `invitation-${index}`,
      type: 'invitation',
      action: 'Invitation sent',
      primaryText: invitation.email,
      secondaryText: `${invitation.role} role invitation`,
      tertiaryText: `Status: ${invitation.status} • Expires: ${new Date(invitation.expires_at).toLocaleDateString()}`,
      time: formatRelativeTime(invitation.sent_at),
      absoluteTime: new Date(invitation.sent_at).toLocaleDateString(),
      icon: Send
    }))
  ].slice(0, 8); // Limit to 8 most recent activities

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your procurement system administration</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading dashboard data...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600">Overview of your procurement system</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Last updated</p>
              <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleTimeString()}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">System Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                {stat.description && (
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                )}
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Health Metrics - Only show when we have real data */}
      {systemStats.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemStats.map((stat) => (
              <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    stat.status === 'good' ? 'bg-green-100' : 
                    stat.status === 'warning' ? 'bg-yellow-100' : 
                    'bg-red-100'
                  }`}>
                    <stat.icon className={`h-5 w-5 ${
                      stat.status === 'good' ? 'text-green-600' : 
                      stat.status === 'warning' ? 'text-yellow-600' : 
                      'text-red-600'
                    }`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UserActivityAnalytics
          totalUsers={loginStats.totalUsers}
          activeUsers={loginStats.activeUsers}
          recentLogins={loginStats.recentLogins}
          newUsers={getNewUsers(7).length}
          averageSessionDuration={sessionStats.averageSessionDuration}
          loading={sessionsLoading}
        />
        
        <UserTrendsChart
          totalUsers={loginStats.totalUsers}
          activeUsers={loginStats.activeUsers}
          recentLogins={loginStats.recentLogins}
          newUsers={getNewUsers(7).length}
          loading={sessionsLoading}
        />
      </div>

      {/* Recent Activity & User Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UserActivityLog
          activities={recentActivity}
          loading={isLoading}
        />

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-start p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
              <Users className="w-4 h-4 mr-3" />
              <span className="font-medium">Add New User</span>
            </button>
            <button className="w-full flex items-center justify-start p-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200">
              <Building2 className="w-4 h-4 mr-3 text-gray-600" />
              <span className="font-medium">Create Organization</span>
            </button>
            <button className="w-full flex items-center justify-start p-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200">
              <Briefcase className="w-4 h-4 mr-3 text-gray-600" />
              <span className="font-medium">Add Business Unit</span>
            </button>
            <button className="w-full flex items-center justify-start p-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200">
              <MapPin className="w-4 h-4 mr-3 text-gray-600" />
              <span className="font-medium">Add Location</span>
            </button>
            <button className="w-full flex items-center justify-start p-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200">
              <Mail className="w-4 h-4 mr-3 text-gray-600" />
              <span className="font-medium">Send Invitation</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Activity & System Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Logins */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <LogIn className="w-4 h-4 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Recent Logins</h3>
          </div>
          <div className="space-y-4">
            {getRecentLogins(5).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent logins</h3>
                <p className="text-gray-500">
                  User login activity will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getRecentLogins(5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <LogIn className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.user_metadata?.full_name || 'No name available'}
                        </p>
                        {user.user_metadata?.days_since_last_login !== undefined && (
                          <p className="text-xs text-gray-400">
                            {user.user_metadata.days_since_last_login === 0 ? 'Today' : 
                             user.user_metadata.days_since_last_login === 1 ? 'Yesterday' :
                             `${user.user_metadata.days_since_last_login} days ago`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatRelativeTime(user.last_sign_in_at)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(user.last_sign_in_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          user.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-xs text-gray-500">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Most Active Users */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Most Active Users</h3>
          </div>
          <div className="space-y-4">
            {getMostActiveUsers(5).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activity data</h3>
                <p className="text-gray-500">
                  User activity metrics will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getMostActiveUsers(5).map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.user_metadata?.full_name || 'No name available'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{user.login_count || 0}</p>
                      <p className="text-xs text-gray-500">logins</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <Server className="w-4 h-4 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">System Performance</h3>
          </div>
          <div className="space-y-4">
            {performanceMetrics.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Server className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data</h3>
                <p className="text-gray-500">
                  System performance metrics will appear here when monitoring is configured.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        metric.status === 'good' ? 'bg-green-100' :
                        metric.status === 'warning' ? 'bg-yellow-100' : 
                        'bg-red-100'
                      }`}>
                        {metric.status === 'good' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : metric.status === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{metric.metric}</p>
                        <p className="text-xs text-gray-500">{metric.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{metric.value}{metric.unit}</p>
                      <p className="text-xs text-gray-500 capitalize">{metric.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};