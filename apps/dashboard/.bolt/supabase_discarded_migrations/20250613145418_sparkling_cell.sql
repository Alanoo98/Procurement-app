/*
  # Advanced Price Monitoring and Negotiation System

  1. New Tables
    - price_alerts: Stores detected price variations and agreement violations
    - price_negotiations: Manages the lifecycle of price negotiations with suppliers
  
  2. Functions
    - update_price_negotiation_supplier: Updates supplier field when supplier_id changes
    - run_price_alert_detection: Detects various types of price alerts
  
  3. Security
    - RLS policies for proper data isolation
    - Organization-based access control
*/

-- Create price_negotiations table
CREATE TABLE IF NOT EXISTS price_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id),
  product_code text NOT NULL,
  description text,
  supplier_id uuid REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  requested_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  target_price numeric,
  current_price numeric,
  effective_date date,
  comment text,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  supplier text,
  unit_type text,
  unit_subtype text
);

-- Create index for efficient querying
CREATE INDEX idx_price_negotiations_organization_id ON price_negotiations(organization_id);
CREATE INDEX idx_price_negotiations_product_code ON price_negotiations(product_code);
CREATE INDEX idx_price_negotiations_supplier_id ON price_negotiations(supplier_id);
CREATE INDEX idx_price_negotiations_status ON price_negotiations(status);
CREATE INDEX idx_price_negotiations_effective_date ON price_negotiations(effective_date);
CREATE INDEX idx_price_negotiations_supplier ON price_negotiations(supplier);

-- Enable RLS
ALTER TABLE price_negotiations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for price_negotiations
CREATE POLICY "Scoped access - price_negotiations" 
  ON price_negotiations
  FOR SELECT
  TO authenticated
  USING (user_has_access_to_bu(organization_id, business_unit_id));

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  description text,
  supplier_name text NOT NULL,
  date date NOT NULL,
  min_price numeric NOT NULL,
  max_price numeric NOT NULL,
  variation_type text NOT NULL CHECK (variation_type IN ('same_day', 'historical', 'agreement')),
  resolved_at timestamptz,
  resolution_reason text,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id),
  alert_type text DEFAULT 'same_day' CHECK (alert_type IN ('same_day', 'agreement', 'post_negotiation_violation')),
  price_negotiation_id uuid REFERENCES price_negotiations(id) ON DELETE SET NULL,
  affected_locations jsonb,
  tolerance_margin numeric DEFAULT 0,
  expected_price numeric,
  actual_price numeric
);

-- Create indexes for efficient querying
CREATE INDEX idx_price_alerts_date_idx ON price_alerts(date);
CREATE INDEX idx_price_alerts_product_supplier_idx ON price_alerts(product_code, supplier_name);
CREATE INDEX idx_price_alerts_resolved_idx ON price_alerts(resolved_at);
CREATE INDEX idx_price_alerts_organization_id ON price_alerts(organization_id);
CREATE INDEX idx_price_alerts_alert_type ON price_alerts(alert_type);
CREATE INDEX idx_price_alerts_price_negotiation_id ON price_alerts(price_negotiation_id);

-- Enable RLS
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for price_alerts
CREATE POLICY "Scoped access - price_alerts" 
  ON price_alerts
  FOR SELECT
  TO authenticated
  USING (user_has_access_to_bu(organization_id, business_unit_id));

-- Create policy for full access to authenticated users
CREATE POLICY "Allow full access to authenticated users" 
  ON price_alerts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update supplier field when supplier_id changes
CREATE OR REPLACE FUNCTION update_price_negotiation_supplier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT name INTO NEW.supplier FROM suppliers WHERE supplier_id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update supplier field
CREATE TRIGGER before_insert_update_price_negotiation
  BEFORE INSERT OR UPDATE ON price_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION update_price_negotiation_supplier();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at column for price_alerts
CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at column for price_negotiations
CREATE TRIGGER update_price_negotiations_updated_at
  BEFORE UPDATE ON price_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to run price alert detection
CREATE OR REPLACE FUNCTION run_price_alert_detection(org_id uuid)
RETURNS integer AS $$
DECLARE
  alert_count integer := 0;
  min_price_difference numeric := 5; -- Configurable threshold
  historical_period_days integer := 30; -- Configurable period
