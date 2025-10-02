import { useState } from 'react';
import { useAlertStore } from '@/store/alertStore';
import { usePriceAlerts } from './usePriceAlerts';
import { toast } from 'sonner';

type AlertType = 'price-variations' | 'agreement-violations';

export const usePriceAlertsState = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AlertType>('price-variations');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set());
  const [showCharts, setShowCharts] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(false);

  const { resolveAlert, unresolveAlert, isResolved, getResolution } = useAlertStore();
  const { 
    priceVariations, 
    agreementViolations, 
    totalSavings, 
    isLoading, 
    error,
    resolveAlert: resolveDbAlert
  } = usePriceAlerts();

  // Get active alerts based on selected tab
  const getActiveAlerts = () => {
    const baseAlerts = activeTab === 'price-variations' 
      ? priceVariations.filter(alert => !isResolved(`${alert.id}|variation`))
      : agreementViolations.filter(alert => !isResolved(`${alert.productCode}|${alert.supplier}|${alert.unitType}|agreement`));

    if (showResolved) {
      const resolvedAlerts = activeTab === 'price-variations'
        ? priceVariations.filter(alert => isResolved(`${alert.id}|variation`))
        : agreementViolations.filter(alert => isResolved(`${alert.productCode}|${alert.supplier}|${alert.unitType}|agreement`));
      
      return [...baseAlerts, ...resolvedAlerts];
    }

    return baseAlerts;
  };

  const handleResolveAlert = async (alertId: string, reason: string, note: string) => {
    try {
      // First, resolve in the database
      await resolveDbAlert(alertId, reason, note);
      
      // Then, update local state
      resolveAlert({
        id: `${alertId}|${activeTab === 'price-variations' ? 'variation' : 'agreement'}`,
        resolvedAt: new Date(),
        reason,
        note,
      });
      
      setResolvingAlert(null);
      toast.success('Price alert resolved');

      // Close expanded state for resolved alert
      const newExpanded = new Set(expandedAlerts);
      newExpanded.delete(alertId);
      setExpandedAlerts(newExpanded);

      const newShowCharts = new Set(showCharts);
      newShowCharts.delete(alertId);
      setShowCharts(newShowCharts);

      const newExpandedVariations = new Set(expandedVariations);
      expandedVariations.forEach(id => {
        if (id.startsWith(alertId)) {
          newExpandedVariations.delete(id);
        }
      });
      setExpandedVariations(newExpandedVariations);
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const handleUnresolveAlert = (alertId: string) => {
    unresolveAlert(`${alertId}|${activeTab === 'price-variations' ? 'variation' : 'agreement'}`);
    toast.success('Price alert restored');
  };

  const toggleAlert = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
      const newShowCharts = new Set(showCharts);
      newShowCharts.delete(alertId);
      setShowCharts(newShowCharts);
      
      const newExpandedVariations = new Set(expandedVariations);
      expandedVariations.forEach(id => {
        if (id.startsWith(alertId)) {
          newExpandedVariations.delete(id);
        }
      });
      setExpandedVariations(newExpandedVariations);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const toggleChart = (alertId: string) => {
    const newShowCharts = new Set(showCharts);
    if (newShowCharts.has(alertId)) {
      newShowCharts.delete(alertId);
    } else {
      newShowCharts.add(alertId);
    }
    setShowCharts(newShowCharts);
  };

  const toggleVariation = (variationId: string) => {
    const newExpanded = new Set(expandedVariations);
    if (newExpanded.has(variationId)) {
      newExpanded.delete(variationId);
    } else {
      newExpanded.add(variationId);
    }
    setExpandedVariations(newExpanded);
  };

  const isAlertExpanded = (alertId: string) => expandedAlerts.has(alertId);
  const isChartShown = (alertId: string) => showCharts.has(alertId);
  const isVariationExpanded = (variationId: string) => expandedVariations.has(variationId);

  const getAlertResolution = (alertId: string) => {
    const resolutionId = `${alertId}|${activeTab === 'price-variations' ? 'variation' : 'agreement'}`;
    return getResolution(resolutionId);
  };

  return {
    // State
    isDetecting,
    setIsDetecting,
    resolvingAlert,
    setResolvingAlert,
    activeTab,
    setActiveTab,
    showResolved,
    setShowResolved,
    
    // Data
    priceVariations,
    agreementViolations,
    totalSavings,
    isLoading,
    error,
    
    // Computed
    activeAlerts: getActiveAlerts(),
    
    // Actions
    handleResolveAlert,
    handleUnresolveAlert,
    toggleAlert,
    toggleChart,
    toggleVariation,
    
    // Helpers
    isAlertExpanded,
    isChartShown,
    isVariationExpanded,
    getAlertResolution,
    isResolved,
  };
}; 
