import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface SessionEvent {
  id: string;
  user_id: string;
  email: string;
  event_type: 'login' | 'logout' | 'token_refresh' | 'session_timeout' | 'forced_logout';
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  session_duration?: number; // in minutes
  metadata?: any;
}

export interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  loginTrends: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  sessionEvents: SessionEvent[];
  topUsers: Array<{
    email: string;
    sessionCount: number;
    totalDuration: number;
  }>;
}

export const useSessionTracking = () => {
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    totalSessions: 0,
    activeSessions: 0,
    averageSessionDuration: 0,
    peakConcurrentUsers: 0,
    loginTrends: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    },
    sessionEvents: [],
    topUsers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseAdmin) {
        throw new Error('Admin client not configured');
      }

      // Fetch all users with their session data
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) throw authError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Process session events from user data
      const sessionEvents: SessionEvent[] = [];
      const userSessionMap = new Map<string, { count: number; totalDuration: number }>();

      authUsers.users.forEach(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        // const createdAt = new Date(user.created_at);
        
        // Create login event
        if (lastSignIn) {
          sessionEvents.push({
            id: `login-${user.id}`,
            user_id: user.id,
            email: user.email || 'Unknown',
            event_type: 'login',
            timestamp: user.last_sign_in_at || new Date().toISOString(),
            ip_address: user.user_metadata?.ip_address,
            user_agent: user.user_metadata?.user_agent,
            session_duration: Math.floor(Math.random() * 120) + 30, // Mock duration
            metadata: {
              login_count: user.user_metadata?.login_count || 0,
              is_email_verified: !!user.email_confirmed_at
            }
          });

          // Track user session stats
          const existing = userSessionMap.get(user.id) || { count: 0, totalDuration: 0 };
          userSessionMap.set(user.id, {
            count: existing.count + 1,
            totalDuration: existing.totalDuration + (Math.floor(Math.random() * 120) + 30)
          });
        }

        // Create account creation event
        sessionEvents.push({
          id: `create-${user.id}`,
          user_id: user.id,
          email: user.email || 'Unknown',
          event_type: 'login',
          timestamp: user.created_at,
          metadata: {
            is_new_user: true,
            is_email_verified: !!user.email_confirmed_at
          }
        });
      });

      // Sort events by timestamp
      sessionEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Calculate analytics - use 7 days for more realistic active session detection
      const activeSessions = authUsers.users.filter(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        return lastSignIn && (now.getTime() - lastSignIn.getTime()) < (7 * 24 * 60 * 60 * 1000);
      });

      const todayLogins = sessionEvents.filter(event => 
        event.event_type === 'login' && new Date(event.timestamp) >= today
      );

      const weekLogins = sessionEvents.filter(event => 
        event.event_type === 'login' && new Date(event.timestamp) >= weekAgo
      );

      const monthLogins = sessionEvents.filter(event => 
        event.event_type === 'login' && new Date(event.timestamp) >= monthAgo
      );

      // Calculate top users
      const topUsers = Array.from(userSessionMap.entries())
        .map(([userId, stats]) => {
          const user = authUsers.users.find(u => u.id === userId);
          return {
            email: user?.email || 'Unknown',
            sessionCount: stats.count,
            totalDuration: stats.totalDuration
          };
        })
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, 10);

      const averageSessionDuration = sessionEvents.length > 0 
        ? Math.floor(sessionEvents.reduce((sum, event) => sum + (event.session_duration || 0), 0) / sessionEvents.length)
        : 0;

      const analyticsData: SessionAnalytics = {
        totalSessions: authUsers.users.length,
        activeSessions: activeSessions.length,
        averageSessionDuration,
        peakConcurrentUsers: Math.max(activeSessions.length, 0),
        loginTrends: {
          today: todayLogins.length,
          thisWeek: weekLogins.length,
          thisMonth: monthLogins.length
        },
        sessionEvents: sessionEvents.slice(0, 100), // Limit to recent 100 events
        topUsers
      };

      setAnalytics(analyticsData);

      console.log('Session Analytics:', {
        totalSessions: analyticsData.totalSessions,
        activeSessions: analyticsData.activeSessions,
        averageSessionDuration: analyticsData.averageSessionDuration,
        todayLogins: analyticsData.loginTrends.today
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch session analytics:', err);
      toast.error('Failed to fetch session analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  const getSessionEventsByUser = useCallback((userId: string) => {
    return analytics.sessionEvents.filter(event => event.user_id === userId);
  }, [analytics.sessionEvents]);

  const getSessionEventsByType = useCallback((eventType: SessionEvent['event_type']) => {
    return analytics.sessionEvents.filter(event => event.event_type === eventType);
  }, [analytics.sessionEvents]);

  const getRecentSessions = useCallback((limit: number = 10) => {
    return analytics.sessionEvents
      .filter(event => event.event_type === 'login')
      .slice(0, limit);
  }, [analytics.sessionEvents]);

  const getSessionDurationStats = useCallback(() => {
    const durations = analytics.sessionEvents
      .filter(event => event.session_duration)
      .map(event => event.session_duration!);
    
    if (durations.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
    
    const sorted = durations.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = Math.floor(durations.reduce((sum, d) => sum + d, 0) / durations.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    return { min, max, avg, median };
  }, [analytics.sessionEvents]);

  useEffect(() => {
    fetchSessionAnalytics();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSessionAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSessionAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchSessionAnalytics,
    getSessionEventsByUser,
    getSessionEventsByType,
    getRecentSessions,
    getSessionDurationStats
  };
};
