import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PaxRecord } from '@/hooks/usePaxData';
import { format, parseISO } from 'date-fns';

interface LocationPaxGraphProps {
  data: PaxRecord[];
  locationId: string;
  locationName: string;
}

export const LocationPaxGraph: React.FC<LocationPaxGraphProps> = ({ data, locationId, locationName }) => {
  const locationData = useMemo(() => {
    // Filter data for this specific location
    const filteredData = data.filter(record => record.location_id === locationId);
    
    // Sort by date
    return filteredData
      .sort((a, b) => a.date_id.localeCompare(b.date_id))
      .map(record => ({
        date: record.date_id,
        pax: record.pax_count,
        // Format date for display - we'll use different formats based on grouping
        fullDate: record.date_id,
        month: format(parseISO(record.date_id), 'MMM yyyy'),
        week: `Week ${format(parseISO(record.date_id), 'w')}`,
        day: format(parseISO(record.date_id), 'd'),
        weekday: format(parseISO(record.date_id), 'EEE')
      }));
  }, [data, locationId]);

  // Determine the best date format based on the date range
  const dateFormat = useMemo(() => {
    if (locationData.length <= 1) return 'fullDate';
    
    // Check date range
    const firstDate = new Date(locationData[0].date);
    const lastDate = new Date(locationData[locationData.length - 1].date);
    const daysDiff = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 180) return 'month'; // If more than 6 months, show month-year
    if (daysDiff > 31) return 'week';   // If more than a month, show week numbers
    return 'weekday';                   // Otherwise show weekday names
  }, [locationData]);

  // Format the x-axis tick based on the determined date format
  const formatXAxisTick = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      
      switch (dateFormat) {
        case 'month':
          return format(date, 'MMM yyyy');
        case 'week':
          return `W${format(date, 'w')}`;
        case 'weekday':
          return format(date, 'EEE d');
        default:
          return format(date, 'yyyy-MM-dd');
      }
    } catch (e) {
      return dateStr;
    }
  };

  // Custom tooltip to show full date information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      try {
        const date = parseISO(label);
        return (
          <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
            <p className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-emerald-600 font-medium">{payload[0].value} guests</p>
          </div>
        );
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  if (locationData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        No PAX data available for this location
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-md font-medium text-gray-900 mb-3">{locationName}</h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={locationData}
            margin={{ top: 10, right: 10, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisTick}
              interval="preserveStartEnd"
              minTickGap={30}
              angle={-30}
              textAnchor="end"
              height={50}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              width={40}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="pax" 
              name="Guests" 
              fill="#059669" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

