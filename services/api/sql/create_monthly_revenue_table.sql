-- Create monthly_revenue table for COGS calculations
-- This table stores monthly revenue data for each restaurant/location

CREATE TABLE IF NOT EXISTS public.monthly_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(location_id) ON DELETE CASCADE,
    business_unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
    
    -- Revenue data
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    revenue_amount NUMERIC(12,2) NOT NULL CHECK (revenue_amount >= 0),
    currency VARCHAR(3) DEFAULT 'DKK',
    
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
COMMENT ON COLUMN public.monthly_revenue.currency IS 'Currency code (ISO 4217) for the revenue amount';
COMMENT ON COLUMN public.monthly_revenue.notes IS 'Optional notes about the revenue data';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_revenue_organization_location 
ON public.monthly_revenue USING btree (organization_id, location_id);

CREATE INDEX IF NOT EXISTS idx_monthly_revenue_year_month 
ON public.monthly_revenue USING btree (year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_revenue_business_unit 
ON public.monthly_revenue USING btree (business_unit_id);

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

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'monthly_revenue' 
ORDER BY ordinal_position;

