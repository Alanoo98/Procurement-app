import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface BookingSyncStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  lastSync?: string;
  error?: string;
  progress: number;
}

interface BookingSyncRequest {
  place_id?: number;
  days_back?: number;
  organization_id?: string;
}

interface BookingSyncResponse {
  status: string;
  message: string;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  sync_time: string;
}

const API_BASE_URL = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:8000';

export const useBookingIntegration = () => {
  const [syncStatus, setSyncStatus] = useState<BookingSyncStatus>({
    status: 'idle',
    progress: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const triggerBookingSync = useCallback(async (request: BookingSyncRequest = {}) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/booking-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: request.place_id,
          days_back: request.days_back || 30,
          organization_id: request.organization_id || 'dining-six-org-id'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: BookingSyncResponse = await response.json();
      
      setSyncStatus({
        status: 'running',
        progress: 0,
        lastSync: result.sync_time
      });

      toast.success('Booking sync started successfully!');
      
      // Start polling for status updates
      pollSyncStatus();
      
      return result;
    } catch (error) {
      console.error('Error triggering booking sync:', error);
      setSyncStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: 0
      });
      toast.error('Failed to start booking sync');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pollSyncStatus = useCallback(async () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/booking-sync/status`);
        if (response.ok) {
          const status = await response.json();
          setSyncStatus(status);
          
          if (status.status === 'success' || status.status === 'error') {
            clearInterval(pollInterval);
            if (status.status === 'success') {
              toast.success('Booking sync completed successfully!');
            } else {
              toast.error(`Booking sync failed: ${status.error}`);
            }
          }
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  }, []);

  const getSyncStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/booking-sync/status`);
      if (response.ok) {
        const status = await response.json();
        setSyncStatus(status);
        return status;
      }
    } catch (error) {
      console.error('Error getting sync status:', error);
    }
    return null;
  }, []);

  const testConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const health = await response.json();
        return health;
      }
      throw new Error('Health check failed');
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  }, []);

  const getRestaurants = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/restaurants`);
      if (response.ok) {
        const data = await response.json();
        return data.restaurants;
      }
      throw new Error('Failed to fetch restaurants');
    } catch (error) {
      console.error('Error getting restaurants:', error);
      throw error;
    }
  }, []);

  const getBookingSummary = useCallback(async (placeId?: number, periodDays: number = 30) => {
    try {
      const params = new URLSearchParams();
      if (placeId) params.append('place_id', placeId.toString());
      params.append('period_days', periodDays.toString());
      
      const response = await fetch(`${API_BASE_URL}/api/booking-summary?${params}`);
      if (response.ok) {
        const summary = await response.json();
        return summary;
      }
      throw new Error('Failed to fetch booking summary');
    } catch (error) {
      console.error('Error getting booking summary:', error);
      throw error;
    }
  }, []);

  const getCPGData = useCallback(async (placeId?: number, startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (placeId) params.append('place_id', placeId.toString());
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await fetch(`${API_BASE_URL}/api/cpg/current?${params}`);
      if (response.ok) {
        const cpgData = await response.json();
        return cpgData;
      }
      throw new Error('Failed to fetch CPG data');
    } catch (error) {
      console.error('Error getting CPG data:', error);
      throw error;
    }
  }, []);

  const getCPGTrends = useCallback(async (placeId?: number, days: number = 30) => {
    try {
      const params = new URLSearchParams();
      if (placeId) params.append('place_id', placeId.toString());
      params.append('days', days.toString());
      
      const response = await fetch(`${API_BASE_URL}/api/cpg/trends?${params}`);
      if (response.ok) {
        const trends = await response.json();
        return trends.trends;
      }
      throw new Error('Failed to fetch CPG trends');
    } catch (error) {
      console.error('Error getting CPG trends:', error);
      throw error;
    }
  }, []);

  const getLocationBreakdown = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cpg/locations`);
      if (response.ok) {
        const breakdown = await response.json();
        return breakdown.locations;
      }
      throw new Error('Failed to fetch location breakdown');
    } catch (error) {
      console.error('Error getting location breakdown:', error);
      throw error;
    }
  }, []);

  return {
    syncStatus,
    isLoading,
    triggerBookingSync,
    getSyncStatus,
    testConnection,
    getRestaurants,
    getBookingSummary,
    getCPGData,
    getCPGTrends,
    getLocationBreakdown
  };
};
