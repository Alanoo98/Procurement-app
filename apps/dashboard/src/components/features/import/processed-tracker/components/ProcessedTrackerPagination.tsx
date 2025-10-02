import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProcessedTrackerPaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalCount: number;
  onGoToPage: (page: number) => void;
}

export const ProcessedTrackerPagination: React.FC<ProcessedTrackerPaginationProps> = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalCount,
  onGoToPage
}) => {
  // Helper to generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);

      if (start > 2) {
        pages.push(-1); // Ellipsis
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push(-1); // Ellipsis
      }

      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-700">
        Showing {startIndex} to {endIndex} of {totalCount} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onGoToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <div className="flex gap-1">
          {getPageNumbers().map((pageNum, idx) =>
            pageNum === -1 ? (
              <span key={`ellipsis-${idx}`} className="px-3 py-2 text-sm">...</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onGoToPage(pageNum)}
                className={`px-3 py-2 text-sm border rounded ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white border-blue-600"
                    : "hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            )
          )}
        </div>
        <button
          onClick={() => onGoToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}; 

