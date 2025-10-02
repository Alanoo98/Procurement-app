import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { toast } from 'react-hot-toast';

interface CreateOrganizationFormProps {
  onClose: () => void;
}

export const CreateOrganizationForm: React.FC<CreateOrganizationFormProps> = ({ onClose }) => {
  const { createOrganization } = useOrganizations();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    settings: {
      timezone: 'UTC',
      currency: 'EUR',
      features: []
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate slug from name if not provided
      const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      await createOrganization({
        name: formData.name,
        slug: slug,
        settings: formData.settings
      });
      
      toast.success('Organization created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'timezone' || name === 'currency') {
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Create Organization</h3>
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
              Organization Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter organization name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="input w-full"
              placeholder="auto-generated from name"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL-friendly identifier (auto-generated if empty)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              name="timezone"
              value={formData.settings.timezone}
              onChange={handleChange}
              className="input w-full"
            >
              <option value="UTC">UTC</option>
              <option value="Europe/Copenhagen">Europe/Copenhagen</option>
              <option value="Europe/Stockholm">Europe/Stockholm</option>
              <option value="Europe/Oslo">Europe/Oslo</option>
              <option value="Europe/Helsinki">Europe/Helsinki</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              name="currency"
              value={formData.settings.currency}
              onChange={handleChange}
              className="input w-full"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="SEK">SEK (kr)</option>
              <option value="NOK">NOK (kr)</option>
              <option value="DKK">DKK (kr)</option>
            </select>
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
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
