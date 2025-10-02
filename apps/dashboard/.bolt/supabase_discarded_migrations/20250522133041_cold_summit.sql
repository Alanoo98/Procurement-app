/*
  # Add procurement system tables
  
  1. New Tables
    - `locations`: Restaurant locations
    - `location_mappings`: Location variant mappings
    - `suppliers`: Supplier information
    - `supplier_mappings`: Supplier variant mappings
    - `dates`: Date dimension table
    - `pax`: Guest count data
    - `pax_data`: Raw PAX data
    - `product_mappings`: Product standardization
    - `price_alerts`: Price variation tracking

  2. Changes
    - Added indexes for performance optimization
    - Added triggers for updated_at timestamps
    - No RLS policies (as requested)
*/

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  location_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create location_mappings table
CREATE TABLE IF NOT EXISTS location_mappings (
  mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(location_id),
  variant_name text NOT NULL,
  variant_address text,
  variant_receiver_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_mappings table
CREATE TABLE IF NOT EXISTS supplier_mappings (
  mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(supplier_id),
  variant_name text NOT NULL,
  variant_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dates dimension table
CREATE TABLE IF NOT EXISTS dates (
  date_id date PRIMARY KEY,
  year integer NOT NULL,
  month integer NOT NULL,
  day_in_month integer NOT NULL,
  week integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create pax table
CREATE TABLE IF NOT EXISTS pax (
  pax_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id date REFERENCES dates(date_id),
  location_id uuid REFERENCES locations(location_id),
  pax_count integer NOT NULL CHECK (pax_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pax_data table for raw data
CREATE TABLE IF NOT EXISTS pax_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  date date NOT NULL,
  pax integer NOT NULL CHECK (pax >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_mappings table
CREATE TABLE IF NOT EXISTS product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL,
  target_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  supplier_name text NOT NULL,
  date date NOT NULL,
  min_price numeric NOT NULL,
  max_price numeric NOT NULL,
  variation_type text NOT NULL CHECK (variation_type = ANY (ARRAY['same_day'::text, 'historical'::text, 'agreement'::text])),
  resolved_at timestamptz,
  resolution_reason text,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS location_mappings_address_idx ON location_mappings(variant_address);
CREATE INDEX IF NOT EXISTS location_mappings_receiver_name_idx ON location_mappings(variant_receiver_name) WHERE variant_receiver_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS location_mappings_location_variant_idx ON location_mappings(location_id, variant_address);
CREATE INDEX IF NOT EXISTS supplier_mappings_variant_name_idx ON supplier_mappings(variant_name);
CREATE INDEX IF NOT EXISTS dates_week_idx ON dates(week);
CREATE INDEX IF NOT EXISTS dates_year_month_idx ON dates(year, month);
CREATE INDEX IF NOT EXISTS pax_date_location_idx ON pax(date_id, location_id);
CREATE INDEX IF NOT EXISTS pax_data_restaurant_date_idx ON pax_data(restaurant_name, date);
CREATE INDEX IF NOT EXISTS product_mappings_source_idx ON product_mappings(source_code);
CREATE INDEX IF NOT EXISTS product_mappings_target_idx ON product_mappings(target_code);
CREATE INDEX IF NOT EXISTS price_alerts_date_idx ON price_alerts(date);
CREATE INDEX IF NOT EXISTS price_alerts_product_supplier_idx ON price_alerts(product_code, supplier_name);
CREATE INDEX IF NOT EXISTS price_alerts_resolved_idx ON price_alerts(resolved_at);

-- Create triggers
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_mappings_updated_at
  BEFORE UPDATE ON location_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_mappings_updated_at
  BEFORE UPDATE ON supplier_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pax_updated_at
  BEFORE UPDATE ON pax
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pax_data_updated_at
  BEFORE UPDATE ON pax_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_mappings_updated_at
  BEFORE UPDATE ON product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();