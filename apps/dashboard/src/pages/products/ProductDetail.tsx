import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, AlertTriangle } from 'lucide-react';
import { useNavigationState } from '@/hooks/ui';
import { useProductDetail } from '@/hooks/management';
import { usePagination } from '@/hooks/ui';
import { useAgreementViolations } from '@/hooks/management/useAgreementViolations';
import { ProductOverview } from '@/components/features/products/productDetail/ProductOverview';
import { PriceHistoryChart } from '@/components/features/products/productDetail/PriceHistoryChart';
import { TransactionHistory } from '@/components/features/products/productDetail/TransactionHistory';
import { AgreementViolationAlert } from '@/components/features/products/productDetail/AgreementViolationAlert';

type SortField = 'date' | 'restaurant' | 'invoice' | 'price' | 'quantity' | 'total';
type SortDirection = 'asc' | 'desc';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack } = useNavigationState();
  const decodedId = decodeURIComponent(id || '');
  const [productCode, supplierId] = decodedId.split('|');
  
  // Handle case where supplierId is "null" (string) or empty
  const actualSupplierId = supplierId && supplierId !== 'null' ? supplierId : null;
  
  
  const { data: productDetail, isLoading, error } = useProductDetail(productCode, actualSupplierId);

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');

  // Agreement violations detection
  const {
    violationData,
    isAlertOpen,
    shouldShowAlert,
    openAlert,
    closeAlert,
  } = useAgreementViolations({
    transactions: productDetail?.transactions || [],
    priceAgreement: productDetail?.priceAgreement,
  });

  const handleBack = () => {
    goBack('/products');
  };

  const handleViewDocument = (invoiceNumber: string) => {
    navigate(`/documents/${invoiceNumber}`, {
      state: { from: `/products/${encodeURIComponent(id || '')}` }
    });
  };

  const handleViewEfficiencyAnalysis = () => {
    if (productDetail && productDetail.locationIds.length > 0) {
      if (productDetail.locationIds.length === 1) {
        // If only one location, go directly to efficiency analysis
        const locationId = productDetail.locationIds[0];
        navigate(`/product-efficiency/${encodeURIComponent(productCode)}/${encodeURIComponent(locationId)}`, {
          state: { from: `/products/${encodeURIComponent(id || '')}` }
        });
      } else {
        // If multiple locations, go to the first one
        // For now, let's go to the first location, but we could enhance this later
        const firstLocationId = productDetail.locationIds[0];
        navigate(`/product-efficiency/${encodeURIComponent(productCode)}/${encodeURIComponent(firstLocationId)}`, {
          state: { from: `/products/${encodeURIComponent(id || '')}` }
        });
      }
    }
  };

  React.useEffect(() => {
    if (productDetail && !selectedUnitType && productDetail.unitTypes.length > 0) {
      setSelectedUnitType(productDetail.unitTypes[0].type);
    }
  }, [productDetail, selectedUnitType]);

  // Auto-show alert when violations are detected
  useEffect(() => {
    if (shouldShowAlert) {
      openAlert();
    }
  }, [shouldShowAlert, openAlert]);

  // Debug effect to track sort state changes
  React.useEffect(() => {
    console.log('Sort state changed:', { sortField, sortDirection });
  }, [sortField, sortDirection]);

  const filteredTransactions = React.useMemo(() => {
    if (!productDetail) return [];
    
    let filtered = productDetail.transactions;
    
    if (selectedLocation) {
      filtered = filtered.filter(transaction => transaction.location === selectedLocation);
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = a.invoiceDate.getTime() - b.invoiceDate.getTime();
          break;
        case 'restaurant':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'invoice':
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
        case 'price':
          comparison = a.unitPrice - b.unitPrice;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
      }
      
      const result = sortDirection === 'asc' ? comparison : -comparison;
      console.log(`Sorting ${sortField} ${sortDirection}:`, {
        a: sortField === 'date' ? a.invoiceDate : sortField === 'restaurant' ? a.location : sortField === 'invoice' ? a.invoiceNumber : sortField === 'price' ? a.unitPrice : sortField === 'quantity' ? a.quantity : a.total,
        b: sortField === 'date' ? b.invoiceDate : sortField === 'restaurant' ? b.location : sortField === 'invoice' ? b.invoiceNumber : sortField === 'price' ? b.unitPrice : sortField === 'quantity' ? b.quantity : b.total,
        comparison,
        result
      });
      
      return result;
    });
    
    console.log('Filtered transactions updated:', {
      sortField,
      sortDirection,
      count: filtered.length,
      firstFew: filtered.slice(0, 3).map(t => ({
        date: t.invoiceDate,
        location: t.location,
        invoice: t.invoiceNumber,
        price: t.unitPrice,
        quantity: t.quantity,
        total: t.total
      }))
    });
    
    return filtered;
  }, [productDetail, selectedLocation, sortField, sortDirection]);

  const {
    currentPage,
    paginatedItems: paginatedTransactions,
    pageSize,
    goToPage,
    changePageSize,
    totalItems,
  } = usePagination(filteredTransactions);

  const handleSort = (field: SortField) => {
    console.log('Sorting by field:', field, 'Current field:', sortField, 'Current direction:', sortDirection);
    
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('Toggling direction to:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('Setting new field:', field, 'with direction: desc');
      setSortField(field);
      setSortDirection('desc');
    }
    
    // Force immediate re-render by updating state
    console.log('Sort state updated - should trigger re-render');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Loading product details...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Product</h2>
          <p className="mt-2 text-red-600">{error.message}</p>
          <button
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!productDetail) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
          <p className="mt-2 text-gray-500">The product you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {productDetail.description}
                {productDetail.productCode !== 'No Product Code' && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({productDetail.productCode})
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Product analysis and price history · {productDetail.unitTypes.map(ut => ut.type).join(', ')} · {productDetail.supplier}
              </p>
            </div>
          </div>
          
          {/* Efficiency Analysis Button */}
          {productDetail.locationIds.length > 0 && (
            <button
              onClick={handleViewEfficiencyAnalysis}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              title={productDetail.locationIds.length > 1 ? `View efficiency analysis for ${productDetail.locations[0]} (${productDetail.locationIds.length} locations available)` : 'View efficiency analysis'}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Efficiency Analysis
            </button>
          )}
        </div>
      </div>

      <ProductOverview 
        productDetail={productDetail}
        hasViolations={violationData.hasViolations}
        onShowViolations={openAlert}
      />

      <PriceHistoryChart
        selectedUnitType={selectedUnitType}
        selectedLocation={selectedLocation}
        unitTypes={productDetail.unitTypes}
        locations={productDetail.locations}
        priceAgreement={productDetail.priceAgreement}
        onUnitTypeChange={setSelectedUnitType}
        onLocationChange={setSelectedLocation}
      />

      <TransactionHistory
        transactions={paginatedTransactions}
        priceAgreement={productDetail.priceAgreement}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
        onSort={handleSort}
        onViewDocument={handleViewDocument}
      />

      {/* Agreement Violation Alert */}
      <AgreementViolationAlert
        isOpen={isAlertOpen}
        onClose={closeAlert}
        violations={violationData.violations}
        agreementPrice={productDetail.priceAgreement?.price || 0}
        unitType={productDetail.priceAgreement?.unitType || ''}
        productDescription={productDetail.description}
        supplier={productDetail.supplier}
        totalOverspend={violationData.totalOverspend}
        onViewDocument={handleViewDocument}
      />
    </div>
  );
};

