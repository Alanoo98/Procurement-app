-- Add total_amount and subtotal columns to invoice_lines table
-- These columns will store the extracted total amount and subtotal from OCR data

-- Add the columns
ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS total_amount numeric NULL,
ADD COLUMN IF NOT EXISTS subtotal numeric NULL;

-- Add comments to document the columns
COMMENT ON COLUMN public.invoice_lines.total_amount IS 'Total amount extracted from OCR data (includes tax)';
COMMENT ON COLUMN public.invoice_lines.subtotal IS 'Subtotal extracted from OCR data (excludes tax)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_lines_total_amount 
ON public.invoice_lines USING btree (total_amount) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_invoice_lines_subtotal 
ON public.invoice_lines USING btree (subtotal) 
TABLESPACE pg_default;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoice_lines' 
  AND column_name IN ('total_amount', 'subtotal')
ORDER BY column_name;
