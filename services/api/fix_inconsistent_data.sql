-- Fix inconsistent data caused by the transaction rollback issues
-- Run these queries to clean up the data before running the fixed ETL

-- 1. Mark extracted_data records as 'failed' if they have no invoice_lines
-- (These were likely rolled back due to transaction issues)
UPDATE extracted_data 
SET 
    status = 'failed',
    processed_at = now()
WHERE status = 'processed'
AND NOT EXISTS (
    SELECT 1 FROM invoice_lines il 
    WHERE il.extracted_data_id = extracted_data.id
);

-- Show how many records were fixed
SELECT 'extracted_data records marked as failed' as action, COUNT(*) as count
FROM extracted_data 
WHERE status = 'failed'
AND processed_at > now() - interval '1 hour';

-- 2. Mark processed_tracker records as 'pending' if they have no corresponding invoice_lines
-- (These were likely marked as processed but then rolled back)
UPDATE processed_tracker pt
SET 
    status = 'pending',
    updated_at = now()
WHERE pt.status = 'processed'
AND NOT EXISTS (
    SELECT 1 
    FROM extracted_data ed
    JOIN invoice_lines il ON il.extracted_data_id = ed.id
    WHERE ed.external_id = pt.document_id || '.pdf'
    AND ed.organization_id = pt.organization_id
);

-- Show how many processed_tracker records were fixed
SELECT 'processed_tracker records marked as pending' as action, COUNT(*) as count
FROM processed_tracker 
WHERE status = 'pending'
AND updated_at > now() - interval '1 hour';

-- 3. Check for orphaned invoice_lines (shouldn't happen but good to verify)
SELECT 'orphaned invoice_lines' as issue, COUNT(*) as count
FROM invoice_lines il
WHERE NOT EXISTS (
    SELECT 1 FROM extracted_data ed 
    WHERE ed.id = il.extracted_data_id
);

-- 4. Show the current status distribution after fixes
SELECT 'extracted_data status distribution' as table_name, status, COUNT(*) as count
FROM extracted_data 
GROUP BY status 
ORDER BY count DESC;

SELECT 'processed_tracker status distribution' as table_name, status, COUNT(*) as count
FROM processed_tracker 
GROUP BY status 
ORDER BY count DESC;

-- 5. Check for records that should be processed but aren't
SELECT 'records ready for processing' as category, COUNT(*) as count
FROM extracted_data 
WHERE status IN ('pending', 'processing', 'failed')
AND NOT EXISTS (
    SELECT 1 FROM invoice_lines il 
    WHERE il.extracted_data_id = extracted_data.id
);
