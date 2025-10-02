import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ECONOMIC_APP_SECRET = Deno.env.get("ECONOMIC_APP_SECRET");
const ECONOMIC_JOURNALS_API_URL = "https://restapi.e-conomic.com";
const ECONOMIC_BOOKED_ENTRIES_API_URL = "https://restapi.e-conomic.com";
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

interface VoucherInfo {
  voucherNumber: number;
  accountingYear: string;
  accountNumber: number;
  journalNumber: number;
  date: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }
  
  // Check if this is a test request for CSV export
  const url = new URL(req.url);
  if (url.pathname.includes('/test-booked-entries-csv')) {
    return await handleTestBookedEntriesCSV(req);
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
    console.log(`⚡ Rate limiting: 200ms between requests`);
    console.log(`📄 Page size: 1000, Max pages: 1000`);

    // Fetch organization_id and location_id from Supabase
    const { organization_id, location_id } = await getOrgAndLocationIdFromSupabase(grantToken);
    console.log(`📍 Location: ${location_id}, Organization: ${organization_id}`);
    
    // Get current processed tracker statistics for debugging
    const trackerStats = await getProcessedTrackerStats(organization_id, location_id, accountingYear);
    console.log(`📊 Current processed tracker stats for ${accountingYear}:`);
    console.log(`   Total: ${trackerStats.total}, Booked: ${trackerStats.booked}, Journal: ${trackerStats.journal}`);
    console.log(`   By status:`, trackerStats.byStatus);

    // Step 1: Fetch vouchers by account number range
    console.log("\n📊 Step 1: Fetching vouchers by account number range...");
    const { vouchersByYear, voucherTypes, voucherDetails } = await fetchVouchersByAccountRange(
      grantToken,
      accountNumberFrom,
      accountNumberTo,
      accountingYear,
      organization_id,
      location_id
    );

    if (Object.keys(vouchersByYear).length === 0) {
      console.log(`⚠️ No vouchers found for account range ${accountNumberFrom}-${accountNumberTo} in year ${accountingYear}`);
      console.log(`📍 Location: ${location_id}, Organization: ${organization_id}`);
      
      return new Response(JSON.stringify({
        success: true,
        message: "No vouchers found for the specified account range",
        totalVouchers: 0,
        totalDocuments: 0,
        organization_id,
        location_id,
        processed_tracker_stats: trackerStats,
        upsert_results: {
          total_processed: 0,
          inserted: 0,
          skipped: 0
        }
      }), {
        headers: CORS_HEADERS
      });
    }

    console.log(`✅ Found vouchers in ${Object.keys(vouchersByYear).length} accounting year(s)`);
    for (const [year, vouchers] of Object.entries(vouchersByYear)) {
      console.log(`📅 Year ${year}: ${vouchers.length} vouchers`);
    }

    // Step 2: Prepare vouchers for upsert
    console.log("\n📄 Step 2: Preparing vouchers for database...");
    
    const vouchersForUpsert = voucherDetails.map((voucher) => ({
      document_id: voucher.voucherNumber.toString(), // Use voucher number as document_id (as string)
      accounting_year: voucher.accountingYear,
      organization_id: organization_id,
      location_id: location_id,
      page_count: 0, // Will be updated when we fetch the actual PDF
      voucher_number: voucher.voucherNumber,
      account_number: voucher.accountNumber,
      entry_type: voucherTypes.get(voucher.voucherNumber) || 'journal', // Add entry type
      status: "pending"
    }));

    // Calculate statistics
    const totalVouchers = Object.values(vouchersByYear).reduce((sum, vouchers) => sum + vouchers.length, 0);
    const bookedCount = Array.from(voucherTypes.values()).filter(type => type === 'booked').length;
    const journalCount = Array.from(voucherTypes.values()).filter(type => type === 'journal').length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`📝 Booked entries found: ${bookedCount}`);
    console.log(`📝 Journal entries found: ${journalCount}`);
    console.log(`📝 Total unique entries: ${voucherDetails.length}`);

    // Step 3: Upsert vouchers to database
    console.log("\n💾 Step 3: Upserting vouchers to database...");
    console.log(`📊 Attempting to upsert ${vouchersForUpsert.length} vouchers`);
    console.log(`📋 First few vouchers:`, vouchersForUpsert.slice(0, 3).map(v => `voucher ${v.voucher_number} (account ${v.account_number}, type: ${v.entry_type})`));
    console.log(`📍 Location ID: ${location_id}`);
    console.log(`🏢 Organization ID: ${organization_id}`);
    
    const upsertResults = await upsertDocumentsInBatches(vouchersForUpsert);

    // Extract statistics from the function response
    const summary = upsertResults.summary || {};
    const insertedCount = summary.inserted || 0;
    const skippedCount = summary.skipped || 0;

    return new Response(JSON.stringify({
      success: true,
      metadata: {
        accounting_year: accountingYear,
        account_range: {
          from: accountNumberFrom,
          to: accountNumberTo
        },
        organization_id: organization_id,
        location_id: location_id,
        processing_timestamp: new Date().toISOString(),
        total_entries: voucherDetails.length,
        booked_entries: bookedCount,
        journal_entries: journalCount
      },
      vouchers: voucherDetails,
      count: voucherDetails.length,
      organization_id,
      location_id,
      totalVouchers,
      bookedEntries: bookedCount,
      journalEntries: journalCount,
      vouchersByYear,
      processed_tracker_stats: trackerStats,
      summary: {
        by_entry_type: {
          booked: bookedCount,
          journal: journalCount
        },
        by_account_number: voucherDetails.reduce((acc: Record<string, number>, voucher) => {
          acc[voucher.accountNumber] = (acc[voucher.accountNumber] || 0) + 1;
          return acc;
        }, {}),
        voucher_numbers: voucherDetails.map(v => v.voucherNumber).sort((a, b) => a - b)
      },
      upsert_results: {
        total_processed: summary.total_processed || 0,
        inserted: insertedCount,
        skipped: skippedCount
      }
    }), {
      headers: CORS_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});

