import React from 'react';
import { formatCurrency } from '@/utils/format';

interface AgreementStatsProps {
  stats: {
    totalAgreements: number;
    complianceRate: number;
    spendCoverage: number;
    totalSavingsPotential: number;
    productsWithoutAgreements: any[];
  };
}

export const AgreementStats: React.FC<AgreementStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm text-gray-500">Total Agreements</div>
        <div className="mt-2 text-2xl font-bold text-gray-900">
          {stats.totalAgreements}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Active price agreements
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm text-gray-500">Compliance Rate</div>
        <div className="mt-2 text-2xl font-bold text-emerald-600">
          {stats.complianceRate.toFixed(1)}%
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Transactions within agreement
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm text-gray-500">Spend Coverage</div>
        <div className="mt-2 text-2xl font-bold text-emerald-600">
          {stats.spendCoverage.toFixed(1)}%
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Of total spend covered
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm text-gray-500">Potential Savings</div>
        <div className="mt-2 text-2xl font-bold text-emerald-600">
          {formatCurrency(stats.totalSavingsPotential)}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          From better compliance
        </div>
      </div>
    </div>
  );
};

