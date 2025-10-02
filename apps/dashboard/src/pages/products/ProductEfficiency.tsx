import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNavigationState } from '@/hooks/ui';
import { useTimeBasedEfficiency } from '@/hooks/metrics/useTimeBasedEfficiency';
import { EfficiencyCharts } from '@/components/features/analytics/efficiency/EfficiencyCharts';
import { ErrorState, LoadingState, NoDataState } from '@/components/shared/ui/EmptyStates';

export const ProductEfficiency: React.FC = () => {
  const { productCode } = useParams<{ productCode: string; locationId?: string }>();
  const { goBack, getNavigationState } = useNavigationState();

  const { productChart, efficiencyMetrics, isLoading, error } = useTimeBasedEfficiency(
    productCode ? decodeURIComponent(productCode) : undefined,
    undefined // Don't filter by location - we want all locations that have this product
  );

  const handleBack = () => {
    goBack('/efficiency'); // Default to efficiency page if no previous state
  };

  const handleCloseChart = () => {
    goBack('/efficiency'); // Use proper back navigation instead of hardcoded dashboard
  };

  // Get the back button text based on where we came from
  const getBackButtonText = () => {
    const navState = getNavigationState();
    if (navState.from) {
      if (navState.from === '/') return 'Back to Dashboard';
      if (navState.from === '/efficiency') return 'Back to Efficiency';
      if (navState.from.startsWith('/products/')) return 'Back to Product';
      if (navState.from === '/cogs-analysis') return 'Back to COGS Analysis';
    }
    return 'Back';
  };

  if (error) {
    return (
      <div className="p-8">
        <ErrorState 
          title="Error Loading Efficiency Data"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingState message="Loading efficiency analysis..." size="lg" />
      </div>
    );
  }

  if (!productChart) {
    return (
      <div className="p-8">
        <NoDataState 
          context="efficiency"
          suggestion="No efficiency data available for the selected product and location."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {getBackButtonText()}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Efficiency Analysis
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Time-based efficiency tracking for {productChart.description}
            </p>
          </div>
        </div>
      </div>

      <EfficiencyCharts 
        chartData={productChart} 
        allMetrics={efficiencyMetrics}
        onClose={handleCloseChart}
      />
    </div>
  );
};
