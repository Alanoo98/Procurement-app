import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useSimpleCasesOfConcern } from '@/hooks/data/useSimpleCasesOfConcern';

interface SimpleCreateConcernActionProps {
  context?: {
    title?: string;
    description?: string;
    concern_type?: 'product' | 'supplier' | 'spend_per_pax' | 'price_variation' | 'efficiency' | 'quality' | 'delivery' | 'contract' | 'other';
  };
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md';
  className?: string;
}

export const SimpleCreateConcernAction: React.FC<SimpleCreateConcernActionProps> = ({
  context = {},
  variant = 'icon',
  size = 'sm',
  className = '',
}) => {
  const { createCase } = useSimpleCasesOfConcern();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateConcern = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      await createCase({
        title: context.title || 'Quick Concern',
        description: context.description || '',
        concern_type: context.concern_type || 'other',
      });
      // Could add a toast notification here
    } catch (err) {
      console.error('Error creating concern:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 transition-colors';
    
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
    };

    const variantClasses = {
      button: 'text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 font-medium',
      icon: 'text-emerald-600 hover:text-emerald-800 p-1',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  const getIconSize = () => {
    const sizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
    };
    return sizes[size];
  };

  return (
    <button
      onClick={handleCreateConcern}
      disabled={isCreating}
      className={getButtonClasses()}
      title="Create a case of concern"
    >
      <Flag className={getIconSize()} />
      {variant === 'button' && (
        <span>
          {isCreating ? 'Creating...' : 'Flag Concern'}
        </span>
      )}
    </button>
  );
};
