import { ProcessedTrackerStatus, EconomicGrantToken } from "../types";

interface ProcessedTrackerFiltersProps {
  statusFilter: "all" | ProcessedTrackerStatus;
  locationFilter: string;
  grantTokens: EconomicGrantToken[];
  onStatusFilterChange: (status: "all" | ProcessedTrackerStatus) => void;
  onLocationFilterChange: (location: string) => void;
}

export const ProcessedTrackerFilters: React.FC<ProcessedTrackerFiltersProps> = ({
  statusFilter,
  locationFilter,
  grantTokens,
  onStatusFilterChange,
  onLocationFilterChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as any)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location Filter</label>
        <select
          value={locationFilter}
          onChange={(e) => onLocationFilterChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="all">All Locations</option>
          {grantTokens.map((token) => (
            <option key={token.location_id} value={token.location_id}>
              {token.location_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}; 

