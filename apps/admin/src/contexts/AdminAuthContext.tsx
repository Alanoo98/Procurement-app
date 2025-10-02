import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super-admin' | 'admin';
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  adminSignIn: (email: string, password: string) => Promise<void>;
  adminSignOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Hardcoded admin credentials for now
const ADMIN_CREDENTIALS = {
  'admin@test.dk': {
    password: 'admin123',
    user: {
      id: 'admin-1',
      email: 'admin@test.dk',
      name: 'System Administrator',
      role: 'super-admin' as const
    }
  }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing admin session on mount
  useEffect(() => {
    const savedAdmin = localStorage.getItem('admin-user');
    if (savedAdmin) {
      try {
        const parsedAdmin = JSON.parse(savedAdmin);
        setAdminUser(parsedAdmin);
      } catch (error) {
        console.error('Error parsing saved admin user:', error);
        localStorage.removeItem('admin-user');
      }
    }
    setIsLoading(false);
  }, []);

  const adminSignIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const credentials = ADMIN_CREDENTIALS[email as keyof typeof ADMIN_CREDENTIALS];
      
      if (!credentials || credentials.password !== password) {
        throw new Error('Invalid admin credentials');
      }
      
      setAdminUser(credentials.user);
      localStorage.setItem('admin-user', JSON.stringify(credentials.user));
      toast.success('Admin login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Admin login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const adminSignOut = useCallback(() => {
    setAdminUser(null);
    localStorage.removeItem('admin-user');
    toast.success('Admin logged out successfully');
  }, []);

  const value: AdminAuthContextType = {
    adminUser,
    isAdminAuthenticated: !!adminUser,
    isLoading,
    adminSignIn,
    adminSignOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
