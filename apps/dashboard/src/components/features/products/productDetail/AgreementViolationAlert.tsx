import React from 'react';
import { AlertTriangle, X, Handshake, DollarSign, Calendar, MapPin } from 'lucide-react';
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
            {/* Summary */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Handshake className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Violation Summary</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-red-700 font-medium">Product:</span>
                  <p className="text-red-900 font-semibold">{productDescription}</p>
                </div>
                <div>
                  <span className="text-red-700 font-medium">Supplier:</span>
                  <p className="text-red-900 font-semibold">{supplier}</p>
                </div>
                <div>
                  <span className="text-red-700 font-medium">Agreement Price:</span>
                  <p className="text-green-600 font-semibold">{formatCurrency(agreementPrice)}/{unitType}</p>
                </div>
                <div>
                  <span className="text-red-700 font-medium">Total Overspend:</span>
                  <p className="text-red-600 font-bold text-lg">{formatCurrency(totalOverspend)}</p>
                </div>
              </div>
            </div>

            {/* Violations List */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Violation Details ({violations.length} transactions)
              </h4>
              
              {violations.map((violation, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
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
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <span className="text-sm text-gray-600">Invoice:</span>
                          <button
                            onClick={() => onViewDocument(violation.invoiceNumber)}
                            className="block text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {violation.invoiceNumber}
                          </button>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Quantity:</span>
                          <p className="text-sm font-medium">{violation.quantity} {unitType}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Actual Price:</span>
                          <p className="text-sm font-medium text-red-600">
                            {formatCurrency(violation.unitPrice)}/{unitType}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Overspend:</span>
                          <p className="text-sm font-bold text-red-600">
                            {formatCurrency(violation.overspendAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <div className="text-xs text-red-600 mb-1">Price Difference</div>
                        <div className="text-lg font-bold text-red-700">
                          +{formatCurrency(violation.unitPrice - agreementPrice)}/{unitType}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          {(((violation.unitPrice - agreementPrice) / agreementPrice) * 100).toFixed(1)}% above agreement
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Required */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="text-lg font-semibold text-amber-900">Action Required</h4>
              </div>
              <p className="text-amber-800 text-sm">
                These transactions violate your negotiated price agreement. Please review the invoices 
                and contact the supplier to address the pricing discrepancies.
              </p>
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
