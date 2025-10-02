-- Diagnose why category updates are not working
-- Check the data mismatch between invoice_lines and product_category_mappings

-- 1. Check sample invoice_lines data
SELECT 
    'Sample invoice_lines data' as check_type,
    description,
    product_code,
    variant_supplier_name,
    category_pending
FROM invoice_lines 
WHERE description IN ('Agurk Norsk Stk', 'Ansjosfilet Italiensk 80g Caracucina', 'Asparages Grønn Xl Imp .')
LIMIT 10;

-- 2. Check sample product_category_mappings data
SELECT 
    'Sample product_category_mappings data' as check_type,
    variant_product_name,
    variant_product_code,
    variant_supplier_name,
    is_active
FROM product_category_mappings 
WHERE variant_product_name IN ('Agurk Norsk Stk', 'Ansjosfilet Italiensk 80g Caracucina', 'Asparages Grønn Xl Imp .')
LIMIT 10;

-- 3. Check for exact matches
SELECT 
    'Potential matches' as check_type,
    il.description as invoice_description,
    il.product_code as invoice_code,
    il.variant_supplier_name as invoice_supplier,
    pcm.variant_product_name as mapping_name,
    pcm.variant_product_code as mapping_code,
    pcm.variant_supplier_name as mapping_supplier,
    pcm.is_active
FROM invoice_lines il
JOIN product_category_mappings pcm ON (
    il.organization_id = pcm.organization_id
    AND il.description = pcm.variant_product_name
    AND (
        (il.product_code = pcm.variant_product_code) OR
        (il.product_code IS NULL AND pcm.variant_product_code IS NULL)
    )
    AND (
        (il.variant_supplier_name = pcm.variant_supplier_name) OR
        (il.variant_supplier_name IS NULL AND pcm.variant_supplier_name IS NULL)
    )
)
WHERE pcm.is_active = true
LIMIT 10;

-- 4. Check for partial matches (name only)
SELECT 
    'Name-only matches' as check_type,
    il.description as invoice_description,
    il.product_code as invoice_code,
    pcm.variant_product_name as mapping_name,
    pcm.variant_product_code as mapping_code,
    CASE 
        WHEN il.product_code = pcm.variant_product_code THEN 'Code matches'
        WHEN il.product_code IS NULL AND pcm.variant_product_code IS NULL THEN 'Both null'
        ELSE 'Code mismatch'
    END as code_status
FROM invoice_lines il
JOIN product_category_mappings pcm ON (
    il.organization_id = pcm.organization_id
    AND il.description = pcm.variant_product_name
)
WHERE pcm.is_active = true
LIMIT 10;
