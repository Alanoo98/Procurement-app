-- Function to upsert new documents into processed_tracker table
-- This function prevents duplicates by checking existing records before inserting
-- Returns information about which documents were inserted vs skipped

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS upsert_new_documents(jsonb);

CREATE OR REPLACE FUNCTION upsert_new_documents(p_documents jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    doc_record jsonb;
    result_record jsonb;
    results jsonb := '[]'::jsonb;
    inserted_count integer := 0;
    skipped_count integer := 0;
BEGIN
    -- Loop through each document in the input array
    FOR doc_record IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
        -- Check if document already exists for this location
        IF EXISTS (
            SELECT 1 FROM processed_tracker 
            WHERE document_id = (doc_record->>'document_id')::text
            AND location_id = (doc_record->>'location_id')::uuid
        ) THEN
            -- Document already exists, skip it
            result_record := jsonb_build_object(
                'document_id', doc_record->>'document_id',
                'location_id', doc_record->>'location_id',
                'inserted', false,
                'reason', 'already_exists'
            );
            skipped_count := skipped_count + 1;
        ELSE
            -- Document doesn't exist, insert it
            INSERT INTO processed_tracker (
                document_id,
                accounting_year,
                organization_id,
                location_id,
                page_count,
                voucher_number,
                status,
                created_at,
                updated_at
            ) VALUES (
                (doc_record->>'document_id')::text,
                (doc_record->>'accounting_year')::text,
                (doc_record->>'organization_id')::uuid,
                (doc_record->>'location_id')::uuid,
                (doc_record->>'page_count')::integer,
                (doc_record->>'voucher_number')::integer,
                doc_record->>'status',
                NOW(),
                NOW()
            );
            
            result_record := jsonb_build_object(
                'document_id', doc_record->>'document_id',
                'location_id', doc_record->>'location_id',
                'inserted', true,
                'reason', 'new_document'
            );
            inserted_count := inserted_count + 1;
        END IF;
        
        -- Add result to results array
        results := results || result_record;
    END LOOP;
    
    -- Return summary and detailed results
    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'total_processed', jsonb_array_length(p_documents),
            'inserted', inserted_count,
            'skipped', skipped_count
        ),
        'results', results
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_new_documents(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_new_documents(jsonb) TO service_role; 