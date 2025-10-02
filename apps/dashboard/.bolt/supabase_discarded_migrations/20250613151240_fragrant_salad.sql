/*
  # Add missing fields to price_negotiations table
  
  1. New Fields
    - `description` (text) - Product description
    - `unit_type` (text) - Unit type for the product
    - `unit_subtype` (text) - Optional subtype for the unit
  
  2. Changes
    - Add indexes for the new fields
    - Add constraints to ensure data integrity
*/

-- Add description field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'price_negotiations' AND column_name = 'description'
  ) THEN
    ALTER TABLE price_negotiations ADD COLUMN description text;
  END IF;
END $$;

-- Add unit_type field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'price_negotiations' AND column_name = 'unit_type'
  ) THEN
    ALTER TABLE price_negotiations ADD COLUMN unit_type text;
  END IF;
END $$;

-- Add unit_subtype field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'price_negotiations' AND column_name = 'unit_subtype'
  ) THEN
    ALTER TABLE price_negotiations ADD COLUMN unit_subtype text;
  END IF;
END $$;

-- Create index for unit_type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'price_negotiations' AND indexname = 'idx_price_negotiations_unit_type'
  ) THEN
    CREATE INDEX idx_price_negotiations_unit_type ON price_negotiations USING btree (unit_type);
  END IF;
END $$;

-- Create index for description if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'price_negotiations' AND indexname = 'idx_price_negotiations_description'
  ) THEN
    CREATE INDEX idx_price_negotiations_description ON price_negotiations USING btree (description);
  END IF;
END $$;

-- Enable row level security
ALTER TABLE price_negotiations ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for scoped access if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'price_negotiations' AND policyname = 'Scoped access - price_negotiations'
  ) THEN
    CREATE POLICY "Scoped access - price_negotiations" 
    ON price_negotiations
    FOR SELECT
    TO authenticated
    USING (user_has_access_to_bu(organization_id, business_unit_id));
  END IF;
END $$;