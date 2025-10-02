-- Fix category mapping deletion by handling foreign key constraints properly

-- Option 1: Update the foreign key constraint to CASCADE DELETE
-- This will automatically remove the reference from invoice_lines when a mapping is deleted
ALTER TABLE invoice_lines 
DROP CONSTRAINT IF EXISTS invoice_lines_category_mapping_id_fkey;

ALTER TABLE invoice_lines 
ADD CONSTRAINT invoice_lines_category_mapping_id_fkey 
FOREIGN KEY (category_mapping_id) 
REFERENCES product_category_mappings(mapping_id) 
ON DELETE SET NULL;

-- Option 2: Alternative approach - Create a function to safely delete mappings
-- This function will first clear the references in invoice_lines, then delete the mapping
CREATE OR REPLACE FUNCTION safe_delete_category_mapping(mapping_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- First, clear the references in invoice_lines
    UPDATE invoice_lines 
    SET 
        category_mapping_id = NULL,
        category_id = NULL,
        category_pending = true,
        updated_at = NOW()
    WHERE category_mapping_id = mapping_uuid;
    
    -- Then delete the mapping
    DELETE FROM product_category_mappings 
    WHERE mapping_id = mapping_uuid;
    
    -- Return true if successful
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return false
        RAISE LOG 'Error deleting category mapping %: %', mapping_uuid, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Test the function
-- SELECT safe_delete_category_mapping('your-mapping-id-here');

-- Verify the constraint is updated
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'invoice_lines'
  AND kcu.column_name = 'category_mapping_id';
