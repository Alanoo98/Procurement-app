-- Simple fix for processed_tracker status update issue
-- Both document_id and invoice_number are TEXT, so no type conversion needed

-- 1. Create a corrected trigger function (simplified)
CREATE OR REPLACE FUNCTION update_processed_tracker_on_invoice_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_document_id TEXT;
    v_location_id UUID;
    v_organization_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get values from the inserted row
    v_document_id := NEW.invoice_number;
    v_location_id := NEW.location_id;
    v_organization_id := NEW.organization_id;

    -- Only proceed if we have a document_id
    IF v_document_id IS NOT NULL AND v_document_id != '' THEN
        -- Update processed_tracker where document_id matches invoice_number
        UPDATE processed_tracker 
        SET 
            status = 'processed',
            updated_at = NOW()
        WHERE 
            document_id = v_document_id  -- Both are TEXT, no conversion needed
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

-- 3. Create a function to fix existing processing records
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
        IF EXISTS (
            SELECT 1 
            FROM invoice_lines il 
            WHERE il.invoice_number = rec.document_id  -- Both are TEXT, direct comparison
              AND il.organization_id = rec.organization_id
              AND (rec.location_id IS NULL OR il.location_id = rec.location_id)
        ) THEN
            -- Update the status to 'processed'
            UPDATE processed_tracker pt2
            SET 
                status = 'processed',
                updated_at = NOW()
            WHERE pt2.document_id = rec.document_id 
              AND pt2.organization_id = rec.organization_id
              AND (pt2.location_id = rec.location_id OR (pt2.location_id IS NULL AND rec.location_id IS NULL))
              AND pt2.status IN ('processing', 'pending');
            
            -- Return the result
            document_id := rec.document_id;
            old_status := rec.old_status;
            new_status := 'processed';
            updated := TRUE;
            v_updated_count := v_updated_count + 1;
            RETURN NEXT;
        ELSE
            -- Document has no invoice_lines, mark as failed
            UPDATE processed_tracker pt2
            SET 
                status = 'failed',
                updated_at = NOW()
            WHERE pt2.document_id = rec.document_id 
              AND pt2.organization_id = rec.organization_id
              AND (pt2.location_id = rec.location_id OR (pt2.location_id IS NULL AND rec.location_id IS NULL))
              AND pt2.status IN ('processing', 'pending');
            
            -- Return the result
            document_id := rec.document_id;
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

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO service_role;
GRANT EXECUTE ON FUNCTION fix_existing_processing_records() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_existing_processing_records() TO service_role;

-- 5. Show current status before fix
SELECT '=== STATUS BEFORE FIX ===' as info;
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM processed_tracker 
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 6. Run the fix for existing records
SELECT '=== FIXING EXISTING RECORDS ===' as info;
SELECT * FROM fix_existing_processing_records() LIMIT 10;

-- 7. Show status after fix
SELECT '=== STATUS AFTER FIX ===' as info;
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM processed_tracker 
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 8. Verify trigger is working
SELECT '=== TRIGGER VERIFICATION ===' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
  AND event_object_table = 'invoice_lines';

-- 9. Test query to see if there are matching records
SELECT '=== TESTING FOR MATCHING RECORDS ===' as info;
SELECT 
    COUNT(*) as total_processing,
    COUNT(CASE 
        WHEN EXISTS (
            SELECT 1 FROM invoice_lines il 
            WHERE il.invoice_number = pt.document_id
              AND il.organization_id = pt.organization_id
        ) THEN 1 
    END) as with_invoice_lines
FROM processed_tracker pt
WHERE pt.status IN ('processing', 'pending');
