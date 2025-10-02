-- Simple COGS System Setup
-- Just the essentials - no overcomplications!

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.monthly_revenue CASCADE;

-- Create the monthly revenue table
CREATE TABLE public.monthly_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(location_id) ON DELETE CASCADE,
    business_unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
    
    -- Revenue data
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    revenue_amount NUMERIC(12,2) NOT NULL CHECK (revenue_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'DKK', -- DKK, NOK, or GBP
    
    -- Optional notes
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One revenue entry per location per month
    UNIQUE(organization_id, location_id, year, month)
);

-- Add comments
COMMENT ON TABLE public.monthly_revenue IS 'Monthly revenue data for COGS calculations';
COMMENT ON COLUMN public.monthly_revenue.currency IS 'Currency code - should match invoice_lines currency';

-- Create indexes for performance
CREATE INDEX idx_monthly_revenue_org_location ON public.monthly_revenue (organization_id, location_id);
CREATE INDEX idx_monthly_revenue_year_month ON public.monthly_revenue (year, month);

-- Enable RLS
ALTER TABLE public.monthly_revenue ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy - users can only see their organization's data
CREATE POLICY "Users can manage monthly revenue for their organization" ON public.monthly_revenue
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- Verify it worked
SELECT 'Monthly revenue table created successfully!' as status;
