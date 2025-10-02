/*
  # Update location mappings table

  1. Changes
    - Drop existing indexes that enforce uniqueness
    - Create new non-unique indexes for performance
    - Add composite unique constraint on all relevant fields to prevent exact duplicates

  2. Security
    - Maintains existing RLS policies
*/

-- Drop existing indexes
DROP INDEX IF EXISTS location_mappings_variant_name_address_idx;
DROP INDEX IF EXISTS location_mappings_variant_receiver_name_idx;

-- Create new non-unique indexes for performance
CREATE INDEX location_mappings_variant_name_idx 
  ON location_mappings (variant_name);

CREATE INDEX location_mappings_variant_address_idx 
  ON location_mappings (variant_address) 
  WHERE variant_address IS NOT NULL;

CREATE INDEX location_mappings_variant_receiver_name_idx 
  ON location_mappings (variant_receiver_name) 
  WHERE variant_receiver_name IS NOT NULL;

-- Add composite unique constraint to prevent exact duplicates
CREATE UNIQUE INDEX location_mappings_unique_variant_idx 
  ON location_mappings (
    location_id,
    COALESCE(variant_name, ''),
    COALESCE(variant_address, ''),
    COALESCE(variant_receiver_name, '')
  );