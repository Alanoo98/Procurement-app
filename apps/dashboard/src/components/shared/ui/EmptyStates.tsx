import React from 'react';
import { 
  Search, 
  Package, 
  Users, 
  Building2, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  MapPin, 
  Handshake,
  RefreshCw,
  Plus,
  Settings,
  Database,
  Upload,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  DollarSign,
  ShoppingCart,
  Receipt,
  Target,
  Sparkles,
  Coffee,
  ChefHat,
  Store,
  Truck,
  ClipboardList,
  PieChart,
  Activity,
  Zap,
  Lightbulb,
  Heart,
  Star,
  Award,
  Gift,
  Home,
  Globe,
  Shield,
  Lock,
  Unlock,
  Key,
  UserCheck,
  UserPlus,
  UserX,
  Mail,
  Phone,
  MessageSquare,
  HelpCircle,
  Info,
  ExternalLink,
  Download,
  Share2,
  Edit3,
  Trash2,
  Archive,
  Bookmark,
  Clock,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  CalendarX,
  CalendarPlus,
  CalendarMinus,
  CalendarClock,
  CalendarOff,
  CalendarEvent,
  CalendarHeart,
  CalendarStar,
  CalendarAward,
  CalendarGift,
  CalendarHome,
  CalendarGlobe,
  CalendarShield,
  CalendarLock,
  CalendarUnlock,
  CalendarKey,
  CalendarUser,
  CalendarMail,
  CalendarPhone,
  CalendarMessage,
  CalendarHelp,
  CalendarInfo,
  CalendarExternal,
  CalendarDownload,
  CalendarShare,
  CalendarEdit,
  CalendarTrash,
  CalendarArchive,
  CalendarBookmark,
  CalendarClock2,
  CalendarDays2,
  CalendarRange2,
  CalendarCheck2,
  CalendarX2,
  CalendarPlus2,
  CalendarMinus2,
  CalendarClock3,
  CalendarOff2,
  CalendarEvent2,
  CalendarHeart2,
  CalendarStar2,
  CalendarAward2,
  CalendarGift2,
  CalendarHome2,
  CalendarGlobe2,
  CalendarShield2,
  CalendarLock2,
  CalendarUnlock2,
  CalendarKey2,
  CalendarUser2,
  CalendarMail2,
  CalendarPhone2,
  CalendarMessage2,
  CalendarHelp2,
  CalendarInfo2,
  CalendarExternal2,
  CalendarDownload2,
  CalendarShare2,
  CalendarEdit2,
  CalendarTrash2,
  CalendarArchive2,
  CalendarBookmark2
} from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getIconForVariant = (variant: string, defaultIcon: React.ReactNode) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="h-12 w-12 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-12 w-12 text-amber-500" />;
    case 'error':
      return <AlertTriangle className="h-12 w-12 text-red-500" />;
    case 'info':
      return <Info className="h-12 w-12 text-blue-500" />;
    default:
      return defaultIcon;
  }
};

