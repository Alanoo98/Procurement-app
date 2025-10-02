-- Complete COGS System Setup
-- This script creates the entire COGS analysis system from scratch
-- It leverages the existing currency column in invoice_lines table

-- =====================================================
-- 1. DROP EXISTING TABLES (if they exist)
-- =====================================================

DROP TABLE IF EXISTS public.monthly_revenue CASCADE;
DROP TABLE IF EXISTS public.currencies CASCADE;

-- =====================================================
-- 2. CREATE CURRENCIES TABLE
-- =====================================================

CREATE TABLE public.currencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO 4217 currency code
    name VARCHAR(100) NOT NULL, -- Full currency name
    symbol VARCHAR(10) NOT NULL, -- Currency symbol (e.g., kr, £, $)
    symbol_position VARCHAR(10) NOT NULL DEFAULT 'after', -- 'before' or 'after'
    decimal_places INTEGER NOT NULL DEFAULT 2, -- Number of decimal places
    is_active BOOLEAN NOT NULL DEFAULT true, -- Whether currency is currently supported
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial currencies
INSERT INTO public.currencies (code, name, symbol, symbol_position, decimal_places, is_active) VALUES
('DKK', 'Danish Krone', 'kr', 'after', 2, true),
('NOK', 'Norwegian Krone', 'kr', 'after', 2, true),
('GBP', 'British Pound Sterling', '£', 'before', 2, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    symbol_position = EXCLUDED.symbol_position,
    decimal_places = EXCLUDED.decimal_places,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Add comments to document the table
COMMENT ON TABLE public.currencies IS 'Supported currencies for the procurement system';
COMMENT ON COLUMN public.currencies.code IS 'ISO 4217 currency code (e.g., DKK, NOK, GBP)';
COMMENT ON COLUMN public.currencies.name IS 'Full currency name';
COMMENT ON COLUMN public.currencies.symbol IS 'Currency symbol for display';
COMMENT ON COLUMN public.currencies.symbol_position IS 'Position of symbol relative to amount (before/after)';
COMMENT ON COLUMN public.currencies.decimal_places IS 'Number of decimal places for this currency';

-- Create indexes for better query performance
CREATE INDEX idx_currencies_code ON public.currencies USING btree (code);
CREATE INDEX idx_currencies_active ON public.currencies USING btree (is_active);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_currencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_currencies_updated_at
    BEFORE UPDATE ON public.currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_currencies_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - currencies are read-only for all authenticated users
CREATE POLICY "Anyone can view active currencies" ON public.currencies
    FOR SELECT USING (is_active = true);

-- =====================================================
-- 3. CREATE MONTHLY REVENUE TABLE
-- =====================================================

CREATE TABLE public.monthly_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(location_id) ON DELETE CASCADE,
    business_unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
    
    -- Revenue data
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    revenue_amount NUMERIC(12,2) NOT NULL CHECK (revenue_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'DKK', -- Direct currency code (DKK, NOK, GBP)
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique revenue entry per location per month
    UNIQUE(organization_id, location_id, year, month)
);

-- Add comments to document the table
COMMENT ON TABLE public.monthly_revenue IS 'Monthly revenue data for COGS percentage calculations';
COMMENT ON COLUMN public.monthly_revenue.revenue_amount IS 'Monthly revenue amount in the specified currency';
COMMENT ON COLUMN public.monthly_revenue.currency IS 'Currency code (DKK, NOK, GBP) - should match invoice_lines currency';
COMMENT ON COLUMN public.monthly_revenue.notes IS 'Optional notes about the revenue data';

-- Create indexes for better query performance
CREATE INDEX idx_monthly_revenue_organization_location 
ON public.monthly_revenue USING btree (organization_id, location_id);

CREATE INDEX idx_monthly_revenue_year_month 
ON public.monthly_revenue USING btree (year, month);

CREATE INDEX idx_monthly_revenue_business_unit 
ON public.monthly_revenue USING btree (business_unit_id);

CREATE INDEX idx_monthly_revenue_currency 
ON public.monthly_revenue USING btree (currency);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_monthly_revenue_updated_at
    BEFORE UPDATE ON public.monthly_revenue
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_revenue_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.monthly_revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view monthly revenue for their organization" ON public.monthly_revenue
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "Users can insert monthly revenue for their organization" ON public.monthly_revenue
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "Users can update monthly revenue for their organization" ON public.monthly_revenue
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "Users can delete monthly revenue for their organization" ON public.monthly_revenue
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- =====================================================
-- 4. CREATE COGS ANALYSIS VIEW (OPTIONAL)
-- =====================================================

-- Create a view that combines revenue and spending data for easy COGS analysis
CREATE OR REPLACE VIEW public.cogs_analysis_view AS
SELECT 
    mr.id as revenue_id,
    mr.organization_id,
    mr.location_id,
    mr.business_unit_id,
    mr.year,
    mr.month,
    mr.revenue_amount,
    mr.currency as revenue_currency,
    mr.notes,
    l.name as location_name,
    l.address as location_address,
    
    -- Calculate total spending from invoice_lines
    COALESCE(spending.total_spend, 0) as total_spend,
    COALESCE(spending.spending_currency, mr.currency) as spending_currency,
    
    -- Calculate COGS percentage
    CASE 
        WHEN mr.revenue_amount > 0 THEN 
            (COALESCE(spending.total_spend, 0) / mr.revenue_amount) * 100
        ELSE 0 
    END as cogs_percentage,
    
    -- Count products
    COALESCE(spending.product_count, 0) as product_count,
    
    -- Currency consistency check
    CASE 
        WHEN mr.currency = COALESCE(spending.spending_currency, mr.currency) THEN true
        ELSE false
    END as currency_consistent,
    
    mr.created_at,
    mr.updated_at

FROM public.monthly_revenue mr
LEFT JOIN public.locations l ON mr.location_id = l.location_id
LEFT JOIN (
    SELECT 
        organization_id,
        location_id,
        EXTRACT(YEAR FROM invoice_date) as year,
        EXTRACT(MONTH FROM invoice_date) as month,
        SUM(COALESCE(total_price_after_discount, total_price, 0)) as total_spend,
        currency as spending_currency,
        COUNT(DISTINCT COALESCE(product_code, description)) as product_count
    FROM public.invoice_lines
    WHERE total_price_after_discount IS NOT NULL 
       OR total_price IS NOT NULL
    GROUP BY organization_id, location_id, EXTRACT(YEAR FROM invoice_date), EXTRACT(MONTH FROM invoice_date), currency
) spending ON (
    mr.organization_id = spending.organization_id 
    AND mr.location_id = spending.location_id 
    AND mr.year = spending.year 
    AND mr.month = spending.month
);

-- Add comment to the view
COMMENT ON VIEW public.cogs_analysis_view IS 'Combined view of monthly revenue and spending data for COGS analysis';

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get COGS analysis for a specific location and month
CREATE OR REPLACE FUNCTION get_cogs_analysis(
    p_organization_id UUID,
    p_location_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    revenue_amount NUMERIC,
    total_spend NUMERIC,
    cogs_percentage NUMERIC,
    currency VARCHAR(3),
    currency_consistent BOOLEAN,
    product_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cav.revenue_amount,
        cav.total_spend,
        cav.cogs_percentage,
        cav.revenue_currency,
        cav.currency_consistent,
        cav.product_count
    FROM public.cogs_analysis_view cav
    WHERE cav.organization_id = p_organization_id
      AND cav.location_id = p_location_id
      AND cav.year = p_year
      AND cav.month = p_month;
END;
$$ LANGUAGE plpgsql;

-- Function to get product breakdown for COGS analysis
CREATE OR REPLACE FUNCTION get_cogs_product_breakdown(
    p_organization_id UUID,
    p_location_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    product_code TEXT,
    description TEXT,
    total_spend NUMERIC,
    spend_percentage NUMERIC,
    invoice_count BIGINT,
    avg_price NUMERIC,
    category_name TEXT
) AS $$
DECLARE
    total_spend_amount NUMERIC;
BEGIN
    -- Get total spend for percentage calculation
    SELECT SUM(COALESCE(total_price_after_discount, total_price, 0))
    INTO total_spend_amount
    FROM public.invoice_lines
    WHERE organization_id = p_organization_id
      AND location_id = p_location_id
      AND EXTRACT(YEAR FROM invoice_date) = p_year
      AND EXTRACT(MONTH FROM invoice_date) = p_month
      AND (total_price_after_discount IS NOT NULL OR total_price IS NOT NULL);
    
    -- Return product breakdown
    RETURN QUERY
    SELECT 
        COALESCE(il.product_code, '') as product_code,
        il.description,
        SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) as total_spend,
        CASE 
            WHEN total_spend_amount > 0 THEN 
                (SUM(COALESCE(il.total_price_after_discount, il.total_price, 0)) / total_spend_amount) * 100
            ELSE 0 
        END as spend_percentage,
        COUNT(*) as invoice_count,
        AVG(COALESCE(il.total_price_after_discount, il.total_price, 0)) as avg_price,
        pc.name as category_name
    FROM public.invoice_lines il
    LEFT JOIN public.product_categories pc ON il.category_id = pc.id
    WHERE il.organization_id = p_organization_id
      AND il.location_id = p_location_id
      AND EXTRACT(YEAR FROM il.invoice_date) = p_year
      AND EXTRACT(MONTH FROM il.invoice_date) = p_month
      AND (il.total_price_after_discount IS NOT NULL OR il.total_price IS NOT NULL)
    GROUP BY COALESCE(il.product_code, ''), il.description, pc.name
    ORDER BY total_spend DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VERIFY INSTALLATION
-- =====================================================

-- Verify tables were created
SELECT 
    'Tables Created' as status,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('currencies', 'monthly_revenue')
ORDER BY table_name;

-- Verify currencies were inserted
SELECT 
    'Currencies' as status,
    code,
    name,
    symbol,
    symbol_position,
    decimal_places,
    is_active
FROM public.currencies 
ORDER BY code;

-- Verify view was created
SELECT 
    'View Created' as status,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'cogs_analysis_view';

-- Verify functions were created
SELECT 
    'Functions Created' as status,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_cogs_analysis', 'get_cogs_product_breakdown')
ORDER BY routine_name;

-- =====================================================
-- 7. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Uncomment the following lines to insert sample data for testing
/*
-- Sample monthly revenue data (replace with actual organization and location IDs)
INSERT INTO public.monthly_revenue (organization_id, location_id, year, month, revenue_amount, currency, notes)
VALUES 
    ('your-org-id-here', 'your-location-id-here', 2025, 8, 1000000.00, 'DKK', 'Kød Frogner August 2025 - Sample data'),
    ('your-org-id-here', 'your-location-id-here', 2025, 7, 950000.00, 'DKK', 'Kød Frogner July 2025 - Sample data')
ON CONFLICT (organization_id, location_id, year, month) DO NOTHING;
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    'COGS System Setup Complete!' as message,
    'Tables: currencies, monthly_revenue' as tables,
    'View: cogs_analysis_view' as views,
    'Functions: get_cogs_analysis, get_cogs_product_breakdown' as functions,
    'Ready to use with existing invoice_lines currency data' as note;

