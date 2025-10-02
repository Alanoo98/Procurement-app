-- Simple category update - match by product name only
-- This is more lenient and should catch most cases

-- First, let's see what we're working with
SELECT 
    'Before Update' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending
FROM invoice_lines;

-- Update invoice_lines with category information (name match only)
UPDATE invoice_lines 
SET 
    category_id = pcm.category_id,
    category_mapping_id = pcm.mapping_id,
    category_pending = false
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = pcm.organization_id
  AND invoice_lines.description = pcm.variant_product_name
  AND pcm.is_active = true
  AND invoice_lines.category_pending = true;

-- Show the results after update
SELECT 
    'After Update' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending
FROM invoice_lines;

-- Show some examples of updated records
SELECT 
    description,
    product_code,
    category_id,
    category_mapping_id,
    category_pending
FROM invoice_lines 
WHERE category_id IS NOT NULL 
LIMIT 10;

-- Show how many records were updated
SELECT 
    COUNT(*) as updated_records
FROM invoice_lines 
WHERE category_pending = false;
