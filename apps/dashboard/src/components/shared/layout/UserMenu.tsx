import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarStore } from '@/store/sidebarStore';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isCollapsed } = useSidebarStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors w-full"
      >
        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium truncate flex-1 text-left">{user.email}</span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Dropdown menu */}
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20 transform -translate-x-1">
            {/* Arrow pointing down */}
            <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
            <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 transform translate-y-0.5"></div>
            
            <div className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">
              <div className="font-medium truncate">{user.email}</div>
              <div className="text-xs text-gray-500">Admin</div>
            </div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to settings if needed
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

