import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PinProtectionProps {
  children: React.ReactNode;
  pin?: string;
}

export const PinProtection: React.FC<PinProtectionProps> = ({ 
  children, 
  pin = '1998' 
}) => {
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === pin) {
      setIsPinVerified(true);
      setPinError(null);
      toast.success('PIN verified successfully');
    } else {
      setPinError('Invalid PIN. Please try again.');
      setPinInput('');
      toast.error('Invalid PIN');
    }
  };

  // Show PIN input if not verified
  if (!isPinVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900">Secure Access Required</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please enter the PIN to access this functionality
            </p>
          </div>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin" className="sr-only">
                PIN
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter PIN"
                maxLength={4}
              />
              {pinError && (
                <p className="mt-2 text-sm text-red-600">{pinError}</p>
              )}
            </div>
            
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Verify PIN
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show protected content after PIN verification
  return <>{children}</>;
};
