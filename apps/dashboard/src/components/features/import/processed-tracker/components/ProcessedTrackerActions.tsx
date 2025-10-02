import { useState, useRef, useEffect } from "react";
import { Download, Send, MoreHorizontal, CheckCircle, XCircle, Clock, Trash2, RefreshCw, Play, RotateCcw } from "lucide-react";
import { ProcessedTrackerStatus } from "../types";

interface ProcessedTrackerActionsProps {
  fetchingDocuments: boolean;
  sendingToNanonets: boolean;
  syncingStatus: boolean;
  triggeringETL: boolean;
  selectedDocuments: string[];
  grantTokens: { location_id: string; location_name: string; grant_token: string }[];
  accountingYear: string;
  statusFilter: string;
  onImportNewDocuments: () => void;
  onSendToNanonets: () => void;
  onRetryFailedDocuments: () => void;
  onTriggerETL: () => void;
  onBulkUpdateStatus: (status: ProcessedTrackerStatus) => void;
  onClearSelection: () => void;
  onShowDeleteConfirm: () => void;
  onSyncStatus: () => void;
}

export const ProcessedTrackerActions: React.FC<ProcessedTrackerActionsProps> = ({
  fetchingDocuments,
  sendingToNanonets,
  syncingStatus,
  triggeringETL,
  selectedDocuments,
  grantTokens,
  accountingYear,
  statusFilter,
  onImportNewDocuments,
  onSendToNanonets,
  onRetryFailedDocuments,
  onTriggerETL,
  onBulkUpdateStatus,
  onClearSelection,
  onShowDeleteConfirm,
  onSyncStatus
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  const handleBulkAction = (action: () => void) => {
    action();
    setShowActionsMenu(false);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={onImportNewDocuments}
        disabled={fetchingDocuments || grantTokens.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-all duration-200"
      >
        <Download className={`h-4 w-4 ${fetchingDocuments ? 'animate-pulse' : ''}`} />
        {fetchingDocuments ? (
          <span className="flex items-center gap-2">
            <span className="animate-pulse">Importing...</span>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </span>
        ) : (
          `Import New Documents (${accountingYear}, Accounts 1300-1600)`
        )}
      </button>
      
      <button
        onClick={onSendToNanonets}
        disabled={sendingToNanonets || selectedDocuments.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {sendingToNanonets ? "Sending..." : `Send to Nanonets (${selectedDocuments.length})`}
      </button>
      
      {statusFilter === "failed" && (
        <button
          onClick={onRetryFailedDocuments}
          disabled={sendingToNanonets}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          {sendingToNanonets ? "Retrying..." : "Retry Failed Documents"}
        </button>
      )}
      
      <button
        onClick={onSyncStatus}
        disabled={syncingStatus}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${syncingStatus ? 'animate-spin' : ''}`} />
        {syncingStatus ? "Syncing..." : "Sync Status"}
      </button>
      
      <button
        onClick={onTriggerETL}
        disabled={triggeringETL}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
      >
        <Play className={`h-4 w-4 ${triggeringETL ? 'animate-spin' : ''}`} />
        {triggeringETL ? "Triggering..." : "Trigger ETL"}
      </button>
      
      {selectedDocuments.length > 0 && (
        <div className="relative" ref={actionsMenuRef}>
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <MoreHorizontal className="h-4 w-4" />
            Actions ({selectedDocuments.length})
          </button>
          
          {showActionsMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
              <div className="py-1">
                <button
                  onClick={() => handleBulkAction(() => onBulkUpdateStatus("processed"))}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Mark as Processed
                </button>
                <button
                  onClick={() => handleBulkAction(() => onBulkUpdateStatus("failed"))}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                  Mark as Failed
                </button>
                <button
                  onClick={() => handleBulkAction(() => onBulkUpdateStatus("pending"))}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Mark as Pending
                </button>
                <button
                  onClick={() => handleBulkAction(() => onBulkUpdateStatus("processing"))}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  Mark as Processing
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleBulkAction(onShowDeleteConfirm)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleBulkAction(onClearSelection)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 

