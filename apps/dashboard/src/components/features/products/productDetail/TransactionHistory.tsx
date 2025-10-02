import React from 'react';
import { Eye, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Pagination } from '@/components/shared/ui/Pagination';

type SortField = 'date' | 'restaurant' | 'invoice' | 'price' | 'quantity' | 'total';
type SortDirection = 'asc' | 'desc';

interface TransactionHistoryProps {
  transactions: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    location: string;
    locationId: string;
    quantity: number;
    unitType: string;
    unitPrice: number;
    unitPriceOriginal?: number;
    total: number;
    totalOriginal?: number;
    hasDiscount?: boolean;
    documentType: string;
  }>;
  priceAgreement?: {
    price: number;
    unitType: string;
  };
  currentPage: number;
  pageSize: number;
  totalItems: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSort: (field: SortField) => void;
  onViewDocument: (invoiceNumber: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  priceAgreement,
  currentPage,
  pageSize,
  totalItems,
  sortField,
  sortDirection,
  onPageChange,
  onPageSizeChange,
  onSort,
  onViewDocument,
}) => {
  // Debug effect to track props changes
  React.useEffect(() => {
    console.log('TransactionHistory props updated:', {
      sortField,
      sortDirection,
      transactionCount: transactions.length,
      currentPage,
      pageSize
    });
  }, [sortField, sortDirection, transactions.length, currentPage, pageSize]);
  const renderSortButton = (field: SortField, label: string) => {
    const isActive = sortField === field;
    const isAscending = isActive && sortDirection === 'asc';
    const isDescending = isActive && sortDirection === 'desc';
    
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Sort button clicked:', field, 'Current state:', { sortField, sortDirection });
          onSort(field);
        }}
        className={`flex items-center gap-1 hover:text-gray-700 transition-colors ${
          isActive ? 'text-emerald-600 font-medium' : 'text-gray-500'
        }`}
        title={`Sort by ${label} ${isActive ? (isAscending ? '(ascending)' : '(descending)') : ''}`}
      >
        {label}
        <ArrowUpDown 
          className={`h-4 w-4 transition-colors ${
            isActive 
              ? 'text-emerald-600' 
              : 'text-gray-400 hover:text-gray-600'
          }`} 
        />
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton('date', 'Date')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton('restaurant', 'Location')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton('invoice', 'Invoice Number')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton('price', 'Unit Price')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton('quantity', 'Quantity')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton('total', 'Total')}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction, index) => {
            const isAboveNegotiatedPrice = priceAgreement && 
              transaction.unitType === priceAgreement.unitType && 
              transaction.unitPrice > priceAgreement.price;
            
            return (
              <tr 
                key={`${transaction.invoiceNumber}-${transaction.invoiceDate.getTime()}-${index}`}
                className={`hover:bg-gray-50 ${isAboveNegotiatedPrice ? 'bg-amber-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {transaction.invoiceDate.toLocaleDateString('da-DK')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{transaction.location}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{transaction.invoiceNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{transaction.unitType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(transaction.unitPrice)}
                    {transaction.hasDiscount && transaction.unitPriceOriginal && (
                      <div className="text-xs text-gray-500 line-through">
                        {formatCurrency(transaction.unitPriceOriginal)}
                      </div>
                    )}
                    {isAboveNegotiatedPrice && priceAgreement && (
                      <div className="text-xs text-amber-600">
                        {formatCurrency(transaction.unitPrice - priceAgreement.price)} above negotiated price
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {transaction.quantity} {transaction.unitType}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(transaction.total)}
                    {transaction.hasDiscount && transaction.totalOriginal && (
                      <div className="text-xs text-gray-500 line-through">
                        {formatCurrency(transaction.totalOriginal)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDocument(transaction.invoiceNumber);
                    }}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};