async function handleTestBookedEntriesCSV(req: Request): Promise<Response> {
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

    console.log(`🧪 TEST MODE: Fetching booked entries for CSV export`);
    console.log(`🔍 Using accounting year: ${accountingYear} and account range: ${accountNumberFrom}-${accountNumberTo}`);

    // Fetch organization_id and location_id from Supabase
    const { organization_id, location_id } = await getOrgAndLocationIdFromSupabase(grantToken);
    
    console.log(`📍 Location: ${location_id}, Organization: ${organization_id}`);

    // Fetch only booked entries
    const bookedEntries = await fetchBookedEntries(
      grantToken,
      accountNumberFrom,
      accountNumberTo,
      accountingYear,
      organization_id,
      location_id
    );

    console.log(`📊 Found ${bookedEntries.length} booked entries for CSV export`);

    // Convert to CSV format
    const csvHeaders = [
      'voucherNumber',
      'accountingYear', 
      'date',
      'accountNumber',
      'amount',
      'journalNumber',
      'departmentNumber'
    ];

    const csvRows = [csvHeaders.join(',')];
    
    for (const entry of bookedEntries) {
      const row = [
        entry.voucherNumber,
        entry.accountingYear,
        entry.date,
        entry.accountNumber,
        entry.amount,
        entry.journalNumber,
        entry.departmentNumber || ''
      ].map(field => `"${field}"`).join(',');
      
      csvRows.push(row);
    }

    const csvContent = csvRows.join('\n');
    const filename = `booked_entries_${accountingYear}_${accountNumberFrom}-${accountNumberTo}_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

async function fetchVouchersByAccountRange(
  grantToken: string,
  accountNumberFrom: number,
  accountNumberTo: number,
  accountingYear: string,
  organization_id: string,
  location_id: string
): Promise<{ 
  vouchersByYear: Record<string, number[]>; 
  voucherTypes: Map<number, 'booked' | 'journal'>; 
  voucherDetails: VoucherInfo[];
}> {
  const allVouchers = new Map<string, { voucherNumber: number; accountingYear: string; isBooked: boolean }>();
  const voucherTypes = new Map<number, 'booked' | 'journal'>();
  const voucherDetails: VoucherInfo[] = [];

  // Step 1: Fetch booked entries first (these are finalized)
  console.log("📝 Step 1: Fetching booked entries...");
  const bookedVouchers = await fetchBookedEntries(
    grantToken, 
    accountNumberFrom, 
    accountNumberTo, 
    accountingYear,
    organization_id,
    location_id
  );
  
  for (const voucher of bookedVouchers) {
    const key = `${voucher.accountingYear}_${voucher.voucherNumber}`;
    allVouchers.set(key, {
      voucherNumber: voucher.voucherNumber,
      accountingYear: voucher.accountingYear,
      isBooked: true
    });
    voucherTypes.set(voucher.voucherNumber, 'booked');
    
    // Add voucher details directly
    voucherDetails.push({
      voucherNumber: voucher.voucherNumber,
      accountingYear: voucher.accountingYear,
      accountNumber: voucher.accountNumber,
      journalNumber: voucher.journalNumber,
      date: voucher.date,
      amount: voucher.amount
    });
  }

  console.log(`✅ Found ${bookedVouchers.length} booked entries`);

  // Step 2: Fetch journal entries (draft entries)
  console.log("📝 Step 2: Fetching journal entries...");
  const journalVouchers = await fetchJournalEntries(
    grantToken, 
    accountNumberFrom, 
    accountNumberTo, 
    accountingYear,
    organization_id,
    location_id
  );
  
  // Only add journal entries if they're not already in booked entries
  for (const voucher of journalVouchers) {
    const key = `${voucher.accountingYear}_${voucher.voucherNumber}`;
    if (!allVouchers.has(key)) {
      allVouchers.set(key, {
        voucherNumber: voucher.voucherNumber,
        accountingYear: voucher.accountingYear,
        isBooked: false
      });
      voucherTypes.set(voucher.voucherNumber, 'journal');
      
      // Add voucher details directly
      voucherDetails.push({
        voucherNumber: voucher.voucherNumber,
        accountingYear: voucher.accountingYear,
        accountNumber: voucher.accountNumber,
        journalNumber: voucher.journalNumber,
        date: voucher.date,
        amount: voucher.amount
      });
    } else {
      console.log(`⏭️ Skipping journal voucher ${voucher.voucherNumber} - already exists as booked entry`);
    }
  }

  console.log(`✅ Found ${journalVouchers.length} journal entries (${journalVouchers.length - bookedVouchers.length} unique)`);

  // Group vouchers by accounting year
  const vouchersByYear: Record<string, number[]> = {};
  for (const voucher of allVouchers.values()) {
    if (!vouchersByYear[voucher.accountingYear]) {
      vouchersByYear[voucher.accountingYear] = [];
    }
    vouchersByYear[voucher.accountingYear].push(voucher.voucherNumber);
  }

  return { vouchersByYear, voucherTypes, voucherDetails };
}

async function fetchBookedEntries(
  grantToken: string,
  accountNumberFrom: number,
  accountNumberTo: number,
  accountingYear: string,
  organization_id: string,
  location_id: string
): Promise<VoucherEntry[]> {
  const entries: VoucherEntry[] = [];
  
  // Get the highest voucher number we've already processed for this organization/location/year
  const lastProcessedVoucher = await getLastProcessedVoucher(organization_id, location_id, accountingYear, 'booked');
  
  console.log(`🔍 Last processed booked voucher for ${accountingYear}: ${lastProcessedVoucher || 'none'}`);
  console.log(`🔍 Processing for location: ${location_id}`);
  
  let skipPages = 0;
  const pageSize = 1000; // Use maximum allowed page size for efficiency
  let totalProcessed = 0;
  let foundInRange = 0;
  let consecutiveEmptyPages = 0;
  const maxConsecutiveEmptyPages = 3; // Stop after 3 consecutive pages with no relevant entries
  const maxPages = 1000; // Increased limit to process all pages for the accounting year
  
  while (true && skipPages < maxPages) {
    // Use only client-side filtering since API filtering is not supported for account.accountNumber
    let url = `${ECONOMIC_JOURNALS_API_URL}/accounting-years/${accountingYear}/entries?pageSize=${pageSize}&skipPages=${skipPages}`;
    
    if (skipPages % 10 === 0) {
      console.log(`📄 Fetching booked entries page ${skipPages + 1} (${pageSize} per page)...`);
    }

    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch booked entries: ${res.status} - ${await res.text()}`);
    }

    const data = await res.json();
    const items = data.collection || [];
    
    if (items.length > 0) {
      console.log(`📊 Found ${items.length} entries on page ${skipPages + 1}`);
    }
    
    if (items.length === 0) {
      consecutiveEmptyPages++;
      console.log(`📄 Empty page ${skipPages + 1} (consecutive: ${consecutiveEmptyPages})`);
      
      if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
        console.log(`✅ Stopping after ${maxConsecutiveEmptyPages} consecutive empty pages`);
        break;
      }
      
      skipPages++;
      await delay(200); // Rate limiting
      continue;
    }
    
    // Reset consecutive empty pages counter
    consecutiveEmptyPages = 0;
    
    for (const item of items) {
      totalProcessed++;
      
      if (item.voucherNumber) {
        const accountNumber = item.account?.accountNumber;
        
        // TEMPORARILY DISABLED: Check if we've already processed this voucher
        // This was causing the date cutoff issue - we'll handle duplicates in the upsert logic instead
        // if (lastProcessedVoucher && item.voucherNumber <= lastProcessedVoucher) {
        //   continue; // Skip already processed vouchers silently
        // }
        
        // Debug logging only for entries in our target range
        if (accountNumber && accountNumber >= accountNumberFrom && accountNumber <= accountNumberTo) {
          console.log(`🔍 Found relevant voucher ${item.voucherNumber}, account ${accountNumber}, date: ${item.date}`);
        }
        
        // Client-side filtering for account number range and supplierInvoice entry type (as originally intended)
        if (accountNumber && accountNumber >= accountNumberFrom && accountNumber <= accountNumberTo && item.entryType === "supplierInvoice") {
          foundInRange++;
          
          entries.push({
            voucherNumber: item.voucherNumber,
            accountingYear: accountingYear,
            date: item.date,
            journalNumber: 0, // Booked entries don't have journal number
            accountNumber: accountNumber,
            amount: item.amount,
            departmentNumber: undefined
          });
        }
      }
    }
    
    skipPages++;
    await delay(200); // Rate limiting
  }

  console.log(`📈 Processed ${totalProcessed} total entries, found ${foundInRange} in range ${accountNumberFrom}-${accountNumberTo}`);
  
  // Log some examples of found entries for debugging
  if (foundInRange > 0) {
    console.log(`📋 Examples of found entries:`, entries.slice(0, 3).map(e => `voucher ${e.voucherNumber} (account ${e.accountNumber})`));
  }
  
  return entries;
}

