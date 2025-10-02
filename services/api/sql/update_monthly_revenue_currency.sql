-- Update monthly_revenue table to reference currencies table
-- This migration adds proper foreign key relationship to currencies

-- First, add the currency_id column
ALTER TABLE public.monthly_revenue 
ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.currencies(id);

-- Update existing records to use currency_id instead of currency string
UPDATE public.monthly_revenue 
SET currency_id = (
    SELECT id FROM public.currencies 
    WHERE code = COALESCE(monthly_revenue.currency, 'DKK')
)
WHERE currency_id IS NULL;

-- Make currency_id NOT NULL after populating existing data
ALTER TABLE public.monthly_revenue 
ALTER COLUMN currency_id SET NOT NULL;

-- Drop the old currency column
ALTER TABLE public.monthly_revenue 
DROP COLUMN IF EXISTS currency;

-- Add comment to document the new column
COMMENT ON COLUMN public.monthly_revenue.currency_id IS 'Reference to the currency used for this revenue amount';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_revenue_currency 
ON public.monthly_revenue USING btree (currency_id);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'monthly_revenue' 
  AND column_name IN ('currency_id', 'currency')
ORDER BY ordinal_position;