const getSizeClasses = (size: string) => {
  switch (size) {
    case 'sm':
      return 'py-6';
    case 'lg':
      return 'py-16';
    default:
      return 'py-12';
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const iconElement = icon ? getIconForVariant(variant, icon) : getIconForVariant(variant, <Package className="h-12 w-12 text-gray-400" />);
  
  const actionClasses = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };

  return (
    <div className={`text-center ${getSizeClasses(size)} ${className}`}>
      <div className="mb-4">
        {iconElement}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 px-4 py-2 rounded-md text-sm font-medium transition-colors ${actionClasses[action.variant || 'primary']}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Specialized empty state components for different contexts
export const LoadingState: React.FC<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ 
  message = "Loading your data...", 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center justify-center ${getSizeClasses(size)} ${className}`}>
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-emerald-500 mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ 
  title = "Something went wrong", 
  message, 
  onRetry,
  className = '' 
}) => (
  <EmptyState
    title={title}
    description={message}
    variant="error"
    action={onRetry ? {
      label: "Try again",
      onClick: onRetry,
      variant: "primary"
    } : undefined}
    className={className}
  />
);

export const NoDataState: React.FC<{
  context: string;
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({ context, suggestion, action, className = '' }) => {
  const getContextConfig = (ctx: string) => {
    switch (ctx.toLowerCase()) {
      case 'products':
        return {
          icon: <Package className="h-12 w-12 text-gray-400" />,
          title: "No products found",
          description: suggestion || "Start by importing some product data to see your procurement insights."
        };
      case 'suppliers':
        return {
          icon: <Building2 className="h-12 w-12 text-gray-400" />,
          title: "No suppliers found",
          description: suggestion || "Import invoice data to see your supplier relationships and spending patterns."
        };
      case 'locations':
        return {
          icon: <MapPin className="h-12 w-12 text-gray-400" />,
          title: "No locations found",
          description: suggestion || "Add your restaurant locations to track location-specific procurement metrics."
        };
      case 'alerts':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-green-500" />,
          title: "No price alerts",
          description: suggestion || "Great news! All your products are within normal price ranges.",
          variant: 'success' as const
        };
      case 'documents':
        return {
          icon: <FileText className="h-12 w-12 text-gray-400" />,
          title: "No documents found",
          description: suggestion || "Import invoice documents to start analyzing your procurement data."
        };
      case 'pax':
        return {
          icon: <Users className="h-12 w-12 text-gray-400" />,
          title: "No PAX data found",
          description: suggestion || "Add customer count data to analyze spend per customer metrics."
        };
      case 'efficiency':
        return {
          icon: <TrendingUp className="h-12 w-12 text-gray-400" />,
          title: "No efficiency data",
          description: suggestion || "Import data to start analyzing procurement efficiency across your locations."
        };
      case 'negotiations':
        return {
          icon: <Handshake className="h-12 w-12 text-gray-400" />,
          title: "No price agreements",
          description: suggestion || "Create price agreements with suppliers to track negotiated rates."
        };
      case 'mappings':
        return {
          icon: <Settings className="h-12 w-12 text-gray-400" />,
          title: "No mappings configured",
          description: suggestion || "Set up product and supplier mappings to improve data consistency."
        };
      case 'import':
        return {
          icon: <Upload className="h-12 w-12 text-gray-400" />,
          title: "No data imported yet",
          description: suggestion || "Start by importing your first invoice or document to begin analysis."
        };
      case 'filters':
        return {
          icon: <Filter className="h-12 w-12 text-gray-400" />,
          title: "No results match your filters",
          description: suggestion || "Try adjusting your search criteria or date range to see more data."
        };
      case 'search':
        return {
          icon: <Search className="h-12 w-12 text-gray-400" />,
          title: "No search results",
          description: suggestion || "Try different keywords or browse all items to find what you're looking for."
        };
      case 'dashboard':
        return {
          icon: <Home className="h-12 w-12 text-gray-400" />,
          title: "Dashboard is empty",
          description: suggestion || "Configure your dashboard settings to see actionable insights and metrics."
        };
      case 'comparisons':
        return {
          icon: <Users className="h-12 w-12 text-gray-400" />,
          title: "No comparison groups",
          description: suggestion || "Create location comparison groups to analyze price inefficiencies."
        };
      case 'consolidation':
        return {
          icon: <Package className="h-12 w-12 text-green-500" />,
          title: "No consolidation opportunities",
          description: suggestion || "All products are purchased from single suppliers - great efficiency!",
          variant: 'success' as const
        };
      case 'inefficiencies':
        return {
          icon: <Target className="h-12 w-12 text-green-500" />,
          title: "No inefficiencies detected!",
          description: suggestion || "All products are performing efficiently across your location comparisons.",
          variant: 'success' as const
        };
      default:
        return {
          icon: <Database className="h-12 w-12 text-gray-400" />,
          title: `No ${context} found`,
          description: suggestion || `No ${context.toLowerCase()} data available.`
        };
    }
  };

  const config = getContextConfig(context);

  return (
    <EmptyState
      title={config.title}
      description={config.description}
      icon={config.icon}
      variant={config.variant}
      action={action}
      className={className}
    />
  );
};

export const WelcomeState: React.FC<{
  title: string;
  description: string;
  features?: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({ title, description, features, action, className = '' }) => (
  <div className={`text-center ${getSizeClasses('lg')} ${className}`}>
    <div className="mb-6">
      <Sparkles className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">{description}</p>
    
    {features && features.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600">{feature}</p>
          </div>
        ))}
      </div>
    )}
    
    {action && (
      <button
        onClick={action.onClick}
        className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <Plus className="h-5 w-5 mr-2" />
        {action.label}
      </button>
    )}
  </div>
);

export const TableEmptyState: React.FC<{
  context: string;
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  colSpan?: number;
}> = ({ context, suggestion, action, colSpan = 6 }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12">
      <NoDataState
        context={context}
        suggestion={suggestion}
        action={action}
        size="sm"
      />
    </td>
  </tr>
);

export const TableLoadingState: React.FC<{
  message?: string;
  colSpan?: number;
}> = ({ message = "Loading...", colSpan = 6 }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-8">
      <LoadingState message={message} size="sm" />
    </td>
  </tr>
);

export const TableErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
  colSpan?: number;
}> = ({ message, onRetry, colSpan = 6 }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-8">
      <ErrorState message={message} onRetry={onRetry} />
    </td>
  </tr>
); 

