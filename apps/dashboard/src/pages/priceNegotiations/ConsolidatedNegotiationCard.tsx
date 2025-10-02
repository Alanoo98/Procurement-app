import React, { useState } from 'react';
import { formatCurrency } from '@/utils/format';
import { ChevronDown, ChevronUp, CheckCircle, Handshake, History } from 'lucide-react';
import { PriceNegotiation } from '@/hooks/management/usePriceNegotiations';

interface ConsolidatedNegotiation {
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  unitType: string;
  unitSubtype?: string;
  negotiations: PriceNegotiation[];
  currentActive: PriceNegotiation | null;
  latestResolved: PriceNegotiation | null;
  overallStatus: 'active' | 'resolved' | 'mixed';
}

interface ConsolidatedNegotiationCardProps {
  consolidated: ConsolidatedNegotiation;
  onDelete: (id: string) => Promise<void>;
  onEdit: (negotiation: PriceNegotiation) => void;
}

export const ConsolidatedNegotiationCard: React.FC<ConsolidatedNegotiationCardProps> = ({
  consolidated,
  onDelete,
  onEdit,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);


  const formatDate = (date?: Date) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateSavings = (negotiation: PriceNegotiation) => {
    if (!negotiation.currentPrice || !negotiation.targetPrice) return 0;
    return negotiation.currentPrice - negotiation.targetPrice;
  };

  const calculateSavingsPercentage = (negotiation: PriceNegotiation) => {
    if (!negotiation.currentPrice || !negotiation.targetPrice) return 0;
    return ((negotiation.currentPrice - negotiation.targetPrice) / negotiation.currentPrice) * 100;
  };

  const getCurrentNegotiation = () => {
    return consolidated.currentActive || consolidated.latestResolved || consolidated.negotiations[0];
  };

  const currentNegotiation = getCurrentNegotiation();

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
                {consolidated.description}
                <span className="ml-2 text-sm text-gray-500">
                  ({consolidated.productCode})
                </span>
              </h3>
              <p className="text-sm text-gray-500">
                {consolidated.supplier} · {consolidated.unitType}
                {consolidated.negotiations.length > 1 && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {consolidated.negotiations.length} negotiations
                  </span>
                )}
                {consolidated.latestResolved && (
                  <span className="ml-2 text-xs text-gray-500">
                    Last resolved: {formatDate(consolidated.latestResolved.resolvedAt)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentNegotiation && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Target Price</div>
                <div className="text-lg font-medium text-emerald-600">
                  {formatCurrency(currentNegotiation.targetPrice)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              {consolidated.overallStatus === 'resolved' && !consolidated.currentActive && (
                <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Resolved
                </div>
              )}
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
          {currentNegotiation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {consolidated.negotiations.length > 1 ? 'Current Negotiation Details' : 'Negotiation Details'}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Current Price:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(currentNegotiation.currentPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Target Price:</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatCurrency(currentNegotiation.targetPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Potential Savings:</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatCurrency(calculateSavings(currentNegotiation))} ({calculateSavingsPercentage(currentNegotiation).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Effective Date:</span>
                    <span className={`text-sm font-medium ${consolidated.currentActive ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatDate(currentNegotiation.effectiveDate)}
                      {consolidated.currentActive && <span className="ml-1 text-xs">(Currently Active)</span>}
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
                      {formatDate(currentNegotiation.requestedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className={`text-sm font-medium ${
                      currentNegotiation.status === 'resolved' 
                        ? 'text-gray-600' 
                        : 'text-green-600'
                    }`}>
                      {currentNegotiation.status.charAt(0).toUpperCase() + currentNegotiation.status.slice(1)}
                    </span>
                  </div>
                  {currentNegotiation.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Resolved:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(currentNegotiation.resolvedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentNegotiation?.comment && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Comment</h4>
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                {currentNegotiation.comment}
              </div>
            </div>
          )}

          {currentNegotiation?.resolutionNote && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution Note</h4>
              <div className="bg-emerald-50 p-3 rounded-md text-sm text-emerald-700">
                {currentNegotiation.resolutionNote}
              </div>
            </div>
          )}

          {consolidated.negotiations.length > 1 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Negotiation History</h4>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <History className="h-4 w-4" />
                  {showHistory ? 'Hide History' : 'Show History'}
                </button>
              </div>
              
              {showHistory && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {consolidated.negotiations.map((negotiation, index) => (
                    <div 
                      key={negotiation.id}
                      className={`p-3 rounded-md border ${
                        negotiation.id === currentNegotiation?.id 
                          ? 'bg-emerald-50 border-emerald-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              Negotiation #{index + 1}
                            </span>
                            {negotiation.id === currentNegotiation?.id && (
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                                Current
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              negotiation.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {negotiation.status === 'active' ? 'Active' : 'Resolved'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Target: {formatCurrency(negotiation.targetPrice)} | Current: {formatCurrency(negotiation.currentPrice)}</div>
                            <div>Requested: {formatDate(negotiation.requestedAt)} | Effective: {formatDate(negotiation.effectiveDate)}</div>
                            {negotiation.resolvedAt && (
                              <div>Resolved: {formatDate(negotiation.resolvedAt)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(negotiation)}
                            className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this negotiation?')) {
                                onDelete(negotiation.id);
                              }
                            }}
                            className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            {currentNegotiation && (
              <>
                <button
                  onClick={() => onEdit(currentNegotiation)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {consolidated.negotiations.length > 1 ? 'Edit Current' : 'Edit'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this negotiation?')) {
                      onDelete(currentNegotiation.id);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                >
                  {consolidated.negotiations.length > 1 ? 'Delete Current' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
