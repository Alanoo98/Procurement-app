-- Add entry_type column to processed_tracker table
ALTER TABLE public.processed_tracker 
ADD COLUMN entry_type VARCHAR(20) DEFAULT 'journal' CHECK (entry_type IN ('booked', 'journal'));

-- Add index for better query performance
CREATE INDEX idx_processed_tracker_entry_type ON public.processed_tracker(entry_type);

-- Add composite index for common queries
CREATE INDEX idx_processed_tracker_status_entry_type ON public.processed_tracker(status, entry_type);

-- Update the upsert function to handle the new column
CREATE OR REPLACE FUNCTION upsert_new_documents(p_documents JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    doc JSONB;
    inserted_count INTEGER := 0;
    skipped_count INTEGER := 0;
    total_processed INTEGER := 0;
BEGIN
    FOR doc IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
        total_processed := total_processed + 1;
        
        -- Try to insert, if conflict then skip
        INSERT INTO public.processed_tracker (
            document_id,
            accounting_year,
            organization_id,
            location_id,
            page_count,
            voucher_number,
            account_number,
            entry_type,
            status,
            created_at,
            updated_at
        ) VALUES (
            (doc->>'document_id')::BIGINT,
            (doc->>'accounting_year')::VARCHAR,
            (doc->>'organization_id')::UUID,
            (doc->>'location_id')::UUID,
            (doc->>'page_count')::INTEGER,
            (doc->>'voucher_number')::INTEGER,
            (doc->>'account_number')::INTEGER,
            COALESCE(doc->>'entry_type', 'journal')::VARCHAR,
            (doc->>'status')::VARCHAR,
            NOW(),
            NOW()
        )
        ON CONFLICT (document_id, accounting_year, organization_id, location_id) 
        DO NOTHING;
        
        IF FOUND THEN
            inserted_count := inserted_count + 1;
        ELSE
            skipped_count := skipped_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'total_processed', total_processed,
            'inserted', inserted_count,
            'skipped', skipped_count
        )
    );
END;
$$;
