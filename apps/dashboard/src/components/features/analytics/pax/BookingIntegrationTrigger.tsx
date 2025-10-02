import React, { useState } from 'react';
import { Play, RefreshCw, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';
import { toast } from 'sonner';

interface BookingIntegrationTriggerProps {
  onTriggerBookingSync: () => Promise<void>;
  isTriggering?: boolean;
  lastSyncTime?: string;
  syncStatus?: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export const BookingIntegrationTrigger: React.FC<BookingIntegrationTriggerProps> = ({
  onTriggerBookingSync,
  isTriggering = false,
  lastSyncTime,
  syncStatus = 'idle',
  errorMessage
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTrigger = async () => {
    try {
      await onTriggerBookingSync();
      toast.success('Booking sync triggered successfully!');
    } catch (error) {
      toast.error('Failed to trigger booking sync');
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'running':
        return 'Syncing booking data...';
      case 'success':
        return 'Last sync completed successfully';
      case 'error':
        return 'Last sync failed';
      default:
        return 'Ready to sync';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'running':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              DiningSix Booking Integration
            </h3>
            <p className="text-sm text-gray-500">
              Sync booking data from Azure SQL to PAX table
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {lastSyncTime && (
              <div className="text-xs text-gray-500">
                {new Date(lastSyncTime).toLocaleString()}
              </div>
            )}
          </div>
          
          <button
            onClick={handleTrigger}
            disabled={isTriggering || syncStatus === 'running'}
            className={`
              inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white
              ${isTriggering || syncStatus === 'running'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }
            `}
          >
            {isTriggering || syncStatus === 'running' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Sync Bookings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Details */}
      <div className="mt-4 flex items-center space-x-2">
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Sync Error
              </h3>
              <div className="mt-1 text-sm text-red-700">
                {errorMessage}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Details */}
      <div className="mt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
        
        {isExpanded && (
          <div className="mt-3 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              What this sync does:
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Connects to Azure SQL database (stg.easytable_bookings)</li>
              <li>• Fetches confirmed bookings from the last 30 days</li>
              <li>• Maps placeID to location_id in your system</li>
              <li>• Aggregates persons count by date and location</li>
              <li>• Inserts/updates PAX records in Supabase</li>
              <li>• Sets organization_id to DiningSix automatically</li>
            </ul>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Data Mapping:
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• <strong>persons</strong> → pax_count</div>
                <div>• <strong>placeID</strong> → location_id</div>
                <div>• <strong>placeName</strong> → location name</div>
                <div>• <strong>date</strong> → date_id</div>
                <div>• <strong>status = 'confirmed'</strong> → only confirmed bookings</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
