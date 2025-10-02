import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ECONOMIC_APP_SECRET = Deno.env.get("ECONOMIC_APP_SECRET");
const ECONOMIC_BASE_URL = "https://restapi.e-conomic.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const NANONETS_API_KEY = Deno.env.get("NANONETS_API_KEY");
const NANONETS_MODEL_ID = Deno.env.get("NANONETS_MODEL_ID");
const NANONETS_URL = `https://app.nanonets.com/api/v2/OCR/Model/${NANONETS_MODEL_ID}/LabelFile/`;

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }
  
  try {
    console.log("🚀 Edge function started");
    
    let body;
    try {
      body = await req.json();
      console.log("📥 Request body received:", { 
        documentIds: body.documentIds?.length || 0, 
        status: body.status, 
        accountingYear: body.accountingYear 
      });
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ error: "Invalid or missing JSON body" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }
    
    // Accept either documentIds+grantToken+accountingYear, or status+grantToken+accountingYear
    let { documentIds, status, grantToken, accountingYear } = body;
    if (!grantToken || !accountingYear) {
      console.error("❌ Missing required parameters:", { grantToken: !!grantToken, accountingYear: !!accountingYear });
      return new Response(JSON.stringify({ error: "Missing grantToken or accountingYear" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    // Get organization_id and location_id from grantToken (CRITICAL for location-specific processing)
    const { organization_id, location_id } = await getOrgAndLocationIdFromSupabase(grantToken);
    console.log(`📍 Location: ${location_id}, Organization: ${organization_id}`);
    
    // If status is provided, fetch documentIds from processed_tracker
    if (!documentIds && status) {
      console.log("📋 Fetching documentIds by status:", status);
      try {
        const statusList = Array.isArray(status) ? status : [status];
        const statusFilter = statusList.map((s) => `status=eq.${s}`).join("&");
        const url = `${SUPABASE_URL}/rest/v1/processed_tracker?accounting_year=eq.${accountingYear}&location_id=eq.${location_id}&${statusFilter}&select=document_id`;
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          }
        });
        if (!res.ok) {
          console.error("❌ Failed to fetch documentIds:", res.status);
          return new Response(JSON.stringify({ error: `Supabase error: ${res.status}` }), {
            status: 500,
            headers: CORS_HEADERS
          });
        }
        const data = await res.json();
        documentIds = data.map((row: any) => row.document_id);
        console.log("📋 Found documentIds:", documentIds.length);
      } catch (fetchError) {
        console.error("❌ Error fetching documentIds:", fetchError);
        return new Response(JSON.stringify({ error: `Failed to fetch documentIds: ${fetchError.message}` }), {
          status: 500,
          headers: CORS_HEADERS
        });
      }
    }
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      console.error("❌ No documentIds to process");
      return new Response(JSON.stringify({ error: "No documentIds to process" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }
    
    // For each document, fetch PDF and push to Nanonets
    const results = [];
    console.log(`🚀 Starting processing of ${documentIds.length} documents`);
    
    for (const docId of documentIds) {
      let result: any = { docId };
      console.log(`📄 Processing document ${docId}...`);
      
      try {
        if (await isAlreadyProcessed(docId, accountingYear, location_id)) {
          console.log(`⏭️ Document ${docId} already processed for location ${location_id}, skipping`);
          result.status = "skipped";
          result.reason = "already processed for this location";
          results.push(result);
          continue;
        }
        
        // Set status to "processing" when starting
        await updateProcessedTracker(docId, accountingYear, "processing", location_id);
        
        // Fetch PDF from e-conomic
        const pdf = await fetchPdf(docId, grantToken, accountingYear);
        
        // Upload to Nanonets
        const response = await sendPdfToNanonets(pdf, `${docId}.pdf`);
        
        // Update processed_tracker status to processing (ETL will set it to "processed" later)
        await updateProcessedTracker(docId, accountingYear, "processing", location_id);
        result.status = "processing";
        result.nanonetsResponse = response;
      } catch (err) {
        console.error(`❌ Error processing document ${docId}:`, err.message);
        // Update processed_tracker status to failed
        try {
          await updateProcessedTracker(docId, accountingYear, "failed", location_id);
        } catch (updateError) {
          console.error(`❌ Failed to update status to failed for document ${docId}:`, updateError);
        }
        
        result.status = "failed";
        result.error = err.message;
        
        // Check if this is a "no attachments" error and mark it differently
        if (err.message.includes("No attachments found") || err.message.includes("No PDF attachment found")) {
          result.reason = "no_pdf_attachments";
        }
      }
      results.push(result);
      await delay(200);
    }
    
    console.log(`🏁 Finished processing ${documentIds.length} documents`);
    console.log("📊 Final results:", results);
    
    return new Response(JSON.stringify({ results }), { headers: CORS_HEADERS });
  } catch (err) {
    console.error("💥 Unhandled error in edge function:", err);
    console.error("💥 Full error details:", err);
    
    return new Response(JSON.stringify({ 
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});

async function fetchPdf(docId: number, grantToken: string, accountingYear: string): Promise<Uint8Array> {
  
  try {
    const headers = {
      "X-AppSecretToken": ECONOMIC_APP_SECRET,
      "X-AgreementGrantToken": grantToken
    };
    
    
    const voucherInfo = await getVoucherInfoFromDocumentId(docId, accountingYear, grantToken);
    
    if (!voucherInfo) {
      throw new Error(`Could not find voucher information for document ${docId}`);
    }
    
    
    // Try to fetch the PDF directly using the voucher attachment endpoint
    // Skip the attachments check since the /attachment/file endpoint might work even if /attachments returns 404
    const url = `${ECONOMIC_BASE_URL}/journals/${voucherInfo.journalNumber}/vouchers/${accountingYear}-${voucherInfo.voucherNumber}/attachment/file`;
    
    const res = await fetch(url, { headers });
    
    
    if (!res.ok) {
      const errorText = await res.text();
      
      if (res.status === 404) {
        throw new Error(`No PDF attachment found for document ${docId} (voucher ${voucherInfo.voucherNumber}) - voucher has no PDF attachments`);
      } else {
        throw new Error(`Failed to fetch PDF for document ${docId} (voucher ${voucherInfo.voucherNumber}): ${res.status} - ${errorText}`);
      }
    }
    
    const pdfData = new Uint8Array(await res.arrayBuffer());
    return pdfData;
  } catch (error) {
    throw error;
  }
}

async function getVoucherInfoFromDocumentId(docId: number, accountingYear: string, grantToken: string): Promise<{ voucherNumber: number, journalNumber: number } | null> {
  const url = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${docId}&accounting_year=eq.${accountingYear}&select=voucher_number,account_number`;
  
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch voucher info for document ${docId}: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  
  if (!data || data.length === 0) {
    return null;
  }
  
  const record = data[0];
  
  if (!record.voucher_number) {
    return null;
  }
  
  // We need to find the journal number. Let's try to get it from the voucher entries
  const journalNumber = await findJournalNumberForVoucher(record.voucher_number, accountingYear, grantToken);
  
  return {
    voucherNumber: record.voucher_number,
    journalNumber: journalNumber
  };
}

async function findJournalNumberForVoucher(voucherNumber: number, accountingYear: string, grantToken: string): Promise<number> {
  // First, get the "Kreditorer" journal number
  const kreditorerJournalNumber = await getKreditorerJournalNumber(grantToken);
  
  // Try to find the voucher in the Kreditorer journal first
  try {
    const url = `${ECONOMIC_BASE_URL}/journals/${kreditorerJournalNumber}/entries?filter=voucher.voucherNumber$eq:${voucherNumber}`;
    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.collection && data.collection.length > 0) {
        return kreditorerJournalNumber;
      }
    }
  } catch (error) {
    // Continue to fallback journals
  }
  
  // Fallback: Try other common journals if not found in Kreditorer
  const fallbackJournals = [1, 2, 4, 5];
  
  for (const journalNumber of fallbackJournals) {
    try {
      const url = `${ECONOMIC_BASE_URL}/journals/${journalNumber}/entries?filter=voucher.voucherNumber$eq:${voucherNumber}`;
      const res = await fetch(url, {
        headers: {
          "X-AppSecretToken": ECONOMIC_APP_SECRET,
          "X-AgreementGrantToken": grantToken
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.collection && data.collection.length > 0) {
          return journalNumber;
        }
      }
    } catch (error) {
      // Continue to next journal
      continue;
    }
  }
  
  // Default to Kreditorer journal if we can't find it anywhere else
  return kreditorerJournalNumber;
}

async function getKreditorerJournalNumber(grantToken: string): Promise<number> {
  try {
    const url = `${ECONOMIC_BASE_URL}/journals`;
    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch journals: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Look for the journal with name "Kreditorer"
    for (const journal of data.collection || []) {
      if (journal.name === "Kreditorer") {
        return journal.journalNumber;
      }
    }
    
    // If not found, default to journal 3 (common Kreditorer journal number)
    console.warn("Kreditorer journal not found, defaulting to journal 3");
    return 3;
  } catch (error) {
    console.warn("Failed to fetch journals, defaulting to journal 3:", error.message);
    return 3;
  }
}

async function sendPdfToNanonets(pdfData: Uint8Array, filename: string, retryCount = 0): Promise<any> {
  const url = `${NANONETS_URL}?async=true`;
  const formData = new FormData();
  
  // Use proper FormData for Deno/edge function
  formData.append("file", new Blob([pdfData], { type: "application/pdf" }), filename);
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${NANONETS_API_KEY}:`)
      // Don't set Content-Type - let the browser set multipart boundary
    },
    body: formData
  });
  
  // Handle timeout (assume success)
  if (res.status === 408) {
    return { message: "TimeoutAssumedSuccess" };
  }
  
  // Handle rate limiting (429) with exponential backoff
  if (res.status === 429) {
    const maxRetries = 5;
    if (retryCount >= maxRetries) {
      throw new Error(`Rate limit exceeded after ${maxRetries} retries for ${filename}`);
    }
    
    // Exponential backoff: 30s, 60s, 120s, 240s, 480s
    const backoffDelay = 30000 * Math.pow(2, retryCount);
    console.log(`Rate limit hit for ${filename}. Retrying after ${backoffDelay / 1000}s (attempt ${retryCount + 1}/${maxRetries})`);
    
    await delay(backoffDelay);
    return sendPdfToNanonets(pdfData, filename, retryCount + 1);
  }
  
  // Handle other errors
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nanonets upload failed: ${res.status} — ${text}`);
  }
  
  return await res.json();
}

async function updateProcessedTracker(docId: number, accountingYear: string, status: string, location_id: string) {
  const existingRecord = await getExistingRecord(docId, accountingYear, location_id);
  
  if (!existingRecord) {
    throw new Error(`Document ${docId} not found in processed_tracker`);
  }
  
  const payload = {
    status: status,
    updated_at: new Date().toISOString()
  };
  
  const url = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${docId}&accounting_year=eq.${accountingYear}&location_id=eq.${location_id}`;
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update processed_tracker: ${res.status} - ${errorText}`);
  }
}

async function getExistingRecord(docId: number, accountingYear: string, location_id: string): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${docId}&accounting_year=eq.${accountingYear}&location_id=eq.${location_id}&select=location_id,organization_id`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    }
  });
  
  if (!res.ok) throw new Error(`Failed to fetch existing record: ${res.status}`);
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

async function isAlreadyProcessed(docId: number, accountingYear: string, location_id: string): Promise<boolean> {
  const url = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${docId}&accounting_year=eq.${accountingYear}&location_id=eq.${location_id}&status=eq.processed&select=id`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Failed to check processed_tracker: ${res.status}`);
  const data = await res.json();
  return data.length > 0;
}

async function getOrgAndLocationIdFromSupabase(grantToken: string): Promise<{ organization_id: string, location_id: string }> {
  const url = `${SUPABASE_URL}/rest/v1/economic_granttokens?grant_token=eq.${encodeURIComponent(grantToken)}&select=organization_id,location_id`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    }
  });
  if (!res.ok) throw new Error("Failed to fetch organization_id and location_id from Supabase");
  const data = await res.json();
  if (!data.length || !data[0].organization_id || !data[0].location_id) throw new Error("No organization_id or location_id found for this grant_token");
  return { organization_id: data[0].organization_id, location_id: data[0].location_id };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
} 