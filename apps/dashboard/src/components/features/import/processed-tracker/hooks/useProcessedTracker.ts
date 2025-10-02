import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/hooks/data";
import { 
  ProcessedTracker, 
  EconomicGrantToken,   
  ProcessedTrackerStatus,
  ProcessedTrackerFilters,
  ProcessedTrackerSorting,
  ProcessedTrackerPagination,
  ProcessingProgress,
  ImportProgress,
  ImportStep
} from "../types";

// Configuration for batch processing
const BATCH_PROCESSING_CONFIG = {
  BATCH_SIZE: 20, // Increased since edge function handles individual rate limiting
  BATCH_DELAY_MS: 500, // Reduced from 1000ms to 500ms for faster processing
  MAX_RETRIES: 3, // Maximum retry attempts for failed requests
  RETRY_BASE_DELAY_MS: 1000, // Base delay for exponential backoff
  MAX_DOCUMENTS_PER_REQUEST: 50, // Maximum documents that can be sent in one operation
} as const;

// Calculate optimal batch size based on document count
const calculateOptimalBatchSize = (totalDocuments: number): number => {
  if (totalDocuments <= 5) return totalDocuments; // Single batch for very small selections
  if (totalDocuments <= 15) return Math.min(totalDocuments, 15); // Larger batches for small selections
  if (totalDocuments <= 25) return 20; // Standard batch size
  if (totalDocuments <= 50) return 25; // Larger batches for many documents
  return 30; // Maximum reasonable batch size
};

