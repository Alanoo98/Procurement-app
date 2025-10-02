-- Fix the processed_tracker trigger function to handle data type mismatch
-- The issue: document_id is BIGINT, invoice_number is TEXT

-- 1. Create the corrected trigger function
CREATE OR REPLACE FUNCTION update_processed_tracker_on_invoice_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_document_id TEXT;
    v_location_id UUID;
    v_organization_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- Use invoice_number as text (no cast needed)
    v_document_id := NEW.invoice_number;
    v_location_id := NEW.location_id;
    v_organization_id := NEW.organization_id;

    -- Only proceed if we have a document_id
    IF v_document_id IS NOT NULL AND v_document_id != '' THEN
        -- Update processed_tracker where document_id (BIGINT) matches invoice_number (TEXT)
        -- Convert document_id to text for comparison
        UPDATE processed_tracker 
        SET 
            status = 'processed',
            updated_at = NOW()
        WHERE 
            document_id::TEXT = v_document_id  -- Convert BIGINT to TEXT for comparison
            AND organization_id = v_organization_id
            AND (
                (v_location_id IS NOT NULL AND location_id = v_location_id)
                OR (v_location_id IS NULL AND location_id IS NULL)
            )
            AND status IN ('pending', 'processing');
        
        -- Get the number of updated rows
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        -- Log the update if any rows were affected
        IF v_updated_count > 0 THEN
            RAISE NOTICE 'Updated % processed_tracker record(s) to "processed" for document_id: %, organization_id: %', 
                         v_updated_count, v_document_id, v_organization_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS trigger_update_processed_tracker_on_invoice_insert ON invoice_lines;

CREATE TRIGGER trigger_update_processed_tracker_on_invoice_insert
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_processed_tracker_on_invoice_insert();

-- 3. Create a function to manually fix existing processing records
CREATE OR REPLACE FUNCTION fix_existing_processing_records()
RETURNS TABLE(
    document_id TEXT,
    old_status TEXT,
    new_status TEXT,
    updated BOOLEAN
) AS $$
DECLARE
    rec RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    -- Loop through all processed_tracker records that are in 'processing' or 'pending' status
    FOR rec IN 
        SELECT 
            pt.document_id,
            pt.status as old_status,
            pt.organization_id,
            pt.location_id
        FROM processed_tracker pt
        WHERE pt.status IN ('processing', 'pending')
    LOOP
        -- Check if this document_id has corresponding invoice_lines
        -- Use the corrected comparison (BIGINT to TEXT conversion)
        IF EXISTS (
            SELECT 1 
            FROM invoice_lines il 
            WHERE il.invoice_number = rec.document_id::TEXT  -- Convert BIGINT to TEXT
              AND il.organization_id = rec.organization_id
              AND (rec.location_id IS NULL OR il.location_id = rec.location_id)
        ) THEN
            -- Update the status to 'processed'
            UPDATE processed_tracker 
            SET 
                status = 'processed',
                updated_at = NOW()
            WHERE document_id = rec.document_id 
              AND organization_id = rec.organization_id
              AND (location_id = rec.location_id OR (location_id IS NULL AND rec.location_id IS NULL))
              AND status IN ('processing', 'pending');
            
            -- Return the result
            document_id := rec.document_id::TEXT;
            old_status := rec.old_status;
            new_status := 'processed';
            updated := TRUE;
            v_updated_count := v_updated_count + 1;
            RETURN NEXT;
        ELSE
            -- Document has no invoice_lines, mark as failed
            UPDATE processed_tracker 
            SET 
                status = 'failed',
                updated_at = NOW()
            WHERE document_id = rec.document_id 
              AND organization_id = rec.organization_id
              AND (location_id = rec.location_id OR (location_id IS NULL AND rec.location_id IS NULL))
              AND status IN ('processing', 'pending');
            
            -- Return the result
            document_id := rec.document_id::TEXT;
            old_status := rec.old_status;
            new_status := 'failed';
            updated := TRUE;
            v_updated_count := v_updated_count + 1;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    -- Log summary
    RAISE NOTICE 'Fix completed. Updated % records.', v_updated_count;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a test function to verify the fix works
CREATE OR REPLACE FUNCTION test_processed_tracker_trigger()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
DECLARE
    v_processing_count INTEGER;
    v_processed_count INTEGER;
    v_failed_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Test 1: Check current status distribution
    SELECT COUNT(*) INTO v_processing_count FROM processed_tracker WHERE status = 'processing';
    SELECT COUNT(*) INTO v_processed_count FROM processed_tracker WHERE status = 'processed';
    SELECT COUNT(*) INTO v_failed_count FROM processed_tracker WHERE status = 'failed';
    SELECT COUNT(*) INTO v_total_count FROM processed_tracker;
    
    test_name := 'Status Distribution';
    result := 'PASS';
    details := FORMAT('Processing: %s, Processed: %s, Failed: %s, Total: %s', 
                     v_processing_count, v_processed_count, v_failed_count, v_total_count);
    RETURN NEXT;
    
    -- Test 2: Check trigger exists
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
          AND event_object_table = 'invoice_lines'
    ) THEN
        test_name := 'Trigger Exists';
        result := 'PASS';
        details := 'Trigger is properly configured';
    ELSE
        test_name := 'Trigger Exists';
        result := 'FAIL';
        details := 'Trigger is missing or misconfigured';
    END IF;
    RETURN NEXT;
    
    -- Test 3: Check for type mismatches
    IF EXISTS (
        SELECT 1 FROM processed_tracker pt
        JOIN invoice_lines il ON pt.organization_id = il.organization_id
        WHERE pt.status IN ('processing', 'pending')
          AND pt.document_id::TEXT = il.invoice_number
    ) THEN
        test_name := 'Type Compatibility';
        result := 'PASS';
        details := 'Found matching records that can be updated';
    ELSE
        test_name := 'Type Compatibility';
        result := 'WARN';
        details := 'No matching records found for testing';
    END IF;
    RETURN NEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO service_role;
GRANT EXECUTE ON FUNCTION fix_existing_processing_records() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_existing_processing_records() TO service_role;
GRANT EXECUTE ON FUNCTION test_processed_tracker_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION test_processed_tracker_trigger() TO service_role;

-- 6. Run diagnostics
SELECT '=== DIAGNOSTIC RESULTS ===' as info;
SELECT * FROM test_processed_tracker_trigger();

-- 7. Show current status before fix
SELECT '=== STATUS BEFORE FIX ===' as info;
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM processed_tracker 
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 8. Run the fix for existing records
SELECT '=== FIXING EXISTING RECORDS ===' as info;
SELECT * FROM fix_existing_processing_records() LIMIT 10;

-- 9. Show status after fix
SELECT '=== STATUS AFTER FIX ===' as info;
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM processed_tracker 
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 10. Verify trigger is working
SELECT '=== TRIGGER VERIFICATION ===' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
  AND event_object_table = 'invoice_lines';
