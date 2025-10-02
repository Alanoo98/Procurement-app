/*
  # Fix dates table indexes

  This migration fixes the issue with duplicate indexes on the dates table by:
  1. Dropping existing indexes if they exist
  2. Recreating them only if they don't exist
*/

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS dates_year_month_idx;
DROP INDEX IF EXISTS dates_week_idx;

-- Recreate indexes only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'dates_year_month_idx'
  ) THEN
    CREATE INDEX dates_year_month_idx ON dates (year, month);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'dates_week_idx'
  ) THEN
    CREATE INDEX dates_week_idx ON dates (week);
  END IF;
END $$;