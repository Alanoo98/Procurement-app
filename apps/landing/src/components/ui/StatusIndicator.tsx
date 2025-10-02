import { ReactNode } from 'react';

interface StatusIndicatorProps {
  children: ReactNode;
  variant: 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const StatusIndicator = ({ children, variant, className = '' }: StatusIndicatorProps) => {
  const baseClasses = 'status-indicator';
  const variantClasses = {
    success: 'status-success',
    warning: 'status-warning',
    error: 'status-error',
    info: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

export default StatusIndicator;

