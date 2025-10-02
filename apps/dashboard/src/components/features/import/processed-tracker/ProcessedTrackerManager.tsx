import { useState } from "react";
import { useProcessedTracker } from "./hooks/useProcessedTracker";
import { ProcessedTrackerHeader } from "./components/ProcessedTrackerHeader";
import { ProcessedTrackerControls } from "./components/ProcessedTrackerControls";
import { ProcessedTrackerFilters } from "./components/ProcessedTrackerFilters";
import { ProcessedTrackerActions } from "./components/ProcessedTrackerActions";
import { ProcessedTrackerTable } from "./components/ProcessedTrackerTable";
import { ProcessedTrackerPagination } from "./components/ProcessedTrackerPagination";
import { ProcessedTrackerProgress } from "./components/ProcessedTrackerProgress";
import { ImportProgress } from "./components/ImportProgress";
import { DeleteConfirmationModal } from "./components/DeleteConfirmationModal";
import { StatusWarningModal } from "./components/StatusWarningModal";
import { ProcessedTrackerStatus, ProcessedTracker } from "./types";

export const ProcessedTrackerManager: React.FC = () => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusWarning, setShowStatusWarning] = useState(false);
  const [warningData, setWarningData] = useState<{
    invalidDocuments: ProcessedTracker[];
    validDocuments: ProcessedTracker[];
  } | null>(null);

  const {
    // State
    documents,
    grantTokens,
    loading,
    fetchingDocuments,
    sendingToNanonets,
    deletingDocuments,
    syncingStatus,
    triggeringETL,
    selectedDocuments,
    selectedLocations,
    processingProgress,
    importProgress,
    filters,
    sorting,
    pagination,
    totalPages,
    startIndex,
    endIndex,
    locationsLoading,

    // Actions
    fetchDocuments,
    sendToNanonets,
    retryFailedDocuments,
    triggerETL,
    importNewDocuments,
    updateDocumentStatus,
    bulkUpdateStatus,
    syncStatus,
    deleteSelectedDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    goToPage,
    handlePageSizeChange,
    handleSort,
    updateFilters,
    setSelectedLocations,
    getLocationName,
    dismissImportProgress,
  } = useProcessedTracker();

  if (locationsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
        <div className="text-gray-500 text-lg">Loading locations...</div>
      </div>
    );
  }

  const handleRefresh = () => {
    fetchDocuments(pagination.currentPage);
  };

  const handleAccountingYearChange = (year: string) => {
    updateFilters({ accountingYear: year });
  };

  const handleStatusFilterChange = (status: "all" | ProcessedTrackerStatus) => {
    updateFilters({ statusFilter: status });
  };

  const handleLocationFilterChange = (location: string) => {
    updateFilters({ locationFilter: location });
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    await deleteSelectedDocuments();
    setShowDeleteConfirm(false);
  };

  const handleSendToNanonets = async () => {
    const result = await sendToNanonets();
    
    // Check if warning is required
    if (result && typeof result === 'object' && 'requiresWarning' in result) {
      setWarningData({
        invalidDocuments: result.invalidDocuments,
        validDocuments: result.validDocuments
      });
      setShowStatusWarning(true);
    }
  };

  const handleConfirmSendWithWarning = async () => {
    setShowStatusWarning(false);
    setWarningData(null);
    // Send with warning skipped
    await sendToNanonets(true);
  };

  const handleCancelSendWithWarning = () => {
    setShowStatusWarning(false);
    setWarningData(null);
  };

  return (
    <div className="max-w-7xl mx-auto mt-4 border rounded-lg p-6 bg-white shadow-sm">
      <ProcessedTrackerHeader 
        loading={loading}
        onRefresh={handleRefresh}
      />

      <ProcessedTrackerControls
        accountingYear={filters.accountingYear}
        onAccountingYearChange={handleAccountingYearChange}
        grantTokens={grantTokens}
        selectedLocations={selectedLocations}
        onSelectedLocationsChange={setSelectedLocations}
      />

      <ProcessedTrackerFilters
        statusFilter={filters.statusFilter}
        locationFilter={filters.locationFilter}
        grantTokens={grantTokens}
        onStatusFilterChange={handleStatusFilterChange}
        onLocationFilterChange={handleLocationFilterChange}
      />

      <ProcessedTrackerActions
        fetchingDocuments={fetchingDocuments}
        sendingToNanonets={sendingToNanonets}
        syncingStatus={syncingStatus}
        triggeringETL={triggeringETL}
        selectedDocuments={selectedDocuments}
        grantTokens={grantTokens}
        accountingYear={filters.accountingYear}
        statusFilter={filters.statusFilter}
        onImportNewDocuments={importNewDocuments}
        onSendToNanonets={handleSendToNanonets}
        onRetryFailedDocuments={retryFailedDocuments}
        onTriggerETL={triggerETL}
        onBulkUpdateStatus={bulkUpdateStatus}
        onClearSelection={clearSelection}
        onShowDeleteConfirm={handleShowDeleteConfirm}
        onSyncStatus={syncStatus}
      />

      <ImportProgress progress={importProgress} onDismiss={dismissImportProgress} />
      
      <ProcessedTrackerProgress progress={processingProgress} />

      {/* Page Size Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
            Show:
          </label>
          <select
            id="pageSize"
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">documents per page</span>
        </div>
        <div className="text-sm text-gray-500">
          Total: {pagination.totalCount} documents
        </div>
      </div>

      <ProcessedTrackerTable
        documents={documents}
        loading={loading}
        selectedDocuments={selectedDocuments}
        sorting={sorting}
        onToggleDocumentSelection={toggleDocumentSelection}
        onSelectAllDocuments={selectAllDocuments}
        onClearSelection={clearSelection}
        onSort={handleSort}
        onUpdateDocumentStatus={updateDocumentStatus}
        getLocationName={getLocationName}
      />

      <ProcessedTrackerPagination
        currentPage={pagination.currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={pagination.totalCount}
        onGoToPage={goToPage}
      />


      <DeleteConfirmationModal
        show={showDeleteConfirm}
        selectedCount={selectedDocuments.length}
        deleting={deletingDocuments}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      {warningData && (
        <StatusWarningModal
          isOpen={showStatusWarning}
          onClose={handleCancelSendWithWarning}
          onConfirm={handleConfirmSendWithWarning}
          documents={[...warningData.invalidDocuments, ...warningData.validDocuments]}
          invalidDocuments={warningData.invalidDocuments}
        />
      )}
    </div>
  );
}; 

