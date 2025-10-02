import React from 'react';
import { Building2, Users, DollarSign, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface OverallMetricsProps {
  metrics: {
    restaurantCount: number;
    totalPax: number;
    avgSpendPerPax: number;
    totalProducts: number;
  };
}

export const OverallMetrics: React.FC<OverallMetricsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Restaurants</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">
          {metrics.restaurantCount}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Active locations
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Total PAX</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">
          {metrics.totalPax.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Across all restaurants
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-gray-700">Average Spend per PAX</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-600">
          {formatCurrency(metrics.avgSpendPerPax)}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Benchmark for comparison
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Unique Products</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">
          {metrics.totalProducts}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Total unique items
        </div>
      </div>
    </div>
  );
};

