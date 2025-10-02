-- Enable multi-category support by removing the unique constraint
-- This allows the same product to belong to multiple categories

-- 1. First, let's see the current constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'product_category_mappings'::regclass
  AND contype = 'u';

-- 2. Drop the unique constraint that prevents multi-category support
ALTER TABLE product_category_mappings 
DROP CONSTRAINT IF EXISTS product_category_mappings_organization_id_variant_product_name_variant_product_code_variant_supplier_name_key;

-- 3. Add a new unique constraint that allows the same product in multiple categories
-- but prevents duplicate entries for the same product-category combination
ALTER TABLE product_category_mappings 
ADD CONSTRAINT product_category_mappings_unique_product_category 
UNIQUE (organization_id, category_id, variant_product_name, variant_product_code, variant_supplier_name);

-- 4. Verify the new constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'product_category_mappings'::regclass
  AND contype = 'u';

-- 5. Test: Show current mappings to see what we have
SELECT 
    pc.category_name,
    pcm.variant_product_name,
    pcm.variant_product_code,
    COUNT(*) as mapping_count
FROM product_category_mappings pcm
JOIN product_categories pc ON pcm.category_id = pc.category_id
GROUP BY pc.category_name, pcm.variant_product_name, pcm.variant_product_code
ORDER BY mapping_count DESC, pc.category_name, pcm.variant_product_name;
