-- Indexes to speed up product category features

-- 1) Categories list ordered by category_name filtered by organization
CREATE INDEX IF NOT EXISTS idx_product_categories_org_name
  ON product_categories (organization_id, category_name);

-- 2) Mappings filtered by organization and is_active, ordered by variant_product_name
CREATE INDEX IF NOT EXISTS idx_product_category_mappings_org_active_name
  ON product_category_mappings (organization_id, is_active, variant_product_name);

-- Optional additional selectivity for exact-variant lookups
CREATE INDEX IF NOT EXISTS idx_product_category_mappings_variant_keys
  ON product_category_mappings (organization_id, variant_product_name, variant_product_code, variant_supplier_name);

-- 3) Pending mappings filtered by organization and status, ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_pending_category_mappings_org_status_created
  ON pending_category_mappings (organization_id, status, created_at DESC);


