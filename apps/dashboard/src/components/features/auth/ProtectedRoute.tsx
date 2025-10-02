import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/pages/auth/AuthPage';
import { SessionGuard } from './SessionGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, emailVerified } = useAuth();

  // Show loading while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user is signed in, show the auth page
  if (!user) {
    return <AuthPage />;
  }

  // If user is signed in but email is not verified, show verification page
  if (!emailVerified) {
    return <Navigate to="/verify-email" />;
  }

  // User is signed in and email is verified, wrap with session guard
  return (
    <SessionGuard>
      {children}
    </SessionGuard>
  );
};

