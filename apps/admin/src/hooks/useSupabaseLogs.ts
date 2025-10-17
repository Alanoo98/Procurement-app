import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface SupabaseLogEntry {
  id: string;
  timestamp: number;
  event_message: string;
  metadata: any[];
}

export interface ParsedAuthEvent {
  id: string;
  user_id: string;
  email: string;
  action: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  duration?: number;
  status: 'success' | 'error' | 'warning';
}

export const useSupabaseLogs = () => {
  const [logEntries, setLogEntries] = useState<SupabaseLogEntry[]>([]);
  const [authEvents, setAuthEvents] = useState<ParsedAuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupabaseLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseAdmin) {
        throw new Error('Admin client not configured');
      }

      console.log('🔍 Fetching Supabase logs...');

      // Note: Supabase doesn't have a direct logs API in the client
      // We need to use the REST API or a different approach
      // For now, let's create a mock implementation that simulates the log data
      
      // This would be the actual API call to get logs:
      // const response = await fetch(`${supabaseUrl}/rest/v1/logs`, {
      //   headers: {
      //     'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      //     'apikey': supabaseServiceRoleKey
      //   }
      // });

      // For now, let's simulate the log data based on your example
      const mockLogEntries: SupabaseLogEntry[] = [
        {
          id: "304b5443-9c31-4721-884f-a56129f6f419",
          timestamp: 1760682273000000,
          event_message: JSON.stringify({
            auth_event: {
              action: "token_revoked",
              actor_id: "2151d7f4-79ac-43b4-aa6b-3c2daafbb5cd",
              actor_name: "Mathias Højberg",
              actor_username: "mhs@diningsix.dk",
              actor_via_sso: false,
              log_type: "token"
            },
            component: "api",
            duration: 25435191,
            grant_type: "refresh_token",
            level: "info",
            method: "POST",
            msg: "request completed",
            path: "/token",
            referer: "http://localhost:5173",
            remote_addr: "82.192.183.178",
            request_id: "98fdb6ae34fdebd0-CPH",
            status: 200,
            time: "2025-10-17T06:24:33Z"
          }),
          metadata: []
        }
      ];

      setLogEntries(mockLogEntries);

      // Parse auth events from log entries
      const parsedEvents: ParsedAuthEvent[] = [];
      
      mockLogEntries.forEach(entry => {
        try {
          const eventData = JSON.parse(entry.event_message);
          
          if (eventData.auth_event) {
            const authEvent = eventData.auth_event;
            const timestamp = new Date(eventData.time || entry.timestamp / 1000000);
            
            parsedEvents.push({
              id: entry.id,
              user_id: authEvent.actor_id,
              email: authEvent.actor_username,
              action: authEvent.action,
              timestamp: timestamp.toISOString(),
              ip_address: eventData.remote_addr,
              user_agent: eventData.referer,
              session_id: eventData.request_id,
              duration: eventData.duration,
              status: eventData.status === 200 ? 'success' : 'error'
            });
          }
        } catch (parseError) {
          console.warn('Failed to parse log entry:', parseError);
        }
      });

      setAuthEvents(parsedEvents);

      console.log('📊 Parsed auth events:', {
        totalLogs: mockLogEntries.length,
        authEvents: parsedEvents.length,
        events: parsedEvents
      });

    } catch (err: any) {
      setError(err.message);
      console.error('❌ Failed to fetch Supabase logs:', err);
      toast.error('Failed to fetch log data');
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecentAuthEvents = useCallback((hours: number = 24) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return authEvents.filter(event => new Date(event.timestamp) > cutoff);
  }, [authEvents]);

  const getAuthEventsByUser = useCallback((userId: string) => {
    return authEvents.filter(event => event.user_id === userId);
  }, [authEvents]);

  const getActiveUsersFromLogs = useCallback(() => {
    const recentEvents = getRecentAuthEvents(24);
    const uniqueUsers = new Set(recentEvents.map(event => event.user_id));
    return Array.from(uniqueUsers).map(userId => {
      const userEvents = getAuthEventsByUser(userId);
      const latestEvent = userEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
      return {
        user_id: userId,
        email: latestEvent.email,
        last_activity: latestEvent.timestamp,
        activity_count: userEvents.length,
        is_active: true
      };
    });
  }, [getRecentAuthEvents, getAuthEventsByUser]);

  useEffect(() => {
    fetchSupabaseLogs();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSupabaseLogs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSupabaseLogs]);

  return {
    logEntries,
    authEvents,
    loading,
    error,
    refetch: fetchSupabaseLogs,
    getRecentAuthEvents,
    getAuthEventsByUser,
    getActiveUsersFromLogs
  };
};
