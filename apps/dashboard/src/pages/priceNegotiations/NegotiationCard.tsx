import React, { useState } from 'react';
import { formatCurrency } from '@/utils/format';
import { ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, Handshake } from 'lucide-react';
import { PriceNegotiation } from '@/hooks/management/usePriceNegotiations';
interface NegotiationCardProps {
  negotiation: PriceNegotiation;
  onUpdate: (id: string, updates: Partial<PriceNegotiation>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (negotiation: PriceNegotiation) => void;
  isActive?: boolean;
}

export const NegotiationCard: React.FC<NegotiationCardProps> = ({
  negotiation,
  onUpdate,
  onDelete,
  onEdit,
  isActive = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateSavings = () => {
    if (!negotiation.currentPrice || !negotiation.targetPrice) return 0;
    return negotiation.currentPrice - negotiation.targetPrice;
  };

  const calculateSavingsPercentage = () => {
    if (!negotiation.currentPrice || !negotiation.targetPrice) return 0;
    return ((negotiation.currentPrice - negotiation.targetPrice) / negotiation.currentPrice) * 100;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Handshake className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {negotiation.description}
                <span className="ml-2 text-sm text-gray-500">
                  ({negotiation.productCode})
                </span>
              </h3>
              <p className="text-sm text-gray-500">
                {negotiation.supplier} · {negotiation.unitType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Target Price</div>
              <div className="text-lg font-medium text-emerald-600">
                {formatCurrency(negotiation.targetPrice)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Active
                </div>
              )}
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(negotiation.status)}`}>
                {getStatusIcon(negotiation.status)}
                <span>{negotiation.status.charAt(0).toUpperCase() + negotiation.status.slice(1)}</span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Negotiation Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Current Price:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(negotiation.currentPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Target Price:</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatCurrency(negotiation.targetPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Potential Savings:</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatCurrency(calculateSavings())} ({calculateSavingsPercentage().toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Effective Date:</span>
                  <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatDate(negotiation.effectiveDate)}
                    {isActive && <span className="ml-1 text-xs">(Currently Active)</span>}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Status Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Requested:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(negotiation.requestedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`text-sm font-medium ${
                    negotiation.status === 'resolved' 
                      ? 'text-gray-600' 
                      : 'text-green-600'
                  }`}>
                    {negotiation.status.charAt(0).toUpperCase() + negotiation.status.slice(1)}
                  </span>
                </div>
                {negotiation.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Resolved:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(negotiation.resolvedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {negotiation.comment && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Comment</h4>
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                {negotiation.comment}
              </div>
            </div>
          )}

          {negotiation.resolutionNote && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution Note</h4>
              <div className="bg-emerald-50 p-3 rounded-md text-sm text-emerald-700">
                {negotiation.resolutionNote}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => onEdit(negotiation)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this negotiation?')) {
                  onDelete(negotiation.id);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

