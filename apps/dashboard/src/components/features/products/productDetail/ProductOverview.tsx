import React from 'react';
import { Package, TrendingUp, Building2, Users, Handshake, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface ProductOverviewProps {
  productDetail: {
    productCode: string;
    description: string;
    supplier: string;
    supplierId: string;
    totalQuantity: number;
    totalSpend: number;
    totalOriginalSpend?: number;
    transactions: Array<{
      invoiceNumber: string;
      invoiceDate: Date;
      location: string;
      locationId: string;
      quantity: number;
      unitType: string;
      unitPrice: number;
      total: number;
      documentType: string;
    }>;
    locations: string[];
    locationIds: string[];
    unitTypes: Array<{
      type: string;
      quantity: number;
      spend: number;
      originalSpend?: number;
      avgPrice: number;
      minPrice: number;
      maxPrice: number;
    }>;
    priceAgreement?: {
      price: number;
      unitType: string;
      startDate?: Date;
      endDate?: Date;
    };
  };
  hasViolations?: boolean;
  onShowViolations?: () => void;
}

export const ProductOverview: React.FC<ProductOverviewProps> = ({ 
  productDetail, 
  hasViolations = false, 
  onShowViolations 
}) => {
  return (
    <>
      {/* Agreement Violation Warning Banner */}
      {hasViolations && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">
                Agreement Violations Detected
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Some transactions are above your negotiated price agreement. 
                Review the details to understand the impact on your costs.
              </p>
            </div>
            {onShowViolations && (
              <button
                onClick={onShowViolations}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                View Violations
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Overview</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Total Spend</div>
            <div className="text-2xl font-semibold text-gray-900">{formatCurrency(productDetail.totalSpend)}</div>
            {productDetail.totalOriginalSpend && productDetail.totalOriginalSpend > productDetail.totalSpend && (
              <div className="text-sm text-gray-500">
                Original: <span className="line-through">{formatCurrency(productDetail.totalOriginalSpend)}</span>
                <span className="ml-2 text-emerald-600">
                  ({((1 - productDetail.totalSpend / productDetail.totalOriginalSpend) * 100).toFixed(1)}% discount)
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">Quantities</div>
            {productDetail.unitTypes.map(unitType => (
              <div key={unitType.type} className="text-lg font-semibold text-gray-900">
                {unitType.quantity.toLocaleString('da-DK')}
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm text-gray-500">Transactions</div>
            <div className="text-2xl font-semibold text-gray-900">
              {productDetail.transactions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Price Analysis</h3>
        </div>
        <div className="space-y-4">
          {productDetail.unitTypes.map(unitType => (
            <div key={unitType.type} className="pb-4 border-b last:border-b-0">
              <div className="text-sm font-medium text-gray-700">{unitType.type}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(unitType.avgPrice)}/{unitType.type}
              </div>
              {unitType.originalSpend && unitType.originalSpend > unitType.spend && (
                <div className="text-sm text-gray-500">
                  Original avg: <span className="line-through">{formatCurrency(unitType.originalSpend / unitType.quantity)}</span>
                </div>
              )}
              <div className="flex justify-between mt-1">
                <div>
                  <div className="text-sm text-gray-500">Min</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(unitType.minPrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Max</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(unitType.maxPrice)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {productDetail.priceAgreement && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-emerald-600">
                <Handshake className="h-5 w-5" />
                <span className="text-sm font-medium">Negotiated Price</span>
              </div>
              <div className="mt-1 text-lg font-medium text-emerald-600">
                {formatCurrency(productDetail.priceAgreement.price)}/{productDetail.priceAgreement.unitType}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Locations</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Total Locations</div>
            <div className="text-2xl font-semibold text-gray-900">
              {productDetail.locations.length}
            </div>
          </div>
          <div className="space-y-2">
            {productDetail.locations.slice(0, 3).map((location, index) => (
              <div key={index} className="text-sm text-gray-600">
                {location}
              </div>
            ))}
            {productDetail.locations.length > 3 && (
              <div className="text-sm text-gray-500">
                +{productDetail.locations.length - 3} more
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Supplier</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="text-lg font-medium text-gray-900">
              {productDetail.supplier}
            </div>
          </div>
          {productDetail.priceAgreement && (
            <div className="pt-2 border-t">
              <div className="text-sm text-gray-500">Agreement Status</div>
              <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Active Price Agreement
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

