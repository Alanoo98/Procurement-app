import React, { useState } from 'react';
import { Play, RefreshCw, Database, Settings, Calendar, MapPin, Building } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface BookingSyncButtonProps {
  organizationId: string;
  onSyncComplete?: () => void;
}

interface SyncConfig {
  startDate: string;
  endDate: string;
  locationId?: string;
  businessType: string;
}

export const BookingSyncButton: React.FC<BookingSyncButtonProps> = ({
  organizationId,
  onSyncComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<SyncConfig>(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      startDate: thirtyDaysAgo,
      endDate: today,
      businessType: 'restaurant'
    };
  });

  const handleBookingSync = async () => {
    if (isLoading) return;

    setIsLoading(true);
    
    try {
      // Call the edge function using the existing supabase client
      const { data, error } = await supabase.functions.invoke('trigger-booking-sync', {
        body: {
          organization_id: organizationId,
          start_date: config.startDate,
          end_date: config.endDate,
          location_id: config.locationId || '',
          business_type: config.businessType
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setLastSync(new Date().toISOString());
      toast.success('Booking sync triggered successfully! Check GitHub Actions for progress.');
      
      if (onSyncComplete) {
        onSyncComplete();
      }

    } catch (error: unknown) {
      console.error('Booking sync error:', error);
      toast.error(`Failed to trigger booking sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Database className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Business Booking Sync
            </h3>
            <p className="text-sm text-gray-500">
              Sync booking data from your source database to PAX table
            </p>
            {lastSync && (
              <p className="text-xs text-gray-400 mt-1">
                Last sync: {new Date(lastSync).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </button>
          
          <button
            onClick={handleBookingSync}
            disabled={isLoading}
            className={`
              inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white
              ${isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }
            `}
          >
            {isLoading ? (
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

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Location ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave empty for all locations"
                value={config.locationId || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, locationId: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="h-4 w-4 inline mr-1" />
                Business Type
              </label>
              <select
                value={config.businessType}
                onChange={(e) => setConfig(prev => ({ ...prev, businessType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="restaurant">Restaurant</option>
                <option value="hotel">Hotel</option>
                <option value="venue">Event Venue</option>
                <option value="cafe">Café</option>
                <option value="bar">Bar</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        <p className="font-medium mb-2">This will:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Fetch confirmed bookings from {config.startDate} to {config.endDate}</li>
          <li>Check which dates are missing in your PAX table</li>
          <li>Only sync missing dates (no duplicates)</li>
          <li>Aggregate guest counts by date and location</li>
          <li>Insert/update PAX records in your database</li>
          <li>Run in GitHub Actions (check Actions tab for progress)</li>
        </ul>
      </div>
    </div>
  );
};
