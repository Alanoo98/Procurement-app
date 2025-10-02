-- Quick retroactive fix for category mappings
-- Run this in Supabase SQL Editor to fix existing data

-- Apply improved matching strategy retroactively
-- 1. Match by product code + supplier (ignore name variations)
UPDATE invoice_lines 
SET 
    category_id = pcm.category_id,
    category_mapping_id = pcm.mapping_id,
    category_pending = false,
    updated_at = NOW()
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = pcm.organization_id
  AND invoice_lines.product_code = pcm.variant_product_code
  AND invoice_lines.variant_supplier_name = pcm.variant_supplier_name
  AND pcm.is_active = true
  AND invoice_lines.category_pending = true
  AND pcm.variant_product_code IS NOT NULL
  AND pcm.variant_supplier_name IS NOT NULL;

-- 2. Match by product code only (ignore name and supplier variations)
UPDATE invoice_lines 
SET 
    category_id = pcm.category_id,
    category_mapping_id = pcm.mapping_id,
    category_pending = false,
    updated_at = NOW()
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = pcm.organization_id
  AND invoice_lines.product_code = pcm.variant_product_code
  AND pcm.is_active = true
  AND invoice_lines.category_pending = true
  AND pcm.variant_product_code IS NOT NULL
  AND pcm.variant_supplier_name IS NULL;

-- Show results
SELECT 
    'Fix Applied' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending,
    COUNT(CASE WHEN category_pending = true THEN 1 END) as still_pending
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';
