-- Add total_tax column to invoice_lines table
-- This column will store the total tax amount for each invoice line

-- Add the total_tax column
ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS total_tax numeric NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.invoice_lines.total_tax IS 'Total tax amount for this invoice line item';

-- Create index for better query performance on tax-related queries
CREATE INDEX IF NOT EXISTS idx_invoice_lines_total_tax 
ON public.invoice_lines USING btree (total_tax) 
TABLESPACE pg_default;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoice_lines' AND column_name = 'total_tax';
