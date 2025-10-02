-- Fix processed_tracker status update using the correct relationship
-- The issue: We need to link through extracted_data table, not direct document_id matching

-- 1. Create the corrected trigger function that uses the proper relationship
CREATE OR REPLACE FUNCTION update_processed_tracker_on_invoice_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_extracted_data_id UUID;
    v_organization_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get values from the inserted row
    v_extracted_data_id := NEW.extracted_data_id;
    v_organization_id := NEW.organization_id;

    -- Only proceed if we have an extracted_data_id
    IF v_extracted_data_id IS NOT NULL THEN
        -- Update processed_tracker by linking through extracted_data table
        -- processed_tracker.document_id = extracted_data.external_id
        UPDATE processed_tracker 
        SET 
            status = 'processed',
            updated_at = NOW()
        WHERE 
            document_id = (
                SELECT ed.external_id 
                FROM extracted_data ed 
                WHERE ed.id = v_extracted_data_id
            )
            AND organization_id = v_organization_id
            AND status IN ('pending', 'processing');
        
        -- Get the number of updated rows
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        -- Log the update if any rows were affected
        IF v_updated_count > 0 THEN
            RAISE NOTICE 'Updated % processed_tracker record(s) to "processed" for extracted_data_id: %, organization_id: %', 
                         v_updated_count, v_extracted_data_id, v_organization_id;
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

-- 3. Create a function to fix existing processing records using the correct relationship
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
        -- Check if this document_id has corresponding invoice_lines through extracted_data
        -- processed_tracker.document_id = extracted_data.external_id
        -- invoice_lines.extracted_data_id = extracted_data.id
        IF EXISTS (
            SELECT 1 
            FROM extracted_data ed
            JOIN invoice_lines il ON il.extracted_data_id = ed.id
            WHERE ed.external_id = rec.document_id
              AND ed.organization_id = rec.organization_id
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

-- 4. Create a diagnostic function to show the relationships
CREATE OR REPLACE FUNCTION diagnose_processed_tracker_relationships()
RETURNS TABLE(
    processed_tracker_document_id TEXT,
    extracted_data_external_id TEXT,
    extracted_data_id UUID,
    invoice_lines_count BIGINT,
    relationship_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.document_id,
        ed.external_id,
        ed.id,
        COUNT(il.id) as invoice_lines_count,
        CASE 
            WHEN COUNT(il.id) > 0 THEN 'HAS_INVOICE_LINES'
            ELSE 'NO_INVOICE_LINES'
        END as relationship_status
    FROM processed_tracker pt
    LEFT JOIN extracted_data ed ON ed.external_id = pt.document_id AND ed.organization_id = pt.organization_id
    LEFT JOIN invoice_lines il ON il.extracted_data_id = ed.id
    WHERE pt.status IN ('processing', 'pending')
    GROUP BY pt.document_id, ed.external_id, ed.id
    ORDER BY pt.document_id
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO service_role;
GRANT EXECUTE ON FUNCTION fix_existing_processing_records() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_existing_processing_records() TO service_role;
GRANT EXECUTE ON FUNCTION diagnose_processed_tracker_relationships() TO authenticated;
GRANT EXECUTE ON FUNCTION diagnose_processed_tracker_relationships() TO service_role;

-- 6. Show current status before fix
SELECT '=== STATUS BEFORE FIX ===' as info;
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM processed_tracker 
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 7. Show the relationships to understand the data flow
SELECT '=== RELATIONSHIP DIAGNOSIS ===' as info;
SELECT * FROM diagnose_processed_tracker_relationships();

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

-- 11. Test the relationship query
SELECT '=== TESTING RELATIONSHIP QUERY ===' as info;
SELECT 
    COUNT(*) as total_processing,
    COUNT(CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM extracted_data ed
            JOIN invoice_lines il ON il.extracted_data_id = ed.id
            WHERE ed.external_id = pt.document_id
              AND ed.organization_id = pt.organization_id
        ) THEN 1 
    END) as with_invoice_lines
FROM processed_tracker pt
WHERE pt.status IN ('processing', 'pending');