async function fetchJournalEntries(
  grantToken: string,
  accountNumberFrom: number,
  accountNumberTo: number,
  accountingYear: string,
  organization_id: string,
  location_id: string
): Promise<VoucherEntry[]> {
  const entries: VoucherEntry[] = [];
  
  // Get the highest voucher number we've already processed for this organization/location/year
  const lastProcessedVoucher = await getLastProcessedVoucher(organization_id, location_id, accountingYear, 'journal');
  
  console.log(`🔍 Last processed journal voucher for ${accountingYear}: ${lastProcessedVoucher || 'none'}`);
  console.log(`🔍 Processing for location: ${location_id}`);
  
  // Get the Kreditorer journal number
  console.log("📚 Finding Kreditorer journal...");
  const kreditorerJournalNumber = await getKreditorerJournalNumber(grantToken);
  
  console.log(`📝 Fetching entries from Kreditorer journal (${kreditorerJournalNumber})...`);
  const journalEntries = await fetchEntriesFromJournal(
    grantToken,
    kreditorerJournalNumber,
    accountNumberFrom,
    accountNumberTo,
    accountingYear,
    lastProcessedVoucher
  );
  entries.push(...journalEntries);

  return entries;
}

async function fetchJournals(grantToken: string): Promise<{ journalNumber: number }[]> {
  const journals: { journalNumber: number }[] = [];
  let cursor: string | undefined = undefined;
  const seenCursors = new Set<string>();

  while (true) {
    let url = `${ECONOMIC_JOURNALS_API_URL}/journals`;
    if (cursor) url += `?cursor=${cursor}`;

    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch journals: ${res.status} - ${await res.text()}`);
    }

    const data = await res.json();
    
    for (const item of data.items || []) {
      journals.push({
        journalNumber: item.journalNumber
      });
    }

    const nextCursor = data.cursor;
    if (!nextCursor || seenCursors.has(nextCursor)) break;
    cursor = nextCursor;
    seenCursors.add(nextCursor);
    await delay(200);
  }

  return journals;
}

async function getKreditorerJournalNumber(grantToken: string): Promise<number> {
  try {
    const url = `${ECONOMIC_JOURNALS_API_URL}/journals`;
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
    
    console.log("📚 Available journals:", data.collection?.map((j: any) => ({ number: j.journalNumber, name: j.name })) || []);
    
    // Look for the journal with name "Kreditorer"
    for (const journal of data.collection || []) {
      if (journal.name === "Kreditorer") {
        console.log(`✅ Found Kreditorer journal: ${journal.journalNumber}`);
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
  accountingYear: string,
  lastProcessedVoucher: number | null
): Promise<VoucherEntry[]> {
  const entries: VoucherEntry[] = [];
  let skipPages = 0;
  const pageSize = 1000;
  let totalVouchers = 0;
  let foundInRange = 0;
  const maxPages = 1000;

  console.log(`📚 Using /journals/${journalNumber}/vouchers endpoint (like Python script)`);

  while (skipPages < maxPages) {
    let url = `${ECONOMIC_JOURNALS_API_URL}/journals/${journalNumber}/vouchers?pagesize=${pageSize}&skippages=${skipPages}`;
    
    if (skipPages % 10 === 0) {
      console.log(`📄 Fetching journal vouchers page ${skipPages + 1}...`);
    }

    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch vouchers from journal ${journalNumber}: ${res.status} - ${await res.text()}`);
    }

    const data = await res.json();
    const vouchers = data.collection || [];
    
    if (vouchers.length > 0) {
      console.log(`📊 Found ${vouchers.length} vouchers on page ${skipPages + 1}`);
    }
    
    if (vouchers.length === 0) {
      console.log(`📄 Empty page ${skipPages + 1}, stopping pagination`);
      break;
    }
    
    for (const voucher of vouchers) {
      totalVouchers++;
      
      // Check if voucher is from the right accounting year
      const voucherYear = voucher.accountingYear?.year;
      if (voucherYear !== accountingYear) {
        continue;
      }

      // TEMPORARILY DISABLED: Check if we've already processed this voucher
      // This was causing the date cutoff issue - we'll handle duplicates in the upsert logic instead
      // if (lastProcessedVoucher && voucher.voucherNumber <= lastProcessedVoucher) {
      //   continue;
      // }
      
      // Check supplier invoices in this voucher
      const supplierInvoices = voucher.entries?.supplierInvoices || [];
      
      for (const invoice of supplierInvoices) {
        const accountNumber = invoice.contraAccount?.accountNumber;
        
        // Debug logging only for entries in our target range
        if (accountNumber && accountNumber >= accountNumberFrom && accountNumber <= accountNumberTo) {
          console.log(`🔍 Found relevant journal voucher ${voucher.voucherNumber}, account ${accountNumber}, date: ${invoice.date}`);
        }
        
        // Client-side filtering for account number range and supplierInvoice entry type
        if (accountNumber && accountNumber >= accountNumberFrom && accountNumber <= accountNumberTo && invoice.entryType === "supplierInvoice") {
          foundInRange++;
          
          entries.push({
            voucherNumber: voucher.voucherNumber,
            accountingYear: voucherYear,
            date: invoice.date,
            journalNumber: journalNumber,
            accountNumber: accountNumber,
            amount: invoice.amount,
            departmentNumber: undefined // Not available in vouchers endpoint
          });
        }
      }
    }

    skipPages++;
    await delay(200); // Rate limiting
  }

  console.log(`📈 Processed ${totalVouchers} total journal vouchers, found ${foundInRange} supplier invoices in range ${accountNumberFrom}-${accountNumberTo}`);
  
  // Log some examples of found entries for debugging
  if (foundInRange > 0) {
    console.log(`📋 Examples of found journal entries:`, entries.slice(0, 3).map(e => `voucher ${e.voucherNumber} (account ${e.accountNumber})`));
  }
  
  return entries;
}





