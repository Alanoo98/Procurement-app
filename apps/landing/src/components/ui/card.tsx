import { ReactNode } from 'react';
import { Info, ArrowRight } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  title: string;
  icon?: ReactNode;
  info?: boolean;
  action?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ title, icon, info, action, className = '' }: CardHeaderProps) => {
  return (
    <div className={`card-header ${className}`}>
      <div className="card-title">
        {icon}
        <span>{title}</span>
        {info && (
          <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <Info className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      {action && (
        <button 
          onClick={action.onClick}
          className="flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
        >
          <span>{action.label}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const CardContent = ({ children, className = '' }: CardContentProps) => {
  return (
    <div className={`card-content ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '' }: CardTitleProps) => {
  return (
    <h3 className={`card-title text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
};

const CardFooter = ({ children, className = '' }: CardFooterProps) => {
  return (
    <div className={`card-footer ${className}`}>
      {children}
    </div>
  );
};

// Export all components
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Title = CardTitle;

// Export named exports for compatibility
export { Card, CardHeader, CardContent, CardFooter, CardTitle };
export default Card;