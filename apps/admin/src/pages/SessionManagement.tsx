import React, { useState } from 'react';
import { 
  Users, 
  Activity, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  UserCheck,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useUserSessions } from '../hooks/useUserSessions';
import { useUserActivity } from '../hooks/useUserActivity';
import { useRealAuthLogs } from '../hooks/useRealAuthLogs';
import { UserActivityLog } from '../components/UserActivityLog';
import { SessionDetailsModal } from '../components/SessionDetailsModal';

interface SessionManagementProps {}

export const SessionManagement: React.FC<SessionManagementProps> = () => {
  const { 
    sessions, 
    loading: sessionsLoading, 
    getInactiveUsers,
    getNewUsers,
    refetch: refetchSessions
  } = useUserSessions();

  const { 
    loading: activityLoading, 
    getMostActiveUsers,
    refetch: refetchActivity
  } = useUserActivity();

  const {
    authEvents,
    activeUsers,
    getRecentEvents,
    getEventsByUser,
    getSessionStats: getAuthStats
  } = useRealAuthLogs();

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'activity' | 'analytics'>('overview');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);

  // Filter sessions based on search term - use real auth log data
  const filteredSessions = activeUsers.filter(session =>
    session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate real activity data from session information
  const generateRealActivities = () => {
    const activities: Array<{
      id: string;
      type: 'login' | 'user' | 'organization' | 'business_unit' | 'location' | 'invitation';
      action: string;
      primaryText: string;
      secondaryText?: string;
      tertiaryText?: string;
      time: string;
      absoluteTime: string;
      icon: React.ComponentType<{ className?: string }>;
      status: 'success' | 'warning' | 'error';
    }> = [];
    const now = new Date();
    
    // Generate activities from real auth events
    const recentEvents = getRecentEvents(168); // Last 7 days
    recentEvents.slice(0, 20).forEach((event) => {
      const eventTime = new Date(event.timestamp);
      const timeDiff = now.getTime() - eventTime.getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      activities.push({
        id: event.id,
        type: 'login',
        action: event.action === 'login' ? 'Logged in' : 
                event.action === 'token_refresh' ? 'Session refreshed' :
                event.action === 'token_revoked' ? 'Session ended' : 'Auth activity',
        primaryText: event.email,
        secondaryText: `From ${event.ip_address || 'Unknown IP'}`,
        tertiaryText: `Action: ${event.action}`,
        time: hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${daysAgo}d ago`,
        absoluteTime: eventTime.toLocaleString(),
        icon: LogIn,
        status: event.status
      });
    });

    // Generate user creation activities for new users
    getNewUsers(7).forEach((session) => {
      const createdTime = new Date(session.created_at);
      const timeDiff = now.getTime() - createdTime.getTime();
      const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      activities.push({
        id: `user-${session.id}`,
        type: 'user',
        action: 'Account created',
        primaryText: session.email,
        secondaryText: `Email ${session.is_email_verified ? 'verified' : 'pending verification'}`,
        tertiaryText: `Days since creation: ${session.days_since_creation}`,
        time: daysAgo === 0 ? 'Today' : `${daysAgo}d ago`,
        absoluteTime: createdTime.toLocaleString(),
        icon: UserPlus,
        status: session.is_email_verified ? 'success' : 'warning'
      });
    });

    return activities.sort((a, b) => 
      new Date(b.absoluteTime).getTime() - new Date(a.absoluteTime).getTime()
    );
  };

  const generatedActivities = generateRealActivities();

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusBadge = (session: { is_active: boolean; last_activity: string }) => {
    const now = new Date();
    const lastActivity = new Date(session.last_activity);
    const hoursSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60));
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (session.is_active) {
      // More granular active status based on real activity
      if (hoursSinceActivity < 1) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Online
          </span>
        );
      } else if (hoursSinceActivity < 24) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Recent
          </span>
        );
      }
    }
    
    if (daysSinceActivity > 30) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Clock className="w-3 h-3 mr-1" />
        Idle
      </span>
    );
  };

  if (sessionsLoading || activityLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Session Management</h1>
              <p className="mt-2 text-gray-600">
                Monitor user sessions, activity, and system usage
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  refetchSessions();
                  refetchActivity();
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{getAuthStats().totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">{getAuthStats().activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Session Duration</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(getAuthStats().averageSessionDuration)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent Activity</p>
                <p className="text-2xl font-semibold text-gray-900">{getAuthStats().recentEvents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: Activity },
                { id: 'sessions', name: 'Sessions', icon: Users },
                { id: 'activity', name: 'Activity Log', icon: Clock },
                { id: 'analytics', name: 'Analytics', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'sessions' | 'activity' | 'analytics')}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <UserActivityLog activities={generatedActivities.slice(0, 10)} loading={false} />
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New users this week</span>
                  <span className="text-sm font-medium">{getNewUsers(7).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inactive users (30+ days)</span>
                  <span className="text-sm font-medium">{getInactiveUsers(30).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Most active user</span>
                  <span className="text-sm font-medium">
                    {getMostActiveUsers(1)[0]?.email || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value as 'today' | 'week' | 'month' | 'all')}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500">
                  {filteredSessions.length} of {sessions.length} users
                </div>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSessions.map((session) => (
                      <tr key={session.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {session.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{session.email}</div>
                              <div className="text-sm text-gray-500">{session.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(session)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(session.last_activity).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.activity_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(session.session_duration_minutes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => {
                              setSelectedUser({ id: session.user_id, email: session.email });
                              setShowSessionDetails(true);
                            }}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            title="View session details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-gray-600 hover:text-gray-900"
                            title="User actions"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <UserActivityLog activities={generatedActivities} loading={false} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Session Debug Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Session Detection Logic</h4>
                    <p className="text-sm text-gray-600">
                      Users are considered "active" if they've logged in within the last 7 days.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Current Time</h4>
                    <p className="text-sm text-gray-600">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Real Auth Log Data</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-600">
                      {JSON.stringify({
                        totalEvents: authEvents.length,
                        activeUsers: activeUsers.filter(u => u.is_active).length,
                        recentEvents: getRecentEvents(24).length,
                        sampleEvents: authEvents.slice(0, 3).map(e => ({
                          email: e.email,
                          action: e.action,
                          timestamp: e.timestamp,
                          status: e.status
                        }))
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Modal */}
        {selectedUser && (
          <SessionDetailsModal
            isOpen={showSessionDetails}
            onClose={() => {
              setShowSessionDetails(false);
              setSelectedUser(null);
            }}
            sessionEvents={getEventsByUser(selectedUser.id).map(event => ({
              id: event.id,
              user_id: event.user_id,
              email: event.email,
              event_type: event.action === 'token_revoked' ? 'logout' : 
                         event.action === 'session_created' ? 'login' :
                         event.action as 'login' | 'logout' | 'token_refresh' | 'session_timeout' | 'forced_logout',
              timestamp: event.timestamp,
              ip_address: event.ip_address,
              user_agent: event.user_agent,
              session_duration: event.duration,
              metadata: event.metadata
            }))}
            userEmail={selectedUser.email}
            userId={selectedUser.id}
          />
        )}
      </div>
    </div>
  );
};
