-- Create currency table for multi-currency support
-- This table stores supported currencies with their codes, symbols, and formatting information

CREATE TABLE IF NOT EXISTS public.currencies (
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
CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies USING btree (code);
CREATE INDEX IF NOT EXISTS idx_currencies_active ON public.currencies USING btree (is_active);

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

-- Verify the table was created and populated
SELECT 
    code, 
    name, 
    symbol, 
    symbol_position, 
    decimal_places, 
    is_active 
FROM public.currencies 
ORDER BY code;

