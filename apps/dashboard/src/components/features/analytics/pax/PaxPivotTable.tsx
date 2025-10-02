import React, { useMemo, useState } from 'react';
import { PaxRecord } from '@/hooks/usePaxData';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';

interface PaxPivotTableProps {
  data: PaxRecord[];
}

export const PaxPivotTable: React.FC<PaxPivotTableProps> = ({ data }) => {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Process data for pivot table
  const { pivotData, locations, months } = useMemo(() => {
    // Extract all unique locations
    const locationsMap = new Map<string, { id: string, name: string }>();
    data.forEach(record => {
      if (!locationsMap.has(record.location_id)) {
        locationsMap.set(record.location_id, {
          id: record.location_id,
          name: record.locations?.name || `-`
        });
      }
    });
    
    // Sort locations by name
    const sortedLocations = Array.from(locationsMap.values())
      .sort((a, b) => sortDirection === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name));
    
    // Extract all unique months
    const monthsSet = new Set<string>();
    data.forEach(record => {
      const month = format(parseISO(record.date_id), 'yyyy-MM');
      monthsSet.add(month);
    });
    
    // Sort months chronologically
    const sortedMonths = Array.from(monthsSet).sort();
    
    // Create pivot data structure
    const pivot: Record<string, Record<string, number>> = {};
    
    // Initialize with zeros for all location/month combinations
    sortedLocations.forEach(location => {
      pivot[location.id] = {
        locationName: location.name,
        total: 0
      };
      
      sortedMonths.forEach(month => {
        pivot[location.id][month] = 0;
      });
    });
    
    // Populate with actual data
    data.forEach(record => {
      const month = format(parseISO(record.date_id), 'yyyy-MM');
      if (pivot[record.location_id] && sortedMonths.includes(month)) {
        pivot[record.location_id][month] += record.pax_count;
        pivot[record.location_id].total += record.pax_count;
      }
    });
    
    return {
      pivotData: pivot,
      locations: sortedLocations,
      months: sortedMonths
    };
  }, [data, sortDirection]);

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy');
  };

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = { total: 0 };
    
    months.forEach(month => {
      totals[month] = 0;
      
      locations.forEach(location => {
        totals[month] += pivotData[location.id][month] || 0;
        totals.total += pivotData[location.id][month] || 0;
      });
    });
    
    return totals;
  }, [pivotData, locations, months]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mt-8">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">PAX Pivot Table</h2>
        <p className="text-sm text-gray-500 mt-1">Monthly guest counts by location</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={toggleSortDirection}
              >
                <div className="flex items-center gap-1">
                  Location
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </th>
              {months.map(month => (
                <th key={month} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {formatMonth(month)}
                </th>
              ))}
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map(location => (
              <tr key={location.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {location.name}
                </td>
                {months.map(month => (
                  <td key={`${location.id}-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {pivotData[location.id][month].toLocaleString()}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center bg-gray-50">
                  {pivotData[location.id].total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Monthly Total
              </td>
              {months.map(month => (
                <td key={`total-${month}`} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                  {monthlyTotals[month].toLocaleString()}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center bg-emerald-50">
                {monthlyTotals.total.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

