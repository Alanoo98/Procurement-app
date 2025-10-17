import React from 'react';
import { UserActivity } from '../hooks/useUserActivity';
import { UserSessionActivity } from '../hooks/useSessionBasedActivity';

interface SessionActivityDisplayProps {
  user: UserActivity | UserSessionActivity;
  showDetailedInfo?: boolean;
}

export const SessionActivityDisplay: React.FC<SessionActivityDisplayProps> = ({ 
  user, 
  showDetailedInfo = false 
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getActivityStatus = () => {
    if ('is_currently_active' in user && user.is_currently_active) {
      return { text: 'Currently Active', color: 'text-green-600', bg: 'bg-green-100' };
    }
    if ('is_active' in user && user.is_active) {
      return { text: 'Active (7 days)', color: 'text-blue-600', bg: 'bg-blue-100' };
    }
    return { text: 'Inactive', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const getActivityScore = () => {
    if ('activity_score' in user) {
      return user.activity_score;
    }
    return 0;
  };

  const getSessionCount = () => {
    if ('session_count' in user) {
      return user.session_count;
    }
    return 0;
  };

  const getLastActiveSession = () => {
    if ('last_active_session' in user) {
      return user.last_active_session;
    }
    return null;
  };

  const activityStatus = getActivityStatus();
  const activityScore = getActivityScore();
  const sessionCount = getSessionCount();
  const lastActiveSession = getLastActiveSession();

  return (
    <div className="space-y-3">
      {/* Activity Status */}
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${activityStatus.bg} ${activityStatus.color}`}>
          {activityStatus.text}
        </span>
        {activityScore > 0 && (
          <span className="text-sm text-gray-600">
            Score: {activityScore}
          </span>
        )}
      </div>

      {/* Session Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-gray-700">Last Active Session:</span>
          <p className="text-gray-600">
            {formatDate(lastActiveSession)}
          </p>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Total Sessions:</span>
          <p className="text-gray-600">{sessionCount}</p>
        </div>
      </div>

      {/* Detailed Information */}
      {showDetailedInfo && (
        <div className="space-y-2 text-sm">
          <div className="border-t pt-2">
            <span className="font-medium text-gray-700">Activity Details:</span>
            <div className="mt-1 space-y-1">
              <div className="flex justify-between">
                <span>Activity Score:</span>
                <span className="font-medium">{activityScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Session Count:</span>
                <span className="font-medium">{sessionCount}</span>
              </div>
              {activityScore > 70 && (
                <div className="text-green-600 text-xs">
                  ⭐ High activity user
                </div>
              )}
              {activityScore < 30 && activityScore > 0 && (
                <div className="text-yellow-600 text-xs">
                  ⚠️ Low activity user
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionActivityDisplay;
