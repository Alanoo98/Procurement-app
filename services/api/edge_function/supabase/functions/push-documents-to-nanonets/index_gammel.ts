import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const ECONOMIC_APP_SECRET = Deno.env.get("ECONOMIC_APP_SECRET");
const ECONOMIC_BASE_URL = "https://apis.e-conomic.com/documentsapi/v2.0.0";
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
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: CORS_HEADERS
    });
  }
  try {
    let body;
    try {
      body = await req.json();
    } catch  {
      return new Response(JSON.stringify({
        error: "Invalid or missing JSON body"
      }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }
    // Accept either documentIds+grantToken+accountingYear, or status+grantToken+accountingYear
    let { documentIds, status, grantToken, accountingYear } = body;
    if (!grantToken || !accountingYear) {
      return new Response(JSON.stringify({
        error: "Missing grantToken or accountingYear"
      }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }
    // If status is provided, fetch documentIds from processed_tracker
    if (!documentIds && status) {
      const statusList = Array.isArray(status) ? status : [
        status
      ];
      const statusFilter = statusList.map((s)=>`status=eq.${s}`).join("&");
      const url = `${SUPABASE_URL}/rest/v1/processed_tracker?accounting_year=eq.${accountingYear}&${statusFilter}&select=document_id`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (!res.ok) {
        return new Response(JSON.stringify({
          error: `Supabase error: ${res.status}`
        }), {
          status: 500,
          headers: CORS_HEADERS
        });
      }
      const data = await res.json();
      documentIds = data.map((row)=>row.document_id);
    }
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return new Response(JSON.stringify({
        error: "No documentIds to process"
      }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }
    // For each document, fetch PDF and push to Nanonets
    const results = [];
    for (const docId of documentIds){
      let result = {
        docId
      };
      try {
        if (await isAlreadyProcessed(docId, accountingYear)) {
          result.status = "skipped";
          result.reason = "already processed";
          results.push(result);
          continue;
        }
        // Fetch PDF from e-conomic
        const pdf = await fetchPdf(docId, grantToken);
        // Upload to Nanonets
        const response = await sendPdfToNanonets(pdf, `${docId}.pdf`);
        // Update processed_tracker status to processing (NOT processed!)
        await updateProcessedTracker(docId, accountingYear, "processing");
        result.status = "processing"; // Changed from "processed" to "processing"
        result.nanonetsResponse = response;
      } catch (err) {
        // Update processed_tracker status to failed
        await updateProcessedTracker(docId, accountingYear, "failed");
        result.status = "failed";
        result.error = err.message;
      }
      results.push(result);
      await delay(200);
    }
    return new Response(JSON.stringify({
      results
    }), {
      headers: CORS_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});
async function fetchPdf(docId, grantToken) {
  const headers = {
    "X-AppSecretToken": ECONOMIC_APP_SECRET,
    "X-AgreementGrantToken": grantToken
  };
  const url = `${ECONOMIC_BASE_URL}/AttachedDocuments/${docId}/pdf`;
  const res = await fetch(url, {
    headers
  });
  if (!res.ok) throw new Error(`Failed to fetch PDF for ${docId}`);
  return new Uint8Array(await res.arrayBuffer());
}
async function sendPdfToNanonets(pdfData, filename, retryCount = 0) {
  const url = `${NANONETS_URL}?async=true`;
  const formData = new FormData();
  formData.append("file", new Blob([
    pdfData
  ], {
    type: "application/pdf"
  }), filename);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${NANONETS_API_KEY}:`)
    },
    body: formData
  });
  // Handle timeout (assume success)
  if (res.status === 408) {
    return {
      message: "TimeoutAssumedSuccess"
    };
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
async function updateProcessedTracker(docId, accountingYear, status) {
  // Use PATCH to update existing record instead of POST to insert
  const url = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${docId}&accounting_year=eq.${accountingYear}`;
  const payload = {
    status: status,
    updated_at: new Date().toISOString()
  };
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
    console.error(`Failed to update processed_tracker: ${res.status} - ${errorText}`);
    throw new Error(`Failed to update processed_tracker: ${res.status}`);
  }
}
async function isAlreadyProcessed(docId, accountingYear) {
  const url = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${docId}&accounting_year=eq.${accountingYear}&status=eq.processed&select=id`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Failed to check processed_tracker: ${res.status}`);
  const data = await res.json();
  return data.length > 0;
}
function delay(ms) {
  return new Promise((resolve)=>setTimeout(resolve, ms));
}
