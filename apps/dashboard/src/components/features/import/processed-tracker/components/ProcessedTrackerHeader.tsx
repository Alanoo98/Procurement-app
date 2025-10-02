import { RefreshCw } from "lucide-react";

interface ProcessedTrackerHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export const ProcessedTrackerHeader: React.FC<ProcessedTrackerHeaderProps> = ({
  loading,
  onRefresh
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Document Processing Manager</h2>
        <p className="text-sm text-gray-500">
          Manage document processing status and fetch new documents from e-conomic
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}; 

