import React from 'react';
import { 
  X, 
  User, 
  Clock, 
  MapPin, 
  Monitor, 
  Shield, 
  Activity,
  LogIn,
  LogOut,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { SessionEvent } from '../hooks/useSessionTracking';

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionEvents: SessionEvent[];
  userEmail: string;
  userId: string;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  sessionEvents,
  userEmail,
  userId
}) => {
  if (!isOpen) return null;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getEventIcon = (eventType: SessionEvent['event_type']) => {
    switch (eventType) {
      case 'login':
        return <LogIn className="w-4 h-4 text-green-600" />;
      case 'logout':
        return <LogOut className="w-4 h-4 text-red-600" />;
      case 'token_refresh':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'session_timeout':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'forced_logout':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: SessionEvent['event_type']) => {
    switch (eventType) {
      case 'login':
        return 'bg-green-50 border-green-200';
      case 'logout':
        return 'bg-red-50 border-red-200';
      case 'token_refresh':
        return 'bg-blue-50 border-blue-200';
      case 'session_timeout':
        return 'bg-yellow-50 border-yellow-200';
      case 'forced_logout':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const totalSessions = sessionEvents.filter(e => e.event_type === 'login').length;
  const totalDuration = sessionEvents
    .filter(e => e.session_duration)
    .reduce((sum, e) => sum + (e.session_duration || 0), 0);
  const averageDuration = totalSessions > 0 ? Math.floor(totalDuration / totalSessions) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Session Details</h3>
                <p className="text-sm text-gray-600">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Session Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Sessions</p>
                    <p className="text-2xl font-bold text-blue-600">{totalSessions}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Total Duration</p>
                    <p className="text-2xl font-bold text-green-600">{formatDuration(totalDuration)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Monitor className="w-5 h-5 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">Avg Duration</p>
                    <p className="text-2xl font-bold text-purple-600">{formatDuration(averageDuration)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Events */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Session History</h4>
              <div className="space-y-3">
                {sessionEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No session events found</p>
                  </div>
                ) : (
                  sessionEvents.map((event, index) => {
                    const timestamp = formatTimestamp(event.timestamp);
                    return (
                      <div
                        key={event.id}
                        className={`border rounded-lg p-4 ${getEventColor(event.event_type)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getEventIcon(event.event_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h5 className="text-sm font-medium text-gray-900 capitalize">
                                  {event.event_type.replace('_', ' ')}
                                </h5>
                                {event.session_duration && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-700">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDuration(event.session_duration)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {timestamp.date} at {timestamp.time}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {timestamp.relative}
                              </p>
                              
                              {/* Event Details */}
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {event.ip_address && (
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">IP: {event.ip_address}</span>
                                  </div>
                                )}
                                {event.user_agent && (
                                  <div className="flex items-center space-x-2">
                                    <Monitor className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600 truncate">
                                      {event.user_agent.length > 50 
                                        ? `${event.user_agent.substring(0, 50)}...` 
                                        : event.user_agent
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Metadata */}
                              {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="mt-3 p-2 bg-white rounded border">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Details:</p>
                                  <div className="space-y-1">
                                    {Object.entries(event.metadata).map(([key, value]) => (
                                      <div key={key} className="flex justify-between text-xs">
                                        <span className="text-gray-600 capitalize">
                                          {key.replace('_', ' ')}:
                                        </span>
                                        <span className="text-gray-900">
                                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
