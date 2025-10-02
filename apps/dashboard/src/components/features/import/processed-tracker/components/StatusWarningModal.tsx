import React from 'react';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { ProcessedTracker } from '../types';

interface StatusWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documents: ProcessedTracker[];
  invalidDocuments: ProcessedTracker[];
}

export const StatusWarningModal: React.FC<StatusWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documents,
  invalidDocuments
}) => {
  if (!isOpen) return null;

  const validDocuments = documents.filter(doc => 
    doc.status === 'failed' || doc.status === 'pending'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'text-green-600 bg-green-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Warning: Invalid Document Status
              </h3>
              <p className="text-sm text-gray-600">
                Some selected documents have statuses other than "failed" or "pending"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              Documents should typically only be sent to Nanonets if they have a status of "failed" or "pending". 
              Sending documents with other statuses may cause unexpected behavior or duplicate processing.
            </p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-orange-800 mb-1">
                    Documents with invalid status ({invalidDocuments.length}):
                  </h4>
                  <p className="text-sm text-orange-700">
                    These documents will be sent to Nanonets despite having non-standard statuses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {invalidDocuments.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Documents with invalid status:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {invalidDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">#{doc.document_id}</span>
                      <span className="text-sm text-gray-600">
                        {doc.accounting_year}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validDocuments.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Documents with valid status ({validDocuments.length}):</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {validDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">#{doc.document_id}</span>
                      <span className="text-sm text-gray-600">
                        {doc.accounting_year}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Send Anyway ({documents.length} documents)
          </button>
        </div>
      </div>
    </div>
  );
};