// Calculate estimated processing time
const calculateEstimatedTime = (totalDocuments: number, totalBatches: number): string => {
  // Edge function processes ~5 documents per second (200ms per document)
  // Plus reduced delays between batches (500ms for normal, 200ms for small batches)
  const avgDelayPerBatch = totalBatches > 1 ? (totalBatches - 1) * 400 : 0; // Average delay
  const processingTimeSeconds = Math.ceil(totalDocuments / 5) + Math.ceil(avgDelayPerBatch / 1000);
  const minutes = Math.floor(processingTimeSeconds / 60);
  const seconds = processingTimeSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export const useProcessedTracker = () => {
  const { session } = useAuth();
  const { data: locations, isLoading: locationsLoading } = useLocations();
  
  // State
  const [documents, setDocuments] = useState<ProcessedTracker[]>([]);
  const [grantTokens, setGrantTokens] = useState<EconomicGrantToken[]>([]);
  const [grantTokensLoading, setGrantTokensLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingDocuments, setFetchingDocuments] = useState(false);
  const [sendingToNanonets, setSendingToNanonets] = useState(false);
  const [deletingDocuments, setDeletingDocuments] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [triggeringETL, setTriggeringETL] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Progress tracking for batch processing
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  
  // Progress tracking for import process
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  // Filters and pagination
  const [filters, setFilters] = useState<ProcessedTrackerFilters>({
    statusFilter: "all",
    locationFilter: "all",
    accountingYear: `${new Date().getFullYear()}a` // e-conomic format: 2025a
  });

  const [sorting, setSorting] = useState<ProcessedTrackerSorting>({
    sortField: "document_id",
    sortDirection: "desc"
  });

  const [pagination, setPagination] = useState<ProcessedTrackerPagination>({
    currentPage: 1,
    totalCount: 0,
    pageSize: 10
  });

  // Fetch processed tracker documents with pagination
  const fetchDocuments = async (page?: number, pageSize?: number) => {
    const targetPage = page || pagination.currentPage;
    const targetPageSize = pageSize || pagination.pageSize;
    setLoading(true);
    try {
      // First, get the total count for pagination
      let countQuery = supabase
        .from("processed_tracker")
        .select("*", { count: "exact", head: true });

      // Apply filters to count query
      if (filters.statusFilter !== "all") {
        countQuery = countQuery.eq("status", filters.statusFilter);
      }
      if (filters.locationFilter !== "all" && filters.locationFilter !== "") {
        countQuery = countQuery.eq("location_id", filters.locationFilter);
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) {
        toast.error(`Failed to get document count: ${countError.message}`);
        return;
      }

      setPagination(prev => ({ ...prev, totalCount: count || 0 }));

      // Then, get the paginated data
      let query = supabase
        .from("processed_tracker")
        .select("*");

      // Apply filters BEFORE pagination
      if (filters.statusFilter !== "all") {
        query = query.eq("status", filters.statusFilter);
      }
      if (filters.locationFilter !== "all" && filters.locationFilter !== "") {
        query = query.eq("location_id", filters.locationFilter);
      }

      // Apply sorting and pagination AFTER filters
      query = query
        .order(sorting.sortField, { ascending: sorting.sortDirection === "asc" })
        .range((targetPage - 1) * targetPageSize, targetPage * targetPageSize - 1);

      const { data, error } = await query;
      
      if (error) {
        toast.error(`Failed to fetch documents: ${error.message}`);
        return;
      }

      setDocuments(data || []);
    } catch {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  // Fetch grant tokens
  const fetchGrantTokens = async () => {
    setGrantTokensLoading(true);
    try {
      const { data, error } = await supabase
        .from("economic_granttokens")
        .select("location_id, location_name, grant_token")
        .order("location_name", { ascending: true });

      if (error) {
        toast.error(`Failed to fetch grant tokens: ${error.message}`);
        return;
      }

      setGrantTokens(data || []);
    } catch {
      toast.error("Failed to fetch grant tokens");
    } finally {
      setGrantTokensLoading(false);
    }
  };

  // Send documents to Nanonets for processing
  const sendToNanonets = async (skipWarning = false) => {
    if (!session?.access_token) {
      toast.error("You must be authenticated to send documents to Nanonets.");
      return;
    }

    if (selectedDocuments.length === 0) {
      toast.warning("Please select documents to send to Nanonets.");
      return;
    }

    // Check if selection exceeds maximum allowed documents
    if (selectedDocuments.length > BATCH_PROCESSING_CONFIG.MAX_DOCUMENTS_PER_REQUEST) {
      toast.error(`Too many documents selected. Maximum allowed is ${BATCH_PROCESSING_CONFIG.MAX_DOCUMENTS_PER_REQUEST} documents. Please select fewer documents or process them in smaller batches.`);
      return;
    }

    // Get the selected documents' details
    const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
    
    console.log("Selected documents count:", selectedDocuments.length);
    console.log("Selected documents IDs:", selectedDocuments);
    console.log("Filtered documents count:", selectedDocs.length);
    console.log("Filtered documents:", selectedDocs);
    
    if (selectedDocs.length === 0) {
      toast.error("No valid documents selected.");
      return;
    }

    // Check if any documents are already processing
    const processingDocs = selectedDocs.filter(doc => doc.status === "processing");
    if (processingDocs.length > 0) {
      const docIds = processingDocs.map(doc => doc.document_id).join(", ");
      toast.warning(`Some documents are already being processed: ${docIds}. Please wait for them to complete or use the "Sync Status" button to check their current status.`);
      return;
    }

    // Check for documents with invalid status (not failed or pending)
    const invalidStatusDocs = selectedDocs.filter(doc => 
      doc.status !== "failed" && doc.status !== "pending"
    );

    // If there are documents with invalid status and warning is not skipped, show warning
    if (invalidStatusDocs.length > 0 && !skipWarning) {
      // This will be handled by the UI component to show the warning modal
      // The actual sending will be triggered from the modal confirmation
      return { requiresWarning: true, invalidDocuments: invalidStatusDocs, validDocuments: selectedDocs.filter(doc => doc.status === "failed" || doc.status === "pending") };
    }

    // Group documents by location to get the appropriate grant token
    const docsByLocation = selectedDocs.reduce((acc, doc) => {
      if (!acc[doc.location_id!]) {
        acc[doc.location_id!] = [];
      }
      acc[doc.location_id!].push(doc);
      return acc;
    }, {} as Record<string, ProcessedTracker[]>);

    console.log("Documents grouped by location:", docsByLocation);
    console.log("Number of locations:", Object.keys(docsByLocation).length);

    setSendingToNanonets(true);
    
    // Track overall progress
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalPending = 0;
    let totalBatches = 0;
    let currentBatch = 0;
    
    // Calculate total batches for progress tracking
    for (const docs of Object.values(docsByLocation)) {
      totalBatches += Math.ceil(docs.length / BATCH_PROCESSING_CONFIG.BATCH_SIZE);
    }
    
    // Calculate estimated time
    const estimatedTime = calculateEstimatedTime(selectedDocuments.length, totalBatches);
    
    // Initialize progress tracking
    setProcessingProgress({
      total: selectedDocuments.length,
      processed: 0,
      failed: 0,
      pending: 0,
      currentBatch: 0,
      totalBatches,
      currentLocation: '',
      estimatedTime
    });
    
    try {
      const SUPABASE_FUNCTION_URL =
        "https://tbulqdabrpgioilodtwa.supabase.co/functions/v1/push-documents-to-nanonets";

      // Update status to 'processing' BEFORE sending to Nanonets
      // This gives immediate feedback to the user
      const { error: statusUpdateError } = await supabase
        .from("processed_tracker")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .in("id", selectedDocuments);

      if (statusUpdateError) {
        console.error("Failed to update status to processing:", statusUpdateError);
        // Continue with the process even if status update fails
      } else {
        // Refresh the documents list to show the status change immediately
        await fetchDocuments(pagination.currentPage);
      }

      // Process each location's documents with batch processing
      for (const [locationId, docs] of Object.entries(docsByLocation)) {
        const grantToken = grantTokens.find(token => token.location_id === locationId);
        
        if (!grantToken) {
          toast.error(`No grant token found for location ${getLocationName(locationId)}`);
          continue;
        }

        // Calculate optimal batch size for this location's documents
        const optimalBatchSize = calculateOptimalBatchSize(docs.length);
        
        // Split documents into batches
        const batches = [];
        for (let i = 0; i < docs.length; i += optimalBatchSize) {
          batches.push(docs.slice(i, i + optimalBatchSize));
        }

        console.log(`Processing ${docs.length} documents from ${getLocationName(locationId)} in ${batches.length} batches`);

        // Process batches with delay between them to avoid rate limits
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          currentBatch++;
          
          // Update progress tracking
          setProcessingProgress(prev => prev ? {
            ...prev,
            currentBatch,
            currentLocation: getLocationName(locationId)
          } : null);
          const batch = batches[batchIndex];
          const documentIds = batch.map(doc => doc.document_id);

          // Ensure documentIds are numbers and accountingYear is a string
          const body = {
            documentIds: documentIds.map(id => Number(id)), // Ensure they're numbers
            grantToken: grantToken.grant_token,
            accountingYear: String(batch[0].accounting_year), // Ensure it's a string
          };

          console.log(`Sending batch ${batchIndex + 1} to edge function:`, {
            documentIds,
            documentIdsType: typeof documentIds[0],
            grantToken: grantToken.grant_token,
            accountingYear: batch[0].accounting_year,
            batchSize: documentIds.length,
            batchDetails: batch.map(doc => ({
              id: doc.id,
              document_id: doc.document_id,
              document_id_type: typeof doc.document_id,
              status: doc.status
            }))
          });

          // Add delay between batches (except for the first batch)
          // Use shorter delays for smaller batches
          if (batchIndex > 0) {
            const delayMs = batch.length <= 5 ? 200 : BATCH_PROCESSING_CONFIG.BATCH_DELAY_MS;
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          let retryCount = 0;
          let success = false;

          while (retryCount < BATCH_PROCESSING_CONFIG.MAX_RETRIES && !success) {
            try {
              const res = await fetch(SUPABASE_FUNCTION_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(body),
              });

              if (!res.ok) {
                const errorText = await res.text();
                console.error(`Edge function error (${res.status}):`, errorText);
                console.error("Request body that failed:", body);
                
                // Check if it's a rate limit error
                if (res.status === 429 || errorText.includes('rate limit') || errorText.includes('too many requests')) {
                  retryCount++;
                  if (retryCount < BATCH_PROCESSING_CONFIG.MAX_RETRIES) {
                    const delay = Math.pow(2, retryCount) * BATCH_PROCESSING_CONFIG.RETRY_BASE_DELAY_MS; // Exponential backoff
                    console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${BATCH_PROCESSING_CONFIG.MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                  }
                }
                
                // Check if it's a processed_tracker update error (document was sent to Nanonets but DB update failed)
                if (errorText.includes('Failed to update processed_tracker')) {
                  console.warn("Document was sent to Nanonets but failed to update processed_tracker. Marking as processed manually.");
                  
                  // Try to manually update the status to processed since the document was sent to Nanonets
                  const { error: manualUpdateError } = await supabase
                    .from("processed_tracker")
                    .update({ status: "processed", updated_at: new Date().toISOString() })
                    .in("id", batch.map(doc => doc.id));

                  if (manualUpdateError) {
                    console.error("Failed to manually update status to processed:", manualUpdateError);
                    // Mark as failed if manual update also fails
                    const { error: failError } = await supabase
                      .from("processed_tracker")
                      .update({ status: "failed", updated_at: new Date().toISOString() })
                      .in("id", batch.map(doc => doc.id));

                    if (failError) {
                      console.error("Failed to mark documents as failed:", failError);
                    }
                  } else {
                    console.log("Successfully manually updated status to processed");
                    totalProcessed += documentIds.length;
                    success = true;
                    break; // Exit retry loop since document was sent to Nanonets
                  }
                }
                
                // Mark documents as failed since the request failed
                const { error: failError } = await supabase
                  .from("processed_tracker")
                  .update({ status: "failed", updated_at: new Date().toISOString() })
                  .in("id", batch.map(doc => doc.id));

                if (failError) {
                  console.error("Failed to mark documents as failed:", failError);
                }
                
                throw new Error(`Failed to send documents to Nanonets: ${errorText}`);
              }

              const result = await res.json();
              console.log(`Batch ${batchIndex + 1}/${batches.length} processing result:`, result);

              // Show user feedback for each batch
              toast.success(`Batch ${batchIndex + 1}/${batches.length}: Sent ${documentIds.length} documents from ${getLocationName(locationId)} to Nanonets.`);

              // Check if the response has the expected structure
              if (!result.results || !Array.isArray(result.results)) {
                console.warn("Nanonets response doesn't have expected 'results' array structure:", result);
                // If no results array, assume success and keep status as 'processing'
                // The trigger will update to 'processed' when data comes back
                totalPending += documentIds.length;
                success = true;
                continue;
              }

              // Check results and show appropriate messages
              const processed = result.results.filter((r: { status: string }) => r.status === "processed").length || 0;
              const failed = result.results.filter((r: { status: string }) => r.status === "failed").length || 0;
              const pending = result.results.filter((r: { status: string }) => r.status === "pending" || r.status === "processing").length || 0;

              totalProcessed += processed;
              totalFailed += failed;
              totalPending += pending;

              // Update progress tracking
              setProcessingProgress(prev => prev ? {
                ...prev,
                processed: totalProcessed,
                failed: totalFailed,
                pending: totalPending
              } : null);

              console.log(`Batch ${batchIndex + 1} results - Processed: ${processed}, Failed: ${failed}, Pending/Processing: ${pending}`);

              if (processed > 0) {
                toast.success(`Batch ${batchIndex + 1}: Successfully processed ${processed} documents by Nanonets.`);
              }
              if (failed > 0) {
                toast.error(`Batch ${batchIndex + 1}: ${failed} documents failed to process by Nanonets.`);
                
                // Mark failed documents as failed in processed_tracker
                const failedDocumentIds = result.results
                  .filter((r: { status: string; document_id: number }) => r.status === "failed")
                  .map((r: { status: string; document_id: number }) => 
                    batch.find(doc => doc.document_id === r.document_id)?.id
                  )
                  .filter(Boolean) || [];
                  
                if (failedDocumentIds.length > 0) {
                  console.log("Marking documents as failed:", failedDocumentIds);
                  const { error: failError } = await supabase
                    .from("processed_tracker")
                    .update({ status: "failed", updated_at: new Date().toISOString() })
                    .in("id", failedDocumentIds);

                  if (failError) {
                    console.error("Failed to mark failed documents:", failError);
                  }
                }
              }

              // If documents are still pending/processing, keep them as 'processing' status
              // They will be updated to 'processed' when the trigger fires
              if (pending > 0) {
                console.log(`Batch ${batchIndex + 1}: ${pending} documents are still pending/processing in Nanonets`);
              }

              success = true;

            } catch (error) {
              retryCount++;
              if (retryCount >= BATCH_PROCESSING_CONFIG.MAX_RETRIES) {
                console.error(`Failed to process batch ${batchIndex + 1} after ${BATCH_PROCESSING_CONFIG.MAX_RETRIES} attempts:`, error);
                throw error;
              } else {
                const delay = Math.pow(2, retryCount) * BATCH_PROCESSING_CONFIG.RETRY_BASE_DELAY_MS; // Exponential backoff
                console.log(`Batch ${batchIndex + 1} failed, retrying in ${delay}ms (attempt ${retryCount}/${BATCH_PROCESSING_CONFIG.MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
        }
      }

      // Show final summary
      const summary = [];
      if (totalProcessed > 0) summary.push(`${totalProcessed} processed`);
      if (totalFailed > 0) summary.push(`${totalFailed} failed`);
      if (totalPending > 0) summary.push(`${totalPending} pending`);
      
      if (summary.length > 0) {
        toast.success(`Processing complete: ${summary.join(', ')}`);
      }

      // Refresh the documents list to show updated statuses
      await fetchDocuments(pagination.currentPage);
      setSelectedDocuments([]);
      
      // Clear progress tracking
      setProcessingProgress(null);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error sending documents to Nanonets: ${errorMessage}`);
    } finally {
      setSendingToNanonets(false);
    }
  };

  // Import new documents from e-conomic
  const importNewDocuments = async () => {
    if (!session?.access_token) {
      toast.error("You must be authenticated to import documents.");
      return;
    }

    if (grantTokens.length === 0) {
      toast.error("No grant tokens available. Please check your e-conomic integration setup.");
      return;
    }

    if (selectedLocations.length === 0) {
      toast.warning("Please select at least one location to import documents from.");
      return;
    }

    // Get grant tokens for selected locations
    const tokensToUse = grantTokens.filter(token => 
      selectedLocations.includes(token.location_id)
    );

    if (tokensToUse.length === 0) {
      toast.error("No grant tokens found for the selected locations.");
      return;
    }

    // Initialize import progress
    const totalSteps = tokensToUse.length * 4; // 4 steps per location: fetch, vouchers, documents, database
    const steps: ImportStep[] = [];
    
    // Create steps for each location
    tokensToUse.forEach((token, locationIndex) => {
      steps.push(
        {
          id: `fetch_${token.location_id}_${locationIndex}`,
          name: `Fetching data for ${token.location_name}`,
          status: 'pending'
        },
        {
          id: `vouchers_${token.location_id}_${locationIndex}`,
          name: `Processing vouchers for ${token.location_name}`,
          status: 'pending'
        },
        {
          id: `documents_${token.location_id}_${locationIndex}`,
          name: `Fetching documents for ${token.location_name}`,
          status: 'pending'
        },
        {
          id: `database_${token.location_id}_${locationIndex}`,
          name: `Saving to database for ${token.location_name}`,
          status: 'pending'
        }
      );
    });

    const startTime = new Date();
    const estimatedTime = `${Math.ceil(tokensToUse.length * 8)}s`; // Rough estimate: 8 seconds per location

    setImportProgress({
      isActive: true,
      currentStep: steps[0]?.id || '',
      totalSteps,
      completedSteps: 0,
      steps,
      overallMessage: `Starting import for ${tokensToUse.length} location(s)...`,
      estimatedTime,
      startTime
    });

    setFetchingDocuments(true);
    
    let completedSteps = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalVouchers = 0;

    try {
      const SUPABASE_FUNCTION_URL =
        "https://tbulqdabrpgioilodtwa.supabase.co/functions/v1/fetch-document-ids";

      console.log(`🔍 Starting import for ${tokensToUse.length} locations`);
      console.log(`📅 Accounting year: ${filters.accountingYear}`);
      
      for (const [locationIndex, token] of tokensToUse.entries()) {
        const baseStepIndex = locationIndex * 4;
        // baseStepIndex is used to calculate step indices for progress tracking
        
        // Update overall message
        setImportProgress(prev => prev ? {
          ...prev,
          overallMessage: `Processing ${token.location_name}...`,
          currentStep: steps[baseStepIndex]?.id || ''
        } : null);

        console.log(`📍 Processing location: ${token.location_name} (${token.location_id})`);
        console.log(`🔑 Grant token: ${token.grant_token.substring(0, 20)}...`);
        
        // Step 1: Fetch data
        const fetchStepIndex = baseStepIndex;
        setImportProgress(prev => {
          if (!prev) return null;
          const newSteps = [...prev.steps];
          newSteps[fetchStepIndex] = {
            ...newSteps[fetchStepIndex],
            status: 'processing',
            startTime: new Date(),
            message: 'Connecting to e-conomic...'
          };
          return { ...prev, steps: newSteps };
        });

        const body = {
          accountingYear: filters.accountingYear,
          grantToken: token.grant_token,
          accountNumberFrom: 1300,
          accountNumberTo: 1600,
        };

        // Step 2: Update to processing vouchers
        setImportProgress(prev => {
          if (!prev) return null;
          const newSteps = [...prev.steps];
          newSteps[fetchStepIndex] = {
            ...newSteps[fetchStepIndex],
            status: 'completed',
            endTime: new Date(),
            message: 'Connected successfully'
          };
          newSteps[fetchStepIndex + 1] = {
            ...newSteps[fetchStepIndex + 1],
            status: 'processing',
            startTime: new Date(),
            message: 'Searching for vouchers...'
          };
          return { 
            ...prev, 
            steps: newSteps,
            completedSteps: completedSteps + 1,
            currentStep: newSteps[fetchStepIndex + 1]?.id || ''
          };
        });
        completedSteps++;

        const res = await fetch(`${SUPABASE_FUNCTION_URL}?async=false&debug=true`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(body),
        });

        // Step 3: Update to processing documents
        setImportProgress(prev => {
          if (!prev) return null;
          const newSteps = [...prev.steps];
          newSteps[fetchStepIndex + 1] = {
            ...newSteps[fetchStepIndex + 1],
            status: 'completed',
            endTime: new Date(),
            message: 'Vouchers found'
          };
          newSteps[fetchStepIndex + 2] = {
            ...newSteps[fetchStepIndex + 2],
            status: 'processing',
            startTime: new Date(),
            message: 'Fetching document details...'
          };
          return { 
            ...prev, 
            steps: newSteps,
            completedSteps: completedSteps + 1,
            currentStep: newSteps[fetchStepIndex + 2]?.id || ''
          };
        });
        completedSteps++;

        if (!res.ok) {
          const errorText = await res.text();
          let userMessage = `Import failed for ${token.location_name}: `;
          if (errorText.includes('duplicate key value violates unique constraint')) {
            userMessage += 'Some documents were already imported for this location and year.';
          } else {
            userMessage += errorText;
          }
          
          // Mark current step as failed
          setImportProgress(prev => {
            if (!prev) return null;
            const newSteps = [...prev.steps];
            newSteps[fetchStepIndex + 2] = {
              ...newSteps[fetchStepIndex + 2],
              status: 'failed',
              endTime: new Date(),
              message: userMessage
            };
            return { 
              ...prev, 
              steps: newSteps,
              completedSteps: completedSteps + 1
            };
          });
          completedSteps++;
          
          toast.error(userMessage);
          continue;
        }

        const json = await res.json();
        console.log(`Document import response for ${token.location_name}:`, json);

        // Check if any new documents were actually inserted
        const insertedCount = json.upsert_results?.inserted || 0;
        const totalFetched = json.upsert_results?.total_processed || json.count || 0;
        const locationVouchers = json.totalVouchers || 0;
        const totalDocuments = json.count || 0;

        totalInserted += insertedCount;
        totalSkipped += json.upsert_results?.skipped || 0;
        totalVouchers += locationVouchers;

        console.log(`📊 Results for ${token.location_name}:`);
        console.log(`  - Total vouchers found: ${locationVouchers}`);
        console.log(`  - Total documents found: ${totalDocuments}`);
        console.log(`  - Documents inserted: ${insertedCount}`);
        console.log(`  - Documents skipped: ${json.upsert_results?.skipped || 0}`);

        // Step 4: Update to database step
        setImportProgress(prev => {
          if (!prev) return null;
          const newSteps = [...prev.steps];
          newSteps[fetchStepIndex + 2] = {
            ...newSteps[fetchStepIndex + 2],
            status: 'completed',
            endTime: new Date(),
            message: `${totalDocuments} documents found`
          };
          newSteps[fetchStepIndex + 3] = {
            ...newSteps[fetchStepIndex + 3],
            status: 'processing',
            startTime: new Date(),
            message: 'Saving to database...'
          };
          return { 
            ...prev, 
            steps: newSteps,
            completedSteps: completedSteps + 1,
            currentStep: newSteps[fetchStepIndex + 3]?.id || ''
          };
        });
        completedSteps++;

        // Step 5: Complete database step
        setImportProgress(prev => {
          if (!prev) return null;
          const newSteps = [...prev.steps];
          newSteps[fetchStepIndex + 3] = {
            ...newSteps[fetchStepIndex + 3],
            status: 'completed',
            endTime: new Date(),
            message: insertedCount > 0 ? `${insertedCount} new documents saved` : 'No new documents to save'
          };
          return { 
            ...prev, 
            steps: newSteps,
            completedSteps: completedSteps + 1
          };
        });
        completedSteps++;

        // Only show toast for significant results to reduce notification noise
        if (insertedCount > 0) {
          toast.success(
            `Imported ${insertedCount} new documents from ${token.location_name}`
          );
        }
        // Remove info/warning toasts for "no new documents" and "no vouchers" to reduce noise
      }

      // Update final progress
      setImportProgress(prev => prev ? {
        ...prev,
        overallMessage: `Import completed! ${totalInserted} new documents imported, ${totalSkipped} skipped, ${totalVouchers} vouchers processed.`,
        completedSteps: totalSteps
      } : null);

      // Refresh the documents list after all imports
      await fetchDocuments(1);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark current step as failed
      setImportProgress(prev => {
        if (!prev) return null;
        const newSteps = [...prev.steps];
        const currentStepIndex = newSteps.findIndex(step => step.status === 'processing');
        if (currentStepIndex !== -1) {
          newSteps[currentStepIndex] = {
            ...newSteps[currentStepIndex],
            status: 'failed',
            endTime: new Date(),
            message: errorMessage
          };
        }
        return { 
          ...prev, 
          steps: newSteps,
          overallMessage: `Import failed: ${errorMessage}`
        };
      });
      
      toast.error(`Error importing documents: ${errorMessage}`);
    } finally {
      setFetchingDocuments(false);
    }
  };

  // Update document status
  const updateDocumentStatus = async (documentId: string, status: ProcessedTrackerStatus) => {
    try {
      const { error } = await supabase
        .from("processed_tracker")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", documentId);

      if (error) {
        toast.error(`Failed to update status: ${error.message}`);
        return;
      }

      toast.success("Status updated successfully");
      await fetchDocuments(pagination.currentPage);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Bulk update selected documents
  const bulkUpdateStatus = async (status: ProcessedTrackerStatus) => {
    if (selectedDocuments.length === 0) {
      toast.warning("Please select documents to update.");
      return;
    }

    try {
      const { error } = await supabase
        .from("processed_tracker")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", selectedDocuments);

      if (error) {
        toast.error(`Failed to update documents: ${error.message}`);
        return;
      }

      toast.success(`Updated ${selectedDocuments.length} documents to ${status}`);
      setSelectedDocuments([]);
      await fetchDocuments(pagination.currentPage);
    } catch {
      toast.error("Failed to update documents");
    }
  };

  // Sync processed_tracker status with actual invoice_lines data
  const syncStatus = async () => {
    if (!session?.access_token) {
      toast.error("You must be authenticated to sync status.");
      return;
    }

    setSyncingStatus(true);
    try {
      const { data, error } = await supabase
        .rpc('sync_processed_tracker_status', {
          p_organization_id: session.user.id
        });

      if (error) {
        toast.error(`Failed to sync status: ${error.message}`);
        return;
      }

      const updatedCount = data?.filter((item: { updated: boolean }) => item.updated).length || 0;
      
      if (updatedCount > 0) {
        toast.success(`Successfully synced ${updatedCount} document statuses.`);
      } else {
        toast.info("No status updates needed. All documents are in sync.");
      }

      // Refresh the documents list to show updated statuses
      await fetchDocuments(pagination.currentPage);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error syncing status: ${errorMessage}`);
    } finally {
      setSyncingStatus(false);
    }
  };

  // Trigger ETL process via GitHub Actions
  const triggerETL = async () => {
    if (!session?.access_token) {
      toast.error("You must be authenticated to trigger ETL.");
      return;
    }

    setTriggeringETL(true);
    try {
      // Use Supabase client to invoke Edge Function (handles CORS automatically)
      const { error } = await supabase.functions.invoke('GITHUB-Trigger-ETL', {
        body: {
          organization_id: session.user.id,
        },
      });

      if (error) {
        throw new Error(`ETL trigger failed: ${error.message}`);
      }

      toast.success("ETL process triggered successfully.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error triggering ETL: ${errorMessage}`);
    } finally {
      setTriggeringETL(false);
    }
  };

  // Delete selected documents
  const deleteSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.warning("Please select documents to delete.");
      return;
    }

    setDeletingDocuments(true);
    try {
      const { error } = await supabase
        .from("processed_tracker")
        .delete()
        .in("id", selectedDocuments);

      if (error) {
        toast.error(`Failed to delete documents: ${error.message}`);
        return;
      }

      toast.success(`Successfully deleted ${selectedDocuments.length} documents`);
      setSelectedDocuments([]);
      
      // Refresh the documents list
      await fetchDocuments(pagination.currentPage);
    } catch {
      toast.error("Failed to delete documents");
    } finally {
      setDeletingDocuments(false);
    }
  };

  // Retry failed documents using status-based processing
  const retryFailedDocuments = async () => {
    if (!session?.access_token) {
      toast.error("You must be authenticated to retry failed documents.");
      return;
    }

    // Check if there are any failed documents
    const failedDocs = documents.filter(doc => doc.status === "failed");
    if (failedDocs.length === 0) {
      toast.warning("No failed documents to retry.");
      return;
    }

    setSendingToNanonets(true);
    try {
      const SUPABASE_FUNCTION_URL =
        "https://tbulqdabrpgioilodtwa.supabase.co/functions/v1/push-documents-to-nanonets";

      // Group failed documents by location to get the appropriate grant token
      const docsByLocation = failedDocs.reduce((acc, doc) => {
        if (!acc[doc.location_id!]) {
          acc[doc.location_id!] = [];
        }
        acc[doc.location_id!].push(doc);
        return acc;
      }, {} as Record<string, ProcessedTracker[]>);

      let totalProcessed = 0;
      let totalFailed = 0;

      // Process each location's failed documents
      for (const [locationId, docs] of Object.entries(docsByLocation)) {
        const grantToken = grantTokens.find(token => token.location_id === locationId);
        
        if (!grantToken) {
          toast.error(`No grant token found for location ${getLocationName(locationId)}`);
          continue;
        }

        const body = {
          status: "failed", // Use status-based processing
          grantToken: grantToken.grant_token,
          accountingYear: docs[0].accounting_year,
        };

        const res = await fetch(SUPABASE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to retry failed documents: ${errorText}`);
        }

        const result = await res.json();
        console.log(`Retry processing result for ${getLocationName(locationId)}:`, result);

        // Count results
        const processed = result.results?.filter((r: { status: string }) => r.status === "processed").length || 0;
        const failed = result.results?.filter((r: { status: string }) => r.status === "failed").length || 0;
        const skipped = result.results?.filter((r: { status: string }) => r.status === "skipped").length || 0;

        totalProcessed += processed;
        totalFailed += failed;

        // Show user feedback
        if (processed > 0) {
          toast.success(`Successfully retried ${processed} documents from ${getLocationName(locationId)}.`);
        }
        if (failed > 0) {
          toast.error(`${failed} documents still failed from ${getLocationName(locationId)}.`);
        }
        if (skipped > 0) {
          toast.info(`${skipped} documents were skipped (already processed) from ${getLocationName(locationId)}.`);
        }
      }

      // Show final summary
      if (totalProcessed > 0) {
        toast.success(`Retry complete: ${totalProcessed} documents successfully processed.`);
      }
      if (totalFailed > 0) {
        toast.error(`${totalFailed} documents still failed after retry.`);
      }

      // Refresh the documents list to show updated statuses
      await fetchDocuments(pagination.currentPage);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error retrying failed documents: ${errorMessage}`);
    } finally {
      setSendingToNanonets(false);
    }
  };

  // Helper function to get location name by ID
  const getLocationName = (locationId: string | null) => {
    if (!locationId) return "—";
    const location = locations?.find(loc => loc.location_id === locationId);
    return location?.name || locationId;
  };

  // Pagination helpers
  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const startIndex = (pagination.currentPage - 1) * pagination.pageSize + 1;
  const endIndex = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
      fetchDocuments(page);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when changing page size
    }));
    fetchDocuments(1, newPageSize); // Fetch first page with new page size
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sorting.sortField === field) {
      setSorting(prev => ({ 
        ...prev, 
        sortDirection: prev.sortDirection === "asc" ? "desc" : "asc" 
      }));
    } else {
      setSorting({ sortField: field, sortDirection: "desc" });
    }
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page when sorting
  };

  // Document selection helpers
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const selectAllDocuments = () => {
    const allDocumentIds = documents.map(doc => doc.id);
    
    // Check if selecting all would exceed the limit
    if (allDocumentIds.length > BATCH_PROCESSING_CONFIG.MAX_DOCUMENTS_PER_REQUEST) {
      toast.warning(`You have ${allDocumentIds.length} documents. Only the first ${BATCH_PROCESSING_CONFIG.MAX_DOCUMENTS_PER_REQUEST} will be selected.`);
      setSelectedDocuments(allDocumentIds.slice(0, BATCH_PROCESSING_CONFIG.MAX_DOCUMENTS_PER_REQUEST));
    } else {
      setSelectedDocuments(allDocumentIds);
    }
  };

  const clearSelection = () => {
    setSelectedDocuments([]);
  };

  // Update filters
  const updateFilters = (newFilters: Partial<ProcessedTrackerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Dismiss import progress
  const dismissImportProgress = () => {
    setImportProgress(null);
  };



  // Initial load effect
  useEffect(() => {
    fetchDocuments(pagination.currentPage);
    fetchGrantTokens();
  }, [filters.statusFilter, filters.locationFilter, pagination.currentPage, sorting.sortField, sorting.sortDirection]);

  // Auto-import on mount
  useEffect(() => {
    const initialLoad = async () => {
      await fetchGrantTokens();
      await importNewDocuments();
    };
    initialLoad();
  }, []); // Only run on mount

  // Only show the grant token error if not loading and still empty
  useEffect(() => {
    if (!grantTokensLoading && grantTokens.length === 0) {
      toast.error("No grant tokens available. Please check your e-conomic integration setup.");
    }
  }, [grantTokensLoading, grantTokens]);

  return {
    // State
    documents,
    grantTokens,
    grantTokensLoading,
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
    fetchGrantTokens,
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
  };
}; 