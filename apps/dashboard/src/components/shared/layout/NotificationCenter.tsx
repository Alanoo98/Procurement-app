import React, { useState, useRef, useEffect } from 'react';
import { Bell, MapPin, Users, Settings } from 'lucide-react';
import { usePendingMappings } from '@/hooks/utils';
import { useNavigate } from 'react-router-dom';

export interface NotificationItem {
  id: string;
  type: 'pending_mapping' | 'data_sync' | 'price_alert' | 'system' | 'info';
  title: string;
  message: string;
  count?: number;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export const NotificationCenter: React.FC = () => {
  const { data: pendingLocations } = usePendingMappings('location');
  const { data: pendingSuppliers } = usePendingMappings('supplier');
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingLocationCount = pendingLocations?.length || 0;
  const pendingSupplierCount = pendingSuppliers?.length || 0;

  // Generate notifications from different sources
  const notifications: NotificationItem[] = [
    // Pending mappings notifications
    ...(pendingLocationCount > 0 ? [{
      id: 'pending-locations',
      type: 'pending_mapping' as const,
      title: `${pendingLocationCount} Pending Location${pendingLocationCount > 1 ? 's' : ''}`,
      message: 'Location names need mapping',
      count: pendingLocationCount,
      icon: <MapPin className="h-4 w-4 text-blue-600" />,
      action: {
        label: 'Go to Settings',
        onClick: () => navigate('/settings')
      },
      priority: 'medium' as const,
      timestamp: new Date()
    }] : []),
    ...(pendingSupplierCount > 0 ? [{
      id: 'pending-suppliers',
      type: 'pending_mapping' as const,
      title: `${pendingSupplierCount} Pending Supplier${pendingSupplierCount > 1 ? 's' : ''}`,
      message: 'Supplier names need mapping',
      count: pendingSupplierCount,
      icon: <Users className="h-4 w-4 text-blue-600" />,
      action: {
        label: 'Go to Settings',
        onClick: () => navigate('/settings')
      },
      priority: 'medium' as const,
      timestamp: new Date()
    }] : []),
    // Add more notification types here as needed
    // Example: Data sync notifications, price alerts, system updates, etc.
  ];

  const totalNotifications = notifications.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (totalNotifications === 0) {
    return null;
  }

  const handleClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleNotificationAction = (notification: NotificationItem) => {
    setIsDropdownOpen(false);
    notification.action?.onClick();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleClick}
        className="relative inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        title={`${totalNotifications} notification${totalNotifications > 1 ? 's' : ''}`}
      >
        <Bell className="h-4 w-4 text-gray-500" />
        <span className="text-xs font-medium">{totalNotifications}</span>
      </button>

      {/* Notification Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Notifications</span>
            </div>
            <span className="text-xs text-gray-500">{totalNotifications} items</span>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                {notification.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {notification.message}
                  </p>
                </div>
                {notification.action && (
                  <button
                    onClick={() => handleNotificationAction(notification)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Settings className="h-4 w-4" />
              View All Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


