-- Fix table structure and upsert function to match edge function requirements

-- First, add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add voucher_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'processed_tracker' AND column_name = 'voucher_number') THEN
        ALTER TABLE public.processed_tracker ADD COLUMN voucher_number INTEGER;
    END IF;
    
    -- Add account_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'processed_tracker' AND column_name = 'account_number') THEN
        ALTER TABLE public.processed_tracker ADD COLUMN account_number INTEGER;
    END IF;
    
    -- Add entry_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'processed_tracker' AND column_name = 'entry_type') THEN
        ALTER TABLE public.processed_tracker ADD COLUMN entry_type VARCHAR(20) DEFAULT 'journal' CHECK (entry_type IN ('booked', 'journal'));
    END IF;
    
    -- Add created_at and updated_at columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'processed_tracker' AND column_name = 'created_at') THEN
        ALTER TABLE public.processed_tracker ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'processed_tracker' AND column_name = 'updated_at') THEN
        ALTER TABLE public.processed_tracker ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processed_tracker_voucher_number ON public.processed_tracker(voucher_number);
CREATE INDEX IF NOT EXISTS idx_processed_tracker_account_number ON public.processed_tracker(account_number);
CREATE INDEX IF NOT EXISTS idx_processed_tracker_entry_type ON public.processed_tracker(entry_type);
CREATE INDEX IF NOT EXISTS idx_processed_tracker_status_entry_type ON public.processed_tracker(status, entry_type);

-- Drop the old upsert function if it exists
DROP FUNCTION IF EXISTS upsert_new_documents(jsonb);

-- Create the new upsert function that matches the edge function requirements
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

-- Show the current table structure for verification
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'processed_tracker' 
ORDER BY ordinal_position;

