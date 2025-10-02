-- Fix processed_tracker status update when invoice_lines are inserted
-- This ensures that documents are marked as 'processed' when they appear in invoice_lines

-- 1. Create or replace the trigger function to update processed_tracker status
CREATE OR REPLACE FUNCTION update_processed_tracker_on_invoice_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_document_id TEXT;
    v_organization_id UUID;
    v_location_id UUID;
    v_invoice_number TEXT;
BEGIN
    -- Get the invoice_number from the inserted row
    v_invoice_number := NEW.invoice_number;
    v_organization_id := NEW.organization_id;
    v_location_id := NEW.location_id;
    
    -- Convert invoice_number to document_id format (handle both text and integer)
    v_document_id := v_invoice_number::TEXT;
    
    -- Update processed_tracker status to 'processed' if it exists and is in 'processing' or 'pending' status
    UPDATE processed_tracker 
    SET 
        status = 'processed',
        updated_at = NOW()
    WHERE document_id = v_document_id 
      AND organization_id = v_organization_id
      AND (location_id = v_location_id OR (location_id IS NULL AND v_location_id IS NULL))
      AND status IN ('processing', 'pending');
    
    -- Log the update if any rows were affected
    IF FOUND THEN
        RAISE NOTICE 'Updated processed_tracker status to processed for document_id: %, organization_id: %', 
                     v_document_id, v_organization_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if it exists and create a new one
DROP TRIGGER IF EXISTS trigger_update_processed_tracker_on_invoice_insert ON invoice_lines;

CREATE TRIGGER trigger_update_processed_tracker_on_invoice_insert
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_processed_tracker_on_invoice_insert();

-- 3. Create a function to manually sync existing processing records
CREATE OR REPLACE FUNCTION sync_processed_tracker_status(
    p_organization_id UUID DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
)
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
          AND (p_organization_id IS NULL OR pt.organization_id = p_organization_id)
          AND (p_location_id IS NULL OR pt.location_id = p_location_id)
    LOOP
        -- Check if this document_id has corresponding invoice_lines
        IF EXISTS (
            SELECT 1 
            FROM invoice_lines il 
            WHERE il.invoice_number = rec.document_id::TEXT
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
            document_id := rec.document_id;
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
            document_id := rec.document_id;
            old_status := rec.old_status;
            new_status := 'failed';
            updated := TRUE;
            v_updated_count := v_updated_count + 1;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    -- Log summary
    RAISE NOTICE 'Sync completed. Updated % records.', v_updated_count;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to get processing status summary
CREATE OR REPLACE FUNCTION get_processed_tracker_summary(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE(
    status TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.status::TEXT,
        COUNT(*) as count,
        ROUND(
            (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 
            2
        ) as percentage
    FROM processed_tracker pt
    WHERE (p_organization_id IS NULL OR pt.organization_id = p_organization_id)
    GROUP BY pt.status
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION update_processed_tracker_on_invoice_insert() TO service_role;
GRANT EXECUTE ON FUNCTION sync_processed_tracker_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_processed_tracker_status(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_processed_tracker_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_processed_tracker_summary(UUID) TO service_role;

-- 6. Show current status before applying fixes
SELECT 'Current processed_tracker status summary:' as info;
SELECT * FROM get_processed_tracker_summary();

-- 7. Run the sync function to fix existing records
SELECT 'Running sync to fix existing processing records...' as info;
SELECT * FROM sync_processed_tracker_status();

-- 8. Show status after applying fixes
SELECT 'Processed_tracker status summary after sync:' as info;
SELECT * FROM get_processed_tracker_summary();

-- 9. Verify trigger is created
SELECT 'Trigger verification:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
  AND event_object_table = 'invoice_lines';
