-- Debug query to check category mappings and why categories are showing as "Uncategorized"

-- 1. Check if product_categories table exists and has data
SELECT 
    'Product Categories' as table_name,
    COUNT(*) as record_count
FROM product_categories;

-- 2. Check if product_category_mappings table exists and has data
SELECT 
    'Product Category Mappings' as table_name,
    COUNT(*) as record_count
FROM product_category_mappings;

-- 3. Show sample product categories
SELECT 
    'Sample Categories' as info,
    category_id,
    category_name,
    organization_id
FROM product_categories
LIMIT 10;

-- 4. Show sample category mappings
SELECT 
    'Sample Mappings' as info,
    mapping_id,
    variant_product_name,
    variant_product_code,
    variant_supplier_name,
    category_id,
    is_active
FROM product_category_mappings
LIMIT 10;

-- 5. Check invoice_lines data for the products shown in the dashboard
SELECT 
    'Invoice Lines Sample' as info,
    product_code,
    description,
    variant_supplier_name,
    category_id
FROM invoice_lines
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (
        description LIKE '%Storfe Indrefilet Fersk 1,8+ Brasil%' OR
        description LIKE '%Storfe Tri Tip Angus Uy Grain%' OR
        description LIKE '%Storfe Indrefilet Fersk 1,4-1,8 Kg%'
    )
LIMIT 10;

-- 6. Try to match products with mappings
SELECT 
    'Product Matching Test' as info,
    il.description as invoice_description,
    il.product_code as invoice_product_code,
    il.variant_supplier_name as invoice_supplier,
    pcm.variant_product_name as mapping_product_name,
    pcm.variant_product_code as mapping_product_code,
    pcm.variant_supplier_name as mapping_supplier,
    pc.category_name,
    CASE 
        WHEN pcm.mapping_id IS NOT NULL THEN 'MATCHED'
        ELSE 'NO MATCH'
    END as match_status
FROM invoice_lines il
LEFT JOIN product_category_mappings pcm ON (
    il.description = pcm.variant_product_name AND
    COALESCE(il.product_code, '') = COALESCE(pcm.variant_product_code, '') AND
    COALESCE(il.variant_supplier_name, '') = COALESCE(pcm.variant_supplier_name, '')
)
LEFT JOIN product_categories pc ON pcm.category_id = pc.category_id
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (
        il.description LIKE '%Storfe Indrefilet Fersk 1,8+ Brasil%' OR
        il.description LIKE '%Storfe Tri Tip Angus Uy Grain%' OR
        il.description LIKE '%Storfe Indrefilet Fersk 1,4-1,8 Kg%'
    )
LIMIT 10;
