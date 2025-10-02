# Account Number Filtering Edge Functions

This directory contains new edge functions that implement a two-step prefilter approach for filtering documents by account numbers in e-conomic.

## Overview

The existing `fetch-document-ids` function fetches all documents for a given accounting year, but cannot filter by account numbers because the Documents API doesn't expose account information. These new functions solve this by:

1. **Step 1**: Query the Journals API to find vouchers that touch specific account numbers
2. **Step 2**: Use those voucher numbers to fetch only the relevant documents

## New Edge Functions

### 1. `fetch-vouchers-by-account`
Fetches vouchers by account number range using the Economic Journals API.

**Endpoints Used:**
- `GET /journalsapi/v12.0.1/draft-entries` - For unbooked entries
- `GET /bookedEntriesApi/booked-entries` - For booked entries

**Features:**
- Filter by account number range (e.g., 1300-1400)
- Filter by journal number (default: 3 for Kreditorer)
- Date range filtering
- Cursor-based pagination
- Deduplication of vouchers across draft and booked entries

### 2. `fetch-documents-by-vouchers`
Fetches document IDs for specific vouchers using the Economic Documents API.

**Endpoints Used:**
- `GET /documentsapi/v2.1.0/AttachedDocuments` - With voucher number filtering

**Features:**
- Processes vouchers by accounting year
- Chunks voucher lists into batches of 200 (API limit)
- Uses `$in` filter for voucher numbers
- Handles cross-year accounting periods (e.g., 2024/2025)

### 3. `fetch-documents-by-account-range` (Combined Function)
Orchestrates the complete process from account range to document IDs.

**Workflow:**
1. Fetches vouchers by account number range
2. Fetches documents for those vouchers
3. Upserts documents to database

## Usage Examples

### Basic Usage (Account Range 1300-1400)
```javascript
// Call the combined function
const response = await fetch('/functions/v1/fetch-documents-by-account-range', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grantToken: 'your-grant-token',
    accountNumberFrom: 1300,
    accountNumberTo: 1400,
    journalNumber: 3, // Kreditorer
    dateFrom: '2025-01-01',
    dateTo: '2025-12-31',
    includeBooked: true,
    includeDraft: true
  })
});
```

### Example with Different Account Range and Date Range
```javascript
// Fetch documents for account range 5000-5999 in Q1 2024
const response = await fetch('/functions/v1/fetch-documents-by-account-range', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grantToken: 'your-grant-token',
    accountNumberFrom: 5000,
    accountNumberTo: 5999,
    journalNumber: 3, // Kreditorer
    dateFrom: '2024-01-01',
    dateTo: '2024-03-31',
    includeBooked: true,
    includeDraft: false // Only booked entries
  })
});
```

### Step-by-Step Usage
```javascript
// Step 1: Get vouchers by account range
const vouchersResponse = await fetch('/functions/v1/fetch-vouchers-by-account', {
  method: 'POST',
  body: JSON.stringify({
    grantToken: 'your-grant-token',
    accountNumberFrom: 1300,
    accountNumberTo: 1400,
    dateFrom: '2025-01-01',
    dateTo: '2025-12-31'
  })
});

const { vouchersByYear } = await vouchersResponse.json();

// Step 2: Get documents for those vouchers
const documentsResponse = await fetch('/functions/v1/fetch-documents-by-vouchers', {
  method: 'POST',
  body: JSON.stringify({
    grantToken: 'your-grant-token',
    vouchersByYear
  })
});
```

## API Parameters

### Common Parameters
- `grantToken` (required): Economic grant token for authentication
- `accountNumberFrom` (required): Start of account number range
- `accountNumberTo` (required): End of account number range
- `journalNumber` (default: 3): Journal number (3 = Kreditorer)
- `dateFrom` (required): Start date for filtering (YYYY-MM-DD format)
- `dateTo` (required): End date for filtering (YYYY-MM-DD format)
- `includeBooked` (default: true): Include booked entries
- `includeDraft` (default: true): Include draft entries

### Response Format
```json
{
  "success": true,
  "totalVouchers": 150,
  "totalDocuments": 45,
  "vouchersByYear": {
    "2025": [1234, 1235, 1236],
    "2024/2025": [1237, 1238]
  },
  "documentsByYear": {
    "2025": 30,
    "2024/2025": 15
  },
  "upsertResults": {
    "summary": {
      "total_processed": 45,
      "inserted": 40,
      "skipped": 5
    }
  }
}
```

## Key Features

### Account Number Filtering
- Filter by specific account ranges (e.g., 1300-1400)
- Support for all department IDs (no department filtering)
- Journal number filtering (default: 3 for Kreditorer)

### API Endpoints Used
1. **Journals API v12.0.1**: For draft entries with account number filtering
2. **Booked Entries API**: For booked entries with account number filtering  
3. **Documents API v2.1.0**: For fetching documents by voucher numbers

### Rate Limiting & Pagination
- 200ms delays between API calls
- Cursor-based pagination for all endpoints
- Chunking of voucher lists (max 200 per request)
- Batch processing for database operations

### Cross-Year Support
- Handles accounting years that span calendar years (e.g., 2024/2025)
- URL encoding for special characters in year names
- Proper filtering and grouping by accounting year

## Deployment

Deploy each function using the Supabase CLI:

```bash
# Deploy individual functions
supabase functions deploy fetch-vouchers-by-account
supabase functions deploy fetch-documents-by-vouchers
supabase functions deploy fetch-documents-by-account-range

# Or deploy all functions
supabase functions deploy
```

## Environment Variables

Ensure these environment variables are set in your Supabase project:

- `ECONOMIC_APP_SECRET`: Your e-conomic app secret
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Error Handling

All functions include comprehensive error handling:
- Invalid JSON body validation
- Missing required parameters (grantToken, accountNumberFrom, accountNumberTo, dateFrom, dateTo)
- Economic API error responses
- Database operation failures
- Rate limiting and pagination issues

### Validation Errors
The functions will return a 400 status code with descriptive error messages for:
- Missing `grantToken`
- Missing `accountNumberFrom` or `accountNumberTo`
- Missing `dateFrom` or `dateTo`
- Invalid JSON body format

## Performance Considerations

- Functions implement rate limiting (200ms delays) to respect Economic API limits
- Large voucher lists are chunked into batches of 200 (API limit)
- Database operations are batched in groups of 100
- Cursor-based pagination prevents infinite loops
- Deduplication prevents processing the same voucher multiple times
