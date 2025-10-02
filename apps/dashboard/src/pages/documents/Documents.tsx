import React, { useState, useMemo, useEffect } from 'react';
import { FileText, ArrowUpDown, Search, Package } from 'lucide-react';
import { useDocuments } from '@/hooks/data/useDocuments';
import { formatCurrency } from '@/utils/format';
import { Pagination } from '@/components/shared/ui/Pagination';
import { usePagination } from '@/hooks/ui/usePagination';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { useTableColumns } from '@/hooks/ui/useTableColumns';
import { TableEmptyState, TableLoadingState, TableErrorState } from '@/components/shared/ui/EmptyStates';
import { useNavigationState } from '@/hooks/ui/useNavigationState';

export const Documents: React.FC = () => {
  const { data, isLoading, error } = useDocuments();
  const { getNavigationState, navigateWithState } = useNavigationState();
  // Global filters are now applied in the useDocuments hook

  const navigationState = getNavigationState();
  const [searchTerm, setSearchTerm] = useState(navigationState.searchTerm || '');
  const [sortField, setSortField] = useState<'document' | 'date' | 'amount' | 'supplier' | 'location'>(
    (navigationState.sortField as 'document' | 'date' | 'amount' | 'supplier' | 'location') || 'date'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (navigationState.sortDirection as 'asc' | 'desc') || 'desc'
  );
  const [currentPageFromState, setCurrentPageFromState] = useState(navigationState.page || 1);

  const { columns, handleColumnResize } = useTableColumns([
    { id: 'document', width: 250 },
    { id: 'date', width: 200 },
    { id: 'supplier', width: 250 },
    { id: 'location', width: 250 },
    { id: 'amount', width: 200 },
  ]);

  const handleViewDocument = (invoiceNumber: string) => {
    navigateWithState(`/documents/${invoiceNumber}`, {
      searchTerm,
      sortField,
      sortDirection,
      page: currentPageFromState,
    });
  };

  const filteredDocuments = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.invoice_number?.toLowerCase().includes(term) ||
          doc.suppliers?.name?.toLowerCase().includes(term) ||
          doc.locations?.name?.toLowerCase().includes(term) ||
          doc.product_codes?.some(code => code?.toLowerCase().includes(term)) ||
          doc.product_descriptions?.some(desc => desc?.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const get = (field: typeof sortField) => {
        switch (field) {
          case 'date':
            return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime();
          case 'amount':
            return (a.total_effective_price || 0) - (b.total_effective_price || 0);
          case 'document':
            return (a.invoice_number || '').localeCompare(b.invoice_number || '');
          case 'supplier':
            return (a.suppliers?.name || '').localeCompare(b.suppliers?.name || '');
          case 'location':
            return (a.locations?.name || '').localeCompare(b.locations?.name || '');
          default:
            return 0;
        }
      };

      const result = get(sortField);
      return sortDirection === 'asc' ? result : -result;
    });

    return filtered;
  }, [data, searchTerm, sortField, sortDirection]);

  const {
    currentPage,
    paginatedItems: paginatedDocuments,
    pageSize,
    goToPage,
    changePageSize,
    totalItems,
  } = usePagination(filteredDocuments, 10, currentPageFromState);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPageFromState(page);
    goToPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    changePageSize(newPageSize);
    setCurrentPageFromState(1); // Reset to first page when changing page size
  };

  // Update page state when currentPage changes from pagination
  useEffect(() => {
    setCurrentPageFromState(currentPage);
  }, [currentPage]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage all procurement documents
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents, suppliers, locations, product codes, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-96 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <ResizableTable
          columns={columns}
          onColumnResize={handleColumnResize}
          className="min-w-full divide-y divide-gray-200"
        >
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button className="flex items-center gap-1" onClick={() => handleSort('document')}>
                  Document
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button className="flex items-center gap-1" onClick={() => handleSort('date')}>
                  Document Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button className="flex items-center gap-1" onClick={() => handleSort('supplier')}>
                  Supplier
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button className="flex items-center gap-1" onClick={() => handleSort('location')}>
                  Location
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button className="flex items-center gap-1" onClick={() => handleSort('amount')}>
                  Amount
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <TableLoadingState message="Loading documents..." colSpan={5} />
            ) : error ? (
              <TableErrorState message={error.message} colSpan={5} />
            ) : paginatedDocuments.length === 0 ? (
              <TableEmptyState 
                context="documents"
                suggestion={searchTerm ? "Try adjusting your search terms to find more documents." : "Import invoice documents to start analyzing your procurement data."}
                action={searchTerm ? {
                  label: "Clear search",
                  onClick: () => setSearchTerm('')
                } : undefined}
                colSpan={5}
              />
            ) : (
              paginatedDocuments.map((doc) => (
              <tr 
                key={doc.invoice_number} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleViewDocument(doc.invoice_number)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {doc.invoice_number}
                        </span>
                        {doc.product_codes && doc.product_codes.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <Package className="h-3 w-3" />
                            <span>{doc.product_codes.length} product{doc.product_codes.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{doc.document_type}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{formatDate(doc.invoice_date)}</span>
                    <span className="text-xs text-gray-400">Due: {formatDate(doc.due_date || '')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{doc.suppliers?.name}</span>
                    <span className="text-xs text-gray-400">{doc.suppliers?.address || <span className="italic text-gray-300">No address</span>}</span>
                  </div>
                </td>
                <td className="px-6 py-4 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{doc.locations?.name}</span>
                    <span className="text-xs text-gray-400">{doc.locations?.address || <span className="italic text-gray-300">No address</span>}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      // Prefer extracted total_amount from OCR data for accuracy
                      const amount = doc.total_amount || doc.total_effective_price;
                      console.log('Documents table - Displaying amount for', doc.invoice_number, ':', {
                        total_amount: doc.total_amount,
                        total_effective_price: doc.total_effective_price,
                        final_amount: amount,
                        total_tax: doc.total_tax
                      });
                      return formatCurrency(amount);
                    })()}
                    {doc.total_discount_saved > 0 && (
                      <div className="text-xs text-green-600">
                        Saved: {formatCurrency(doc.total_discount_saved)}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </ResizableTable>

        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
};

