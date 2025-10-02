-- Diagnostic script to identify the processed_tracker status update issue
-- This will help us understand why the trigger isn't working

-- 1. Check data types of key columns
SELECT '=== DATA TYPE ANALYSIS ===' as section;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE (table_name = 'processed_tracker' AND column_name = 'document_id')
   OR (table_name = 'invoice_lines' AND column_name = 'invoice_number')
ORDER BY table_name, column_name;

-- 2. Check if trigger exists and is enabled
SELECT '=== TRIGGER STATUS ===' as section;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
  AND event_object_table = 'invoice_lines';

-- 3. Sample data comparison - check for type mismatches
SELECT '=== SAMPLE DATA COMPARISON ===' as section;
SELECT 
    'processed_tracker' as source_table,
    document_id,
    pg_typeof(document_id) as data_type,
    status,
    organization_id
FROM processed_tracker 
WHERE status IN ('processing', 'pending')
LIMIT 5

UNION ALL

SELECT 
    'invoice_lines' as source_table,
    invoice_number::text as document_id,
    pg_typeof(invoice_number) as data_type,
    'N/A' as status,
    organization_id
FROM invoice_lines 
LIMIT 5;

-- 4. Check for records that should match but don't due to type issues
SELECT '=== POTENTIAL MATCHES (TYPE CONVERSION TEST) ===' as section;
SELECT 
    pt.document_id as pt_document_id,
    pt.status as pt_status,
    pt.organization_id as pt_org_id,
    il.invoice_number as il_invoice_number,
    il.organization_id as il_org_id,
    CASE 
        WHEN pt.document_id::text = il.invoice_number THEN 'EXACT_MATCH'
        WHEN pt.document_id = il.invoice_number::bigint THEN 'CONVERTED_MATCH'
        ELSE 'NO_MATCH'
    END as match_type
FROM processed_tracker pt
JOIN invoice_lines il ON pt.organization_id = il.organization_id
WHERE pt.status IN ('processing', 'pending')
  AND (
      pt.document_id::text = il.invoice_number 
      OR pt.document_id = il.invoice_number::bigint
  )
LIMIT 10;

-- 5. Count processing records that have corresponding invoice_lines
SELECT '=== PROCESSING RECORDS WITH INVOICE_LINES ===' as section;
SELECT 
    COUNT(*) as total_processing,
    COUNT(CASE 
        WHEN EXISTS (
            SELECT 1 FROM invoice_lines il 
            WHERE il.invoice_number = pt.document_id::text
              AND il.organization_id = pt.organization_id
        ) THEN 1 
    END) as with_invoice_lines,
    COUNT(CASE 
        WHEN EXISTS (
            SELECT 1 FROM invoice_lines il 
            WHERE il.invoice_number::bigint = pt.document_id
              AND il.organization_id = pt.organization_id
        ) THEN 1 
    END) as with_invoice_lines_bigint
FROM processed_tracker pt
WHERE pt.status IN ('processing', 'pending');

-- 6. Show function definition
SELECT '=== CURRENT TRIGGER FUNCTION ===' as section;
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_processed_tracker_on_invoice_insert'
  AND routine_type = 'FUNCTION';
