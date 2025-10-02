import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useOrganizations } from '../../hooks/useOrganizations';
import { toast } from 'react-hot-toast';

interface CreateUserFormProps {
  onClose: () => void;
}

export const CreateUserForm: React.FC<CreateUserFormProps> = ({ onClose }) => {
  const { createUser } = useUsers();
  const { organizations } = useOrganizations();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    organization_id: '',
    role: 'member' as 'owner' | 'admin' | 'member'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // In a real implementation, you would:
      // 1. Create the user in Supabase Auth using supabase.auth.admin.createUser()
      // 2. Get the user ID from the created auth user
      // 3. Create the organization_user record with the auth user ID
      
      // For now, we'll create the organization_user record with the email as user_id
      // This is a simplified approach for demo purposes
      await createUser({
        user_id: formData.email, // In production, this should be the actual auth user ID
        organization_id: formData.organization_id,
        role: formData.role
      });
      
      toast.success('User created successfully! Note: In production, this would create an auth user first.');
      onClose();
    } catch (error: any) {
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
            <h3 className="text-lg font-medium text-gray-900">Create User</h3>
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
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization *
            </label>
            <select
              name="organization_id"
              value={formData.organization_id}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="">Select an organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This creates an organization user record. In production, 
              this would first create a Supabase Auth user and then link them to the organization.
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
              disabled={isSubmitting || !formData.email.trim() || !formData.organization_id}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
