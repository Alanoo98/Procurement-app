import { 
  Filter, 
  Bell, 
  ChevronDown, 
  Settings,
  Menu
} from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

const Header = ({ onMenuToggle, showMenuButton = false }: HeaderProps) => {
  return (
    <header className="header">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        )}
        
        <button className="btn btn-secondary">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              1
            </span>
          </button>
        </div>

        {/* Company Selector */}
        <div className="flex items-center space-x-2">
          <select className="bg-transparent border-none text-gray-700 font-medium focus:outline-none cursor-pointer">
            <option>DiningSix A/S</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {/* Business Unit Selector */}
        <div className="flex items-center space-x-2">
          <select className="bg-transparent border-none text-gray-700 font-medium focus:outline-none cursor-pointer">
            <option>All Business Units</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {/* Customize Button */}
        <button className="btn btn-primary">
          <Settings className="w-4 h-4" />
          Customize
        </button>
      </div>
    </header>
  );
};

export default Header;

