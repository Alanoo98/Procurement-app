-- Simple test to verify the processed_tracker trigger fix
-- Run this after applying the main fix

-- 1. Check if there are any processing records that should be updated
SELECT '=== PROCESSING RECORDS THAT SHOULD BE UPDATED ===' as test_section;
SELECT 
    pt.document_id,
    pt.status,
    pt.organization_id,
    pt.updated_at,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM invoice_lines il 
            WHERE il.invoice_number = pt.document_id::TEXT
              AND il.organization_id = pt.organization_id
        ) THEN 'SHOULD_BE_PROCESSED'
        ELSE 'NO_INVOICE_LINES'
    END as expected_status
FROM processed_tracker pt
WHERE pt.status IN ('processing', 'pending')
ORDER BY pt.updated_at DESC
LIMIT 10;

-- 2. Test the trigger by simulating an invoice_lines insert
-- (This is just a verification - don't actually insert)
SELECT '=== TRIGGER SIMULATION TEST ===' as test_section;
SELECT 
    'Would trigger update for document_id: ' || pt.document_id::TEXT as simulation_result
FROM processed_tracker pt
WHERE pt.status IN ('processing', 'pending')
  AND EXISTS (
      SELECT 1 FROM invoice_lines il 
      WHERE il.invoice_number = pt.document_id::TEXT
        AND il.organization_id = pt.organization_id
  )
LIMIT 5;

-- 3. Check data type compatibility
SELECT '=== DATA TYPE COMPATIBILITY CHECK ===' as test_section;
SELECT 
    'processed_tracker.document_id' as column_name,
    data_type,
    'BIGINT' as expected_type,
    CASE WHEN data_type = 'bigint' THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM information_schema.columns 
WHERE table_name = 'processed_tracker' AND column_name = 'document_id'

UNION ALL

SELECT 
    'invoice_lines.invoice_number' as column_name,
    data_type,
    'TEXT' as expected_type,
    CASE WHEN data_type = 'text' THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM information_schema.columns 
WHERE table_name = 'invoice_lines' AND column_name = 'invoice_number';

-- 4. Show function definition to verify the fix
SELECT '=== UPDATED FUNCTION DEFINITION ===' as test_section;
SELECT 
    routine_name,
    CASE 
        WHEN routine_definition LIKE '%document_id::TEXT%' THEN 'FIXED - Uses type conversion'
        ELSE 'NEEDS_FIX - No type conversion found'
    END as fix_status
FROM information_schema.routines 
WHERE routine_name = 'update_processed_tracker_on_invoice_insert'
  AND routine_type = 'FUNCTION';
