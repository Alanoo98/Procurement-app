import React from 'react';
import { useSessionBasedActivity } from '../hooks/useSessionBasedActivity';
import { useUserActivity } from '../hooks/useUserActivity';
import SessionActivityDisplay from './SessionActivityDisplay';

export const SessionAnalyticsDashboard: React.FC = () => {
  const { 
    userSessionData, 
    analytics, 
    loading: sessionLoading, 
    error: sessionError 
  } = useSessionBasedActivity();
  
  const { 
    userActivity, 
    loginStats, 
    loading: userLoading, 
    error: userError,
    getCurrentlyActiveUsers,
    getMostActiveUsersBySessions
  } = useUserActivity();

  if (sessionLoading || userLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading session analytics...</p>
        </div>
      </div>
    );
  }

  if (sessionError || userError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading session data: {sessionError || userError}</p>
      </div>
    );
  }

  const currentlyActiveUsers = getCurrentlyActiveUsers(5);
  const mostActiveBySessions = getMostActiveUsersBySessions(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session-Based Activity Analytics</h2>
        <p className="text-gray-600">
          Track user activity based on token requests and active sessions instead of just login events.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Currently Active</p>
              <p className="text-2xl font-bold text-gray-900">{loginStats.currentlyActiveUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions Today</p>
              <p className="text-2xl font-bold text-gray-900">{loginStats.totalSessionsToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Session Duration</p>
              <p className="text-2xl font-bold text-gray-900">{loginStats.averageSessionDuration}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions This Week</p>
              <p className="text-2xl font-bold text-gray-900">{loginStats.totalSessionsThisWeek}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Currently Active Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Currently Active Users</h3>
          <p className="text-sm text-gray-600">Users with activity in the last 24 hours</p>
        </div>
        <div className="p-6">
          {currentlyActiveUsers.length > 0 ? (
            <div className="space-y-4">
              {currentlyActiveUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          Activity Score: {user.activity_score}/100
                        </p>
                      </div>
                    </div>
                  </div>
                  <SessionActivityDisplay user={user} showDetailedInfo={false} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No currently active users</p>
          )}
        </div>
      </div>

      {/* Most Active Users by Sessions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Most Active Users by Sessions</h3>
          <p className="text-sm text-gray-600">Users ranked by total session count</p>
        </div>
        <div className="p-6">
          {mostActiveBySessions.length > 0 ? (
            <div className="space-y-4">
              {mostActiveBySessions.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-600">
                        {user.session_count} total sessions
                      </p>
                    </div>
                  </div>
                  <SessionActivityDisplay user={user} showDetailedInfo={false} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No session data available</p>
          )}
        </div>
      </div>

      {/* Session Trends */}
      {analytics && analytics.session_trends && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Session Trends (Last 7 Days)</h3>
            <p className="text-sm text-gray-600">Daily session activity overview</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {analytics.session_trends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(trend.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {trend.unique_users} unique users
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{trend.session_count}</p>
                    <p className="text-sm text-gray-600">sessions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionAnalyticsDashboard;
