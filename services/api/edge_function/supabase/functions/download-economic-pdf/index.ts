import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ECONOMIC_APP_SECRET = Deno.env.get("ECONOMIC_APP_SECRET");
const ECONOMIC_BASE_URL = "https://restapi.e-conomic.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    const body = await req.json();
    const { invoiceNumber } = body || {};

    if (!invoiceNumber) {
      return new Response(JSON.stringify({ error: "Missing invoiceNumber" }), { status: 400, headers: CORS_HEADERS });
    }

    // 1) First, find the voucher number from the invoice number by looking through extracted_data and invoice_lines
    // The relationship is: invoice_lines.invoice_number -> extracted_data.external_id (voucher_number + ".pdf") -> processed_tracker.document_id (voucher_number)
    const invoiceLookupUrl = `${SUPABASE_URL}/rest/v1/invoice_lines?invoice_number=eq.${encodeURIComponent(invoiceNumber)}&select=extracted_data_id,organization_id,location_id&limit=1`;
    const invoiceRes = await fetch(invoiceLookupUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    if (!invoiceRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to query invoice_lines: ${invoiceRes.status}` }), { status: 500, headers: CORS_HEADERS });
    }
    const invoiceData = await invoiceRes.json();
    if (!Array.isArray(invoiceData) || invoiceData.length === 0) {
      return new Response(JSON.stringify({ error: `No invoice found with number ${invoiceNumber}` }), { status: 404, headers: CORS_HEADERS });
    }
    const { extracted_data_id, organization_id, location_id } = invoiceData[0];
    
    // 2) Get the voucher number from extracted_data
    const extractedDataUrl = `${SUPABASE_URL}/rest/v1/extracted_data?id=eq.${extracted_data_id}&select=external_id&limit=1`;
    const extractedRes = await fetch(extractedDataUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    if (!extractedRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to query extracted_data: ${extractedRes.status}` }), { status: 500, headers: CORS_HEADERS });
    }
    const extractedData = await extractedRes.json();
    if (!Array.isArray(extractedData) || extractedData.length === 0) {
      return new Response(JSON.stringify({ error: `No extracted_data found for invoice ${invoiceNumber}` }), { status: 404, headers: CORS_HEADERS });
    }
    const { external_id } = extractedData[0];
    const voucher_number = external_id.replace('.pdf', ''); // Remove .pdf suffix to get voucher number
    
    // 3) Now lookup processed_tracker using the voucher number
    const trackerUrl = `${SUPABASE_URL}/rest/v1/processed_tracker?document_id=eq.${encodeURIComponent(voucher_number)}&organization_id=eq.${organization_id}&select=accounting_year&order=updated_at.desc&limit=1`;
    const trackerRes = await fetch(trackerUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    if (!trackerRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to query processed_tracker: ${trackerRes.status}` }), { status: 500, headers: CORS_HEADERS });
    }
    const trackerData = await trackerRes.json();
    if (!Array.isArray(trackerData) || trackerData.length === 0) {
      return new Response(JSON.stringify({ error: `No processed_tracker entry found for voucher ${voucher_number}` }), { status: 404, headers: CORS_HEADERS });
    }
    const { accounting_year } = trackerData[0];

    // 4) Lookup grant token for this org/location
    const tokenUrl = `${SUPABASE_URL}/rest/v1/economic_granttokens?organization_id=eq.${organization_id}&location_id=eq.${location_id}&select=grant_token&limit=1`;
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch grant token: ${tokenRes.status}` }), { status: 500, headers: CORS_HEADERS });
    }
    const tokenData = await tokenRes.json();
    if (!Array.isArray(tokenData) || tokenData.length === 0 || !tokenData[0].grant_token) {
      return new Response(JSON.stringify({ error: `No grant token found for organization/location` }), { status: 404, headers: CORS_HEADERS });
    }
    const grantToken: string = tokenData[0].grant_token;

    // 5) Find journal number
    const journalNumber = await findJournalNumberForVoucher(voucher_number, String(accounting_year), grantToken);

    // 6) Fetch PDF from e-conomic
    const headers = {
      "X-AppSecretToken": ECONOMIC_APP_SECRET!,
      "X-AgreementGrantToken": grantToken
    };
    const url = `${ECONOMIC_BASE_URL}/journals/${journalNumber}/vouchers/${accounting_year}-${voucher_number}/attachment/file`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errorText = await res.text();
      return new Response(JSON.stringify({ error: `Failed to fetch PDF: ${res.status} - ${errorText}` }), { status: 502, headers: CORS_HEADERS });
    }
    const pdfData = new Uint8Array(await res.arrayBuffer());
    const base64 = arrayBufferToBase64(pdfData);

    return new Response(JSON.stringify({
      filename: `${invoiceNumber}.pdf`,
      fileBase64: base64
    }), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS_HEADERS });
  }
});

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function findJournalNumberForVoucher(voucherNumber: number, accountingYear: string, grantToken: string): Promise<number> {
  const kreditorerJournalNumber = await getKreditorerJournalNumber(grantToken);
  try {
    const url = `${ECONOMIC_BASE_URL}/journals/${kreditorerJournalNumber}/entries?filter=voucher.voucherNumber$eq:${voucherNumber}`;
    const res = await fetch(url, { headers: { "X-AppSecretToken": ECONOMIC_APP_SECRET!, "X-AgreementGrantToken": grantToken } });
    if (res.ok) {
      const data = await res.json();
      if (data.collection && data.collection.length > 0) return kreditorerJournalNumber;
    }
  } catch {}

  const fallbackJournals = [1, 2, 4, 5];
  for (const journalNumber of fallbackJournals) {
    try {
      const url = `${ECONOMIC_BASE_URL}/journals/${journalNumber}/entries?filter=voucher.voucherNumber$eq:${voucherNumber}`;
      const res = await fetch(url, { headers: { "X-AppSecretToken": ECONOMIC_APP_SECRET!, "X-AgreementGrantToken": grantToken } });
      if (res.ok) {
        const data = await res.json();
        if (data.collection && data.collection.length > 0) return journalNumber;
      }
    } catch {}
  }
  return kreditorerJournalNumber;
}

async function getKreditorerJournalNumber(grantToken: string): Promise<number> {
  try {
    const url = `${ECONOMIC_BASE_URL}/journals`;
    const res = await fetch(url, { headers: { "X-AppSecretToken": ECONOMIC_APP_SECRET!, "X-AgreementGrantToken": grantToken } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    for (const journal of data.collection || []) {
      if (journal.name === "Kreditorer") return journal.journalNumber;
    }
    return 3;
  } catch {
    return 3;
  }
}


