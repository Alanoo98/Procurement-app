import { useState } from 'react';
import { toast } from 'sonner';

export const useMaterializedViewRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const syncData = async () => {
    setIsRefreshing(true);
    
    try {
      // Trigger a general data refresh by dispatching a custom event
      // This will cause all components to re-fetch their data
      window.dispatchEvent(new CustomEvent('data-refresh'));
      
      toast.success('Data synced successfully!');
    } catch (error) {
      console.error('Error syncing data:', error);
      toast.error('Failed to sync data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isRefreshing,
    syncData
  };
}; 
