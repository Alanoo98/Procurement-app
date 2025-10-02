import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { useLocations } from '../../hooks/useLocations';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useBusinessUnits } from '../../hooks/useBusinessUnits';
import { toast } from 'react-hot-toast';

interface CreateLocationFormProps {
  onClose: () => void;
}

export const CreateLocationForm: React.FC<CreateLocationFormProps> = ({ onClose }) => {
  const { createLocation } = useLocations();
  const { organizations } = useOrganizations();
  const { businessUnits } = useBusinessUnits();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    country: '',
    organization_id: '',
    business_unit_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter business units based on selected organization
  const filteredBusinessUnits = businessUnits.filter(unit => 
    !formData.organization_id || unit.organization_id === formData.organization_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createLocation({
        name: formData.name,
        address: formData.address,
        country: formData.country,
        organization_id: formData.organization_id,
        business_unit_id: formData.business_unit_id
      });
      
      toast.success('Location created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset business unit when organization changes
      ...(name === 'organization_id' && { business_unit_id: '' })
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPin className="w-6 h-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Create Location</h3>
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
              Location Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter location name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter full address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="">Select a country</option>
              <option value="Denmark">Denmark</option>
              <option value="Sweden">Sweden</option>
              <option value="Norway">Norway</option>
              <option value="Finland">Finland</option>
              <option value="Germany">Germany</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="France">France</option>
              <option value="Spain">Spain</option>
              <option value="Italy">Italy</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Belgium">Belgium</option>
              <option value="Austria">Austria</option>
              <option value="Switzerland">Switzerland</option>
              <option value="Poland">Poland</option>
              <option value="Czech Republic">Czech Republic</option>
              <option value="Hungary">Hungary</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="New Zealand">New Zealand</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Unit *
            </label>
            <select
              name="business_unit_id"
              value={formData.business_unit_id}
              onChange={handleChange}
              required
              className="input w-full"
              disabled={!formData.organization_id}
            >
              <option value="">
                {formData.organization_id ? 'Select a business unit' : 'Select an organization first'}
              </option>
              {filteredBusinessUnits.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.type})
                </option>
              ))}
            </select>
            {!formData.organization_id && (
              <p className="text-xs text-gray-500 mt-1">
                Please select an organization first to see available business units
              </p>
            )}
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
              disabled={isSubmitting || !formData.name.trim() || !formData.address.trim() || !formData.country || !formData.organization_id || !formData.business_unit_id}
            >
              {isSubmitting ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
