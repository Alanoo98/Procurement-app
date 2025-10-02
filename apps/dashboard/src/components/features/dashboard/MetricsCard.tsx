import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'green';
  format?: 'currency' | 'number';
  description?: string;
  clickable?: boolean;
}

const colorClasses = {
  emerald: {
    bg: 'bg-white',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-600',
    border: 'border-gray-200'
  },
  blue: {
    bg: 'bg-white',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-600',
    border: 'border-gray-200'
  },
  purple: {
    bg: 'bg-white',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-600',
    border: 'border-gray-200'
  },
  amber: {
    bg: 'bg-white',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-600',
    border: 'border-gray-200'
  },
  rose: {
    bg: 'bg-white',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-600',
    border: 'border-gray-200'
  },
  green: {
    bg: 'bg-white',
    icon: 'bg-green-50 text-green-600',
    text: 'text-green-600',
    border: 'border-green-200'
  }
};

export const MetricsCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  format = 'currency',
  description,
  clickable = false
}) => {
  const colors = colorClasses[color];
  
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return formatCurrency(val);
    }
    return val.toLocaleString();
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-6 transition-all duration-200 relative ${
      clickable 
        ? 'hover:shadow-md hover:border-gray-300 cursor-pointer' 
        : 'hover:shadow-sm hover:border-gray-300'
    }`}>
      {/* Subtle icon in top right corner */}
      <div className="absolute top-3 right-3 opacity-30">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      
      <div className="flex-1">
        <p className={`text-sm font-medium ${colors.text} mb-2`}>
          {title}
        </p>
        <p className="text-3xl font-semibold text-gray-900 mb-1">
          {formatValue(value)}
        </p>
        {description && (
          <p className="text-xs text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
