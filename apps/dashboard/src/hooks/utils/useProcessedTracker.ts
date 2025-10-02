import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

export type ProcessedTracker = {
  id: string;
  document_id: number;
  accounting_year: string;
  organization_id: string;
  voucher_number: string | null;
  status: "pending" | "processed" | "failed";
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

export const useProcessedTracker = () => {
  const [documents, setDocuments] = useState<ProcessedTracker[]>([]);
  const [grantTokens, setGrantTokens] = useState<EconomicGrantToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDocuments, setFetchingDocuments] = useState(false);

  // Fetch processed tracker documents
  const fetchDocuments = async (
    statusFilter: "all" | "pending" | "processed" | "failed" = "all",
    locationFilter: string = "all"
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from("processed_tracker")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply location filter
      if (locationFilter !== "all") {
        query = query.eq("location_id", locationFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        toast.error(`Failed to fetch documents: ${error.message}`);
        return [];
      }

      setDocuments(data || []);
      return data || [];
    } catch (error) {
      toast.error("Failed to fetch documents");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch grant tokens
  const fetchGrantTokens = async () => {
    try {
      const { data, error } = await supabase
        .from("economic_granttokens")
        .select("location_id, location_name, grant_token")
        .order("location_name", { ascending: true });

      if (error) {
        toast.error(`Failed to fetch grant tokens: ${error.message}`);
        return [];
      }

      setGrantTokens(data || []);
      return data || [];
    } catch (error) {
      toast.error("Failed to fetch grant tokens");
      return [];
    }
  };

  // Update document status
  const updateDocumentStatus = async (
    documentId: string, 
    status: "pending" | "processed" | "failed"
  ) => {
    try {
      const { error } = await supabase
        .from("processed_tracker")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", documentId);

      if (error) {
        toast.error(`Failed to update status: ${error.message}`);
        return false;
      }

      toast.success("Status updated successfully");
      return true;
    } catch (error) {
      toast.error("Failed to update status");
      return false;
    }
  };

  // Bulk update selected documents
  const bulkUpdateStatus = async (
    documentIds: string[], 
    status: "pending" | "processed" | "failed"
  ) => {
    if (documentIds.length === 0) {
      toast.warning("Please select documents to update.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("processed_tracker")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", documentIds);

      if (error) {
        toast.error(`Failed to update documents: ${error.message}`);
        return false;
      }

      toast.success(`Updated ${documentIds.length} documents to ${status}`);
      return true;
    } catch (error) {
      toast.error("Failed to update documents");
      return false;
    }
  };

  // Get unique locations from documents
  const getUniqueLocations = () => {
    return Array.from(new Set(documents.map(doc => doc.location_id).filter(Boolean)));
  };

  // Get document statistics
  const getDocumentStats = () => {
    const total = documents.length;
    const pending = documents.filter(doc => doc.status === "pending").length;
    const processed = documents.filter(doc => doc.status === "processed").length;
    const failed = documents.filter(doc => doc.status === "failed").length;

    return { total, pending, processed, failed };
  };

  // Initialize data
  useEffect(() => {
    fetchDocuments();
    fetchGrantTokens();
  }, []);

  return {
    documents,
    grantTokens,
    loading,
    fetchingDocuments,
    setFetchingDocuments,
    fetchDocuments,
    fetchGrantTokens,
    updateDocumentStatus,
    bulkUpdateStatus,
    getUniqueLocations,
    getDocumentStats,
  };
}; 