BEGIN
  -- 1. Detect same-day price variations
  INSERT INTO price_alerts (
    product_code, 
    description, 
    supplier_name, 
    date, 
    min_price, 
    max_price, 
    variation_type,
    organization_id,
    business_unit_id,
    alert_type,
    affected_locations
  )
  SELECT 
    il.product_code,
    il.description,
    s.name as supplier_name,
    il.invoice_date as date,
    MIN(il.unit_price_after_discount) as min_price,
    MAX(il.unit_price_after_discount) as max_price,
    'same_day' as variation_type,
    il.organization_id,
    il.business_unit_id,
    'same_day' as alert_type,
    jsonb_agg(
      jsonb_build_object(
        'location_id', il.location_id,
        'location_name', l.name,
        'price', il.unit_price_after_discount
      )
    ) as affected_locations
  FROM 
    invoice_lines il
    JOIN suppliers s ON il.supplier_id = s.supplier_id
    JOIN locations l ON il.location_id = l.location_id
  WHERE 
    il.organization_id = org_id
    AND il.unit_price_after_discount IS NOT NULL
  GROUP BY 
    il.product_code, 
    il.description, 
    s.name, 
    il.invoice_date,
    il.organization_id,
    il.business_unit_id
  HAVING 
    COUNT(DISTINCT il.unit_price_after_discount) > 1
    AND MAX(il.unit_price_after_discount) - MIN(il.unit_price_after_discount) >= min_price_difference
    AND NOT EXISTS (
      SELECT 1 FROM price_alerts pa 
      WHERE 
        pa.product_code = il.product_code
        AND pa.supplier_name = s.name
        AND pa.date = il.invoice_date
        AND pa.variation_type = 'same_day'
        AND pa.resolved_at IS NULL
    );

  GET DIAGNOSTICS alert_count = ROW_COUNT;
  
  -- 2. Detect agreement violations
  INSERT INTO price_alerts (
    product_code, 
    description, 
    supplier_name, 
    date, 
    min_price, 
    max_price, 
    variation_type,
    organization_id,
    business_unit_id,
    alert_type,
    price_negotiation_id,
    expected_price,
    actual_price,
    affected_locations,
    tolerance_margin
  )
  SELECT 
    il.product_code,
    il.description,
    s.name as supplier_name,
    il.invoice_date as date,
    pn.target_price as min_price,
    il.unit_price_after_discount as max_price,
    'agreement' as variation_type,
    il.organization_id,
    il.business_unit_id,
    'agreement' as alert_type,
    pn.id as price_negotiation_id,
    pn.target_price as expected_price,
    il.unit_price_after_discount as actual_price,
    jsonb_build_array(
      jsonb_build_object(
        'location_id', il.location_id,
        'location_name', l.name,
        'price', il.unit_price_after_discount
      )
    ) as affected_locations,
    COALESCE((pn.target_price * 0.05), 0) as tolerance_margin -- 5% tolerance by default
  FROM 
    invoice_lines il
    JOIN suppliers s ON il.supplier_id = s.supplier_id
    JOIN locations l ON il.location_id = l.location_id
    JOIN price_negotiations pn ON 
      il.product_code = pn.product_code 
      AND s.name = pn.supplier
      AND il.organization_id = pn.organization_id
      AND pn.status = 'resolved'
      AND pn.effective_date <= il.invoice_date
  WHERE 
    il.organization_id = org_id
    AND il.unit_price_after_discount > (pn.target_price * (1 + COALESCE((pn.target_price * 0.05), 0)))
    AND il.invoice_date >= pn.effective_date
    AND NOT EXISTS (
      SELECT 1 FROM price_alerts pa 
      WHERE 
        pa.product_code = il.product_code
        AND pa.supplier_name = s.name
        AND pa.date = il.invoice_date
        AND pa.variation_type = 'agreement'
        AND pa.price_negotiation_id = pn.id
        AND pa.resolved_at IS NULL
    );

  GET DIAGNOSTICS alert_count = alert_count + ROW_COUNT;
  
  RETURN alert_count;
END;
$$ LANGUAGE plpgsql;