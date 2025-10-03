import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  PanelLeftClose,
  LayoutDashboard, 
  Boxes,
  Users, 
  ShoppingCart, 
  BarChart3, 
  FileSpreadsheet,
  Settings,
  HelpCircle,
  FileText,
  AlertTriangle,
  Sparkles,
  Handshake,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Database,
  Users as UsersIcon,
  Package,
  Calculator,
  Flag
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useFilteredData } from '@/hooks/utils';
import { useSidebarStore } from '@/store/sidebarStore';
import { UserMenu } from './UserMenu';

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Documents', icon: FileText, href: '/documents' },
  { name: 'Locations', icon: Boxes, href: '/locations' },
  { name: 'Suppliers', icon: Users, href: '/suppliers' },
  { name: 'Efficiency', icon: TrendingUp, href: '/efficiency', highlight: true },
  { name: 'COGS Analysis', icon: Calculator, href: '/cogs-analysis', highlight: true },
];

const productNavigation = [
  { name: 'Products', icon: ShoppingCart, href: '/products' },
  { name: 'Product Targets', icon: BarChart3, href: '/product-targets' },
  { name: 'Price Alerts', icon: AlertTriangle, href: '/price-alerts' },
  { name: 'Price Negotiations', icon: Handshake, href: '/price-negotiations' },
];

const importNavigation = [
  { name: 'Document Processing Manager', icon: Database, href: '/import' },
  { name: 'Import PAX', icon: UsersIcon, href: '/pax' },
];

const secondaryNavigation = [
  { name: 'Cases of Concern', icon: Flag, href: '/cases-of-concern' },
  { name: 'Settings', icon: Settings, href: '/settings' },
  { name: 'Help', icon: HelpCircle, href: '/help' },
];

interface SidebarProps {
  onSwitchToStock?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSwitchToStock }) => {
  const invoiceData = useFilteredData();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([]));

  // Check if there are any price alerts
  const hasPriceAlerts = React.useMemo(() => {
    if (!invoiceData) return false;

    const priceVariations = new Map();
    
    for (const invoice of invoiceData) {
      for (const item of invoice.items) {
        const key = `${item.description}|${item.unitType}`;
        const dateKey = invoice.dates.invoice.toISOString().slice(0, 10);
        
        if (!priceVariations.has(key)) {
          priceVariations.set(key, new Map());
        }
        
        if (!priceVariations.get(key).has(dateKey)) {
          priceVariations.get(key).set(dateKey, []);
        }
        
        priceVariations.get(key).get(dateKey).push({
          price: item.unitPrice,
          restaurant: invoice.receiver.name
        });
      }
    }

    // Check for variations > 10%
    for (const [, dates] of priceVariations) {
      for (const [, prices] of dates) {
        if (prices.length > 1) {
          const minPrice = Math.min(...prices.map((p: { price: number }) => p.price));
          const maxPrice = Math.max(...prices.map((p: { price: number }) => p.price));
          const variation = ((maxPrice - minPrice) / minPrice) * 100;
          if (variation > 10) {
            return true;
          }
        }
      }
    }

    return false;
  }, [invoiceData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const renderNavItem = (item: { name: string; icon: React.ComponentType<{ className?: string }>; href: string; highlight?: boolean; comingSoon?: boolean }, isSubItem = false) => (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
          isActive
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-emerald-400',
          item.highlight && 'bg-gradient-to-r from-amber-800/30 to-transparent',
          isSubItem && !isCollapsed && 'ml-6',
          item.comingSoon && 'opacity-75'
        )
      }
    >
      {item.name === 'Price Alerts' ? (
        <div className="relative">
          <AlertTriangle className={cn(
            "h-5 w-5 shrink-0",
            hasPriceAlerts && "text-amber-400 animate-pulse"
          )} />
          {hasPriceAlerts && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full" />
          )}
        </div>
      ) : (
        <item.icon className={cn(
          "h-5 w-5 shrink-0",
          item.highlight && "text-emerald-400"
        )} />
      )}
      {!isCollapsed && (
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
          {item.comingSoon && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              Soon
            </span>
          )}
        </div>
      )}
    </NavLink>
  );

  const renderDropdownSection = (sectionKey: string, title: string, items: { name: string; icon: React.ComponentType<{ className?: string }>; href: string; highlight?: boolean; comingSoon?: boolean }[], icon: React.ComponentType<{ className?: string }>) => {
    const isExpanded = expandedSections.has(sectionKey);
  
    return (
      <li className="mb-2">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={cn(
            'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 w-full text-left',
            'text-gray-300 hover:bg-gray-700/50 hover:text-emerald-400'
          )}
        >
          {React.createElement(icon, { className: "h-5 w-5 shrink-0" })}
          {!isCollapsed && (
            <>
              <span className="flex-1">{title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </button>
        
        {isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {items.map((item) => (
              <div key={item.name}>
                {renderNavItem(item, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Show sub-items when collapsed but expanded */}
        {isExpanded && isCollapsed && (
          <div className="mt-1 space-y-1">
            {items.map((item) => (
              <div key={item.name} className="ml-2">
                {renderNavItem(item, true)}
              </div>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="relative flex h-screen flex-col justify-between border-r bg-gradient-to-b from-gray-900 to-gray-800">
      <div className={`${isCollapsed ? 'px-2' : 'px-6'} py-8`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} mb-8`}>
          <div className="bg-emerald-500 rounded-xl p-2.5">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div className={isCollapsed ? 'hidden' : 'block'}>
            <span className="text-xl font-bold text-white">Procurement</span>
            <span className="block text-xs text-gray-400">Dashboard</span>
          </div>
        </div>
        
        <nav className="mt-6 flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {/* Main navigation items */}
            {navigation.map((item) => (
              <li key={item.name}>
                {renderNavItem(item)}
              </li>
            ))}
            
            {/* Products dropdown section */}
            {renderDropdownSection('products', 'Products', productNavigation, ShoppingCart)}
            
            {/* Import Data dropdown section */}
            {renderDropdownSection('import', 'Import Data', importNavigation, FileSpreadsheet)}
            
            {/* Stock Counting - Standalone item - HIDDEN */}
            {/* <li>
              {renderNavItem({ name: 'Stock Counting', icon: Package, href: '/stock-counting', comingSoon: true })}
            </li> */}
             
             {/* AI Analyze It - Last item - HIDDEN */}
             {/* <li>
               {renderNavItem({ name: 'AI (Analyze It)', icon: Sparkles, href: '/ai-analyze', highlight: false, comingSoon: true })}
             </li> */}
             
             <li className="mt-auto">
              <div className="border-t border-gray-700/50 my-4" />
              
              {/* Stock Management Button - Hidden for now */}
              {/* {onSwitchToStock && (
                <button
                  onClick={onSwitchToStock}
                  className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-700/50 hover:text-blue-400 w-full mb-2"
                >
                  <Package className="h-6 w-6 shrink-0" />
                  {!isCollapsed && <span>Stock Management</span>}
                </button>
              )} */}
              
              {secondaryNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-700/50 hover:text-emerald-400"
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
          <button
            onClick={toggleSidebar}
            className="absolute right-0 bottom-8 -mr-3 bg-gray-700 rounded-full p-1 text-gray-400 hover:text-white transition-colors"
          >
            <PanelLeftClose className={`h-5 w-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </nav>
      </div>
    </div>
  );
};

