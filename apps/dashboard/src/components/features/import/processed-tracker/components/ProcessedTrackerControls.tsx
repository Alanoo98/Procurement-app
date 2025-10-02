import { EconomicGrantToken } from "../types";

interface ProcessedTrackerControlsProps {
  accountingYear: string;
  onAccountingYearChange: (year: string) => void;
  grantTokens: EconomicGrantToken[];
  selectedLocations: string[];
  onSelectedLocationsChange: (locations: string[]) => void;
}

export const ProcessedTrackerControls: React.FC<ProcessedTrackerControlsProps> = ({
  accountingYear,
  onAccountingYearChange,
  grantTokens,
  selectedLocations,
  onSelectedLocationsChange
}) => {
  const handleSelectAll = () => {
    onSelectedLocationsChange(grantTokens.map(token => token.location_id));
  };

  const handleClearAll = () => {
    onSelectedLocationsChange([]);
  };

  const handleLocationToggle = (locationId: string, checked: boolean) => {
    if (checked) {
      onSelectedLocationsChange([...selectedLocations, locationId]);
    } else {
      onSelectedLocationsChange(selectedLocations.filter(id => id !== locationId));
    }
  };

  return (
    <>
      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Accounting Year</label>
          <input
            type="text"
            value={accountingYear}
            onChange={(e) => onAccountingYearChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., 2025a"
          />
          <div className="text-xs text-gray-500 mt-1">
            Use format: 2025a for Kød Bergen.
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Range</label>
          <div className="w-full px-3 py-2 bg-gray-100 border rounded-md text-gray-600">
            <span className="font-mono">1300 - 1600</span>
            <span className="text-xs text-gray-500 ml-2">(Fixed range)</span>
          </div>
        </div>
      </div>

      {/* Location Selection Section */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-gray-700">Select Locations to Fetch Documents From</label>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear All
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
          {grantTokens.map((token) => (
            <label key={token.location_id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedLocations.includes(token.location_id)}
                onChange={(e) => handleLocationToggle(token.location_id, e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>{token.location_name}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-600">
          {selectedLocations.length === 0 
            ? "No locations selected. All locations will be used." 
            : `${selectedLocations.length} location(s) selected`
          }
        </div>
      </div>
    </>
  );
}; 

