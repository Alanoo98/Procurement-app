-- Create trigger to automatically update invoice_lines when category mappings are created/updated

-- Function to update invoice_lines when category mappings change
-- Uses improved matching strategy: code + supplier > code only > name + code > name only
CREATE OR REPLACE FUNCTION update_invoice_lines_on_category_mapping_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update invoice_lines records that match this category mapping using improved strategy
    
    -- 1. Exact match (name + code + supplier)
    UPDATE invoice_lines 
    SET 
        category_id = NEW.category_id,
        category_mapping_id = NEW.mapping_id,
        category_pending = false
    WHERE invoice_lines.organization_id = NEW.organization_id
      AND invoice_lines.description = NEW.variant_product_name
      AND (
          (invoice_lines.product_code = NEW.variant_product_code) OR
          (invoice_lines.product_code IS NULL AND NEW.variant_product_code IS NULL)
      )
      AND (
          (invoice_lines.variant_supplier_name = NEW.variant_supplier_name) OR
          (invoice_lines.variant_supplier_name IS NULL AND NEW.variant_supplier_name IS NULL)
      )
      AND NEW.is_active = true
      AND invoice_lines.category_pending = true;

    -- 2. Match by product code + supplier (ignore name variations)
    IF NEW.variant_product_code IS NOT NULL AND NEW.variant_supplier_name IS NOT NULL THEN
        UPDATE invoice_lines 
        SET 
            category_id = NEW.category_id,
            category_mapping_id = NEW.mapping_id,
            category_pending = false
        WHERE invoice_lines.organization_id = NEW.organization_id
          AND invoice_lines.product_code = NEW.variant_product_code
          AND invoice_lines.variant_supplier_name = NEW.variant_supplier_name
          AND NEW.is_active = true
          AND invoice_lines.category_pending = true;
    END IF;

    -- 3. Match by product code only (ignore name and supplier variations)
    IF NEW.variant_product_code IS NOT NULL THEN
        UPDATE invoice_lines 
        SET 
            category_id = NEW.category_id,
            category_mapping_id = NEW.mapping_id,
            category_pending = false
        WHERE invoice_lines.organization_id = NEW.organization_id
          AND invoice_lines.product_code = NEW.variant_product_code
          AND NEW.is_active = true
          AND invoice_lines.category_pending = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_update_invoice_lines_on_category_mapping_insert 
ON product_category_mappings;

CREATE TRIGGER trigger_update_invoice_lines_on_category_mapping_insert
    AFTER INSERT ON product_category_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_lines_on_category_mapping_change();

-- Create trigger for UPDATE operations (when is_active changes)
DROP TRIGGER IF EXISTS trigger_update_invoice_lines_on_category_mapping_update 
ON product_category_mappings;

CREATE TRIGGER trigger_update_invoice_lines_on_category_mapping_update
    AFTER UPDATE ON product_category_mappings
    FOR EACH ROW
    WHEN (OLD.is_active != NEW.is_active OR OLD.category_id != NEW.category_id)
    EXECUTE FUNCTION update_invoice_lines_on_category_mapping_change();

-- Create trigger for DELETE operations (set category_pending back to true)
-- Uses improved matching strategy to find all affected invoice_lines
CREATE OR REPLACE FUNCTION update_invoice_lines_on_category_mapping_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Set category_pending back to true for records that matched this mapping
    -- using the same improved matching strategy
    
    -- 1. Exact match (name + code + supplier)
    UPDATE invoice_lines 
    SET 
        category_id = NULL,
        category_mapping_id = NULL,
        category_pending = true
    WHERE invoice_lines.organization_id = OLD.organization_id
      AND invoice_lines.description = OLD.variant_product_name
      AND (
          (invoice_lines.product_code = OLD.variant_product_code) OR
          (invoice_lines.product_code IS NULL AND OLD.variant_product_code IS NULL)
      )
      AND (
          (invoice_lines.variant_supplier_name = OLD.variant_supplier_name) OR
          (invoice_lines.variant_supplier_name IS NULL AND OLD.variant_supplier_name IS NULL)
      )
      AND invoice_lines.category_mapping_id = OLD.mapping_id;

    -- 2. Match by product code + supplier (ignore name variations)
    IF OLD.variant_product_code IS NOT NULL AND OLD.variant_supplier_name IS NOT NULL THEN
        UPDATE invoice_lines 
        SET 
            category_id = NULL,
            category_mapping_id = NULL,
            category_pending = true
        WHERE invoice_lines.organization_id = OLD.organization_id
          AND invoice_lines.product_code = OLD.variant_product_code
          AND invoice_lines.variant_supplier_name = OLD.variant_supplier_name
          AND invoice_lines.category_mapping_id = OLD.mapping_id;
    END IF;

    -- 3. Match by product code only (ignore name and supplier variations)
    IF OLD.variant_product_code IS NOT NULL THEN
        UPDATE invoice_lines 
        SET 
            category_id = NULL,
            category_mapping_id = NULL,
            category_pending = true
        WHERE invoice_lines.organization_id = OLD.organization_id
          AND invoice_lines.product_code = OLD.variant_product_code
          AND invoice_lines.category_mapping_id = OLD.mapping_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_lines_on_category_mapping_delete 
ON product_category_mappings;

CREATE TRIGGER trigger_update_invoice_lines_on_category_mapping_delete
    AFTER DELETE ON product_category_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_lines_on_category_mapping_delete();
