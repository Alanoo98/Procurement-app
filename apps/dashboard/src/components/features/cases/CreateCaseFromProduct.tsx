import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useCasesOfConcern } from '@/hooks/data/useCasesOfConcern';
import { toast } from 'sonner';

interface CreateCaseFromProductProps {
  productCode: string;
  supplierId?: string;
  supplierName?: string;
  className?: string;
}

export const CreateCaseFromProduct: React.FC<CreateCaseFromProductProps> = ({
  productCode,
  supplierId,
  supplierName,
  className = '',
}) => {
  const { createCase } = useCasesOfConcern();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    concern_type: 'product' as const,
  });

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsCreating(true);
    try {
      await createCase({
        title: formData.title.trim(),
        description: formData.description.trim(),
        concern_type: formData.concern_type,
        related_product_code: productCode,
        related_supplier_id: supplierId,
        related_supplier_name: supplierName,
      });
      
      toast.success('Case of concern created successfully');
      setShowForm(false);
      setFormData({ title: '', description: '', concern_type: 'product' });
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Failed to create case of concern');
    } finally {
      setIsCreating(false);
    }
  };

  if (showForm) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Create Case of Concern</h3>
          <button
            onClick={() => setShowForm(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <form onSubmit={handleCreateCase} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the concern"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed description of the concern"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-3 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || isCreating}
              className="flex-1 px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 
        bg-orange-50 hover:bg-orange-100 
        border border-orange-200 hover:border-orange-300
        rounded-lg text-orange-700 hover:text-orange-800
        text-sm font-medium transition-colors
        ${className}
      `}
      title="Create a case of concern for this product"
    >
      <Flag className="h-4 w-4" />
      <span>Report Issue</span>
    </button>
  );
};
