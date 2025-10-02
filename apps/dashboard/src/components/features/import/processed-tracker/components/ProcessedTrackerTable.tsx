import { CheckCircle, XCircle, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { ProcessedTracker, ProcessedTrackerStatus } from "../types";

interface ProcessedTrackerTableProps {
  documents: ProcessedTracker[];
  loading: boolean;
  selectedDocuments: string[];
  sorting: {
    sortField: string;
    sortDirection: "asc" | "desc";
  };
  onToggleDocumentSelection: (documentId: string) => void;
  onSelectAllDocuments: () => void;
  onClearSelection: () => void;
  onSort: (field: string) => void;
  onUpdateDocumentStatus: (documentId: string, status: ProcessedTrackerStatus) => void;
  getLocationName: (locationId: string | null) => string;
}

export const ProcessedTrackerTable: React.FC<ProcessedTrackerTableProps> = ({
  documents,
  loading,
  selectedDocuments,
  sorting,
  onToggleDocumentSelection,
  onSelectAllDocuments,
  onClearSelection,
  onSort,
  onUpdateDocumentStatus,
  getLocationName
}) => {
  const getSortIcon = (field: string) => {
    if (sorting.sortField !== field) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    return sorting.sortDirection === "asc" ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "processed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedDocuments.length === documents.length && documents.length > 0}
                onChange={selectedDocuments.length === documents.length ? onClearSelection : onSelectAllDocuments}
                className="rounded border-gray-300"
              />
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("document_id")}
            >
              <div className="flex items-center gap-1">
                Document ID
                {getSortIcon("document_id")}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("accounting_year")}
            >
              <div className="flex items-center gap-1">
                Accounting Year
                {getSortIcon("accounting_year")}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("location_id")}
            >
              <div className="flex items-center gap-1">
                Location
                {getSortIcon("location_id")}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("voucher_number")}
            >
              <div className="flex items-center gap-1">
                Voucher Number
                {getSortIcon("voucher_number")}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("page_count")}
            >
              <div className="flex items-center gap-1">
                Pages
                {getSortIcon("page_count")}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("status")}
            >
              <div className="flex items-center gap-1">
                Status
                {getSortIcon("status")}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("created_at")}
            >
              <div className="flex items-center gap-1">
                Created
                {getSortIcon("created_at")}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                Loading documents...
              </td>
            </tr>
          ) : documents.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                No documents found matching the current filters.
              </td>
            </tr>
          ) : (
            documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={() => onToggleDocumentSelection(doc.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {doc.document_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.accounting_year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getLocationName(doc.location_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.voucher_number || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.page_count || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(doc.status)}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(doc.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, "processed")}
                      className="text-green-600 hover:text-green-900"
                      title="Mark as processed"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, "failed")}
                      className="text-red-600 hover:text-red-900"
                      title="Mark as failed"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, "pending")}
                      className="text-yellow-600 hover:text-yellow-900"
                      title="Mark as pending"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, "processing")}
                      className="text-blue-600 hover:text-blue-900"
                      title="Mark as processing"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}; 

