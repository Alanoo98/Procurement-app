import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/utils/format';
import { FileText, ArrowUpDown, Search, Handshake, FolderPlus, Download } from 'lucide-react';
import { Pagination } from '@/components/shared/ui/Pagination';
import { usePagination } from '@/hooks/ui';
import { useNavigationState } from '@/hooks/ui';
import { useFilterStore } from '@/store/filterStore';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { useTableColumns } from '@/hooks/ui';
import { useProductMetrics } from '@/hooks/metrics';
import { ErrorState, TableEmptyState, TableLoadingState } from '@/components/shared/ui/EmptyStates';
import { ProductExportModal } from '@/components/features/products/ProductExportModal';

type SortField = 'name' | 'category' | 'spend' | 'quantity' | 'latestPrice' | 'supplier';
type SortDirection = 'asc' | 'desc';

export const Products: React.FC = () => {
  const { getNavigationState, navigateWithState } = useNavigationState();
  const { filters } = getNavigationState();
  const filterStore = useFilterStore();
  const { data: productMetrics, isLoading, error } = useProductMetrics();
  const [localData, setLocalData] = useState<typeof productMetrics>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Update local data when data changes
  useEffect(() => {
    setLocalData(productMetrics || []);
  }, [productMetrics]);

  const [searchTerm, setSearchTerm] = useState(getNavigationState().searchTerm || '');
  const [sortField, setSortField] = useState<SortField>((getNavigationState().sortField as SortField) || 'spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>((getNavigationState().sortDirection as SortDirection) || 'desc');

  const { columns, handleColumnResize } = useTableColumns([
    { id: 'product', width: 400 },
    { id: 'category', width: 150 },
    { id: 'supplier', width: 180 },
    { id: 'spend', width: 150 },
    { id: 'quantity', width: 200 },
    { id: 'latestPrice', width: 150 },
  ]);

  React.useEffect(() => {
    if (filters) {
      if (filters.dateRange !== undefined) filterStore.setDateRange(filters.dateRange);
      if (filters.restaurants !== undefined) filterStore.setRestaurants(filters.restaurants || []);
      if (filters.suppliers !== undefined) filterStore.setSuppliers(filters.suppliers || []);
      if (filters.categories !== undefined) filterStore.setCategories(filters.categories);
      if (filters.documentType !== undefined) filterStore.setDocumentType(filters.documentType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filteredAndSortedProducts = React.useMemo(() => {
    if (!localData) return [];
    
    let filtered = [...localData];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.description?.toLowerCase() || '').includes(searchLower) ||
        (product.productCode?.toLowerCase() || '').includes(searchLower) ||
        (product.supplier?.toLowerCase() || '').includes(searchLower)
      );
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
        case 'category':
          comparison = (a.categoryName || '').localeCompare(b.categoryName || '');
          break;
        case 'supplier':
          comparison = (a.supplier || '').localeCompare(b.supplier || '');
          break;
        case 'spend':
          comparison = b.totalSpend - a.totalSpend;
          break;
        case 'quantity':
          comparison = b.totalQuantity - a.totalQuantity;
          break;
        case 'latestPrice': {
          const aLatestPrice = Math.max(...a.unitTypes.map((ut: { latestPrice: number }) => ut.latestPrice));
          const bLatestPrice = Math.max(...b.unitTypes.map((ut: { latestPrice: number }) => ut.latestPrice));
          comparison = bLatestPrice - aLatestPrice;
          break;
        }
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [localData, searchTerm, sortField, sortDirection]);

  const { currentPage, paginatedItems, goToPage, totalItems, pageSize, changePageSize } = usePagination(filteredAndSortedProducts, 20);

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    // Update URL state if needed - for now just update local state
  };


  const handleProductClick = (productId: string) => {
    // Navigate to product detail page with the product ID
    // The product ID format is "product_code|supplier_id"
    navigateWithState(`/products/${encodeURIComponent(productId)}`, {
      sortField,
      sortDirection,
      searchTerm,
      filters: {
        dateRange: filterStore.dateRange,
        restaurants: filterStore.restaurants,
        suppliers: filterStore.suppliers,
        categories: filterStore.categories,
        documentType: filterStore.documentType,
      },
      page: currentPage,
    });
  };

  const renderSortButton = (field: SortField, label: string) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-700"
    >
      {label}
      <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-emerald-600' : ''}`} />
    </button>
  );

  if (error) {
    return (
      <div className="p-8">
        <ErrorState 
          title="Error Loading Products"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and analyze product procurement data from your database
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Products
            </button>
            <button
              onClick={() => navigateWithState('/product-categories', {
                sortField,
                sortDirection,
                searchTerm,
                filters: {
                  dateRange: filterStore.dateRange,
                  restaurants: filterStore.restaurants,
                  suppliers: filterStore.suppliers,
                  categories: filterStore.categories,
                  documentType: filterStore.documentType,
                },
                page: currentPage,
              })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Product Categories
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                {renderSortButton('name', 'Product')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {renderSortButton('category', 'Category')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {renderSortButton('supplier', 'Supplier')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {renderSortButton('spend', 'Total Spend')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {renderSortButton('quantity', 'Quantity')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {renderSortButton('latestPrice', 'Latest Price')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <TableLoadingState message="Loading products..." colSpan={6} />
            ) : paginatedItems.length === 0 ? (
              <TableEmptyState 
                context="products"
                suggestion={searchTerm ? "Try adjusting your search terms to find more products." : "Start by importing some product data to see your procurement insights."}
                action={searchTerm ? {
                  label: "Clear search",
                  onClick: () => setSearchTerm('')
                } : undefined}
                colSpan={6}
              />
            ) : (
              paginatedItems.map((product) => {
                return (
                  <tr 
                    key={product.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleProductClick(product.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {product.hasAgreement ? (
                            <Handshake className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {product.description || 'Unnamed Product'}
                                {product.productCode && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({product.productCode})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.locationCount} locations · {product.unitTypes.map((ut: { type: string }) => ut.type).join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.categoryName ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.categoryName}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">No category</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.supplier || 'Unknown Supplier'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(product.totalSpend)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.unitTypes.map((ut: { type: string; quantity: number }) => (
                          <div key={ut.type}>
                            {ut.quantity.toLocaleString('da-DK')}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.unitTypes.map((ut: { type: string; latestPrice: number }) => (
                          <div key={ut.type}>
                            {formatCurrency(ut.latestPrice)}/{ut.type}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </ResizableTable>

        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </div>

      {/* Export Modal */}
      <ProductExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        productKeys={filteredAndSortedProducts.map(p => p.id)}
        searchTerm={searchTerm}
      />
    </div>
  );
};


