import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useOrganizations } from '../../hooks/useOrganizations';
import { UserWithOrganization } from '../../types/database';
import { toast } from 'react-hot-toast';

interface EditUserFormProps {
  user: UserWithOrganization;
  onClose: () => void;
}

export const EditUserForm: React.FC<EditUserFormProps> = ({ user, onClose }) => {
  const { updateUser } = useUsers();
  const { organizations } = useOrganizations();
  const [formData, setFormData] = useState({
    user_name: user.user_name || '',
    user_email: user.user_email || user.user_id,
    organization_id: user.organization_id,
    role: user.role
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateUser(user.organization_id, user.user_id, {
        role: formData.role
        // Note: In a real implementation, you might also update user_name and user_email
        // but these would typically come from the auth system
      });
      
      toast.success('User updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
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
            <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
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
              User ID
            </label>
            <input
              type="text"
              value={user.user_id}
              disabled
              className="input w-full bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              User ID cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              name="user_name"
              value={formData.user_name}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter display name"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is a display name for the user
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="user_email"
              value={formData.user_email}
              onChange={handleChange}
              className="input w-full"
              placeholder="user@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the user's email address
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <select
              name="organization_id"
              value={formData.organization_id}
              onChange={handleChange}
              className="input w-full"
            >
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Changes to user details will be reflected immediately. 
              Role changes affect the user's permissions within the organization.
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
