-- Test script to verify the processed_tracker status update fix
-- Run this after applying the main fix to verify everything works

-- 1. Check current trigger status
SELECT '=== TRIGGER VERIFICATION ===' as test_section;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
  AND event_object_table = 'invoice_lines';

-- 2. Check current processed_tracker status distribution
SELECT '=== CURRENT STATUS DISTRIBUTION ===' as test_section;
SELECT * FROM get_processed_tracker_summary();

-- 3. Find some examples of processing records that should be updated
SELECT '=== PROCESSING RECORDS THAT SHOULD BE UPDATED ===' as test_section;
SELECT 
    pt.document_id,
    pt.status,
    pt.organization_id,
    pt.location_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM invoice_lines il 
            WHERE il.invoice_number = pt.document_id::TEXT
              AND il.organization_id = pt.organization_id
        ) THEN 'HAS_INVOICE_LINES'
        ELSE 'NO_INVOICE_LINES'
    END as invoice_lines_status
FROM processed_tracker pt
WHERE pt.status IN ('processing', 'pending')
LIMIT 10;

-- 4. Test the sync function on a small subset (optional - uncomment to run)
-- SELECT '=== TESTING SYNC FUNCTION ===' as test_section;
-- SELECT * FROM sync_processed_tracker_status() LIMIT 5;

-- 5. Check if there are any invoice_lines without corresponding processed_tracker records
SELECT '=== INVOICE_LINES WITHOUT PROCESSED_TRACKER ===' as test_section;
SELECT 
    il.invoice_number,
    il.organization_id,
    COUNT(*) as line_count,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM processed_tracker pt 
            WHERE pt.document_id = il.invoice_number::TEXT
              AND pt.organization_id = il.organization_id
        ) THEN 'HAS_TRACKER'
        ELSE 'NO_TRACKER'
    END as tracker_status
FROM invoice_lines il
GROUP BY il.invoice_number, il.organization_id
HAVING NOT EXISTS (
    SELECT 1 FROM processed_tracker pt 
    WHERE pt.document_id = il.invoice_number::TEXT
      AND pt.organization_id = il.organization_id
)
LIMIT 10;

-- 6. Show function definitions
SELECT '=== FUNCTION DEFINITIONS ===' as test_section;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
    'update_processed_tracker_on_invoice_insert',
    'sync_processed_tracker_status',
    'get_processed_tracker_summary'
)
ORDER BY routine_name;
