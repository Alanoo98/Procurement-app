import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SessionState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export const useSessionManager = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  const updateSession = useCallback((session: Session | null) => {
    setSessionState(prev => ({
      ...prev,
      user: session?.user ?? null,
      session,
      loading: false,
      initialized: true,
    }));
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      setSessionState(prev => ({ ...prev, loading: true }));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session initialization error:', error);
        toast.error('Failed to initialize session');
      }
      
      updateSession(session);
    } catch (error) {
      console.error('Unexpected error during session initialization:', error);
      setSessionState(prev => ({
        ...prev,
        loading: false,
        initialized: true,
      }));
    }
  }, [updateSession]);

  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session?.user?.email_confirmed_at);
    
    updateSession(session);

    // Handle specific auth events
    switch (event) {
      case 'SIGNED_IN':
        // Only show toast for email confirmation, not regular sign-ins
        if (session?.user?.email_confirmed_at) {
          // Silent sign-in, no toast needed for regular usage
        }
        break;
      case 'SIGNED_OUT':
        // Silent sign-out, no toast needed
        break;
      case 'TOKEN_REFRESHED':
        // Silent token refresh, no toast needed
        break;
      case 'PASSWORD_RECOVERY':
        toast.info('Password recovery email sent');
        break;
    }
  }, [updateSession]);

  useEffect(() => {
    // Initialize session on mount
    initializeSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove dependencies to prevent constant re-initialization

  return {
    ...sessionState,
    refreshSession: initializeSession,
  };
};
