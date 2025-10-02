import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationState } from '@/hooks/ui';
import { PriceAlertsHeader, PriceAlertsList } from '@/components/features/alerts/priceAlerts';
import { usePriceAlertsState } from '@/hooks/management';

export const PriceAlerts: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateWithState } = useNavigationState();
  
  const {
    // State
    resolvingAlert,
    setResolvingAlert,
    activeTab,
    setActiveTab,
    
    // Data
    isLoading,
    error,
    totalSavings,
    
    // Computed
    activeAlerts,
    
    // Actions
    handleResolveAlert,
    handleUnresolveAlert,
    toggleAlert,
    toggleChart,
    
    // Helpers
    isAlertExpanded,
    isChartShown,
    isResolved,
    getAlertResolution,
  } = usePriceAlertsState();

  const handleViewDocument = (invoiceNumber: string) => {
    navigate(`/documents/${invoiceNumber}`, {
      state: { from: location.pathname }
    });
  };

  const handleViewProduct = (productId: string) => {
    navigateWithState(`/products/${encodeURIComponent(productId)}`, {
      from: location.pathname
    });
  };

  // Transform the resolution to match expected type
  const getAlertResolutionTyped = (alertId: string) => {
    const resolution = getAlertResolution(alertId);
    if (!resolution) return undefined;
    return {
      reason: resolution.reason,
      note: resolution.note || '',
      resolvedAt: resolution.resolvedAt,
    };
  };

  return (
    <div className="p-8">
      <PriceAlertsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <PriceAlertsList
        activeTab={activeTab}
        activeAlerts={activeAlerts}
        isLoading={isLoading}
        error={error}
        totalSavings={activeTab === 'price-variations' ? totalSavings.variations : totalSavings.agreements}
        isAlertExpanded={isAlertExpanded}
        isChartShown={isChartShown}
        isResolved={isResolved}
        getAlertResolution={getAlertResolutionTyped}
        onToggleAlert={toggleAlert}
        onToggleChart={toggleChart}
        onResolveAlert={handleResolveAlert}
        onUnresolveAlert={handleUnresolveAlert}
        onViewDocument={handleViewDocument}
        onViewProduct={handleViewProduct}
        resolvingAlert={resolvingAlert}
        setResolvingAlert={setResolvingAlert}
      />
    </div>
  );
};

