import React, { useState } from 'react';
import { Flag, Plus } from 'lucide-react';
import { CaseOfConcernForm } from './CaseOfConcernForm';
import { CreateCaseOfConcernInput } from '../../types';

interface CreateConcernQuickActionProps {
  context?: {
    related_supplier_id?: string;
    related_location_id?: string;
    related_product_code?: string;
    related_invoice_number?: string;
    title?: string;
    description?: string;
    concern_type?: 'product' | 'supplier' | 'spend_per_pax' | 'price_variation' | 'efficiency' | 'quality' | 'delivery' | 'contract' | 'other';
  };
  variant?: 'button' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CreateConcernQuickAction: React.FC<CreateConcernQuickActionProps> = ({
  context = {},
  variant = 'button',
  size = 'md',
  className = '',
}) => {
  const [showForm, setShowForm] = useState(false);

  const handleCreateConcern = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleSuccess = () => {
    setShowForm(false);
    // Could add a toast notification here
  };

  const getInitialData = (): Partial<CreateCaseOfConcernInput> => {
    return {
      title: context.title || '',
      description: context.description || '',
      concern_type: context.concern_type || 'other',
      related_supplier_id: context.related_supplier_id,
      related_location_id: context.related_location_id,
      related_product_code: context.related_product_code,
      related_invoice_number: context.related_invoice_number,
    };
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 transition-colors';
    
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    };

    const variantClasses = {
      button: 'text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 font-medium',
      icon: 'text-emerald-600 hover:text-emerald-800 p-1',
      text: 'text-emerald-600 hover:text-emerald-800 font-medium',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  const getIconSize = () => {
    const sizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };
    return sizes[size];
  };

  if (showForm) {
    return (
      <CaseOfConcernForm
        initialData={getInitialData()}
        onClose={handleCloseForm}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <button
      onClick={handleCreateConcern}
      className={getButtonClasses()}
      title="Create a case of concern"
    >
      <Flag className={getIconSize()} />
      {variant !== 'icon' && (
        <span>
          {variant === 'text' ? 'Flag Concern' : 'Create Case'}
        </span>
      )}
    </button>
  );
};

// Preset components for common use cases
export const ProductConcernAction: React.FC<{
  productCode: string;
  productName?: string;
  variant?: 'button' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ productCode, productName, variant = 'icon', size = 'sm', className }) => (
  <CreateConcernQuickAction
    context={{
      related_product_code: productCode,
      title: productName ? `Concern: ${productName}` : `Product Concern: ${productCode}`,
      concern_type: 'product',
    }}
    variant={variant}
    size={size}
    className={className}
  />
);

export const SupplierConcernAction: React.FC<{
  supplierId: string;
  supplierName?: string;
  variant?: 'button' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ supplierId, supplierName, variant = 'icon', size = 'sm', className }) => (
  <CreateConcernQuickAction
    context={{
      related_supplier_id: supplierId,
      title: supplierName ? `Concern: ${supplierName}` : `Supplier Concern: ${supplierId}`,
      concern_type: 'supplier',
    }}
    variant={variant}
    size={size}
    className={className}
  />
);

export const SpendPerPaxConcernAction: React.FC<{
  locationId?: string;
  locationName?: string;
  variant?: 'button' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ locationId, locationName, variant = 'icon', size = 'sm', className }) => (
  <CreateConcernQuickAction
    context={{
      related_location_id: locationId,
      title: locationName ? `Spend per PAX Concern: ${locationName}` : 'Spend per PAX Concern',
      concern_type: 'spend_per_pax',
    }}
    variant={variant}
    size={size}
    className={className}
  />
);

export const PriceVariationConcernAction: React.FC<{
  productCode?: string;
  supplierId?: string;
  variant?: 'button' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ productCode, supplierId, variant = 'icon', size = 'sm', className }) => (
  <CreateConcernQuickAction
    context={{
      related_product_code: productCode,
      related_supplier_id: supplierId,
      title: 'Price Variation Concern',
      description: productCode && supplierId 
        ? `Price variation detected for product ${productCode} from supplier ${supplierId}`
        : 'Price variation detected',
      concern_type: 'price_variation',
    }}
    variant={variant}
    size={size}
    className={className}
  />
);
