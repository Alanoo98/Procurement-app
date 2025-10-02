-- Revert to single category constraint
-- This ensures each product can only belong to one category

-- Drop the multi-category constraint we added
ALTER TABLE product_category_mappings
DROP CONSTRAINT IF EXISTS product_category_mappings_unique_per_category;

-- Restore the original single-category constraint
ALTER TABLE product_category_mappings
ADD CONSTRAINT product_category_mappings_organization_id_variant_product_name_key
UNIQUE (organization_id, variant_product_name, variant_product_code, variant_supplier_name);

-- Verify the constraint is in place
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'product_category_mappings'::regclass 
  AND conname LIKE '%product_category_mappings%';
