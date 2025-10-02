export type ProcessedTracker = {
  id: string;
  document_id: number;
  accounting_year: string;
  organization_id: string;
  voucher_number: string | null;
  status: "pending" | "processed" | "failed" | "processing";
  created_at: string;
  updated_at: string;
  location_id: string | null;
  page_count: number | null;
};

export type EconomicGrantToken = {
  location_id: string;
  location_name: string;
  grant_token: string;
};

export type ProcessedTrackerStatus = "pending" | "processed" | "failed" | "processing";

export interface ProcessedTrackerFilters {
  statusFilter: "all" | ProcessedTrackerStatus;
  locationFilter: string;
  accountingYear: string;
}

export interface ProcessedTrackerSorting {
  sortField: string;
  sortDirection: "asc" | "desc";
}

export interface ProcessedTrackerPagination {
  currentPage: number;
  totalCount: number;
  pageSize: number;
}

export interface ProcessingProgress {
  total: number;
  processed: number;
  failed: number;
  pending: number;
  currentBatch: number;
  totalBatches: number;
  currentLocation: string;
  estimatedTime: string;
}

// Import progress types
export interface ImportStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  details?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface ImportProgress {
  isActive: boolean;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  steps: ImportStep[];
  overallMessage: string;
  estimatedTime?: string;
  startTime: Date;
} 