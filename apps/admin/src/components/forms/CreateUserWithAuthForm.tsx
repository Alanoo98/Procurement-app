import React, { useState } from 'react';
import { X, Users, Mail, User, Building2 } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useOrganizations } from '../../hooks/useOrganizations';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface CreateUserWithAuthFormProps {
  onClose: () => void;
}

export const CreateUserWithAuthForm: React.FC<CreateUserWithAuthFormProps> = ({ onClose }) => {
  const { refetch: refetchUsers } = useUsers();
  const { organizations } = useOrganizations();
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    organization_id: '',
    role: 'member' as 'owner' | 'admin' | 'member'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Step 1: Create user in Supabase Auth
      if (!supabaseAdmin) {
        throw new Error('Admin client not configured. Please set VITE_SUPABASE_SERVICE_ROLE_KEY');
      }
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Auto-confirm email for admin-created users
        user_metadata: {
          full_name: formData.fullName,
          organization_id: formData.organization_id,
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }

      // Step 2: Create user profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          organization_id: formData.organization_id,
        });

      if (profileError) throw profileError;

      // Step 3: Create organization user relationship
      const { error: orgUserError } = await supabase
        .from('organization_users')
        .insert({
          user_id: authData.user.id,
          organization_id: formData.organization_id,
          role: formData.role,
        });

      if (orgUserError) throw orgUserError;

      toast.success('User created successfully with full authentication!');
      await refetchUsers();
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Create User with Auth</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input w-full pl-10"
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="input w-full pl-10"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temporary Password *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input w-full pl-10"
                placeholder="Temporary password (user will change)"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              User will be prompted to change this password on first login
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                name="organization_id"
                value={formData.organization_id}
                onChange={handleChange}
                required
                className="input w-full pl-10"
              >
                <option value="">Select an organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Members have basic access, Admins can manage users, Owners have full control
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>Full Integration:</strong> This creates a complete user with:
              <br />• Supabase Auth account
              <br />• User profile in database
              <br />• Organization membership
              <br />• Email auto-confirmed
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !formData.email.trim() || !formData.fullName.trim() || !formData.password.trim() || !formData.organization_id}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
