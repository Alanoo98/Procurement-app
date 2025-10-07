-- Performance optimization indexes and maintenance for Supabase/Postgres
-- Safe to run multiple times in any environment

-- 1) Pending category mappings pagination (ensure exists across envs)
create index concurrently if not exists ix_pcm_org_status_id
  on public.pending_category_mappings (organization_id, status, id);

-- 2) Clean up redundant/low-value indexes on invoice_lines
-- Duplicate supplier index: keep one canonical index name only
drop index concurrently if exists public.idx_invoice_lines_supplier_id;

-- If equality lookups on invoice_number are rare, prefer the trigram index and drop btree
drop index concurrently if exists public.idx_invoice_lines_invoice_number;

-- 3) Ensure stats are fresh after changes
analyze public.invoice_lines;

-- Performance Optimization Indexes
-- Based on analysis of slow queries from pg_stat_statements
-- These indexes target the most expensive queries in the system

-- 1. Invoice Lines Performance Indexes
-- Target: Most expensive queries (1.5M+ total_exec_time)

-- Composite index for organization + date range queries (most common pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_org_date_location 
ON invoice_lines (organization_id, invoice_date, location_id) 
WHERE organization_id IS NOT NULL;

-- Index for product code filtering (frequently used in slow queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_org_product_code 
ON invoice_lines (organization_id, product_code) 
WHERE product_code IS NOT NULL AND product_code != '';

-- Index for supplier filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_org_supplier 
ON invoice_lines (organization_id, supplier_id) 
WHERE supplier_id IS NOT NULL;

-- Index for document type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_org_document_type 
ON invoice_lines (organization_id, document_type) 
WHERE document_type IS NOT NULL;

-- Index for description filtering (used in many slow queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_org_description 
ON invoice_lines (organization_id, description) 
WHERE description IS NOT NULL AND description != '';

-- Composite index for location + date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_location_date 
ON invoice_lines (location_id, invoice_date) 
WHERE location_id IS NOT NULL;

-- Index for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_org_category 
ON invoice_lines (organization_id, category_id) 
WHERE category_id IS NOT NULL;

-- 2. Pending Category Mappings Performance Indexes
-- Target: Most expensive query (1.5M+ total_exec_time)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_category_mappings_org_status 
ON pending_category_mappings (organization_id, status) 
WHERE organization_id IS NOT NULL;

-- Index for variant product name searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_category_mappings_variant_name 
ON pending_category_mappings (variant_product_name) 
WHERE variant_product_name IS NOT NULL;

-- 3. Locations Performance Indexes
-- Target: Location-related queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_org_business_unit 
ON locations (organization_id, business_unit_id) 
WHERE organization_id IS NOT NULL;

-- 4. Suppliers Performance Indexes
-- Target: Supplier-related queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_org 
ON suppliers (organization_id) 
WHERE organization_id IS NOT NULL;

-- 5. PAX Data Performance Indexes
-- Target: PAX-related queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pax_location_date 
ON pax (location_id, date_id) 
WHERE location_id IS NOT NULL;

-- 6. Processed Tracker Performance Indexes
-- Target: Document processing queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processed_tracker_status_location 
ON processed_tracker (status, location_id) 
WHERE status IS NOT NULL;

-- 7. Additional Composite Indexes for Common Query Patterns

-- Invoice lines with all common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_comprehensive 
ON invoice_lines (organization_id, invoice_date, location_id, supplier_id, document_type) 
WHERE organization_id IS NOT NULL;

-- Invoice lines for product analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_product_analysis 
ON invoice_lines (organization_id, product_code, description, invoice_date) 
WHERE product_code IS NOT NULL AND product_code != '';

-- 8. Partial Indexes for Specific Use Cases

-- Index for non-null product codes only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_with_product_codes 
ON invoice_lines (organization_id, product_code, invoice_date) 
WHERE product_code IS NOT NULL AND product_code != '';

-- Index for null product codes only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_without_product_codes 
ON invoice_lines (organization_id, invoice_date) 
WHERE product_code IS NULL OR product_code = '';

-- 9. Text Search Indexes

-- GIN index for full-text search on descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_lines_description_gin 
ON invoice_lines USING gin (to_tsvector('english', description)) 
WHERE description IS NOT NULL AND description != '';

-- 10. Statistics Update
-- Update table statistics to help query planner make better decisions
ANALYZE invoice_lines;
ANALYZE pending_category_mappings;
ANALYZE locations;
ANALYZE suppliers;
ANALYZE pax;
ANALYZE processed_tracker;

-- 11. Query Plan Analysis
-- Enable query plan logging for monitoring
-- (Uncomment these lines in production for monitoring)
-- ALTER SYSTEM SET log_statement = 'all';
-- ALTER SYSTEM SET log_min_duration_statement = 1000;
-- SELECT pg_reload_conf();

