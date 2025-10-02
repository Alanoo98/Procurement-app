-- Manual update script to fix category_id and category_mapping_id in invoice_lines
-- Run this after creating new category mappings

-- First, let's see the current state
SELECT 
    'Before Update' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_mapping_id IS NOT NULL THEN 1 END) as with_category_mapping_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending
FROM invoice_lines;

-- Update invoice_lines with category information
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
  AND (
      (invoice_lines.variant_supplier_name = pcm.variant_supplier_name) OR
      (invoice_lines.variant_supplier_name IS NULL AND pcm.variant_supplier_name IS NULL)
  )
  AND pcm.is_active = true
  AND invoice_lines.category_pending = true;

-- Show the results after update
SELECT 
    'After Update' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_mapping_id IS NOT NULL THEN 1 END) as with_category_mapping_id,
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
