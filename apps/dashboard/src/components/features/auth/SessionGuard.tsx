import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SessionGuardProps {
  children: React.ReactNode;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({ children }) => {
  const { user, session, loading, emailVerified, userProfile, currentOrganization } = useAuth();
  const [sessionValid, setSessionValid] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const warningShownRef = useRef(false);

  useEffect(() => {
    // Only run once when component mounts and loading is complete
    // Also wait for userProfile to be available (not null) to avoid false warnings
    if (initialized || loading || userProfile === null) return;

    const checkSession = async () => {
      try {
        // Check if user is authenticated
        if (!user || !session) {
          setSessionValid(false);
          setInitialized(true);
          return;
        }

        // Check if email is verified
        if (!emailVerified) {
          setSessionValid(false);
          setInitialized(true);
          return;
        }

        // User profile is guaranteed to be available at this point since we wait for it
        // No need to check for missing profile data
        // Note: We don't check for currentOrganization here because:
        // 1. It can be null temporarily during data loading
        // 2. The user has organization membership (as shown in your data)
        // 3. The useUserData hook will handle organization selection automatically

        setSessionValid(true);
        setInitialized(true);
      } catch (error) {
        console.error('Session validation error:', error);
        setSessionValid(false);
        setInitialized(true);
      }
    };

    checkSession();
  }, [loading, initialized, userProfile]); // Include userProfile to re-run when it becomes available

  // Show loading while checking session
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  // Session is valid, render children
  if (sessionValid) {
    return <>{children}</>;
  }

  // Session is invalid, this will be handled by ProtectedRoute
  return null;
};

