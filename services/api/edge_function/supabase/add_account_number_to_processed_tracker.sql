-- Add account_number column to processed_tracker table
ALTER TABLE public.processed_tracker 
ADD COLUMN account_number integer;

-- Add index for account number queries
CREATE INDEX IF NOT EXISTS idx_processed_tracker_account_number 
ON public.processed_tracker USING btree (account_number);

-- Add index for account number range queries (useful for filtering 1300-1600)
CREATE INDEX IF NOT EXISTS idx_processed_tracker_account_range 
ON public.processed_tracker USING btree (account_number, accounting_year);

-- Add index for account number with status (useful for processing specific account ranges)
CREATE INDEX IF NOT EXISTS idx_processed_tracker_account_status 
ON public.processed_tracker USING btree (account_number, status, accounting_year);

-- Add comment to document the new column
COMMENT ON COLUMN public.processed_tracker.account_number IS 'Account number from e-conomic voucher entries. Used for filtering documents by account ranges (e.g., 1300-1600).';
