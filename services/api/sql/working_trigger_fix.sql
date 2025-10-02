-- Working trigger fix: Link through extracted_data using document_id + ".pdf"
-- processed_tracker.document_id = "7587" 
-- extracted_data.external_id = "7587.pdf"
-- invoice_lines.extracted_data_id = extracted_data.id

-- 1. Create the working trigger function
CREATE OR REPLACE FUNCTION update_processed_tracker_on_invoice_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_document_id TEXT;
    v_organization_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get values from the inserted row
    v_organization_id := NEW.organization_id;

    -- Find the document_id by looking up the extracted_data record
    -- and removing the ".pdf" suffix from external_id
    SELECT REPLACE(ed.external_id, '.pdf', '') INTO v_document_id
    FROM extracted_data ed
    WHERE ed.id = NEW.extracted_data_id;

    -- Only proceed if we found a document_id
    IF v_document_id IS NOT NULL AND v_document_id != '' THEN
        -- Update processed_tracker where document_id matches (without .pdf)
        UPDATE processed_tracker 
        SET 
            status = 'processed',
            updated_at = NOW()
        WHERE 
            document_id = v_document_id
            AND organization_id = v_organization_id
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

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_update_processed_tracker_on_invoice_insert ON invoice_lines;

CREATE TRIGGER trigger_update_processed_tracker_on_invoice_insert
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_processed_tracker_on_invoice_insert();

-- 3. Fix existing processing records using the same logic
UPDATE processed_tracker 
SET status = 'processed', updated_at = NOW()
WHERE status IN ('processing', 'pending')
  AND EXISTS (
      SELECT 1 
      FROM extracted_data ed
      JOIN invoice_lines il ON il.extracted_data_id = ed.id
      WHERE ed.external_id = processed_tracker.document_id || '.pdf'
        AND ed.organization_id = processed_tracker.organization_id
  );

-- 4. Show the results
SELECT 
    status,
    COUNT(*) as count
FROM processed_tracker 
GROUP BY status
ORDER BY status;

-- 5. Verify the trigger is working
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_processed_tracker_on_invoice_insert'
  AND event_object_table = 'invoice_lines';
