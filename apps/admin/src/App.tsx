import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { AdminLoginForm } from './components/AdminLoginForm';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/UserManagement';
import { OrganizationManagement } from './pages/OrganizationManagement';
import { BusinessUnitManagement } from './pages/BusinessUnitManagement';
import { LocationManagement } from './pages/LocationManagement';
import { InvitationManagement } from './pages/InvitationManagement';
import { SessionManagement } from './pages/SessionManagement';

const AdminRoutes: React.FC = () => {
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  
  console.log('AdminRoutes: isAdminAuthenticated:', isAdminAuthenticated, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <AdminLoginForm />;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/organizations" element={<OrganizationManagement />} />
        <Route path="/admin/business-units" element={<BusinessUnitManagement />} />
        <Route path="/admin/locations" element={<LocationManagement />} />
        <Route path="/admin/invitations" element={<InvitationManagement />} />
        <Route path="/admin/sessions" element={<SessionManagement />} />
        <Route path="/admin/settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p>Settings page coming soon...</p></div>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};

const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/*" element={<AdminRoutes />} />
      </Routes>
    </AdminAuthProvider>
  );
};

export default App;
