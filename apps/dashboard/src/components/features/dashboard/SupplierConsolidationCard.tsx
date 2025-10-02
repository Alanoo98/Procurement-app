import React, { useState } from 'react';
import { MapPin, Package, DollarSign, Eye, EyeOff } from 'lucide-react';
import { useSupplierConsolidation } from '@/hooks/management';
import { useNavigate } from 'react-router-dom';

export const ProductConsolidationCard: React.FC = () => {
  const { data: opportunities, isLoading, error } = useSupplierConsolidation();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500 py-2">
          <p className="text-sm">Unable to load consolidation opportunities</p>
        </div>
      </div>
    );
  }

  const topOpportunities = showAll ? opportunities : opportunities.slice(0, 5);
  const totalPotentialSavings = opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);
  const totalOpportunities = opportunities.length;

  if (totalOpportunities === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500 py-2">
          <p className="text-sm">All products are purchased from single suppliers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showAll ? 'Show Less' : 'Show All'}
        </button>
      </div>

      <div className="mb-4 p-4 bg-emerald-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Total Potential Savings
            </p>
            <p className="text-2xl font-bold text-emerald-900">
              {totalPotentialSavings.toLocaleString('da-DK', {
                style: 'currency',
                currency: 'DKK',
                minimumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-600">
              {totalOpportunities} opportunities
            </p>
            <p className="text-xs text-emerald-500">
              Across {opportunities.reduce((sum, opp) => sum + opp.locationCount, 0)} locations
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {topOpportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => navigate(`/products/${encodeURIComponent(`${opportunity.productCode}|${opportunity.bestSupplier.supplierId}`)}`)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">
                  {opportunity.description || 'Unnamed Product'}
                  <span className="ml-2 text-xs text-gray-500">{opportunity.productCode}</span>
                  {opportunity.unitType && (
                    <span className="ml-2 text-xs text-gray-400">[{opportunity.unitType}]</span>
                  )}
                </h4>
                {opportunity.isMapped && (
                  <p className="text-xs text-emerald-600 mt-1">
                    (Mapped to {opportunity.mappedProductCode})
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-600">
                  {opportunity.potentialSavings.toLocaleString('da-DK', {
                    style: 'currency',
                    currency: 'DKK',
                    minimumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {opportunity.savingsPercentage.toFixed(1)}% savings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span>{opportunity.currentSuppliers.length} suppliers</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{opportunity.locationCount} locations</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>
                  {opportunity.totalCurrentSpend.toLocaleString('da-DK', {
                    style: 'currency',
                    currency: 'DKK',
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Current suppliers:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {opportunity.currentSuppliers.map((supplier) => (
                  <span
                    key={supplier.supplierId}
                    className={`px-2 py-1 rounded-full text-xs ${
                      supplier.supplierId === opportunity.bestSupplier.supplierId
                        ? 'bg-emerald-100 text-emerald-700 font-semibold'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {supplier.supplierName} ({supplier.avgUnitPrice.toLocaleString('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 2 })})
                    {supplier.supplierId === opportunity.bestSupplier.supplierId && (
                      <span className="ml-1">★</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {opportunities.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {showAll ? 'Show Less' : `Show ${opportunities.length - 5} More Opportunities`}
          </button>
        </div>
      )}
    </div>
  );
}; 

