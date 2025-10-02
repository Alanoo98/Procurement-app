-- SQL query to get August 2025 totals for all locations
-- Using the correct logic: prefer total_price_after_discount when > 0, otherwise use total_price

SELECT 
    il.location_id,
    l.name as location_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN il.total_price_after_discount IS NOT NULL THEN 1 END) as records_with_price_after_discount,
    COUNT(CASE WHEN il.total_price IS NOT NULL THEN 1 END) as records_with_total_price,
    
    -- Calculate spending using the same logic as the dashboard
    SUM(
        CASE 
            WHEN COALESCE(il.total_price_after_discount, 0) > 0 THEN il.total_price_after_discount
            ELSE COALESCE(il.total_price, 0)
        END
    ) as total_spend,
    
    -- Alternative calculations for comparison
    SUM(COALESCE(il.total_price_after_discount, 0)) as sum_price_after_discount,
    SUM(COALESCE(il.total_price, 0)) as sum_total_price,
    SUM(COALESCE(il.total_amount, 0)) as sum_total_amount,
    
    -- Count records by type
    COUNT(CASE WHEN COALESCE(il.total_price_after_discount, 0) > 0 THEN 1 END) as records_using_price_after_discount,
    COUNT(CASE WHEN COALESCE(il.total_price_after_discount, 0) = 0 AND COALESCE(il.total_price, 0) > 0 THEN 1 END) as records_using_total_price,
    COUNT(CASE WHEN COALESCE(il.total_price_after_discount, 0) = 0 AND COALESCE(il.total_price, 0) = 0 THEN 1 END) as records_with_zero_spend,
    
    il.currency,
    
    -- Revenue data
    mr.revenue_amount,
    mr.currency as revenue_currency,
    
    -- COGS percentage
    CASE 
        WHEN mr.revenue_amount > 0 THEN 
            ROUND(
                (SUM(
                    CASE 
                        WHEN COALESCE(il.total_price_after_discount, 0) > 0 THEN il.total_price_after_discount
                        ELSE COALESCE(il.total_price, 0)
                    END
                ) / mr.revenue_amount) * 100, 2
            )
        ELSE NULL 
    END as cogs_percentage

FROM invoice_lines il
LEFT JOIN locations l ON il.location_id = l.location_id
LEFT JOIN monthly_revenue mr ON (
    il.location_id = mr.location_id 
    AND mr.year = 2025 
    AND mr.month = 8
    AND mr.organization_id = il.organization_id
)
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND il.invoice_date >= '2025-08-01'
    AND il.invoice_date <= '2025-08-31'
    AND (
        il.total_price_after_discount IS NOT NULL 
        OR il.total_price IS NOT NULL
    )
GROUP BY 
    il.location_id, 
    l.name, 
    il.currency,
    mr.revenue_amount,
    mr.currency
ORDER BY 
    total_spend DESC;

-- Simplified version for quick overview
SELECT 
    il.location_id,
    l.name as location_name,
    COUNT(*) as record_count,
    SUM(
        CASE 
            WHEN COALESCE(il.total_price_after_discount, 0) > 0 THEN il.total_price_after_discount
            ELSE COALESCE(il.total_price, 0)
        END
    ) as total_spend,
    il.currency,
    mr.revenue_amount,
    CASE 
        WHEN mr.revenue_amount > 0 THEN 
            ROUND(
                (SUM(
                    CASE 
                        WHEN COALESCE(il.total_price_after_discount, 0) > 0 THEN il.total_price_after_discount
                        ELSE COALESCE(il.total_price, 0)
                    END
                ) / mr.revenue_amount) * 100, 2
            )
        ELSE NULL 
    END as cogs_percentage
FROM invoice_lines il
LEFT JOIN locations l ON il.location_id = l.location_id
LEFT JOIN monthly_revenue mr ON (
    il.location_id = mr.location_id 
    AND mr.year = 2025 
    AND mr.month = 8
    AND mr.organization_id = il.organization_id
)
WHERE 
    il.organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND il.invoice_date >= '2025-08-01'
    AND il.invoice_date <= '2025-08-31'
    AND (
        il.total_price_after_discount IS NOT NULL 
        OR il.total_price IS NOT NULL
    )
GROUP BY 
    il.location_id, 
    l.name, 
    il.currency,
    mr.revenue_amount
ORDER BY 
    total_spend DESC;
