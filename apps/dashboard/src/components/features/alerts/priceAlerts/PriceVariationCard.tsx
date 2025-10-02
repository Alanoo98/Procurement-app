import React from 'react';
import { formatCurrency } from '@/utils/format';
import { 
  Eye, ChevronDown, ChevronUp, DollarSign, 
  AlertTriangle, CheckCircle, XCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNavigationState } from '@/hooks/ui/useNavigationState';
import { PriceVariationChart } from './PriceVariationChart';

interface PriceVariation {
  id: string;
  productCode: string;
  description: string;
  supplier: string;
  unitType: string;
  variations: Array<{
    date: Date;
    unitType: string;
    restaurants: Array<{
      name: string;
      price: number;
      quantity: number;
      invoiceNumber: string;
      isBase: boolean;
      overpaidAmount: number;
    }>;
    priceDifference: number;
    basePrice: number;
    maxPrice: number;
    overpaidAmount: number;
  }>;
  totalOverpaid: number;
  chartData?: Array<{
    date: Date;
    unitType: string;
    basePrice: number;
    variationPrice: number | null;
    priceDifference: number;
    hasVariation: boolean;
  }>;
}

interface PriceVariationCardProps {
  variation: PriceVariation;
  isExpanded: boolean;
  showChart: boolean;
  onToggleExpanded: () => void;
  onToggleChart: () => void;
  onViewDocument: (invoiceNumber: string) => void;
  onViewProduct: (productId: string) => void;
  onResolve: (alertId: string, reason: string, note: string) => void;
  onUnresolve: (alertId: string) => void;
  isResolved: boolean;
  resolution?: {
    reason: string;
    note: string;
    resolvedAt: Date;
  };
}

export const PriceVariationCard: React.FC<PriceVariationCardProps> = ({
  variation,
  isExpanded,
  showChart,
  onToggleExpanded,
  onToggleChart,
  onViewDocument,
  onViewProduct,
  onResolve,
  onUnresolve,
  isResolved,
  resolution,
}) => {
  const navigate = useNavigate();
  const { navigateWithState } = useNavigationState();

  const formatDetailedDate = (date: Date) => {
    return date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewProduct = () => {
    const productId = `${variation.productCode}|${variation.supplier}`;
    onViewProduct(productId);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      isResolved ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className={`h-5 w-5 ${
                isResolved ? 'text-gray-400' : 'text-amber-600'
              }`} />
              <h3 className="text-lg font-semibold text-gray-900">
                {variation.description}
              </h3>
              {isResolved && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Product Code:</span>
                <p className="font-medium">{variation.productCode}</p>
              </div>
              <div>
                <span className="text-gray-500">Supplier:</span>
                <p className="font-medium">{variation.supplier}</p>
              </div>
              <div>
                <span className="text-gray-500">Unit Type:</span>
                <p className="font-medium">{variation.unitType}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Overpaid:</span>
                <p className="font-medium text-red-600">
                  {formatCurrency(variation.totalOverpaid)}
                </p>
              </div>
            </div>

            {resolution && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Resolved</span>
                </div>
                <p className="text-sm text-green-700 mb-1">
                  <strong>Reason:</strong> {resolution.reason}
                </p>
                {resolution.note && (
                  <p className="text-sm text-green-700">
                    <strong>Note:</strong> {resolution.note}
                  </p>
                )}
                <p className="text-xs text-green-600 mt-2">
                  Resolved on {formatDetailedDate(resolution.resolvedAt)}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleViewProduct}
              className="flex items-center gap-1 px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md"
            >
              <Eye className="h-4 w-4" />
              View Product
            </button>
            
            <button
              onClick={onToggleChart}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            >
              <DollarSign className="h-4 w-4" />
              {showChart ? 'Hide Chart' : 'Show Chart'}
            </button>

            <button
              onClick={onToggleExpanded}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Details
                </>
              )}
            </button>
          </div>
        </div>

        {showChart && variation.chartData && (
          <div className="mt-6">
            <PriceVariationChart data={variation.chartData} />
          </div>
        )}

        {isExpanded && (
          <div className="mt-6 space-y-4">
            {variation.variations.map((variationData, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    {formatDetailedDate(variationData.date)} - {variationData.unitType}
                  </h4>
                  <div className="text-sm text-gray-600">
                    Price difference: {formatCurrency(variationData.priceDifference)}
                  </div>
                </div>

                <div className="space-y-2">
                  {variationData.restaurants.map((restaurant, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded ${
                        restaurant.isBase ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {restaurant.isBase ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{restaurant.name}</span>
                        <button
                          onClick={() => onViewDocument(restaurant.invoiceNumber)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {restaurant.invoiceNumber}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(restaurant.price)} × {restaurant.quantity}
                        </div>
                        {!restaurant.isBase && (
                          <div className="text-sm text-red-600">
                            Overpaid: {formatCurrency(restaurant.overpaidAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 

