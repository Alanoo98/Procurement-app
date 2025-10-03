import React, { useState, useEffect } from 'react';
import { Lock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PinProtectionProps {
  children: React.ReactNode;
  pin?: string;
  maxAttempts?: number;
  lockoutDuration?: number; // in minutes
}

export const PinProtection: React.FC<PinProtectionProps> = ({ 
  children, 
  pin = '1998',
  maxAttempts = 3,
  lockoutDuration = 5
}) => {
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Check if we're still in lockout period
  useEffect(() => {
    if (lockoutTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = lockoutTime.getTime() + (lockoutDuration * 60 * 1000) - now.getTime();
        
        if (diff <= 0) {
          setIsLocked(false);
          setLockoutTime(null);
          setTimeRemaining(0);
          setAttempts(0);
        } else {
          setTimeRemaining(Math.ceil(diff / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutTime, lockoutDuration]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      toast.error('Account is temporarily locked. Please wait.');
      return;
    }

    if (pinInput === pin) {
      setIsPinVerified(true);
      setPinError(null);
      setAttempts(0);
      toast.success('Access granted successfully');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        setIsLocked(true);
        setLockoutTime(new Date());
        setPinError(`Too many failed attempts. Account locked for ${lockoutDuration} minutes.`);
        toast.error('Account locked due to multiple failed attempts');
      } else {
        setPinError(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
        toast.error(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
      }
      setPinInput('');
    }
  };

  // Show PIN input if not verified
  if (!isPinVerified) {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="relative">
              {isLocked ? (
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              ) : (
                <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              )}
              {attempts > 0 && !isLocked && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {attempts}
                </div>
              )}
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900">
              {isLocked ? 'Account Locked' : 'Secure Access Required'}
            </h2>
            
            <p className="mt-2 text-sm text-gray-600">
              {isLocked 
                ? `Too many failed attempts. Please wait ${formatTime(timeRemaining)} before trying again.`
                : 'Please enter your access PIN to continue'
              }
            </p>
            
            {attempts > 0 && !isLocked && (
              <p className="mt-1 text-xs text-orange-600 font-medium">
                {maxAttempts - attempts} attempts remaining
              </p>
            )}
          </div>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Access PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  required
                  disabled={isLocked}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className={`relative block w-full pl-10 pr-3 py-3 border ${
                    isLocked 
                      ? 'border-gray-300 bg-gray-100' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors`}
                  placeholder={isLocked ? "Locked" : "Enter 4-digit PIN"}
                  maxLength={4}
                  pattern="[0-9]{4}"
                  inputMode="numeric"
                />
              </div>
              
              {pinError && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {pinError}
                </div>
              )}
              
              {isLocked && timeRemaining > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  Time remaining: {formatTime(timeRemaining)}
                </div>
              )}
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLocked || pinInput.length !== 4}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isLocked || pinInput.length !== 4
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Account Locked
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Access
                  </>
                )}
              </button>
            </div>
            
            {/* Security notice */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                🔒 This is a secure area. All access attempts are logged.
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show protected content after PIN verification
  return <>{children}</>;
};
