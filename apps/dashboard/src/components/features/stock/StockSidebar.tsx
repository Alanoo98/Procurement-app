import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  PanelLeftClose,
  LayoutDashboard, 
  Boxes,
  Package,
  ClipboardList,
  Truck,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Warehouse,
  BarChart3,
  FileText
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSidebarStore } from '@/store/sidebarStore';
import { UserMenu } from '../../shared/layout/UserMenu';

const stockNavigation = [
  { name: 'Stock Dashboard', icon: LayoutDashboard, href: '/stock', end: true },
  { name: 'Stock Items', icon: Package, href: '/stock/items' },
  { name: 'Stock Counts', icon: ClipboardList, href: '/stock/counts' },
  { name: 'Delivery Records', icon: Truck, href: '/stock/deliveries' },
  { name: 'Stock Units', icon: Warehouse, href: '/stock/units' },
];

const stockAnalyticsNavigation = [
  { name: 'Stock Reports', icon: BarChart3, href: '/stock/reports' },
  { name: 'Stock History', icon: FileText, href: '/stock/history' },
];

const stockManagementNavigation = [
  { name: 'Stock Settings', icon: Settings, href: '/stock/settings' },
  { name: 'Help', icon: HelpCircle, href: '/stock/help' },
];

interface StockSidebarProps {
  onSwitchToProcurement: () => void;
}

export const StockSidebar: React.FC<StockSidebarProps> = ({ onSwitchToProcurement }) => {
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['analytics']);

  const toggleExpanded = (item: string) => {
    setExpandedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const renderNavItem = (item: { name: string; icon: React.ComponentType<{ className?: string }>; href: string; end?: boolean }) => {
    return (
      <NavLink to={item.href} end={item.end}
        className={({ isActive }) => cn(
          'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
          isActive ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-gray-700/50 hover:text-blue-400'
        )}
      >
        {({ isActive }) => (
          <>
            <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-blue-400')} />
            {!isCollapsed && <span>{item.name}</span>}
          </>
        )}
      </NavLink>
    );
  };

  const renderDropdownSection = (key: string, title: string, items: { name: string; icon: React.ComponentType<{ className?: string }>; href: string }[], icon: React.ComponentType<{ className?: string }>) => {
    const isExpanded = expandedItems.includes(key);
    
    return (
      <li key={key}>
        <button
          onClick={() => toggleExpanded(key)}
          className={cn(
            'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 w-full text-left',
            'text-gray-300 hover:bg-gray-700/50 hover:text-blue-400',
            isCollapsed && 'justify-center'
          )}
        >
          {React.createElement(icon, { className: 'h-5 w-5 shrink-0' })}
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </button>
        
        {!isCollapsed && isExpanded && (
          <ul className="mt-1 space-y-1 ml-6">
            {items.map((subItem) => (
              <li key={subItem.name}>
                {renderNavItem(subItem)}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="relative flex h-screen flex-col justify-between border-r bg-gradient-to-b from-gray-900 to-gray-800">
      <div className={`${isCollapsed ? 'px-2' : 'px-6'} py-8`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} mb-8`}>
          <div className="bg-blue-500 rounded-xl p-2.5">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div className={isCollapsed ? 'hidden' : 'block'}>
            <span className="text-xl font-bold text-white">Stock</span>
            <span className="block text-xs text-blue-200">Management</span>
          </div>
        </div>
        
        {/* Switch to Procurement Button */}
        <div className="mb-2" />
        
        <nav className="mt-6 flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {/* Main stock navigation items */}
            {stockNavigation.map((item) => (
              <li key={item.name}>
                {renderNavItem(item)}
              </li>
            ))}
            
            {/* Stock Analytics dropdown section */}
            {renderDropdownSection('analytics', 'Analytics', stockAnalyticsNavigation, BarChart3)}
            
            {/* Stock Management dropdown section */}
            {renderDropdownSection('management', 'Management', stockManagementNavigation, Settings)}

            {/* Secondary section aligned with procurement structure */}
            <li className="mt-auto">
              <div className="border-t border-gray-700/50 my-4" />

              {/* Switch button mirrors procurement's secondary spot */}
              <button
                onClick={onSwitchToProcurement}
                className={cn('group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-700/50 hover:text-blue-400')}
              >
                <Boxes className="h-6 w-6 shrink-0" />
                {!isCollapsed && <span>Switch to Procurement</span>}
              </button>

              {stockManagementNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-700/50 hover:text-blue-400"
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </NavLink>
              ))}
              <div className="mt-2">
                <UserMenu />
              </div>
            </li>
          </ul>
          {/* Collapse button aligned like procurement */}
          <button
            onClick={toggleSidebar}
            className="absolute right-0 bottom-8 -mr-3 bg-gray-700 rounded-full p-1 text-gray-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeftClose className={`h-5 w-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </nav>
      </div>


    </div>
  );
};
