-- Analyze discount scenarios in existing invoice_lines data
-- This script will help us understand what discount patterns exist

-- 1. Overall discount statistics
SELECT 
    'Total invoice_lines' as metric,
    COUNT(*) as count
FROM invoice_lines
UNION ALL
SELECT 
    'Lines with discount_amount > 0' as metric,
    COUNT(*) as count
FROM invoice_lines 
WHERE discount_amount IS NOT NULL AND discount_amount > 0
UNION ALL
SELECT 
    'Lines with discount_percentage > 0' as metric,
    COUNT(*) as count
FROM invoice_lines 
WHERE discount_percentage IS NOT NULL AND discount_percentage > 0
UNION ALL
SELECT 
    'Lines with BOTH discount_amount > 0 AND discount_percentage > 0' as metric,
    COUNT(*) as count
FROM invoice_lines 
WHERE discount_amount IS NOT NULL AND discount_amount > 0 
  AND discount_percentage IS NOT NULL AND discount_percentage > 0
UNION ALL
SELECT 
    'Lines with discount_amount = 0 AND discount_percentage > 0' as metric,
    COUNT(*) as count
FROM invoice_lines 
WHERE discount_amount = 0 
  AND discount_percentage IS NOT NULL AND discount_percentage > 0
UNION ALL
SELECT 
    'Lines with discount_percentage = 0 AND discount_amount > 0' as metric,
    COUNT(*) as count
FROM invoice_lines 
WHERE discount_percentage = 0 
  AND discount_amount IS NOT NULL AND discount_amount > 0
UNION ALL
SELECT 
    'Lines with no discounts' as metric,
    COUNT(*) as count
FROM invoice_lines 
WHERE (discount_amount IS NULL OR discount_amount = 0) 
  AND (discount_percentage IS NULL OR discount_percentage = 0);

-- 2. Sample problematic cases (both discount types present)
SELECT 
    'Sample problematic cases (both discount types present)' as analysis,
    id,
    invoice_number,
    description,
    unit_price,
    discount_amount,
    discount_percentage,
    unit_price_after_discount,
    total_price_after_discount,
    quantity
FROM invoice_lines 
WHERE discount_amount IS NOT NULL AND discount_amount > 0 
  AND discount_percentage IS NOT NULL AND discount_percentage > 0
LIMIT 10;

-- 3. Discount amount vs percentage distribution
SELECT 
    'Discount amount distribution' as analysis,
    CASE 
        WHEN discount_amount IS NULL THEN 'NULL'
        WHEN discount_amount = 0 THEN '0'
        WHEN discount_amount > 0 AND discount_amount <= 10 THEN '1-10'
        WHEN discount_amount > 10 AND discount_amount <= 50 THEN '11-50'
        WHEN discount_amount > 50 AND discount_amount <= 100 THEN '51-100'
        WHEN discount_amount > 100 THEN '100+'
    END as amount_range,
    COUNT(*) as count
FROM invoice_lines 
GROUP BY 
    CASE 
        WHEN discount_amount IS NULL THEN 'NULL'
        WHEN discount_amount = 0 THEN '0'
        WHEN discount_amount > 0 AND discount_amount <= 10 THEN '1-10'
        WHEN discount_amount > 10 AND discount_amount <= 50 THEN '11-50'
        WHEN discount_amount > 50 AND discount_amount <= 100 THEN '51-100'
        WHEN discount_amount > 100 THEN '100+'
    END
ORDER BY 
    CASE 
        WHEN discount_amount IS NULL THEN 1
        WHEN discount_amount = 0 THEN 2
        WHEN discount_amount > 0 AND discount_amount <= 10 THEN 3
        WHEN discount_amount > 10 AND discount_amount <= 50 THEN 4
        WHEN discount_amount > 50 AND discount_amount <= 100 THEN 5
        WHEN discount_amount > 100 THEN 6
    END;

-- 4. Discount percentage distribution
SELECT 
    'Discount percentage distribution' as analysis,
    CASE 
        WHEN discount_percentage IS NULL THEN 'NULL'
        WHEN discount_percentage = 0 THEN '0'
        WHEN discount_percentage > 0 AND discount_percentage <= 5 THEN '1-5%'
        WHEN discount_percentage > 5 AND discount_percentage <= 10 THEN '6-10%'
        WHEN discount_percentage > 10 AND discount_percentage <= 20 THEN '11-20%'
        WHEN discount_percentage > 20 AND discount_percentage <= 50 THEN '21-50%'
        WHEN discount_percentage > 50 THEN '50%+'
    END as percentage_range,
    COUNT(*) as count
FROM invoice_lines 
GROUP BY 
    CASE 
        WHEN discount_percentage IS NULL THEN 'NULL'
        WHEN discount_percentage = 0 THEN '0'
        WHEN discount_percentage > 0 AND discount_percentage <= 5 THEN '1-5%'
        WHEN discount_percentage > 5 AND discount_percentage <= 10 THEN '11-10%'
        WHEN discount_percentage > 10 AND discount_percentage <= 20 THEN '11-20%'
        WHEN discount_percentage > 20 AND discount_percentage <= 50 THEN '21-50%'
        WHEN discount_percentage > 50 THEN '50%+'
    END
ORDER BY 
    CASE 
        WHEN discount_percentage IS NULL THEN 1
        WHEN discount_percentage = 0 THEN 2
        WHEN discount_percentage > 0 AND discount_percentage <= 5 THEN 3
        WHEN discount_percentage > 5 AND discount_percentage <= 10 THEN 4
        WHEN discount_percentage > 10 AND discount_percentage <= 20 THEN 5
        WHEN discount_percentage > 20 AND discount_percentage <= 50 THEN 6
        WHEN discount_percentage > 50 THEN 7
    END;

-- 5. Cases where discount_amount and discount_percentage have similar values (potential conflicts)
SELECT 
    'Potential conflicts (similar values)' as analysis,
    COUNT(*) as count,
    'Cases where discount_amount ≈ discount_percentage' as description
FROM invoice_lines 
WHERE discount_amount IS NOT NULL AND discount_amount > 0 
  AND discount_percentage IS NOT NULL AND discount_percentage > 0
  AND ABS(discount_amount - discount_percentage) <= 5; -- Within 5 units

-- 6. Calculate what the correct unit_price_after_discount should be for percentage discounts
SELECT 
    'Percentage discount validation' as analysis,
    COUNT(*) as total_cases,
    COUNT(CASE 
        WHEN unit_price IS NOT NULL AND discount_percentage IS NOT NULL AND discount_percentage > 0
        THEN 1 
    END) as cases_with_data,
    COUNT(CASE 
        WHEN unit_price IS NOT NULL AND discount_percentage IS NOT NULL AND discount_percentage > 0
        AND ABS(unit_price_after_discount - (unit_price * (1 - discount_percentage/100))) <= 0.01
        THEN 1 
    END) as correctly_calculated
FROM invoice_lines 
WHERE discount_percentage IS NOT NULL AND discount_percentage > 0;
