-- Check and fix pending products that should already be categorized

-- First, let's see what's currently pending
SELECT 
    'Current Pending Products' as info,
    description,
    product_code,
    variant_supplier_name,
    category_pending,
    category_id
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_pending = true
    AND product_code IS NOT NULL
ORDER BY description
LIMIT 20;

-- Check if we have mappings for these pending products
SELECT 
    'Mappings for Pending Products' as info,
    pcm.variant_product_name,
    pcm.variant_product_code,
    pcm.variant_supplier_name,
    pc.category_name,
    pcm.is_active
FROM product_category_mappings pcm
JOIN product_categories pc ON pcm.category_id = pc.category_id
WHERE pcm.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND pcm.is_active = true
    AND pcm.variant_product_code IN (
        SELECT DISTINCT product_code 
        FROM invoice_lines 
        WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
            AND category_pending = true
            AND product_code IS NOT NULL
    )
ORDER BY pcm.variant_product_code;

-- Now apply the fix - match by product code + supplier
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

-- Match by product code only (for mappings without supplier constraint)
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

-- Show results after fix
SELECT 
    'After Fix - Still Pending' as info,
    COUNT(*) as still_pending_count
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_pending = true;

-- Show remaining pending products (should be much fewer now)
SELECT 
    'Remaining Pending Products' as info,
    description,
    product_code,
    variant_supplier_name
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_pending = true
    AND product_code IS NOT NULL
ORDER BY description
LIMIT 10;
