-- Query to get spending for August 2025 for each location
-- This query aggregates invoice_lines data by location for the month of August

SELECT 
    il.location_id,
    l.name as location_name,
    COUNT(DISTINCT il.invoice_id) as invoice_count,
    COUNT(il.id) as line_item_count,
    SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) as total_spend,
    il.currency,
    ROUND(
        SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) / 
        COUNT(DISTINCT il.invoice_id), 2
    ) as avg_spend_per_invoice,
    ROUND(
        SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) / 
        COUNT(il.id), 2
    ) as avg_spend_per_line_item
FROM invoice_lines il
LEFT JOIN locations l ON il.location_id = l.location_id
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'  -- Replace with your org ID
    AND il.invoice_date >= '2025-08-01'
    AND il.invoice_date <= '2025-08-31'
    AND (il.total_price_after_discount IS NOT NULL OR il.total_price IS NOT NULL)
GROUP BY 
    il.location_id, 
    l.name, 
    il.currency
ORDER BY 
    total_spend DESC;

-- Alternative query with more detailed breakdown by product category
SELECT 
    il.location_id,
    l.name as location_name,
    pc.category_name,
    COUNT(DISTINCT il.invoice_id) as invoice_count,
    COUNT(il.id) as line_item_count,
    SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) as category_spend,
    il.currency,
    ROUND(
        (SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) / 
         SUM(SUM(COALESCE(il.total_price_after_discount, il.total_price, 0))) OVER (PARTITION BY il.location_id)
        ) * 100, 2
    ) as percentage_of_location_spend
FROM invoice_lines il
LEFT JOIN locations l ON il.location_id = l.location_id
LEFT JOIN product_categories pc ON il.category_id = pc.category_id
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'  -- Replace with your org ID
    AND il.invoice_date >= '2025-08-01'
    AND il.invoice_date <= '2025-08-31'
    AND (il.total_price_after_discount IS NOT NULL OR il.total_price IS NOT NULL)
GROUP BY 
    il.location_id, 
    l.name, 
    pc.category_name,
    il.currency
ORDER BY 
    il.location_id, 
    category_spend DESC;

-- Simple summary query for quick overview
SELECT 
    il.location_id,
    l.name as location_name,
    SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) as august_spend,
    il.currency
FROM invoice_lines il
LEFT JOIN locations l ON il.location_id = l.location_id
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'  -- Replace with your org ID
    AND il.invoice_date >= '2025-08-01'
    AND il.invoice_date <= '2025-08-31'
    AND (il.total_price_after_discount IS NOT NULL OR il.total_price IS NOT NULL)
GROUP BY 
    il.location_id, 
    l.name, 
    il.currency
ORDER BY 
    august_spend DESC;
