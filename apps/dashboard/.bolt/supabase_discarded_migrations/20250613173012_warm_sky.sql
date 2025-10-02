/*
  # Fix price alert detection function

  1. Updates
    - Remove references to non-existent 'description' column in price_alerts table
    - Update function to work with existing schema
*/

-- Drop and recreate the price alert detection function without description column references
CREATE OR REPLACE FUNCTION run_price_alert_detection()
RETURNS TABLE(
  alerts_created integer,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_count integer := 0;
  current_date date := CURRENT_DATE;
BEGIN
  -- Same day price variation detection
  WITH same_day_variations AS (
    SELECT 
      il.product_code,
      s.name as supplier_name,
      il.invoice_date,
      MIN(il.unit_price_after_discount) as min_price,
      MAX(il.unit_price_after_discount) as max_price,
      il.organization_id,
      il.business_unit_id
    FROM invoice_lines il
    JOIN suppliers s ON s.supplier_id = il.supplier_id
    WHERE il.invoice_date = current_date
      AND il.unit_price_after_discount IS NOT NULL
      AND il.unit_price_after_discount > 0
    GROUP BY il.product_code, s.name, il.invoice_date, il.organization_id, il.business_unit_id
    HAVING COUNT(DISTINCT il.unit_price_after_discount) > 1
      AND (MAX(il.unit_price_after_discount) - MIN(il.unit_price_after_discount)) / MIN(il.unit_price_after_discount) > 0.1
  )
  INSERT INTO price_alerts (
    product_code,
    supplier_name,
    date,
    min_price,
    max_price,
    variation_type,
    organization_id,
    business_unit_id,
    alert_type
  )
  SELECT 
    product_code,
    supplier_name,
    invoice_date,
    min_price,
    max_price,
    'same_day',
    organization_id,
    business_unit_id,
    'same_day'
  FROM same_day_variations
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS alert_count = ROW_COUNT;

  -- Agreement violations detection
  WITH agreement_violations AS (
    SELECT DISTINCT
      il.product_code,
      s.name as supplier_name,
      il.invoice_date,
      il.unit_price_after_discount as actual_price,
      pn.target_price as expected_price,
      il.organization_id,
      il.business_unit_id,
      pn.id as price_negotiation_id
    FROM invoice_lines il
    JOIN suppliers s ON s.supplier_id = il.supplier_id
    JOIN price_negotiations pn ON pn.product_code = il.product_code 
      AND pn.supplier_id = il.supplier_id
      AND pn.status = 'resolved'
      AND il.invoice_date >= pn.effective_date
    WHERE il.invoice_date >= current_date - INTERVAL '7 days'
      AND il.unit_price_after_discount > pn.target_price * 1.05 -- 5% tolerance
  )
  INSERT INTO price_alerts (
    product_code,
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
    actual_price
  )
  SELECT 
    product_code,
    supplier_name,
    invoice_date,
    actual_price,
    actual_price,
    'agreement',
    organization_id,
    business_unit_id,
    'agreement',
    price_negotiation_id,
    expected_price,
    actual_price
  FROM agreement_violations
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS alert_count = alert_count + ROW_COUNT;

  RETURN QUERY SELECT alert_count, 'Price alert detection completed successfully'::text;
END;
$$;