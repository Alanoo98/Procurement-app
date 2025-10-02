import React, { useState, useEffect } from 'react';
import { Settings, AlertTriangle, BarChart3, Target, DollarSign, PiggyBank, Users, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '@/store/dashboardStore';
import { useDashboardData } from '@/hooks/metrics';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLocationComparisons } from '@/hooks/metrics/useRestaurantComparisons';
import { DashboardSettings } from '@/components/features/dashboard/DashboardSettings';
import { InefficientProductsCard } from '@/components/features/dashboard/InefficientProductsCard';
import { PriceAlertsCard } from '@/components/features/dashboard/PriceAlertsCard';
// import { ProductConsolidationCard } from '@/components/features/dashboard/SupplierConsolidationCard';
import { ProductTargetsCard } from '@/components/features/dashboard/ProductTargetsCard';
import { MetricsCard } from '@/components/features/dashboard/MetricsCard';
import { InfoTooltip } from '@/components/shared/ui/InfoTooltip';
import { formatCurrency } from '@/utils/format';
import { LoadingState, ErrorState, WelcomeState } from '@/components/shared/ui/EmptyStates';



export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading, error } = useDashboardData();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { comparisonGroups } = useLocationComparisons();
  const {
    showPriceAlerts,
    showInefficientProducts,
    // showSupplierConsolidation,
    showProductTargets,
  } = useDashboardStore();

  const [showSettings, setShowSettings] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Load collapsed sections from localStorage on component mount
  useEffect(() => {
    const savedCollapsedSections = localStorage.getItem('dashboard-collapsed-sections');
    if (savedCollapsedSections) {
      try {
        const parsed = JSON.parse(savedCollapsedSections);
        setCollapsedSections(new Set(parsed));
      } catch (error) {
        console.error('Error parsing saved collapsed sections:', error);
        // Default to all sections collapsed if parsing fails
        setCollapsedSections(new Set(['price-alerts', 'inefficient-products', 'product-targets', 'product-consolidation']));
      }
    } else {
      // Default to all sections collapsed for new users
      setCollapsedSections(new Set(['price-alerts', 'inefficient-products', 'product-targets', 'product-consolidation']));
    }
  }, []);

  // Save collapsed sections to localStorage whenever they change
  useEffect(() => {
    if (collapsedSections.size > 0) {
      localStorage.setItem('dashboard-collapsed-sections', JSON.stringify([...collapsedSections]));
    }
  }, [collapsedSections]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };



  const handleViewProduct = (productCode: string, locationId?: string) => {
    // Navigate to efficiency charts for time-based analysis
    const encodedProductCode = encodeURIComponent(productCode);
    const encodedLocationId = locationId ? encodeURIComponent(locationId) : '';
    navigate(`/product-efficiency/${encodedProductCode}${encodedLocationId ? `/${encodedLocationId}` : ''}`, {
      state: { from: '/' }
    });
  };

  // Show loading state when either organization context or dashboard data is loading
  if (isLoading || orgLoading || !currentOrganization) {
    return (
      <div className="p-8">
        <LoadingState 
          message={!currentOrganization 
            ? "Loading organization data..."
            : "Loading dashboard data..."}
          size="lg"
        />
      </div>
    );
  }

  if (error) {
    // Check if it's a UUID error and provide a more helpful message
    const isUuidError = error.message.includes('invalid input syntax for type uuid');
    const errorMessage = isUuidError 
      ? "There was an issue with the data configuration. This usually happens when there's no data or the business unit settings need to be updated."
      : error.message;
    
    return (
      <div className="p-8">
        <ErrorState 
          title="Error Loading Dashboard"
          message={errorMessage}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Procurement Dashboard
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Track performance, identify opportunities, and optimize your procurement strategy
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm"
              >
                <Settings className="h-4 w-4" />
                Customize
              </button>
            </div>
          </div>
        </div>

        {/* Top Level Metrics */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricsCard
              title="Total Spend"
              value={dashboardData.totalSpend}
              icon={DollarSign}
              color="blue"
              description="Total procurement spending"
            />
            <MetricsCard
              title="Total Savings"
              value={dashboardData.totalSavings}
              icon={PiggyBank}
              color="green"
              description="Savings from discounts"
            />
            <div onClick={() => navigate('/suppliers')}>
              <MetricsCard
                title="Unique Suppliers"
                value={dashboardData.uniqueSuppliers}
                icon={Users}
                color="blue"
                format="number"
                description="Active suppliers"
                clickable={true}
              />
            </div>
            <div onClick={() => navigate('/documents')}>
              <MetricsCard
                title="Total Invoices"
                value={dashboardData.totalInvoices}
                icon={FileText}
                color="blue"
                format="number"
                description="Processed invoices"
                clickable={true}
              />
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="space-y-8">
        {/* Price Alerts Section */}
        {showPriceAlerts && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="px-6 py-4 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleSection('price-alerts')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Price Alerts</h2>
                    <InfoTooltip content="Monitor price variations across suppliers and locations. Get alerted when prices deviate significantly from expected ranges, helping you identify cost-saving opportunities and negotiate better deals with suppliers." />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/price-alerts');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    View All Alerts
                    <span className="text-yellow-600">→</span>
                  </button>
                  {collapsedSections.has('price-alerts') ? (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
            {!collapsedSections.has('price-alerts') && (
              <div className="p-6">
                <PriceAlertsCard maxAlerts={3} />
              </div>
            )}
          </div>
        )}

        {/* Inefficient Products Section */}
        {showInefficientProducts && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="px-6 py-4 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleSection('inefficient-products')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Inefficient Products</h2>
                    <InfoTooltip content="Identify products with significant price variations across different locations or suppliers. This helps you standardize pricing, negotiate better contracts, and reduce procurement costs by addressing price inefficiencies." />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {comparisonGroups.length === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSettings(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Configure Groups
                      <span className="text-slate-600">→</span>
                    </button>
                  )}
                  {collapsedSections.has('inefficient-products') ? (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
            {!collapsedSections.has('inefficient-products') && (
              <div className="p-6">
                <InefficientProductsCard onViewProduct={handleViewProduct} />
              </div>
            )}
          </div>
        )}

        {/* Product Targets Section */}
        {showProductTargets && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="px-6 py-4 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleSection('product-targets')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Target className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Product Targets</h2>
                    <InfoTooltip content="Set and track specific procurement goals for products, including target prices, supplier agreements, and cost reduction objectives. Monitor progress and get alerts when targets are at risk or need attention." />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/product-targets');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    View All Targets
                    <span className="text-slate-600">→</span>
                  </button>
                  {collapsedSections.has('product-targets') ? (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
            {!collapsedSections.has('product-targets') && (
              <div className="p-6">
                <ProductTargetsCard maxTargets={5} />
              </div>
            )}
          </div>
        )}

        



        {/* Product Consolidation Section temporarily hidden */}

        {/* Empty State */}
        {!showPriceAlerts && !showInefficientProducts && !showProductTargets && (
          <WelcomeState
            title="Welcome to Your Dashboard"
            description="Configure your dashboard settings to see actionable insights and optimize your procurement strategy."
            features={[
              "Track price variations and alerts",
              "Identify inefficient products",
              "Analyze supplier performance",
              "Find consolidation opportunities"
            ]}
            action={{
              label: "Configure Dashboard",
              onClick: () => setShowSettings(true)
            }}
          />
        )}
        </div>
      </div>

      {/* Settings Modal */}
      <DashboardSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

