import React from 'react';
import { TrendingDown, AlertTriangle, Target, TrendingUp, Minus } from 'lucide-react';
import { useDashboardInefficientProducts } from '@/hooks/metrics/useDashboardInefficientProducts';
import { formatCurrency } from '@/utils/format';

interface InefficientProductsCardProps {
  onViewProduct?: (productCode: string, locationId?: string) => void;
}

export const InefficientProductsCard: React.FC<InefficientProductsCardProps> = ({
  onViewProduct,
}) => {
  const { inefficientProducts, totalPotentialSavings, isLoading, error } = useDashboardInefficientProducts();

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getEfficiencyIcon = (score: number) => {
    if (score >= 80) return <Target className="h-4 w-4" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-center py-2">
          <p className="text-red-600 text-sm">Error loading inefficient products</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          <span className="ml-2 text-gray-600 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (inefficientProducts.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-2">
          <p className="text-gray-500 text-sm">No inefficient products identified</p>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500">
          {inefficientProducts.length} inefficient products identified
        </div>
      </div>

      <div className="space-y-4">
        {inefficientProducts.slice(0, 5).map((product, index) => (
          <div
            key={`${product.productCode}-${product.locationName}`}
            className="border border-gray-100 rounded-md p-4 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                  <h5 className="font-medium text-gray-900 text-sm">{product.description}</h5>
                  <span className="text-xs text-gray-500">({product.productCode})</span>
                </div>
                <p className="text-xs text-gray-500">{product.locationName}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEfficiencyColor(product.efficiencyScore)}`}>
                  <div className="flex items-center gap-1">
                    {getEfficiencyIcon(product.efficiencyScore)}
                    <span>{Math.round(product.efficiencyScore)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-2">
              <div>
                <span className="text-gray-500">Spend per PAX:</span>
                <span className="ml-1 font-medium">{formatCurrency(product.currentSpendPerPax)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total spend:</span>
                <span className="ml-1 font-medium">{formatCurrency(product.totalSpend)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs mb-3">
              <div className="flex items-center gap-1">
                {getTrendIcon(product.trendDirection)}
                <span className="text-gray-500">Trend:</span>
                <span className={`font-medium ${
                  product.trendDirection === 'improving' ? 'text-green-600' :
                  product.trendDirection === 'declining' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {product.trendDirection}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Data points:</span>
                <span className="ml-1 font-medium">{product.dataPoints}</span>
                <span className={`ml-1 text-xs ${
                  product.dataQualityFactor >= 0.8 ? 'text-green-600' :
                  product.dataQualityFactor >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  ({product.dataQualityFactor >= 0.8 ? 'Good' : product.dataQualityFactor >= 0.5 ? 'Fair' : 'Limited'})
                </span>
              </div>
            </div>

            {onViewProduct && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onViewProduct(product.productCode, product.locationId)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View Efficiency Charts →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {inefficientProducts.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            +{inefficientProducts.length - 5} more inefficient products
          </p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Total Potential Savings</p>
            <p className="text-xs text-gray-500">Based on trend analysis and efficiency improvements</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-emerald-600">
              {formatCurrency(totalPotentialSavings)}
            </p>
            <p className="text-xs text-gray-500">
              {inefficientProducts.length} products
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};