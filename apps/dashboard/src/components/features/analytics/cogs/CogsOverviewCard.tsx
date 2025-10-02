import React from 'react';
import { Calculator, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface CogsOverviewCardProps {
  locationName: string;
  month: string;
  year: number;
  revenue: number;
  totalSpend: number;
  cogsPercentage: number;
  productCount: number;
  onViewDetails?: () => void;
}

export const CogsOverviewCard: React.FC<CogsOverviewCardProps> = ({
  locationName,
  month,
  year,
  revenue,
  totalSpend,
  cogsPercentage,
  productCount,
  onViewDetails
}) => {
  const getCogsColor = (percentage: number) => {
    if (percentage <= 25) return 'text-green-600 bg-green-50';
    if (percentage <= 35) return 'text-yellow-600 bg-yellow-50';
    if (percentage <= 45) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getCogsStatus = (percentage: number) => {
    if (percentage <= 25) return 'Excellent';
    if (percentage <= 35) return 'Good';
    if (percentage <= 45) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-medium text-gray-900">{locationName}</h3>
        </div>
        <span className="text-sm text-gray-500">{month} {year}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Revenue</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(revenue)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Spend</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(totalSpend)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">COGS %</span>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${getCogsColor(cogsPercentage).split(' ')[0]}`}>
            {cogsPercentage.toFixed(1)}%
          </div>
          <div className={`text-xs font-medium ${getCogsColor(cogsPercentage)} px-2 py-1 rounded-full inline-block`}>
            {getCogsStatus(cogsPercentage)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>{productCount} products analyzed</span>
        <span>COGS Target: 25-35%</span>
      </div>

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          <Calculator className="h-4 w-4" />
          View Detailed Analysis
        </button>
      )}
    </div>
  );
};