async function getAccountNumberForVoucher(
  grantToken: string, 
  voucherNumber: number, 
  accountingYear: string
): Promise<number | undefined> {
  try {
    // Try to get account number from booked entries first
    let url = `${ECONOMIC_BOOKED_ENTRIES_API_URL}/booked-entries?filter=voucherNumber$eq:${voucherNumber}$and:accountingYear$eq:${accountingYear}&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].accountNumber;
      }
    }

    // If not found in booked entries, try draft entries
    url = `${ECONOMIC_JOURNALS_API_URL}/draft-entries?filter=voucherNumber$eq:${voucherNumber}$and:accountingYear$eq:${accountingYear}&limit=1`;
    
    const draftRes = await fetch(url, {
      headers: {
        "X-AppSecretToken": ECONOMIC_APP_SECRET,
        "X-AgreementGrantToken": grantToken
      }
    });

    if (draftRes.ok) {
      const draftData = await draftRes.json();
      if (draftData.items && draftData.items.length > 0) {
        return draftData.items[0].accountNumber;
      }
    }

    return undefined;
  } catch (error) {
    console.warn(`Failed to get account number for voucher ${voucherNumber}:`, error);
    return undefined;
  }
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
  
  console.log(`🔄 Starting upsert process for ${documents.length} documents in batches of ${batchSize}`);
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`📦 Processing batch ${batchNumber}/${Math.ceil(documents.length / batchSize)} (${batch.length} documents)`);
    console.log(`📋 Sample document from batch:`, batch[0]);
    
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
      console.error(`❌ Failed to upsert batch ${batchNumber}: ${res.status} - ${errorText}`);
      throw new Error(`Failed to upsert batch ${batchNumber}: ${res.status} - ${errorText}`);
    }
    
    const batchResults = await res.json();
    console.log(`✅ Batch ${batchNumber} results:`, batchResults);
    
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
  
  console.log(`📊 Final upsert summary: ${totalInserted} inserted, ${totalSkipped} skipped, ${totalProcessed} total processed`);
  
  return {
    summary: {
      total_processed: totalProcessed,
      inserted: totalInserted,
      skipped: totalSkipped
    }
  };
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function getLastProcessedVoucher(
  organization_id: string,
  location_id: string,
  accountingYear: string,
  entry_type: 'booked' | 'journal'
): Promise<number | null> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/processed_tracker?organization_id=eq.${organization_id}&location_id=eq.${location_id}&accounting_year=eq.${accountingYear}&entry_type=eq.${entry_type}&select=voucher_number&order=voucher_number.desc&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    
    if (!res.ok) {
      console.warn(`Failed to fetch last processed voucher: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (data.length > 0 && data[0].voucher_number) {
      return data[0].voucher_number;
    }
    
    return null;
  } catch (error) {
    console.warn(`Error fetching last processed voucher:`, error);
    return null;
  }
}

async function getProcessedTrackerStats(
  organization_id: string,
  location_id: string,
  accountingYear: string
): Promise<{ total: number; booked: number; journal: number; byStatus: Record<string, number> }> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/processed_tracker?organization_id=eq.${organization_id}&location_id=eq.${location_id}&accounting_year=eq.${accountingYear}&select=entry_type,status`;
    
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    
    if (!res.ok) {
      console.warn(`Failed to fetch processed tracker stats: ${res.status}`);
      return { total: 0, booked: 0, journal: 0, byStatus: {} };
    }
    
    const data = await res.json();
    const total = data.length;
    const booked = data.filter((item: any) => item.entry_type === 'booked').length;
    const journal = data.filter((item: any) => item.entry_type === 'journal').length;
    
    const byStatus: Record<string, number> = {};
    for (const item of data) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }
    
    return { total, booked, journal, byStatus };
  } catch (error) {
    console.warn(`Error fetching processed tracker stats:`, error);
    return { total: 0, booked: 0, journal: 0, byStatus: {} };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
