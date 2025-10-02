import React from 'react';
import { TrendingUp, Eye } from 'lucide-react';
import { usePriceAlerts } from '@/hooks/management';
import { formatCurrency } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

interface PriceAlertsCardProps {
  maxAlerts?: number;
}

export const PriceAlertsCard: React.FC<PriceAlertsCardProps> = ({
  maxAlerts = 5,
}) => {
  const { priceVariations, agreementViolations, totalSavings, isLoading, error } = usePriceAlerts();
  const navigate = useNavigate();

  const handleViewAlerts = () => {
    navigate('/price-alerts');
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${encodeURIComponent(productId)}`);
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-center py-2">
          <p className="text-red-600 text-sm">Error loading price alerts</p>
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

  const totalAlerts = priceVariations.length + agreementViolations.length;

  if (totalAlerts === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-2">
          <p className="text-gray-500 text-sm">All products are within normal price ranges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={handleViewAlerts}
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          <Eye className="h-4 w-4" />
          View All
        </button>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Active Alerts</p>
            <p className="text-2xl font-bold text-red-600">{totalAlerts}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Potential Savings</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalSavings.total)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {priceVariations.slice(0, maxAlerts).map((variation, index) => (
          <div
            key={variation.id}
            className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <h4 className="font-medium text-gray-900">{variation.description}</h4>
                  <span className="text-sm text-gray-500">({variation.productCode})</span>
                </div>
                <p className="text-sm text-gray-600">{variation.supplier}</p>
              </div>
              <button
                onClick={() => handleViewProduct(`${variation.productCode}|${variation.supplierId}`)}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                View
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Variations</p>
                <p className="font-semibold text-red-600">{variation.variations.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Unit Type</p>
                <p className="font-medium text-gray-900">{variation.unitType}</p>
              </div>
              <div>
                <p className="text-gray-500">Max Difference</p>
                <p className="font-semibold text-red-600">
                  {formatCurrency(Math.max(...variation.variations.map(v => v.priceDifference)))}
                </p>
              </div>
            </div>

            <div className="mt-2 bg-red-50 rounded-md p-2">
              <p className="text-xs text-red-700">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Price variations detected across {variation.variations.length} dates
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalAlerts > maxAlerts && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleViewAlerts}
            className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700"
          >
            View {totalAlerts - maxAlerts} more alerts →
          </button>
        </div>
      )}
    </div>
  );
}; 

