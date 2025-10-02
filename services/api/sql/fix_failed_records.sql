-- Fix records that were incorrectly marked as "failed"
-- Update them back to "processed" if they actually have invoice_lines
-- Update them to "pending" if they don't have invoice_lines yet

-- 1. Update failed records back to processed if they have invoice_lines
UPDATE processed_tracker 
SET status = 'processed', updated_at = NOW()
WHERE status = 'failed'
  AND EXISTS (
      SELECT 1 
      FROM extracted_data ed
      JOIN invoice_lines il ON il.extracted_data_id = ed.id
      WHERE ed.external_id = processed_tracker.document_id || '.pdf'
        AND ed.organization_id = processed_tracker.organization_id
  );

-- 2. Update remaining failed records to pending (they don't have invoice_lines yet)
UPDATE processed_tracker 
SET status = 'pending', updated_at = NOW()
WHERE status = 'failed';

-- 3. Show the results
SELECT 
    status,
    COUNT(*) as count
FROM processed_tracker 
GROUP BY status
ORDER BY status;

-- 4. Show which records were fixed
SELECT 
    'Records that were fixed from failed to processed:' as info;
    
SELECT 
    pt.document_id,
    pt.status,
    pt.updated_at,
    'Fixed - has invoice_lines' as reason
FROM processed_tracker pt
WHERE pt.status = 'processed'
  AND pt.updated_at > NOW() - INTERVAL '1 minute'
ORDER BY pt.updated_at DESC;
