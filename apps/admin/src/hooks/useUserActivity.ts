import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface UserActivity {
  id: string;
  user_id: string;
  email: string;
  last_sign_in_at: string;
  created_at: string;
  email_confirmed_at: string;
  login_count: number;
  is_active: boolean;
  user_metadata: any;
}

export interface LoginStats {
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  failedLogins: number;
  averageSessionDuration: number;
}

export const useUserActivity = () => {
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loginStats, setLoginStats] = useState<LoginStats>({
    totalUsers: 0,
    activeUsers: 0,
    recentLogins: 0,
    failedLogins: 0,
    averageSessionDuration: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseAdmin) {
        throw new Error('Admin client not configured');
      }

      // Fetch users from auth with pagination to get all users
      let allUsers: any[] = [];
      let page = 1;
      const perPage = 1000; // Supabase default limit
      
      while (true) {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage
        });
        
        if (authError) throw authError;
        
        if (!authUsers.users || authUsers.users.length === 0) break;
        
        allUsers = [...allUsers, ...authUsers.users];
        
        // If we got fewer users than the limit, we've reached the end
        if (authUsers.users.length < perPage) break;
        
        page++;
      }

      // Process user data with enhanced information
      const processedUsers: UserActivity[] = allUsers.map(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        const createdAt = new Date(user.created_at);
        const now = new Date();
        
        // Calculate if user is active (logged in within last 7 days)
        const isActive = lastSignIn ? 
          (now.getTime() - lastSignIn.getTime()) < (7 * 24 * 60 * 60 * 1000) : false;
        
        // Calculate days since last login
        const daysSinceLastLogin = lastSignIn ? 
          Math.floor((now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        // Calculate days since account creation
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: user.id,
          user_id: user.id,
          email: user.email || 'No email',
          last_sign_in_at: user.last_sign_in_at || user.created_at,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at || '',
          login_count: user.user_metadata?.login_count || 0,
          is_active: isActive,
          user_metadata: {
            ...user.user_metadata,
            days_since_last_login: daysSinceLastLogin,
            days_since_creation: daysSinceCreation,
            is_email_verified: !!user.email_confirmed_at,
            phone: user.phone || null,
            app_metadata: user.app_metadata || {}
          }
        };
      });

      setUserActivity(processedUsers);

      // Calculate enhanced stats
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentLogins = processedUsers.filter(user => 
        user.last_sign_in_at && new Date(user.last_sign_in_at) > last24Hours
      );
      
      const activeUsers = processedUsers.filter(user => user.is_active);
      const newUsers = processedUsers.filter(user => 
        new Date(user.created_at) > last7Days
      );
      const verifiedUsers = processedUsers.filter(user => user.email_confirmed_at);
      
      // Calculate average session duration (mock for now, would need real session tracking)
      const averageSessionDuration = processedUsers.length > 0 ? 
        Math.floor(Math.random() * 120) + 30 : 0; // Mock: 30-150 minutes

      const stats: LoginStats = {
        totalUsers: processedUsers.length,
        activeUsers: activeUsers.length,
        recentLogins: recentLogins.length,
        failedLogins: 0, // This would need to be tracked separately
        averageSessionDuration: averageSessionDuration
      };

      setLoginStats(stats);

      console.log('User Activity Data:', {
        totalUsers: processedUsers.length,
        activeUsers: activeUsers.length,
        recentLogins: recentLogins.length,
        newUsers: newUsers.length,
        verifiedUsers: verifiedUsers.length
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch user activity data:', err);
      toast.error('Failed to fetch user activity data');
    } finally {
      setLoading(false);
    }
  };

  const getRecentLogins = (limit: number = 10) => {
    return userActivity
      .filter(user => user.last_sign_in_at)
      .sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime())
      .slice(0, limit);
  };

  const getMostActiveUsers = (limit: number = 10) => {
    return userActivity
      .sort((a, b) => (b.login_count || 0) - (a.login_count || 0))
      .slice(0, limit);
  };

  const getNewUsers = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return userActivity.filter(user => 
      new Date(user.created_at) > cutoffDate
    );
  };

  useEffect(() => {
    fetchUserActivity();
  }, []);

  return {
    userActivity,
    loginStats,
    loading,
    error,
    refetch: fetchUserActivity,
    getRecentLogins,
    getMostActiveUsers,
    getNewUsers
  };
};
