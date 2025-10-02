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

interface VoucherEntry {
  voucherNumber: number;
  accountingYear: string;
  date: string;
  journalNumber: number;
  accountNumber: number;
  amount: number;
  departmentNumber?: number;
}

interface DocumentInfo {
  number: number;
  pageCount: number;
  voucherNumber: number;
  accountingYear: string;
  accountNumber?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or missing JSON body" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }
    const { accountingYear, grantToken, accountNumberFrom = 1300, accountNumberTo = 1600 } = body;
    if (!accountingYear || !grantToken) {
      return new Response(JSON.stringify({ error: "Missing accountingYear or grantToken" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    console.log(`🔍 Using accounting year: ${accountingYear} and account range: ${accountNumberFrom}-${accountNumberTo}`);

    // Fetch organization_id and location_id from Supabase
    const { organization_id, location_id } = await getOrgAndLocationIdFromSupabase(grantToken);

    // Step 1: Fetch vouchers by account number range
    console.log("📊 Step 1: Fetching vouchers by account number range...");
    const vouchersByYear = await fetchVouchersByAccountRange(
      grantToken,
      accountNumberFrom,
      accountNumberTo,
      accountingYear
    );

    if (Object.keys(vouchersByYear).length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No vouchers found for the specified account range",
        totalVouchers: 0,
        totalDocuments: 0,
        organization_id,
        location_id,
        upsert_results: {
          total_processed: 0,
          inserted: 0,
          skipped: 0
        }
      }), {
        headers: CORS_HEADERS
      });
    }

    // Step 2: Fetch documents for those vouchers
    console.log("📄 Step 2: Fetching documents for the vouchers...");
    const documentsByYear = await fetchDocumentsForVouchers(
      grantToken,
      vouchersByYear
    );

    // Step 3: Prepare documents for upsert
    const allDocuments = Object.values(documentsByYear).flat();
    const documentsForUpsert = allDocuments.map((doc) => ({
      document_id: doc.number,
      accounting_year: doc.accountingYear,
      organization_id: organization_id,
      location_id: location_id,
      page_count: doc.pageCount,
      voucher_number: doc.voucherNumber,
      account_number: doc.accountNumber,
      status: "pending"
    }));

    // Step 4: Upsert documents to database
    console.log("💾 Step 3: Upserting documents to database...");
    const upsertResults = await upsertDocumentsInBatches(documentsForUpsert);

    // Extract statistics from the function response
    const summary = upsertResults.summary || {};
    const insertedCount = summary.inserted || 0;
    const skippedCount = summary.skipped || 0;

    return new Response(JSON.stringify({
      success: true,
      documents: allDocuments,
      count: allDocuments.length,
      organization_id,
      location_id,
      totalVouchers: Object.values(vouchersByYear).reduce((sum, vouchers) => sum + vouchers.length, 0),
      vouchersByYear,
      documentsByYear: Object.fromEntries(
        Object.entries(documentsByYear).map(([year, docs]) => [year, docs.length])
      ),
      upsert_results: {
        total_processed: summary.total_processed || 0,
        inserted: insertedCount,
        skipped: skippedCount
      }
    }), {
      headers: CORS_HEADERS
    });
  } catch (err) {
    console.error("Error in fetch-document-ids:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});

async function fetchVouchersByAccountRange(
  grantToken: string,
  accountNumberFrom: number,
  accountNumberTo: number,
  accountingYear: string
): Promise<Record<string, number[]>> {
  const allVouchers = new Map<string, { voucherNumber: number; accountingYear: string }>();

  // Fetch journal entries
  console.log("📝 Fetching journal entries...");
  const journalVouchers = await fetchJournalEntries(
    grantToken, 
    accountNumberFrom, 
    accountNumberTo, 
    accountingYear
  );
  
  for (const voucher of journalVouchers) {
    const key = `${voucher.accountingYear}_${voucher.voucherNumber}`;
    if (!allVouchers.has(key)) {
      allVouchers.set(key, {
        voucherNumber: voucher.voucherNumber,
        accountingYear: voucher.accountingYear
      });
    }
  }

  console.log(`✅ Found ${allVouchers.size} unique vouchers`);

  // Group vouchers by accounting year
  const vouchersByYear: Record<string, number[]> = {};
  for (const voucher of allVouchers.values()) {
    if (!vouchersByYear[voucher.accountingYear]) {
      vouchersByYear[voucher.accountingYear] = [];
    }
    vouchersByYear[voucher.accountingYear].push(voucher.voucherNumber);
  }

  return vouchersByYear;
}

async function fetchJournalEntries(
  grantToken: string,
  accountNumberFrom: number,
  accountNumberTo: number,
  accountingYear: string
): Promise<VoucherEntry[]> {
  const entries: VoucherEntry[] = [];
  
  // Get the Kreditorer journal number
  console.log("📚 Finding Kreditorer journal...");
  const kreditorerJournalNumber = await getKreditorerJournalNumber(grantToken);
  
  console.log(`📝 Fetching entries from Kreditorer journal (${kreditorerJournalNumber})...`);
  const journalEntries = await fetchEntriesFromJournal(
    grantToken,
    kreditorerJournalNumber,
    accountNumberFrom,
    accountNumberTo,
    accountingYear
  );
  entries.push(...journalEntries);

  return entries;
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

async function fetchEntriesFromJournal(
  grantToken: string,
  journalNumber: number,
  accountNumberFrom: number,
  accountNumberTo: number,
  accountingYear: string
): Promise<VoucherEntry[]> {
  const entries: VoucherEntry[] = [];
  let cursor: string | undefined = undefined;
  const seenCursors = new Set<string>();

  while (true) {
    // Use the correct filter syntax for the new API
    let url = `${ECONOMIC_BASE_URL}/journals/${journalNumber}/entries?filter=contraAccount.accountNumber$gte:${accountNumberFrom}$and:contraAccount.accountNumber$lte:${accountNumberTo}`;
    if (cursor) url += `&cursor=${cursor}`;

    console.log(`Fetching from URL: ${url}`);

    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to fetch entries from journal ${journalNumber}: ${res.status} - ${errorText}`);
      throw new Error(`Failed to fetch entries from journal ${journalNumber}: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    console.log(`Received ${data.collection?.length || 0} entries from journal ${journalNumber}`);
    
    for (const item of data.collection || []) {
      // Filter by accounting year in our code since API doesn't support it
      if (item.voucher && item.voucher.accountingYear === accountingYear) {
        entries.push({
          voucherNumber: item.voucher.voucherNumber,
          accountingYear: item.voucher.accountingYear,
          date: item.date,
          journalNumber: journalNumber,
          accountNumber: item.contraAccount?.accountNumber || item.account?.accountNumber,
          amount: item.amount,
          departmentNumber: item.department?.departmentNumber
        });
      }
    }

    const nextCursor = data.pagination?.nextCursor;
    if (!nextCursor || seenCursors.has(nextCursor)) break;
    cursor = nextCursor;
    seenCursors.add(cursor);
    await delay(200);
  }

  console.log(`Found ${entries.length} entries for accounting year ${accountingYear}`);
  return entries;
}

async function fetchDocumentsForVouchers(
  grantToken: string,
  vouchersByYear: Record<string, number[]>
): Promise<Record<string, DocumentInfo[]>> {
  const documentsByYear: Record<string, DocumentInfo[]> = {};

  // Process each accounting year
  for (const [accountingYear, voucherNumbers] of Object.entries(vouchersByYear)) {
    console.log(`📅 Processing accounting year: ${accountingYear} with ${voucherNumbers.length} vouchers`);
    
    const yearDocuments = await fetchDocumentsForYear(
      grantToken,
      accountingYear,
      voucherNumbers
    );

    documentsByYear[accountingYear] = yearDocuments;
  }

  return documentsByYear;
}

async function fetchDocumentsForYear(
  grantToken: string,
  accountingYear: string,
  voucherNumbers: number[]
): Promise<DocumentInfo[]> {
  const documents: DocumentInfo[] = [];
  
  console.log(`📄 Processing ${voucherNumbers.length} vouchers for year ${accountingYear}`);

  // Process each voucher individually to get its attachment
  for (const [index, voucherNumber] of voucherNumbers.entries()) {
    try {
      console.log(`📄 Processing voucher ${voucherNumber} (${index + 1}/${voucherNumbers.length})`);
      
      // Fetch the voucher attachment
      const voucherDocuments = await fetchVoucherAttachment(
        grantToken,
        voucherNumber,
        accountingYear
      );
      
      documents.push(...voucherDocuments);
      
      // Small delay between vouchers to be respectful to the API
      if (index < voucherNumbers.length - 1) {
        await delay(100);
      }
    } catch (error) {
      console.warn(`Failed to fetch documents for voucher ${voucherNumber}:`, error.message);
    }
  }

  return documents;
}

async function fetchVoucherAttachment(
  grantToken: string,
  voucherNumber: number,
  accountingYear: string
): Promise<DocumentInfo[]> {
  const documents: DocumentInfo[] = [];
  
  // Get the Kreditorer journal number
  const kreditorerJournalNumber = await getKreditorerJournalNumber(grantToken);
  
  try {
    // Use the correct endpoint structure for the new API
    const attachmentUrl = `${ECONOMIC_BASE_URL}/journals/${kreditorerJournalNumber}/vouchers/${accountingYear}-${voucherNumber}/attachment`;
    
    console.log(`Fetching attachment from: ${attachmentUrl}`);
    
    const res = await fetch(attachmentUrl, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (res.ok) {
      const data = await res.json();
      
      // Process the attachment data
      if (data.collection && Array.isArray(data.collection)) {
        for (const item of data.collection) {
          documents.push({
            number: item.number,
            pageCount: item.pageCount,
            voucherNumber: voucherNumber,
            accountingYear: accountingYear,
            accountNumber: undefined // Will be filled later if needed
          });
        }
      }
    } else {
      console.log(`No attachment found for voucher ${voucherNumber} (${res.status})`);
    }
  } catch (error) {
    console.warn(`Failed to fetch attachment for voucher ${voucherNumber}:`, error.message);
  }

  return documents;
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

async function upsertDocumentsInBatches(documents: any[]): Promise<any> {
  const batchSize = 100;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_new_documents`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_documents: batch
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to upsert batch ${Math.floor(i / batchSize) + 1}: ${res.status} - ${errorText}`);
    }
    
    const batchResults = await res.json();
    
    // Aggregate results from all batches
    if (batchResults.summary) {
      totalInserted += batchResults.summary.inserted || 0;
      totalSkipped += batchResults.summary.skipped || 0;
      totalProcessed += batchResults.summary.total_processed || 0;
    }
    
    // Small delay between batches to avoid overwhelming the database
    if (i + batchSize < documents.length) {
      await delay(100);
    }
  }
  
  return {
    summary: {
      total_processed: totalProcessed,
      inserted: totalInserted,
      skipped: totalSkipped
    }
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
