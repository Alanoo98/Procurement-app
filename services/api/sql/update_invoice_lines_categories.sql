-- Update invoice_lines with category mappings from product_category_mappings
-- This query will populate category_mapping_id and category_id for invoice_lines
-- that don't already have them but have matching products in the mappings table

-- First, let's see what we're working with
SELECT 
    'Current State' as info,
    COUNT(*) as total_invoice_lines,
    COUNT(category_mapping_id) as lines_with_mapping_id,
    COUNT(category_id) as lines_with_category_id,
    COUNT(CASE WHEN category_mapping_id IS NULL AND category_id IS NULL THEN 1 END) as lines_without_categories
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';

-- Show sample of unmapped products
SELECT 
    'Unmapped Products Sample' as info,
    product_code,
    description,
    variant_supplier_name,
    category_mapping_id,
    category_id
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND category_mapping_id IS NULL
    AND category_id IS NULL
LIMIT 10;

-- Update invoice_lines with category mappings where they don't exist
-- This matches on product description, product code, and supplier name
UPDATE invoice_lines 
SET 
    category_mapping_id = pcm.mapping_id,
    category_id = pcm.category_id,
    category_pending = false,
    updated_at = NOW()
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND invoice_lines.category_mapping_id IS NULL
    AND invoice_lines.category_id IS NULL
    AND pcm.organization_id = invoice_lines.organization_id
    AND pcm.is_active = true
    AND (
        -- Match on exact product name and code
        (invoice_lines.description = pcm.variant_product_name 
         AND COALESCE(invoice_lines.product_code, '') = COALESCE(pcm.variant_product_code, ''))
        OR
        -- Match on product name only (if no code specified in mapping)
        (invoice_lines.description = pcm.variant_product_name 
         AND pcm.variant_product_code IS NULL)
        OR
        -- Match on product name and supplier (if supplier is specified in mapping)
        (invoice_lines.description = pcm.variant_product_name 
         AND COALESCE(invoice_lines.variant_supplier_name, '') = COALESCE(pcm.variant_supplier_name, '')
         AND pcm.variant_supplier_name IS NOT NULL)
    );

-- Show results after update
SELECT 
    'After Update' as info,
    COUNT(*) as total_invoice_lines,
    COUNT(category_mapping_id) as lines_with_mapping_id,
    COUNT(category_id) as lines_with_category_id,
    COUNT(CASE WHEN category_mapping_id IS NULL AND category_id IS NULL THEN 1 END) as lines_without_categories
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';

-- Show some examples of updated records
SELECT 
    'Updated Records Sample' as info,
    product_code,
    description,
    variant_supplier_name,
    category_mapping_id,
    category_id,
    pc.category_name
FROM invoice_lines il
LEFT JOIN product_categories pc ON il.category_id = pc.category_id
WHERE il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND il.category_mapping_id IS NOT NULL
    AND il.category_id IS NOT NULL
LIMIT 10;

-- Alternative approach: Update using a more flexible matching strategy
-- This handles cases where the exact match might not work due to slight variations
/*
UPDATE invoice_lines 
SET 
    category_mapping_id = pcm.mapping_id,
    category_id = pcm.category_id,
    category_pending = false,
    updated_at = NOW()
FROM product_category_mappings pcm
WHERE invoice_lines.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND invoice_lines.category_mapping_id IS NULL
    AND invoice_lines.category_id IS NULL
    AND pcm.organization_id = invoice_lines.organization_id
    AND pcm.is_active = true
    AND (
        -- Exact match on description and code
        (LOWER(TRIM(invoice_lines.description)) = LOWER(TRIM(pcm.variant_product_name))
         AND COALESCE(invoice_lines.product_code, '') = COALESCE(pcm.variant_product_code, ''))
        OR
        -- Match on description only if no code in mapping
        (LOWER(TRIM(invoice_lines.description)) = LOWER(TRIM(pcm.variant_product_name))
         AND pcm.variant_product_code IS NULL)
        OR
        -- Partial match on description (for cases with slight variations)
        (LOWER(TRIM(invoice_lines.description)) LIKE '%' || LOWER(TRIM(pcm.variant_product_name)) || '%'
         AND COALESCE(invoice_lines.product_code, '') = COALESCE(pcm.variant_product_code, ''))
    );
*/