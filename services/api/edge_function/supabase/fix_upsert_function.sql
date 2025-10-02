-- Create a more robust upsert function that properly handles conflicts

DROP FUNCTION IF EXISTS upsert_new_documents(jsonb);

CREATE OR REPLACE FUNCTION upsert_new_documents(p_documents JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    doc JSONB;
    inserted_count INTEGER := 0;
    skipped_count INTEGER := 0;
    total_processed INTEGER := 0;
    v_document_id BIGINT;
    v_accounting_year VARCHAR;
    v_organization_id UUID;
    v_location_id UUID;
BEGIN
    FOR doc IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
        total_processed := total_processed + 1;
        
        -- Extract values with proper error handling
        BEGIN
            v_document_id := (doc->>'document_id')::BIGINT;
            v_accounting_year := (doc->>'accounting_year')::VARCHAR;
            v_organization_id := (doc->>'organization_id')::UUID;
            v_location_id := (doc->>'location_id')::UUID;
            
            -- Check if record already exists
            IF EXISTS (
                SELECT 1 FROM public.processed_tracker 
                WHERE document_id = v_document_id
                AND accounting_year = v_accounting_year
                AND organization_id = v_organization_id
                AND location_id = v_location_id
            ) THEN
                -- Record exists, skip it
                skipped_count := skipped_count + 1;
            ELSE
                -- Record doesn't exist, insert it
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
                    v_document_id,
                    v_accounting_year,
                    v_organization_id,
                    v_location_id,
                    (doc->>'page_count')::INTEGER,
                    (doc->>'voucher_number')::INTEGER,
                    (doc->>'account_number')::INTEGER,
                    COALESCE(doc->>'entry_type', 'journal')::VARCHAR,
                    (doc->>'status')::VARCHAR,
                    NOW(),
                    NOW()
                );
                
                inserted_count := inserted_count + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log the error but continue processing other records
            RAISE WARNING 'Error processing document %: %', v_document_id, SQLERRM;
            skipped_count := skipped_count + 1;
        END;
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

