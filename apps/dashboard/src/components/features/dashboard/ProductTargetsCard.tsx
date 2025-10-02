import React from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductTargetsSummary } from '@/hooks/management';

interface ProductTargetsCardProps {
  maxTargets?: number;
}

export const ProductTargetsCard: React.FC<ProductTargetsCardProps> = ({ maxTargets = 5 }) => {
  const navigate = useNavigate();
  const { data: summary, isLoading, error } = useProductTargetsSummary();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500 py-2">
          <p className="text-sm">Failed to load product targets</p>
        </div>
      </div>
    );
  }

  if (!summary || summary.totalTargets === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500 py-2">
          <p className="text-sm mb-2">Set up product targets to track your procurement goals</p>
          <button
            onClick={() => navigate('/product-targets')}
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            Create Product Target →
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Track':
        return 'text-green-600 bg-green-100';
      case 'At Risk':
        return 'text-amber-600 bg-amber-100';
      case 'Behind':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On Track':
        return <CheckCircle className="h-4 w-4" />;
      case 'At Risk':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Behind':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Simple Summary */}
      <div className="flex items-center justify-end mb-4">
        {((summary?.needsAttention || 0) > 0 || (summary?.endingSoon || 0) > 0) && (
          <div className="flex items-center gap-2">
            {(summary?.needsAttention || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                {summary?.needsAttention || 0} need attention
              </span>
            )}
            {(summary?.endingSoon || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Clock className="h-3 w-3" />
                {summary?.endingSoon || 0} ending soon
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recent Targets */}
      <div className="space-y-2">
        {summary?.recentTargets?.slice(0, maxTargets).map((target) => (
          <div key={target.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {target.product_name || target.product_code || 'No Product Code'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(target.status)}`}>
                  {getStatusIcon(target.status)}
                  {target.status}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {target.supplier_name} • {target.days_left} days left
              </div>
            </div>
          </div>
        )) || (
          <div className="text-center py-4 text-gray-500 text-sm">
            No product targets found
          </div>
        )}
      </div>

      {/* View All Button */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => navigate('/product-targets')}
          className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          View All Product Targets →
        </button>
      </div>
    </div>
  );
}; 

