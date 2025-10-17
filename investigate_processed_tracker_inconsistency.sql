-- Query to investigate processed_tracker documents marked as 'processed' 
-- but may not actually be fully processed
-- 
-- This query checks for inconsistencies where:
-- 1. processed_tracker.status = 'processed'
-- 2. But there are no corresponding invoice_lines OR
-- 3. The extracted_data is not processed OR
-- 4. The relationship chain is broken

WITH processed_tracker_analysis AS (
    -- Get all processed_tracker records marked as 'processed'
    SELECT 
        pt.id as pt_id,
        pt.document_id,
        pt.organization_id,
        pt.location_id,
        pt.status as pt_status,
        pt.created_at as pt_created_at,
        pt.updated_at as pt_updated_at
    FROM processed_tracker pt
    WHERE pt.status = 'processed'
),
extracted_data_analysis AS (
    -- Check if extracted_data exists and is processed
    SELECT 
        ed.id as ed_id,
        ed.external_id,
        ed.status as ed_status,
        ed.organization_id as ed_org_id,
        ed.processed_at,
        -- Try to match with processed_tracker document_id
        CASE 
            WHEN ed.external_id LIKE '%.pdf' THEN REPLACE(ed.external_id, '.pdf', '')
            ELSE ed.external_id
        END as clean_external_id
    FROM extracted_data ed
),
invoice_lines_analysis AS (
    -- Check if invoice_lines exist for the extracted_data
    SELECT 
        il.id as il_id,
        il.extracted_data_id,
        il.invoice_number,
        il.organization_id as il_org_id,
        il.location_id as il_location_id,
        COUNT(*) OVER (PARTITION BY il.extracted_data_id) as line_count
    FROM invoice_lines il
)
-- Main analysis query
SELECT 
    'INCONSISTENT PROCESSED TRACKER RECORDS' as analysis_type,
    pt.document_id,
    pt.organization_id,
    pt.location_id,
    pt.pt_status,
    pt.pt_created_at,
    pt.pt_updated_at,
    
    -- Check extracted_data status
    CASE 
        WHEN ed.ed_id IS NULL THEN 'NO_EXTRACTED_DATA'
        WHEN ed.ed_status != 'processed' THEN 'EXTRACTED_DATA_NOT_PROCESSED'
        ELSE 'EXTRACTED_DATA_OK'
    END as extracted_data_status,
    
    -- Check invoice_lines existence
    CASE 
        WHEN il.line_count IS NULL THEN 'NO_INVOICE_LINES'
        WHEN il.line_count = 0 THEN 'ZERO_INVOICE_LINES'
        ELSE 'HAS_INVOICE_LINES'
    END as invoice_lines_status,
    
    -- Additional details
    ed.ed_status as actual_extracted_data_status,
    ed.processed_at as extracted_data_processed_at,
    il.line_count as invoice_line_count,
    il.invoice_number as sample_invoice_number,
    
    -- Relationship chain analysis
    CASE 
        WHEN ed.ed_id IS NULL THEN 'BROKEN_CHAIN_NO_EXTRACTED_DATA'
        WHEN ed.ed_status != 'processed' THEN 'BROKEN_CHAIN_EXTRACTED_DATA_NOT_PROCESSED'
        WHEN il.line_count IS NULL OR il.line_count = 0 THEN 'BROKEN_CHAIN_NO_INVOICE_LINES'
        ELSE 'CHAIN_COMPLETE'
    END as relationship_chain_status

FROM processed_tracker_analysis pt
LEFT JOIN extracted_data_analysis ed ON (
    pt.document_id = ed.clean_external_id 
    AND pt.organization_id = ed.ed_org_id
)
LEFT JOIN invoice_lines_analysis il ON (
    ed.ed_id = il.extracted_data_id
    AND pt.organization_id = il.il_org_id
    AND (pt.location_id = il.il_location_id OR (pt.location_id IS NULL AND il.il_location_id IS NULL))
)

-- Filter for inconsistent records
WHERE 
    -- Case 1: No extracted_data found
    ed.ed_id IS NULL
    OR 
    -- Case 2: Extracted_data exists but not processed
    ed.ed_status != 'processed'
    OR 
    -- Case 3: No invoice_lines found
    il.line_count IS NULL 
    OR 
    -- Case 4: Zero invoice_lines
    il.line_count = 0

ORDER BY 
    relationship_chain_status,
    pt.organization_id,
    pt.document_id;

-- Additional summary query (run separately)
WITH processed_tracker_analysis AS (
    -- Get all processed_tracker records marked as 'processed'
    SELECT 
        pt.id as pt_id,
        pt.document_id,
        pt.organization_id,
        pt.location_id,
        pt.status as pt_status,
        pt.created_at as pt_created_at,
        pt.updated_at as pt_updated_at
    FROM processed_tracker pt
    WHERE pt.status = 'processed'
),
extracted_data_analysis AS (
    -- Check if extracted_data exists and is processed
    SELECT 
        ed.id as ed_id,
        ed.external_id,
        ed.status as ed_status,
        ed.organization_id as ed_org_id,
        ed.processed_at,
        -- Try to match with processed_tracker document_id
        CASE 
            WHEN ed.external_id LIKE '%.pdf' THEN REPLACE(ed.external_id, '.pdf', '')
            ELSE ed.external_id
        END as clean_external_id
    FROM extracted_data ed
),
invoice_lines_analysis AS (
    -- Check if invoice_lines exist for the extracted_data
    SELECT 
        il.id as il_id,
        il.extracted_data_id,
        il.invoice_number,
        il.organization_id as il_org_id,
        il.location_id as il_location_id,
        COUNT(*) OVER (PARTITION BY il.extracted_data_id) as line_count
    FROM invoice_lines il
)
SELECT 
    'SUMMARY' as analysis_type,
    COUNT(*) as total_processed_tracker_records,
    COUNT(CASE WHEN ed.ed_id IS NULL THEN 1 END) as no_extracted_data,
    COUNT(CASE WHEN ed.ed_id IS NOT NULL AND ed.ed_status != 'processed' THEN 1 END) as extracted_data_not_processed,
    COUNT(CASE WHEN il.line_count IS NULL OR il.line_count = 0 THEN 1 END) as no_or_zero_invoice_lines,
    COUNT(CASE WHEN ed.ed_id IS NOT NULL AND ed.ed_status = 'processed' AND il.line_count > 0 THEN 1 END) as properly_processed
FROM processed_tracker_analysis pt
LEFT JOIN extracted_data_analysis ed ON (
    pt.document_id = ed.clean_external_id 
    AND pt.organization_id = ed.ed_org_id
)
LEFT JOIN invoice_lines_analysis il ON (
    ed.ed_id = il.extracted_data_id
    AND pt.organization_id = il.il_org_id
    AND (pt.location_id = il.il_location_id OR (pt.location_id IS NULL AND il.il_location_id IS NULL))
);
