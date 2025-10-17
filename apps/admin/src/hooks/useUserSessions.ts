import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface UserSession {
  id: string;
  user_id: string;
  email: string;
  last_sign_in_at: string;
  created_at: string;
  is_active: boolean;
  login_count: number;
  days_since_last_login: number;
  days_since_creation: number;
  is_email_verified: boolean;
  user_metadata: any;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  loginTrends: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export const useUserSessions = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    averageSessionDuration: 0,
    peakConcurrentUsers: 0,
    loginTrends: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseAdmin) {
        console.error('❌ Supabase Admin client not configured. Check VITE_SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Admin client not configured');
      }

      console.log('✅ Supabase Admin client is configured');

      // Fetch all users with their session data
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Debug: Log the raw data from Supabase
      console.log('🔍 Raw Supabase Auth Data:', {
        totalUsers: authUsers.users.length,
        users: authUsers.users.map(user => ({
          email: user.email,
          last_sign_in_at: user.last_sign_in_at,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
          user_metadata: user.user_metadata
        }))
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Process session data
      const processedSessions: UserSession[] = authUsers.users.map(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        const createdAt = new Date(user.created_at);
        
        const daysSinceLastLogin = lastSignIn ? 
          Math.floor((now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // More accurate active session detection
        // Consider a user active if they've logged in within the last 7 days
        // This is more realistic for business applications
        const isActive = lastSignIn ? 
          (now.getTime() - lastSignIn.getTime()) < (7 * 24 * 60 * 60 * 1000) : false;

        return {
          id: user.id,
          user_id: user.id,
          email: user.email || 'No email',
          last_sign_in_at: user.last_sign_in_at || user.created_at,
          created_at: user.created_at,
          is_active: isActive,
          login_count: user.user_metadata?.login_count || 0,
          days_since_last_login: daysSinceLastLogin || 0,
          days_since_creation: daysSinceCreation,
          is_email_verified: !!user.email_confirmed_at,
          user_metadata: user.user_metadata || {}
        };
      });

      setSessions(processedSessions);

      // Calculate session statistics
      const activeSessions = processedSessions.filter(session => session.is_active);
      const todayLogins = processedSessions.filter(session => 
        session.last_sign_in_at && new Date(session.last_sign_in_at) >= today
      );
      const weekLogins = processedSessions.filter(session => 
        session.last_sign_in_at && new Date(session.last_sign_in_at) >= weekAgo
      );
      const monthLogins = processedSessions.filter(session => 
        session.last_sign_in_at && new Date(session.last_sign_in_at) >= monthAgo
      );

      const stats: SessionStats = {
        totalSessions: processedSessions.length,
        activeSessions: activeSessions.length,
        averageSessionDuration: 45, // Mock data - would need real session tracking
        peakConcurrentUsers: Math.max(activeSessions.length, 0),
        loginTrends: {
          today: todayLogins.length,
          thisWeek: weekLogins.length,
          thisMonth: monthLogins.length
        }
      };

      setSessionStats(stats);

      console.log('Session Data:', {
        totalSessions: processedSessions.length,
        activeSessions: activeSessions.length,
        todayLogins: todayLogins.length,
        weekLogins: weekLogins.length
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch user sessions:', err);
      toast.error('Failed to fetch user session data');
    } finally {
      setLoading(false);
    }
  };

  const getActiveUsers = (limit: number = 10) => {
    return sessions
      .filter(session => session.is_active)
      .sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime())
      .slice(0, limit);
  };

  const getRecentLogins = (limit: number = 10) => {
    return sessions
      .filter(session => session.last_sign_in_at)
      .sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime())
      .slice(0, limit);
  };

  const getInactiveUsers = (days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return sessions.filter(session => 
      session.last_sign_in_at && new Date(session.last_sign_in_at) < cutoffDate
    );
  };

  const getNewUsers = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return sessions.filter(session => 
      new Date(session.created_at) > cutoffDate
    );
  };

  useEffect(() => {
    fetchUserSessions();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchUserSessions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    sessions,
    sessionStats,
    loading,
    error,
    refetch: fetchUserSessions,
    getActiveUsers,
    getRecentLogins,
    getInactiveUsers,
    getNewUsers
  };
};


