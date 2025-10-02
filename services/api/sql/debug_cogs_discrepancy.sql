-- Debug query to identify the discrepancy between COGS Dashboard and Deep Dive Analysis
-- This will help us understand why the same location shows different spending amounts

-- First, let's get the location ID for "Kød Oslo" (assuming it's one of the Oslo locations)
-- Based on the mapping we saw earlier, it's likely one of these:
-- 11280: "9e2d666b-b366-45d4-9b3e-8fa41f8f352e"  # KöD Posthallen (Oslo)
-- 11281: "b2a67990-d237-4f17-abef-6533892e6f19"  # KöD Frogner

-- Let's check what locations exist with "oslo" in the name
SELECT 
    location_id,
    name,
    address
FROM locations 
WHERE LOWER(name) LIKE '%oslo%' 
   OR LOWER(name) LIKE '%kød%'
   OR LOWER(name) LIKE '%köd%'
ORDER BY name;

-- Now let's run the EXACT same queries that both hooks use
-- to see where the discrepancy comes from

-- Query 1: COGS Dashboard style query (useCogsDashboard.ts)
-- This should match the 409,325 kr amount
SELECT 
    'COGS Dashboard Query' as query_type,
    COUNT(*) as record_count,
    SUM(
        CASE 
            WHEN COALESCE(total_price_after_discount, 0) > 0 THEN total_price_after_discount
            ELSE COALESCE(total_price, 0)
        END
    ) as total_spend,
    COUNT(CASE WHEN COALESCE(total_price_after_discount, 0) > 0 THEN 1 END) as records_using_price_after_discount,
    COUNT(CASE WHEN COALESCE(total_price_after_discount, 0) = 0 AND COALESCE(total_price, 0) > 0 THEN 1 END) as records_using_total_price,
    SUM(COALESCE(total_price_after_discount, 0)) as sum_price_after_discount,
    SUM(COALESCE(total_price, 0)) as sum_total_price
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '9e2d666b-b366-45d4-9b3e-8fa41f8f352e'  -- KöD Posthallen (Oslo) - adjust if needed
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND total_price_after_discount IS NOT NULL;

-- Query 2: Deep Dive Analysis style query (useProductSpendingAnalysis.ts)
-- This should match the 1,064,089 kr amount
SELECT 
    'Deep Dive Analysis Query' as query_type,
    COUNT(*) as record_count,
    SUM(
        CASE 
            WHEN COALESCE(total_price_after_discount, 0) > 0 THEN total_price_after_discount
            ELSE COALESCE(total_price, 0)
        END
    ) as total_spend,
    COUNT(CASE WHEN COALESCE(total_price_after_discount, 0) > 0 THEN 1 END) as records_using_price_after_discount,
    COUNT(CASE WHEN COALESCE(total_price_after_discount, 0) = 0 AND COALESCE(total_price, 0) > 0 THEN 1 END) as records_using_total_price,
    SUM(COALESCE(total_price_after_discount, 0)) as sum_price_after_discount,
    SUM(COALESCE(total_price, 0)) as sum_total_price
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '9e2d666b-b366-45d4-9b3e-8fa41f8f352e'  -- KöD Posthallen (Oslo) - adjust if needed
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND total_price_after_discount IS NOT NULL;

-- Let's also check if there are any records that might be filtered differently
-- by looking at the data without the total_price_after_discount filter
SELECT 
    'All Records (No Filter)' as query_type,
    COUNT(*) as record_count,
    COUNT(CASE WHEN total_price_after_discount IS NOT NULL THEN 1 END) as has_price_after_discount,
    COUNT(CASE WHEN total_price_after_discount IS NULL THEN 1 END) as missing_price_after_discount,
    SUM(
        CASE 
            WHEN COALESCE(total_price_after_discount, 0) > 0 THEN total_price_after_discount
            ELSE COALESCE(total_price, 0)
        END
    ) as total_spend,
    SUM(COALESCE(total_price_after_discount, 0)) as sum_price_after_discount,
    SUM(COALESCE(total_price, 0)) as sum_total_price
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '9e2d666b-b366-45d4-9b3e-8fa41f8f352e'  -- KöD Posthallen (Oslo) - adjust if needed
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31';

-- Let's also check if there are multiple Oslo locations
SELECT 
    'All Oslo Locations' as query_type,
    il.location_id,
    l.name as location_name,
    COUNT(*) as record_count,
    SUM(
        CASE 
            WHEN COALESCE(il.total_price_after_discount, 0) > 0 THEN il.total_price_after_discount
            ELSE COALESCE(il.total_price, 0)
        END
    ) as total_spend
FROM invoice_lines il
LEFT JOIN locations l ON il.location_id = l.location_id
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (LOWER(l.name) LIKE '%oslo%' OR LOWER(l.name) LIKE '%kød%' OR LOWER(l.name) LIKE '%köd%')
    AND il.invoice_date >= '2025-08-01'
    AND il.invoice_date <= '2025-08-31'
    AND il.total_price_after_discount IS NOT NULL
GROUP BY il.location_id, l.name
ORDER BY total_spend DESC;
