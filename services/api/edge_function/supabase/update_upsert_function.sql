-- Update the upsert function to handle all required columns including account_number and entry_type
-- This replaces the old upsert_new_documents function

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_new_documents(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_new_documents(jsonb) TO service_role;

