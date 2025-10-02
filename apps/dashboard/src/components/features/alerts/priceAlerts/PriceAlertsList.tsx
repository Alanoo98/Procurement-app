import React from 'react';
import { formatCurrency } from '@/utils/format';
import { Pagination } from '@/components/shared/ui/Pagination';
import { usePagination } from '@/hooks/ui/usePagination';
import { ResolveAlertDialog } from '../ResolveAlertDialog';
import { PriceVariationCard } from './PriceVariationCard';
import { AgreementViolationCard } from './AgreementViolationCard';

interface PriceVariation {
  id: string;
  productCode: string;
  description: string;
  supplier: string;
  unitType: string;
  variations: Array<{
    date: Date;
    unitType: string;
    restaurants: Array<{
      name: string;
      price: number;
      quantity: number;
      invoiceNumber: string;
      isBase: boolean;
      overpaidAmount: number;
    }>;
    priceDifference: number;
    basePrice: number;
    maxPrice: number;
    overpaidAmount: number;
  }>;
  totalOverpaid: number;
  chartData?: Array<{
    date: Date;
    unitType: string;
    basePrice: number;
    variationPrice: number | null;
    priceDifference: number;
    hasVariation: boolean;
  }>;
}

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

interface PriceAlertsListProps {
  activeTab: 'price-variations' | 'agreement-violations';
  activeAlerts: (PriceVariation | AgreementViolation)[];
  isLoading: boolean;
  error: Error | null;
  totalSavings: number;
  isAlertExpanded: (alertId: string) => boolean;
  isChartShown: (alertId: string) => boolean;
  isResolved: (alertId: string) => boolean;
  getAlertResolution: (alertId: string) => {
    reason: string;
    note: string;
    resolvedAt: Date;
  } | undefined;
  onToggleAlert: (alertId: string) => void;
  onToggleChart: (alertId: string) => void;
  onResolveAlert: (alertId: string, reason: string, note: string) => void;
  onUnresolveAlert: (alertId: string) => void;
  onViewDocument: (invoiceNumber: string) => void;
  onViewProduct: (productId: string) => void;
  resolvingAlert: string | null;
  setResolvingAlert: (alertId: string | null) => void;
}

export const PriceAlertsList: React.FC<PriceAlertsListProps> = ({
  activeTab,
  activeAlerts,
  isLoading,
  error,
  totalSavings,
  isAlertExpanded,
  isChartShown,
  isResolved,
  getAlertResolution,
  onToggleAlert,
  onToggleChart,
  onResolveAlert,
  onUnresolveAlert,
  onViewDocument,
  onViewProduct,
  resolvingAlert,
  setResolvingAlert,
}) => {
  const {
    currentPage,
    paginatedItems: paginatedAlerts,
    pageSize,
    goToPage,
    totalItems,
    changePageSize,
  } = usePagination(activeAlerts, 10);

  const handleViewDocument = (invoiceNumber: string) => {
    onViewDocument(invoiceNumber);
  };

  const handleViewProduct = (productId: string) => {
    onViewProduct(productId);
  };

  if (error) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Error Loading Price Alerts</h2>
        <p className="mt-2 text-red-600">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
        <p className="ml-4 text-gray-600">Loading price alerts...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Stats */}
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-red-50 border border-amber-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab === 'price-variations' ? 'Price Variations' : 'Agreement Violations'}
            </h3>
            <p className="text-sm text-gray-600">
              {activeAlerts.length} active alerts
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSavings)}
            </p>
            <p className="text-sm text-gray-600">Total potential savings</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {paginatedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-500">
              {activeTab === 'price-variations' 
                ? 'No price variations detected in the selected period.'
                : 'No agreement violations found in the selected period.'
              }
            </p>
          </div>
        ) : (
          paginatedAlerts.map((alert) => {
            const alertId = 'id' in alert ? alert.id : `${alert.productCode}|${alert.supplier}|${alert.unitType}`;
            const isExpanded = isAlertExpanded(alertId);
            const showChart = isChartShown(alertId);
            const resolved = isResolved(alertId);
            const resolution = getAlertResolution(alertId);

            if (activeTab === 'price-variations' && 'variations' in alert) {
              return (
                <PriceVariationCard
                  key={alertId}
                  variation={alert as PriceVariation}
                  isExpanded={isExpanded}
                  showChart={showChart}
                  onToggleExpanded={() => onToggleAlert(alertId)}
                  onToggleChart={() => onToggleChart(alertId)}
                  onViewDocument={handleViewDocument}
                  onViewProduct={handleViewProduct}
                  onResolve={onResolveAlert}
                  onUnresolve={onUnresolveAlert}
                  isResolved={resolved}
                  resolution={resolution}
                />
              );
            } else if (activeTab === 'agreement-violations' && 'violations' in alert) {
              return (
                <AgreementViolationCard
                  key={alertId}
                  violation={alert as AgreementViolation}
                  isExpanded={isExpanded}
                showChart={showChart}
                onToggleChart={() => onToggleChart(alertId)}
                  onToggleExpanded={() => onToggleAlert(alertId)}
                  onViewDocument={handleViewDocument}
                  onViewProduct={handleViewProduct}
                  isResolved={resolved}
                  resolution={resolution}
                />
              );
            }
            return null;
          })
        )}
      </div>

      {/* Pagination */}
      {activeAlerts.length > 0 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        </div>
      )}

      {/* Resolve Dialog */}
      {resolvingAlert && (
        <ResolveAlertDialog
          onClose={() => setResolvingAlert(null)}
          onResolve={(reason, note) => {
            onResolveAlert(resolvingAlert, reason, note);
          }}
        />
      )}
    </div>
  );
}; 

