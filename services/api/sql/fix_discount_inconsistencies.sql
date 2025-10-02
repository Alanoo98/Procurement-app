-- Fix Discount Inconsistencies in Invoice Lines
-- This script addresses the issue where both discount_amount and discount_percentage
-- are set simultaneously, which is logically inconsistent.

-- ============================================================================
-- PART 1: ANALYSIS - Check current state of discount data
-- ============================================================================

-- Check how many records have both discount types set
SELECT 
    'Current State Analysis' as analysis_type,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN discount_amount IS NOT NULL AND discount_amount != 0 THEN 1 END) as has_discount_amount,
    COUNT(CASE WHEN discount_percentage IS NOT NULL AND discount_percentage != 0 THEN 1 END) as has_discount_percentage,
    COUNT(CASE WHEN (discount_amount IS NOT NULL AND discount_amount != 0) 
                AND (discount_percentage IS NOT NULL AND discount_percentage != 0) THEN 1 END) as has_both_discounts,
    COUNT(CASE WHEN (discount_amount IS NULL OR discount_amount = 0) 
                AND (discount_percentage IS NULL OR discount_percentage = 0) THEN 1 END) as has_no_discounts
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';

-- Show sample records with both discount types (the problematic ones)
SELECT 
    'Problematic Records Sample' as analysis_type,
    id,
    invoice_number,
    product_code,
    description,
    unit_price,
    quantity,
    discount_amount,
    discount_percentage,
    unit_price_after_discount,
    total_price_after_discount,
    created_at
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_amount IS NOT NULL AND discount_amount != 0)
    AND (discount_percentage IS NOT NULL AND discount_percentage != 0)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 2: BUSINESS LOGIC - Determine which discount type to keep
-- ============================================================================

-- For records with both discount types, we need to determine which one is correct
-- Based on the user's feedback, when discount_percentage is present, it should take precedence
-- and discount_amount should be set to 0 (since it's a percentage-only discount)

-- Let's analyze the data to understand the pattern
SELECT 
    'Discount Pattern Analysis' as analysis_type,
    discount_amount,
    discount_percentage,
    COUNT(*) as record_count,
    AVG(unit_price) as avg_unit_price,
    AVG(unit_price_after_discount) as avg_unit_price_after_discount
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_amount IS NOT NULL AND discount_amount != 0)
    AND (discount_percentage IS NOT NULL AND discount_percentage != 0)
GROUP BY discount_amount, discount_percentage
ORDER BY record_count DESC;

-- ============================================================================
-- PART 3: FIX - Update records with both discount types
-- ============================================================================

-- Strategy: When both discount_amount and discount_percentage are present,
-- prioritize discount_percentage and set discount_amount to 0
-- This aligns with the business logic that percentage discounts should not have a flat amount

-- First, let's create a backup of the current state (optional but recommended)
-- CREATE TABLE invoice_lines_discount_backup AS 
-- SELECT id, discount_amount, discount_percentage, unit_price_after_discount, total_price_after_discount
-- FROM invoice_lines 
-- WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
--     AND (discount_amount IS NOT NULL AND discount_amount != 0)
--     AND (discount_percentage IS NOT NULL AND discount_percentage != 0);

-- Update records that have both discount types
-- Set discount_amount to 0 when discount_percentage is present
UPDATE invoice_lines 
SET 
    discount_amount = 0,
    -- Recalculate unit_price_after_discount based on percentage only
    unit_price_after_discount = CASE 
        WHEN unit_price IS NOT NULL AND unit_price > 0 AND discount_percentage IS NOT NULL AND discount_percentage > 0
        THEN ROUND(unit_price * (1 - discount_percentage / 100.0), 2)
        ELSE unit_price_after_discount
    END,
    -- Recalculate total_price_after_discount based on new unit_price_after_discount
    total_price_after_discount = CASE 
        WHEN quantity IS NOT NULL AND quantity > 0 
             AND unit_price IS NOT NULL AND unit_price > 0 
             AND discount_percentage IS NOT NULL AND discount_percentage > 0
        THEN ROUND(quantity * unit_price * (1 - discount_percentage / 100.0), 2)
        ELSE total_price_after_discount
    END,
    updated_at = NOW()
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_amount IS NOT NULL AND discount_amount != 0)
    AND (discount_percentage IS NOT NULL AND discount_percentage != 0);

-- ============================================================================
-- PART 4: VALIDATION - Check the results
-- ============================================================================

-- Verify that the fix worked
SELECT 
    'Post-Fix Validation' as analysis_type,
    COUNT(*) as total_invoice_lines,
    COUNT(CASE WHEN discount_amount IS NOT NULL AND discount_amount != 0 THEN 1 END) as has_discount_amount,
    COUNT(CASE WHEN discount_percentage IS NOT NULL AND discount_percentage != 0 THEN 1 END) as has_discount_percentage,
    COUNT(CASE WHEN (discount_amount IS NOT NULL AND discount_amount != 0) 
                AND (discount_percentage IS NOT NULL AND discount_percentage != 0) THEN 1 END) as has_both_discounts,
    COUNT(CASE WHEN discount_amount = 0 AND (discount_percentage IS NOT NULL AND discount_percentage != 0) THEN 1 END) as percentage_only_discounts
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703';

-- Show sample of fixed records
SELECT 
    'Fixed Records Sample' as analysis_type,
    id,
    invoice_number,
    product_code,
    description,
    unit_price,
    quantity,
    discount_amount,
    discount_percentage,
    unit_price_after_discount,
    total_price_after_discount,
    updated_at
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND discount_amount = 0
    AND (discount_percentage IS NOT NULL AND discount_percentage != 0)
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- PART 5: ADD VALIDATION CONSTRAINT (Optional)
-- ============================================================================

-- Add a check constraint to prevent both discount types from being set in the future
-- Note: This is commented out as it might be too restrictive for some edge cases
-- Uncomment if you want to enforce this at the database level

/*
ALTER TABLE invoice_lines 
ADD CONSTRAINT check_discount_consistency 
CHECK (
    -- Either no discounts, or only one type of discount
    (discount_amount IS NULL OR discount_amount = 0) OR 
    (discount_percentage IS NULL OR discount_percentage = 0) OR
    (discount_amount = 0 AND discount_percentage = 0)
);
*/

-- ============================================================================
-- PART 6: SUMMARY REPORT
-- ============================================================================

-- Final summary of the discount data state
SELECT 
    'Final Summary' as analysis_type,
    'Total Records' as metric,
    COUNT(*) as value
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'

UNION ALL

SELECT 
    'Final Summary' as analysis_type,
    'Records with Amount Discount Only' as metric,
    COUNT(*) as value
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_amount IS NOT NULL AND discount_amount != 0)
    AND (discount_percentage IS NULL OR discount_percentage = 0)

UNION ALL

SELECT 
    'Final Summary' as analysis_type,
    'Records with Percentage Discount Only' as metric,
    COUNT(*) as value
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_percentage IS NOT NULL AND discount_percentage != 0)
    AND (discount_amount = 0)

UNION ALL

SELECT 
    'Final Summary' as analysis_type,
    'Records with No Discounts' as metric,
    COUNT(*) as value
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_amount IS NULL OR discount_amount = 0)
    AND (discount_percentage IS NULL OR discount_percentage = 0)

UNION ALL

SELECT 
    'Final Summary' as analysis_type,
    'Records with Both Discounts (ERROR)' as metric,
    COUNT(*) as value
FROM invoice_lines
WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'
    AND (discount_amount IS NOT NULL AND discount_amount != 0)
    AND (discount_percentage IS NOT NULL AND discount_percentage != 0);
