import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error parameters in the URL hash
        if (location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (error === 'access_denied' && errorDescription?.includes('expired')) {
            toast.error('Your verification link has expired. Please request a new one.');
            navigate('/verify-email');
            return;
          }
          
          if (error) {
            toast.error(errorDescription || 'Authentication error');
            navigate('/');
            return;
          }
        }
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast.error('Email verification failed. Please try again.');
          navigate('/');
          return;
        }

        if (data.session?.user) {
          if (data.session.user.email_confirmed_at) {
            // Don't show toast here as user is just returning to the app
            // The verification success will be handled by the auth state change
            navigate('/');
          } else {
            toast.warning('Please verify your email address to continue');
            navigate('/verify-email');
            return;
          }
        }
        
        navigate('/');
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
        toast.error('An unexpected error occurred. Please try again.');
        
        // If we have a user but they're not verified, send them to verification page
        if (user && !user.email_confirmed_at) {
          navigate('/verify-email');
        } else {
          navigate('/');
        }
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Verifying your email...</p>
      </div>
    </div>
  );
};

