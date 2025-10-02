-- Retroactive fix for category mappings using improved matching strategy
-- This will update all existing invoice_lines that should have been categorized
-- but weren't due to the old exact-name matching logic

-- First, let's see what we're working with
SELECT 
    'Before Fix' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending,
    COUNT(CASE WHEN category_pending = true THEN 1 END) as still_pending
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';

-- Show some examples of pending products that should be matched
SELECT 
    'Pending Products Sample' as info,
    description,
    product_code,
    variant_supplier_name,
    category_pending
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_pending = true
    AND product_code IS NOT NULL
LIMIT 10;

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
-- Only for records that still don't have a category
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
  AND pcm.variant_supplier_name IS NULL; -- Only mappings without supplier constraint

-- 3. Match by exact name + code (for cases where supplier doesn't match)
UPDATE invoice_lines 
SET 
    category_id = pcm.category_id,
    category_mapping_id = pcm.mapping_id,
    category_pending = false,
    updated_at = NOW()
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = pcm.organization_id
  AND invoice_lines.description = pcm.variant_product_name
  AND (
      (invoice_lines.product_code = pcm.variant_product_code) OR
      (invoice_lines.product_code IS NULL AND pcm.variant_product_code IS NULL)
  )
  AND pcm.is_active = true
  AND invoice_lines.category_pending = true;

-- Show results after the fix
SELECT 
    'After Fix' as status,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
    COUNT(CASE WHEN category_pending = false THEN 1 END) as not_pending,
    COUNT(CASE WHEN category_pending = true THEN 1 END) as still_pending
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';

-- Show some examples of newly categorized products
SELECT 
    'Newly Categorized Products' as info,
    description,
    product_code,
    variant_supplier_name,
    category_id,
    category_mapping_id,
    category_pending
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_id IS NOT NULL
    AND updated_at > NOW() - INTERVAL '1 minute' -- Recently updated
LIMIT 10;

-- Show remaining pending products (if any)
SELECT 
    'Still Pending Products' as info,
    description,
    product_code,
    variant_supplier_name,
    category_pending
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_pending = true
LIMIT 10;

-- Summary of the fix
SELECT 
    'Fix Summary' as info,
    'Applied improved matching strategy to existing invoice_lines' as description,
    'Product code + supplier > Product code only > Name + code' as matching_priority;
