/*
  # Create PAX table for guest count tracking

  1. New Tables
    - `pax`
      - `pax_id` (uuid, primary key) - Record identifier
      - `date_id` (date, foreign key) - Date reference
      - `location_id` (uuid, foreign key) - Location reference
      - `pax_count` (integer) - Guest count (≥ 0)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp
  2. Constraints
    - Check constraint ensuring non-negative PAX count
    - Foreign key to dates table
    - Foreign key to locations table
    - Unique constraint on date_id and location_id
  3. Indexes
    - Primary key on `pax_id`
    - Index on `date_id, location_id` for efficient lookups
  4. Triggers
    - Update trigger for `updated_at` column
*/

CREATE TABLE IF NOT EXISTS pax (
  pax_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id DATE NOT NULL REFERENCES dates(date_id),
  location_id UUID NOT NULL REFERENCES locations(location_id),
  pax_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pax_pax_count_check CHECK (pax_count >= 0),
  CONSTRAINT pax_date_location_unique UNIQUE (date_id, location_id)
);

CREATE INDEX IF NOT EXISTS pax_date_location_idx ON pax (date_id, location_id);

-- Create or replace the update_updated_at_column function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create trigger for updating the updated_at column
CREATE TRIGGER update_pax_updated_at
BEFORE UPDATE ON pax
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();