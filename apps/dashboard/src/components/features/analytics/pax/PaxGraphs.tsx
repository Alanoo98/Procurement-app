import React, { useMemo } from 'react';
import { PaxRecord } from '@/hooks/usePaxData';
import { LocationPaxGraph } from './LocationPaxGraph';
import { BarChart } from 'lucide-react';

interface PaxGraphsProps {
  data: PaxRecord[];
}

export const PaxGraphs: React.FC<PaxGraphsProps> = ({ data }) => {
  // Group locations and get unique location IDs
  const locations = useMemo(() => {
    const locationsMap = new Map<string, { id: string, name: string }>();
    
    data.forEach(record => {
      if (!locationsMap.has(record.location_id)) {
        locationsMap.set(record.location_id, {
          id: record.location_id,
          name: record.locations?.name || `-`
        });
      }
    });
    
    // Sort locations alphabetically by name
    return Array.from(locationsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-medium text-gray-900">PAX Trends by Location</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map(location => (
          <LocationPaxGraph 
            key={location.id}
            data={data}
            locationId={location.id}
            locationName={location.name}
          />
        ))}
      </div>
    </div>
  );
};

