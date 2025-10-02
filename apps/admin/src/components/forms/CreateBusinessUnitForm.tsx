import React, { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { useBusinessUnits } from '../../hooks/useBusinessUnits';
import { useOrganizations } from '../../hooks/useOrganizations';
import { toast } from 'react-hot-toast';

interface CreateBusinessUnitFormProps {
  onClose: () => void;
}

export const CreateBusinessUnitForm: React.FC<CreateBusinessUnitFormProps> = ({ onClose }) => {
  const { createBusinessUnit } = useBusinessUnits();
  const { organizations } = useOrganizations();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Regional',
    organization_id: '',
    settings: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createBusinessUnit({
        name: formData.name,
        type: formData.type,
        organization_id: formData.organization_id,
        settings: formData.settings
      });
      
      toast.success('Business unit created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create business unit');
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
            <Briefcase className="w-6 h-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Create Business Unit</h3>
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
              Business Unit Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter business unit name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="Regional">Regional</option>
              <option value="Brand">Brand</option>
              <option value="Division">Division</option>
              <option value="Support">Support</option>
              <option value="Operations">Operations</option>
            </select>
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
              disabled={isSubmitting || !formData.name.trim() || !formData.organization_id}
            >
              {isSubmitting ? 'Creating...' : 'Create Business Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
