import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrencyByCode } from '@/utils/currency';
import { useProductAcrossLocations } from '@/hooks/metrics/useProductAcrossLocations';

interface ProductLocationBreakdownProps {
  productCode: string | null;
  productDescription: string | null;
  year: number;
  month: number;
  selectedLocationId: string | null;
}

export const ProductLocationBreakdown: React.FC<ProductLocationBreakdownProps> = ({
  productCode,
  productDescription,
  year,
  month,
  selectedLocationId
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const { 
    data: locationData = [], 
    isLoading, 
    error 
  } = useProductAcrossLocations(productCode, productDescription, year, month, selectedLocationId);


  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Sort location data by total spend (descending)
  const sortedLocationData = React.useMemo(() => {
    return [...locationData].sort((a, b) => b.total_spend - a.total_spend);
  }, [locationData]);

  // Calculate max values for relative bar scaling
  const maxTotalSpend = sortedLocationData.length > 0 ? Math.max(...sortedLocationData.map(loc => Math.abs(loc.percentage_of_total_spend))) : 0;
  const maxRevenuePercentage = sortedLocationData.length > 0 ? Math.max(...sortedLocationData.map(loc => Math.abs(loc.percentage_of_revenue))) : 0;

  return (
    <div className="border-l-4 border-blue-200 bg-blue-50/30">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-blue-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-blue-600" />
          )}
           <span className="text-sm font-medium text-blue-800">
             View across {sortedLocationData.length > 0 ? sortedLocationData.length : 'other'} locations
           </span>
        </div>
        <span className="text-xs text-blue-600">
          {isExpanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-blue-600">Loading location data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600">{error.message || 'Failed to load data'}</p>
            </div>
           ) : sortedLocationData.length > 0 ? (
             <div className="space-y-0">
               {sortedLocationData.map((location, index) => (
                <div
                  key={location.location_id}
                  className={`flex items-center hover:bg-gray-50 transition-colors ${
                    location.location_id === selectedLocationId
                      ? 'bg-blue-100'
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  }`}
                >
                   {/* Column 1: Product Details (Location Name) - matches main table sticky column */}
                   <div className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap border-r border-gray-200 flex-shrink-0" style={{width: '530px'}}>
                     <div className="text-xs font-medium text-gray-600 truncate" title={location.location_name}>
                       {location.location_name}
                     </div>
                   </div>

                   {/* Column 2: Category - matches main table */}
                   <div className="px-4 py-4 whitespace-nowrap flex-shrink-0" style={{width: '108px'}}>
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                       location.category_name 
                         ? 'bg-blue-50 text-blue-600' 
                         : 'bg-gray-50 text-gray-500'
                     }`}>
                       {location.category_name || 'No Category'}
                     </span>
                   </div>

                   {/* Column 3: Total Spend - matches main table */}
                   <div className="px-4 py-4 whitespace-nowrap text-right flex-shrink-0" style={{width: '145px'}}>
                     <div className="text-xs font-medium text-gray-600">
                       {formatCurrencyByCode(location.total_spend, location.currency)}
                     </div>
                   </div>

                   {/* Column 4: Spend per PAX - matches main table */}
                   <div className="px-4 py-4 whitespace-nowrap text-right flex-shrink-0" style={{width: '125px'}}>
                     <div className="text-xs font-medium text-gray-600">
                       {(location.spend_per_pax || 0).toFixed(1)} {location.currency === 'GBP' ? '£' : 'kr'}
                     </div>
                   </div>

                   {/* Column 5: % of Total Spend - matches main table */}
                   <div className="px-4 py-4 whitespace-nowrap text-right flex-shrink-0" style={{width: '160px'}}>
                     <div className="flex items-center justify-end space-x-2">
                       <div className="w-16 bg-gray-100 rounded-full h-1.5">
                         <div 
                           className={`h-1.5 rounded-full transition-all duration-300 ${
                             location.percentage_of_total_spend < 0 
                               ? 'bg-gradient-to-r from-red-400 to-red-500' 
                               : 'bg-gradient-to-r from-blue-400 to-blue-500'
                           }`}
                           style={{ 
                             width: maxTotalSpend > 0 
                               ? `${(Math.abs(location.percentage_of_total_spend) / maxTotalSpend) * 100}%` 
                               : '0%' 
                           }}
                         ></div>
                       </div>
                       <span className="text-xs font-medium text-gray-600 min-w-[2.5rem]">
                         {location.percentage_of_total_spend.toFixed(1)}%
                       </span>
                     </div>
                   </div>

                   {/* Column 6: % of Revenue - matches main table */}
                   <div className="px-4 py-4 whitespace-nowrap text-right flex-shrink-0" style={{width: '160px'}}>
                     <div className="flex items-center justify-end space-x-2">
                       <div className="w-16 bg-gray-100 rounded-full h-1.5">
                         <div 
                           className={`h-1.5 rounded-full transition-all duration-300 ${
                             location.percentage_of_revenue < 0 
                               ? 'bg-gradient-to-r from-red-400 to-red-500' 
                               : 'bg-gradient-to-r from-green-400 to-green-500'
                           }`}
                           style={{ 
                             width: maxRevenuePercentage > 0 
                               ? `${(Math.abs(location.percentage_of_revenue) / maxRevenuePercentage) * 100}%` 
                               : '0%' 
                           }}
                         ></div>
                       </div>
                       <span className="text-xs font-medium text-gray-600 min-w-[2.5rem]">
                         {location.percentage_of_revenue.toFixed(2)}%
                       </span>
                     </div>
                   </div>

                   {/* Column 7: Invoice Count - matches main table */}
                   <div className="px-4 py-4 whitespace-nowrap text-center flex-shrink-0" style={{width: '140px'}}>
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                       location.invoice_count > 10 ? 'bg-green-50 text-green-600' :
                       location.invoice_count > 5 ? 'bg-yellow-50 text-yellow-600' :
                       'bg-gray-50 text-gray-500'
                     }`}>
                       {location.invoice_count}
                     </span>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No data found for other locations</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
