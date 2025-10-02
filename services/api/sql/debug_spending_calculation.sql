-- Debug query to understand the spending calculation discrepancy
-- Let's compare different price fields for Basso Bergen in August 2025

-- First, let's see what fields are available and their values
SELECT 
    'Field Analysis' as analysis_type,
    COUNT(*) as total_records,
    COUNT(total_price_after_discount) as has_total_price_after_discount,
    COUNT(total_price) as has_total_price,
    COUNT(total_amount) as has_total_amount,
    SUM(COALESCE(total_price_after_discount, 0)) as sum_total_price_after_discount,
    SUM(COALESCE(total_price, 0)) as sum_total_price,
    SUM(COALESCE(total_amount, 0)) as sum_total_amount,
    AVG(COALESCE(total_price_after_discount, 0)) as avg_total_price_after_discount,
    AVG(COALESCE(total_price, 0)) as avg_total_price,
    AVG(COALESCE(total_amount, 0)) as avg_total_amount
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31';

-- Let's see some sample records to understand the data structure
SELECT 
    'Sample Records' as analysis_type,
    invoice_number,
    product_code,
    description,
    total_price_after_discount,
    total_price,
    total_amount,
    subtotal,
    total_tax,
    currency
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND (total_amount > 0 OR total_price_after_discount > 0 OR total_price > 0)
ORDER BY invoice_date DESC
LIMIT 10;

-- Check for potential duplicates by invoice
SELECT 
    'Invoice Analysis' as analysis_type,
    invoice_number,
    COUNT(*) as line_count,
    SUM(COALESCE(total_price_after_discount, 0)) as sum_price_after_discount,
    SUM(COALESCE(total_price, 0)) as sum_total_price,
    SUM(COALESCE(total_amount, 0)) as sum_total_amount,
    SUM(COALESCE(subtotal, 0)) as sum_subtotal,
    SUM(COALESCE(total_tax, 0)) as sum_tax
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
GROUP BY invoice_number
ORDER BY sum_total_amount DESC
LIMIT 10;

-- Compare the three calculation methods
SELECT 
    'Calculation Comparison' as analysis_type,
    'total_price_after_discount' as method,
    SUM(COALESCE(total_price_after_discount, 0)) as total_spend
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND total_price_after_discount IS NOT NULL

UNION ALL

SELECT 
    'Calculation Comparison' as analysis_type,
    'total_price' as method,
    SUM(COALESCE(total_price, 0)) as total_spend
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND total_price IS NOT NULL

UNION ALL

SELECT 
    'Calculation Comparison' as analysis_type,
    'total_amount' as method,
    SUM(COALESCE(total_amount, 0)) as total_spend
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND total_amount IS NOT NULL

UNION ALL

SELECT 
    'Calculation Comparison' as analysis_type,
    'subtotal' as method,
    SUM(COALESCE(subtotal, 0)) as total_spend
FROM invoice_lines 
WHERE 
    organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND location_id = '1f3168d0-ba4f-4f02-995e-0e53e4cdd11d'  -- Basso Bergen
    AND invoice_date >= '2025-08-01'
    AND invoice_date <= '2025-08-31'
    AND subtotal IS NOT NULL;
