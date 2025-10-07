import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { useCasesOfConcern } from '@/hooks/data/useCasesOfConcern';
import { CreateCaseOfConcernInput, UpdateCaseOfConcernInput, ConcernType, ConcernStatus, ConcernPriority } from '../../types';

interface CaseOfConcernFormProps {
  caseId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<CreateCaseOfConcernInput>;
}

const concernTypeOptions: Array<{ value: ConcernType; label: string }> = [
  { value: 'product', label: 'Product' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'spend_per_pax', label: 'Spend per PAX' },
  { value: 'price_variation', label: 'Price Variation' },
  { value: 'efficiency', label: 'Efficiency' },
  { value: 'quality', label: 'Quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

const statusOptions: Array<{ value: ConcernStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: Array<{ value: ConcernPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const CaseOfConcernForm: React.FC<CaseOfConcernFormProps> = ({
  caseId,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { createCase, updateCase } = useCasesOfConcern();

  const [formData, setFormData] = useState<CreateCaseOfConcernInput & { status?: ConcernStatus }>({
    title: '',
    description: '',
    concern_type: 'other',
    priority: 'medium',
    target_resolution_date: '',
    assigned_to: '',
    tags: [],
    metadata: {},
    ...initialData,
  });

  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!caseId;

  // Removed caseData loading - not available in simplified hook

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const updateData: UpdateCaseOfConcernInput = {
          title: formData.title,
          description: formData.description,
          concern_type: formData.concern_type,
          status: formData.status,
          priority: formData.priority,
          related_supplier_id: formData.related_supplier_id,
          related_location_id: formData.related_location_id,
          related_product_code: formData.related_product_code,
          related_invoice_number: formData.related_invoice_number,
          target_resolution_date: formData.target_resolution_date || undefined,
          assigned_to: formData.assigned_to || undefined,
          tags: formData.tags,
          metadata: formData.metadata,
        };
        await updateCase(caseId, updateData);
      } else {
        const createData: CreateCaseOfConcernInput = {
          title: formData.title,
          description: formData.description,
          concern_type: formData.concern_type,
          priority: formData.priority,
          related_supplier_id: formData.related_supplier_id,
          related_location_id: formData.related_location_id,
          related_product_code: formData.related_product_code,
          related_invoice_number: formData.related_invoice_number,
          target_resolution_date: formData.target_resolution_date || undefined,
          assigned_to: formData.assigned_to || undefined,
          tags: formData.tags,
          metadata: formData.metadata,
        };
        await createCase(createData);
      }
      onSuccess();
    } catch (err) {
      console.error('Error saving case of concern:', err);
      setError(err instanceof Error ? err.message : 'Failed to save case of concern');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed caseLoading check - not available in simplified hook

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Case of Concern' : 'Create Case of Concern'}
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {isEditing ? 'Update the case details and status' : 'Add a new case to track and manage'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Brief description of the concern"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Detailed description of the concern, context, and any relevant information"
                />
              </div>

              <div>
                <label htmlFor="concern_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  id="concern_type"
                  value={formData.concern_type}
                  onChange={(e) => handleInputChange('concern_type', e.target.value as ConcernType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  {concernTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as ConcernPriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {isEditing && (
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    value={formData.status || 'open'}
                    onChange={(e) => handleInputChange('status', e.target.value as ConcernStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To
                </label>
                <select
                  id="assigned_to"
                  value={formData.assigned_to || ''}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Unassigned</option>
                  {/* User assignment removed - no user data available */}
                </select>
              </div>

              <div>
                <label htmlFor="target_resolution_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Resolution Date
                </label>
                <input
                  type="date"
                  id="target_resolution_date"
                  value={formData.target_resolution_date || ''}
                  onChange={(e) => handleInputChange('target_resolution_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Context References */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Context References</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="related_supplier_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Related Supplier
                  </label>
                  <input
                    type="text"
                    id="related_supplier_id"
                    value={formData.related_supplier_id || ''}
                    onChange={(e) => handleInputChange('related_supplier_id', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Supplier ID or name"
                  />
                </div>

                <div>
                  <label htmlFor="related_location_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Related Location
                  </label>
                  <input
                    type="text"
                    id="related_location_id"
                    value={formData.related_location_id || ''}
                    onChange={(e) => handleInputChange('related_location_id', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Location ID or name"
                  />
                </div>

                <div>
                  <label htmlFor="related_product_code" className="block text-sm font-medium text-gray-700 mb-2">
                    Related Product Code
                  </label>
                  <input
                    type="text"
                    id="related_product_code"
                    value={formData.related_product_code || ''}
                    onChange={(e) => handleInputChange('related_product_code', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Product code"
                  />
                </div>

                <div>
                  <label htmlFor="related_invoice_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Related Invoice Number
                  </label>
                  <input
                    type="text"
                    id="related_invoice_number"
                    value={formData.related_invoice_number || ''}
                    onChange={(e) => handleInputChange('related_invoice_number', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Invoice number"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Add a tag and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-emerald-800 bg-emerald-100 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-emerald-600 hover:text-emerald-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditing ? 'Update Case' : 'Create Case'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
