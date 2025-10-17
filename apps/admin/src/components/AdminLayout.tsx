import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Briefcase, 
  MapPin,
  Mail, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  BarChart3,
  ChevronDown,
  Activity
} from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { ConfigurationStatus } from './ConfigurationStatus';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Sessions', href: '/admin/sessions', icon: Activity },
  { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { name: 'Business Units', href: '/admin/business-units', icon: Briefcase },
  { name: 'Locations', href: '/admin/locations', icon: MapPin },
  { name: 'Invitations', href: '/admin/invitations', icon: Mail },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { adminUser, adminSignOut } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    adminSignOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col glass border-r border-white/20">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Admin Portal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-white/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900 hover:shadow-sm'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow glass border-r border-white/20">
          <div className="flex h-20 items-center px-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Admin Portal</span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between glass border-b border-white/20 px-6 shadow-sm backdrop-blur-md">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:bg-white/50 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-x-6">
            {/* User menu */}
            <div className="flex items-center gap-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-gray-900">{adminUser?.name || 'System Administrator'}</p>
                <p className="text-xs text-gray-500">{adminUser?.role || 'super-admin'}</p>
              </div>
              <button className="hidden lg:flex items-center text-gray-400 hover:text-gray-600">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-x-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:block">Sign out</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <ConfigurationStatus />
            <div className="animate-fade-in">
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
