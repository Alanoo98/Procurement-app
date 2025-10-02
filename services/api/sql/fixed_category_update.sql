-- Fixed category update - match by name and code, ignore supplier name
-- This handles the case where invoice_lines have supplier names but mappings don't

-- First, let's see what we're working with
SELECT 
    'Before Update' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending
FROM invoice_lines;

-- Update invoice_lines with category information (match by name and code only)
UPDATE invoice_lines 
SET 
    category_id = pcm.category_id,
    category_mapping_id = pcm.mapping_id,
    category_pending = false
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = pcm.organization_id
  AND invoice_lines.description = pcm.variant_product_name
  AND (
      (invoice_lines.product_code = pcm.variant_product_code) OR
      (invoice_lines.product_code IS NULL AND pcm.variant_product_code IS NULL)
  )
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
    variant_supplier_name,
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
