import React, { useState } from 'react';
import { Mail, RefreshCw, LogOut, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

export const EmailVerificationPage: React.FC = () => {
  const { user, signOut, resendVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  
  // Show expired info by default if we were redirected from an expired link
  const [showExpiredInfo, setShowExpiredInfo] = useState(
    location.search?.includes('expired=true') || 
    location.state?.expired === true
  );

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await resendVerification();
      setShowExpiredInfo(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="bg-amber-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Mail className="h-10 w-10 text-amber-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Verify Your Email Address
          </h2>

          <p className="text-gray-600 mb-6">
            We've sent a verification link to{' '}
            <span className="font-medium text-gray-900">{user?.email}</span>
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-amber-800 mb-1">
                  Verification Link Expiration
                </h4>
                <p className="text-sm text-amber-700">
                  Verification links expire after 24 hours. If your link has expired, please click the "Resend Verification Email" button below to get a new link.
                </p>
                {showExpiredInfo && (
                  <div className="mt-2 text-sm text-amber-700 bg-amber-100 p-2 rounded">
                    <p>If you clicked an expired link, you'll need to:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Request a new verification email using the button below</li>
                      <li>Check your email for the new link</li>
                      <li>Click the new verification link to complete signup</li>
                    </ol>
                  </div>
                )}
                <button 
                  onClick={() => setShowExpiredInfo(!showExpiredInfo)}
                  className="text-amber-800 underline text-sm mt-1"
                >
                  {showExpiredInfo ? 'Hide details' : 'Show more details'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-amber-800 mb-2">
                  To access DiningSix Procurement:
                </h4>
                <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link in the email</li>
                  <li>Return to this page - you'll be automatically signed in</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-blue-800 mb-1">
                  Security Notice
                </h4>
                <p className="text-sm text-blue-700">
                  Email verification is required to ensure only authorized users can access the procurement platform.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full text-gray-600 hover:text-gray-800 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-5 w-5" />
              Sign Out & Try Different Account
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>
              Didn't receive the email? Check your spam folder or try resending.
              <br />
              If you continue to have issues, contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

