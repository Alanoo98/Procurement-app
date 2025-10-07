-- YTD Locations RPC Function
-- Fast RPC for year-to-date data by multiple locations
-- Replaces expensive individual queries with a single optimized function

CREATE OR REPLACE FUNCTION api.ytd_locations(
  _org uuid, 
  _locs uuid[], 
  _from timestamptz, 
  _to timestamptz
) RETURNS TABLE(
  location_id uuid, 
  line_count bigint, 
  total_amount numeric, 
  total_after numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT 
    location_id,
    COUNT(*) AS line_count,
    SUM(total_price) AS total_amount,
    SUM(total_price_after_discount) AS total_after
  FROM public.invoice_lines
  WHERE organization_id = _org
    AND invoice_date >= _from 
    AND invoice_date <= _to
    AND location_id = ANY(_locs)
  GROUP BY location_id
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION api.ytd_locations(uuid, uuid[], timestamptz, timestamptz) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION api.ytd_locations(uuid, uuid[], timestamptz, timestamptz) IS 
'Fast RPC for year-to-date spending data by multiple locations. Returns aggregated metrics per location.';

