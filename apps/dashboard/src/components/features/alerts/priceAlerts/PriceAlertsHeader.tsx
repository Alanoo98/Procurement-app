import React from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigationState } from '@/hooks/ui/useNavigationState';

interface PriceAlertsHeaderProps {
  activeTab: 'price-variations' | 'agreement-violations';
  setActiveTab: (tab: 'price-variations' | 'agreement-violations') => void;
}

export const PriceAlertsHeader: React.FC<PriceAlertsHeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { goBack } = useNavigationState();

  const handleBack = () => {
    goBack('/products');
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Products
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Alerts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor price variations and agreement violations across your procurement data
          </p>
        </div>

      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('price-variations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'price-variations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Price Variations
          </button>
          <button
            onClick={() => setActiveTab('agreement-violations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'agreement-violations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Agreement Violations
          </button>
        </div>

      </div>
    </div>
  );
}; 

