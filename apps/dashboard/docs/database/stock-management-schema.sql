-- Stock Management Database Schema
-- This schema extends the existing procurement system with stock management capabilities

-- Stock Units Table
-- Defines different storage units within locations (kitchen, freezer, winebar, etc.)
CREATE TABLE IF NOT EXISTS stock_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location_id uuid REFERENCES locations(location_id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock Items Table
-- Tracks individual products and their current stock levels per location/unit
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  product_description text NOT NULL,
  location_id uuid REFERENCES locations(location_id) ON DELETE CASCADE,
  stock_unit_id uuid REFERENCES stock_units(id) ON DELETE CASCADE,
  current_quantity numeric NOT NULL DEFAULT 0,
  last_count_date timestamptz,
  last_delivery_date timestamptz,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_code, location_id, stock_unit_id)
);

-- Stock Counts Table
-- Manages stock counting sessions with date and status tracking
CREATE TABLE IF NOT EXISTS stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(location_id) ON DELETE CASCADE,
  count_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock Count Items Table
-- Individual items counted during a stock count session
CREATE TABLE IF NOT EXISTS stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid REFERENCES stock_counts(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE,
  -- MVP snapshot fields to avoid complex joins at read-time
  product_code text, -- snapshot of the counted product
  location_id uuid,  -- snapshot of location for quick filtering
  unit_price numeric, -- snapshot of latest known price at count time
  counted_quantity numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(stock_count_id, stock_item_id)
);

-- Optional simple assignment table for unit default product lists
CREATE TABLE IF NOT EXISTS stock_unit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_unit_id uuid REFERENCES stock_units(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  location_id uuid REFERENCES locations(location_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (stock_unit_id, product_code)
);

-- Delivery Records Table
-- Tracks when invoices were actually delivered vs invoice date
CREATE TABLE IF NOT EXISTS delivery_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  delivery_date date NOT NULL,
  location_id uuid REFERENCES locations(location_id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_units_location ON stock_units(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_units_organization ON stock_units(organization_id);

CREATE INDEX IF NOT EXISTS idx_stock_items_location ON stock_items(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_stock_unit ON stock_items(stock_unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_organization ON stock_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_product_code ON stock_items(product_code);

CREATE INDEX IF NOT EXISTS idx_stock_counts_location ON stock_counts(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_counts_organization ON stock_counts(organization_id);

CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON stock_count_items(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_item ON stock_count_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_location ON stock_count_items(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_product ON stock_count_items(product_code);
CREATE INDEX IF NOT EXISTS idx_stock_unit_products_unit ON stock_unit_products(stock_unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_unit_products_location ON stock_unit_products(location_id);

CREATE INDEX IF NOT EXISTS idx_delivery_records_location ON delivery_records(location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_records_supplier ON delivery_records(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_records_delivery_date ON delivery_records(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_records_organization ON delivery_records(organization_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_units_updated_at 
  BEFORE UPDATE ON stock_units 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at 
  BEFORE UPDATE ON stock_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_counts_updated_at 
  BEFORE UPDATE ON stock_counts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_count_items_updated_at 
  BEFORE UPDATE ON stock_count_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_records_updated_at 
  BEFORE UPDATE ON delivery_records 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MVP helper views derived from invoice_lines (source of truth)
-- These keep the schema simple while ensuring we only count products that were actually bought

-- Latest price per product/location based on invoice_date (fallback to created_at if present)
CREATE OR REPLACE VIEW invoice_latest_prices_by_location AS
WITH ranked AS (
  SELECT 
    il.location_id,
    il.product_code,
    il.description,
    il.supplier_id,
    il.unit_price,
    il.invoice_date,
    il.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY il.location_id, il.product_code 
      ORDER BY il.invoice_date DESC NULLS LAST, il.created_at DESC NULLS LAST
    ) AS rn
  FROM invoice_lines il
  WHERE il.product_code IS NOT NULL AND il.location_id IS NOT NULL
)
SELECT 
  location_id,
  product_code,
  description,
  supplier_id,
  unit_price AS latest_price,
  COALESCE(invoice_date, created_at)::date AS as_of_date
FROM ranked
WHERE rn = 1;

-- Distinct purchasable products per location (drives product pickers for counts)
CREATE OR REPLACE VIEW purchasable_products_by_location AS
SELECT DISTINCT 
  location_id,
  product_code,
  description,
  supplier_id,
  latest_price,
  as_of_date
FROM invoice_latest_prices_by_location;

-- NOTE: Frontend should use purchasable_products_by_location to populate selectable
-- products in counts, ensuring items are only those previously bought at that location,
-- and prefilling latest_price into stock_count_items.unit_price at the time of counting.

-- RLS Policies (if needed)
-- Note: These are commented out as per the existing system's approach
-- ALTER TABLE stock_units ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE delivery_records ENABLE ROW LEVEL SECURITY;

-- Sample data for testing (optional)
-- INSERT INTO stock_units (name, description, location_id, organization_id) VALUES
-- ('Kitchen', 'Main kitchen storage', 'location-uuid-here', 'org-uuid-here'),
-- ('Freezer', 'Frozen goods storage', 'location-uuid-here', 'org-uuid-here'),
-- ('Wine Bar', 'Wine and beverage storage', 'location-uuid-here', 'org-uuid-here');
