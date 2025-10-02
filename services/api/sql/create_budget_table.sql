-- Create budget table for revenue and COGS benchmarking
CREATE TABLE IF NOT EXISTS public.monthly_budget (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(location_id) ON DELETE CASCADE,
    business_unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    revenue_budget NUMERIC(12,2) NOT NULL CHECK (revenue_budget >= 0),
    cogs_budget NUMERIC(12,2) NOT NULL CHECK (cogs_budget >= 0),
    currency VARCHAR(3) DEFAULT 'DKK',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, location_id, year, month)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_budget_organization_location 
ON public.monthly_budget(organization_id, location_id);

CREATE INDEX IF NOT EXISTS idx_monthly_budget_year_month 
ON public.monthly_budget(year, month);

-- Enable RLS
ALTER TABLE public.monthly_budget ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for organization access
CREATE POLICY "Users can manage monthly budget for their organization" ON public.monthly_budget
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_monthly_budget_updated_at
    BEFORE UPDATE ON public.monthly_budget
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_budget_updated_at();

-- Insert some sample budget data (optional - remove if not needed)
-- INSERT INTO public.monthly_budget (organization_id, location_id, year, month, revenue_budget, cogs_budget, currency, notes)
-- SELECT 
--     '5c38a370-7d13-4656-97f8-0b71f4000703'::uuid,
--     'b2a67990-d237-4f17-abef-6533892e6f19'::uuid,
--     2025,
--     8,
--     1500000.00,
--     450000.00,
--     'NOK',
--     'Q3 2025 budget target'
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.monthly_budget 
--     WHERE organization_id = '5c38a370-7d13-4656-97f8-0b71f4000703'::uuid
--     AND location_id = 'b2a67990-d237-4f17-abef-6533892e6f19'::uuid
--     AND year = 2025 AND month = 8
-- );

