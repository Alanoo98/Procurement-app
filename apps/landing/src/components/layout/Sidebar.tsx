import { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  MapPin, 
  Users, 
  TrendingUp, 
  Package, 
  Target, 
  Bell, 
  DollarSign, 
  MessageSquare, 
  Upload, 
  Brain, 
  Settings, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  User
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ isCollapsed = false, onToggle }: SidebarProps) => {
  const [expandedItems, setExpandedItems] = useState<string[]>(['products', 'import-data']);

  const toggleExpanded = (item: string) => {
    setExpandedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: true
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText
    },
    {
      id: 'locations',
      label: 'Locations',
      icon: MapPin
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Users
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      icon: TrendingUp
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      hasSubmenu: true,
      submenu: [
        { id: 'products-list', label: 'Products' },
        { id: 'product-targets', label: 'Product Targets' },
        { id: 'price-alerts', label: 'Price Alerts' },
        { id: 'price-negotiations', label: 'Price Negotiations' }
      ]
    },
    {
      id: 'import-data',
      label: 'Import Data',
      icon: Upload,
      hasSubmenu: true,
      submenu: [
        { id: 'document-processing', label: 'Document Processing Manager' },
        { id: 'import-pax', label: 'Import PAX' }
      ]
    },
    {
      id: 'ai-analyze',
      label: 'AI (Analyze It)',
      icon: Brain
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Procurement</h1>
            <p className="text-xs text-gray-400">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  item.active 
                    ? 'bg-emerald-500 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => item.hasSubmenu && toggleExpanded(item.id)}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.hasSubmenu && (
                  expandedItems.includes(item.id) ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                )}
              </div>
              
              {/* Submenu */}
              {item.hasSubmenu && expandedItems.includes(item.id) && (
                <ul className="ml-8 mt-2 space-y-1">
                  {item.submenu?.map((subItem) => (
                    <li key={subItem.id}>
                      <a
                        href="#"
                        className="flex items-center p-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {subItem.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">ev@diningsix.dk</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

