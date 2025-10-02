import React from 'react';
import { formatCurrency } from '@/utils/format';
import { 
  Eye, ChevronDown, ChevronUp, Handshake, 
  CheckCircle, XCircle, DollarSign 
} from 'lucide-react';
import { PriceVariationChart } from './PriceVariationChart';

interface AgreementViolation {
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  unitType: string;
  agreementPrice: number;
  violations: Array<{
    date: Date;
    restaurant: string;
    quantity: number;
    actualPrice: number;
    overspendAmount: number;
    invoiceNumber: string;
  }>;
  totalOverspend: number;
  chartData?: Array<{
    date: Date;
    unitType: string;
    basePrice: number;
    variationPrice: number | null;
    priceDifference: number;
    hasVariation: boolean;
  }>;
}

interface AgreementViolationCardProps {
  violation: AgreementViolation;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleChart?: () => void;
  showChart?: boolean;
  onViewDocument: (invoiceNumber: string) => void;
  onViewProduct: (productId: string) => void;
  isResolved: boolean;
  resolution?: {
    reason: string;
    note: string;
    resolvedAt: Date;
  };
}

export const AgreementViolationCard: React.FC<AgreementViolationCardProps> = ({
  violation,
  isExpanded,
  onToggleExpanded,
  onToggleChart,
  showChart,
  onViewDocument,
  onViewProduct,
  isResolved,
  resolution,
}) => {
  const formatDetailedDate = (date: Date) => {
    return date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewProduct = () => {
    const productId = `${violation.productCode}|${violation.supplier}`;
    onViewProduct(productId);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      isResolved ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Handshake className={`h-5 w-5 ${
                isResolved ? 'text-gray-400' : 'text-red-600'
              }`} />
              <h3 className="text-lg font-semibold text-gray-900">
                {violation.description}
              </h3>
              {isResolved && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Product Code:</span>
                <p className="font-medium">{violation.productCode}</p>
              </div>
              <div>
                <span className="text-gray-500">Supplier:</span>
                <p className="font-medium">{violation.supplier}</p>
              </div>
              <div>
                <span className="text-gray-500">Agreement Price:</span>
                <p className="font-medium text-green-600">
                  {formatCurrency(violation.agreementPrice)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Total Overspend:</span>
                <p className="font-medium text-red-600">
                  {formatCurrency(violation.totalOverspend)}
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

            {violation.chartData && onToggleChart && (
              <button
                onClick={onToggleChart}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
              >
                <DollarSign className="h-4 w-4" />
                {showChart ? 'Hide Chart' : 'Show Chart'}
              </button>
            )}

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

        {showChart && violation.chartData && (
          <div className="mt-6">
            <PriceVariationChart data={violation.chartData} />
          </div>
        )}

        {isExpanded && (
          <div className="mt-6 space-y-4">
            {violation.violations.map((violationData, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    {formatDetailedDate(violationData.date)}
                  </h4>
                  <div className="text-sm text-gray-600">
                    Overspend: {formatCurrency(violationData.overspendAmount)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium">{violationData.restaurant}</span>
                      <button
                        onClick={() => onViewDocument(violationData.invoiceNumber)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {violationData.invoiceNumber}
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(violationData.actualPrice)} × {violationData.quantity}
                      </div>
                      <div className="text-sm text-red-600">
                        Overspend: {formatCurrency(violationData.overspendAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 

