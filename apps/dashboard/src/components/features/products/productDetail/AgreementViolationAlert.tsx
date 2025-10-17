import React, { useState } from 'react';
import { AlertTriangle, X, Handshake, DollarSign, Calendar, MapPin, ChevronDown, ChevronUp, TrendingUp, FileText } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface ViolationTransaction {
  invoiceNumber: string;
  invoiceDate: Date;
  location: string;
  quantity: number;
  unitPrice: number;
  overspendAmount: number;
}

interface AgreementViolationAlertProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ViolationTransaction[];
  agreementPrice: number;
  unitType: string;
  productDescription: string;
  supplier: string;
  totalOverspend: number;
  onViewDocument: (invoiceNumber: string) => void;
}

export const AgreementViolationAlert: React.FC<AgreementViolationAlertProps> = ({
  isOpen,
  onClose,
  violations,
  agreementPrice,
  unitType,
  productDescription,
  supplier,
  totalOverspend,
  onViewDocument,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    violations: true,
    action: false,
  });
  const [expandedViolations, setExpandedViolations] = useState<Set<number>>(new Set());

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleViolation = (index: number) => {
    setExpandedViolations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAllViolations = () => {
    setExpandedViolations(new Set(violations.map((_, index) => index)));
  };

  const collapseAllViolations = () => {
    setExpandedViolations(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Alert Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Agreement Violation Alert</h2>
                <p className="text-red-100 text-sm">Prices above negotiated agreement detected</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Quick Overview - Always Visible */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Quick Overview</h3>
                    <p className="text-sm text-red-700">
                      {violations.length} violations detected • {formatCurrency(totalOverspend)} total overspend
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverspend)}</div>
                  <div className="text-sm text-red-700">Potential Savings</div>
                </div>
              </div>
            </div>

            {/* Collapsible Summary Section */}
            <div className="bg-white border border-gray-200 rounded-lg mb-4">
              <button
                onClick={() => toggleSection('summary')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Handshake className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Agreement Details</h3>
                </div>
                {expandedSections.summary ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {expandedSections.summary && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Product:</span>
                      <p className="text-gray-900 font-semibold">{productDescription}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Supplier:</span>
                      <p className="text-gray-900 font-semibold">{supplier}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Agreement Price:</span>
                      <p className="text-green-600 font-semibold">{formatCurrency(agreementPrice)}/{unitType}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Total Overspend:</span>
                      <p className="text-red-600 font-bold text-lg">{formatCurrency(totalOverspend)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Violations Section */}
            <div className="bg-white border border-gray-200 rounded-lg mb-4">
              <button
                onClick={() => toggleSection('violations')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Violation Details ({violations.length} transactions)
                  </h3>
                </div>
                {expandedSections.violations ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {expandedSections.violations && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  {/* Expand/Collapse All Controls */}
                  <div className="flex items-center justify-between pt-4 mb-4">
                    <div className="text-sm text-gray-600">
                      {expandedViolations.size} of {violations.length} violations expanded
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={expandAllViolations}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                      >
                        Expand All
                      </button>
                      <button
                        onClick={collapseAllViolations}
                        className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {violations.map((violation, index) => {
                      const isExpanded = expandedViolations.has(index);
                      const priceDifference = violation.unitPrice - agreementPrice;
                      const percentageAbove = ((priceDifference / agreementPrice) * 100).toFixed(1);
                      
                      return (
                        <div key={index} className="border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                          {/* Violation Header - Always Visible */}
                          <button
                            onClick={() => toggleViolation(index)}
                            className="w-full p-4 flex items-center justify-between hover:bg-red-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  {violation.invoiceDate.toLocaleDateString('da-DK')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">{violation.location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-blue-600 font-medium">{violation.invoiceNumber}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-600">
                                  {formatCurrency(violation.overspendAmount)}
                                </div>
                                <div className="text-xs text-red-600">
                                  +{formatCurrency(priceDifference)}/{unitType} ({percentageAbove}%)
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          </button>
                          
                          {/* Violation Details - Collapsible */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-red-200 bg-red-50">
                              <div className="grid grid-cols-2 gap-4 pt-4">
                                <div>
                                  <span className="text-sm text-gray-600">Invoice:</span>
                                  <button
                                    onClick={() => onViewDocument(violation.invoiceNumber)}
                                    className="block text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {violation.invoiceNumber}
                                  </button>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-600">Quantity:</span>
                                  <p className="text-sm font-medium mt-1">{violation.quantity} {unitType}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-600">Actual Price:</span>
                                  <p className="text-sm font-medium text-red-600 mt-1">
                                    {formatCurrency(violation.unitPrice)}/{unitType}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-600">Overspend:</span>
                                  <p className="text-sm font-bold text-red-600 mt-1">
                                    {formatCurrency(violation.overspendAmount)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                                <div className="text-xs text-red-600 mb-1">Price Difference Details</div>
                                <div className="text-lg font-bold text-red-700">
                                  +{formatCurrency(priceDifference)}/{unitType}
                                </div>
                                <div className="text-xs text-red-600 mt-1">
                                  {percentageAbove}% above agreement price
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Action Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('action')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Recommended Actions</h3>
                </div>
                {expandedSections.action ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {expandedSections.action && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="pt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-amber-900 mb-2">Next Steps</h4>
                      <ul className="text-amber-800 text-sm space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>Review the violation details above to understand the pricing discrepancies</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>Contact the supplier to address the pricing issues and request refunds</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>Update your price negotiations to prevent future violations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>Monitor future transactions to ensure compliance with agreements</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Total potential savings: {formatCurrency(totalOverspend)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Acknowledge
              </button>
              <button
                onClick={() => {
                  // Navigate to price negotiations or contact supplier
                  console.log('Navigate to price negotiations');
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Contact Supplier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
