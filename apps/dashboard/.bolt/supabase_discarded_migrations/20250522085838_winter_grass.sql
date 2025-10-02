/*
  # Improve location mappings uniqueness constraints
  
  1. Changes
    - Add unique constraint on variant_name and variant_address combination
    - Add unique constraint on variant_receiver_name when not null
    - Add indexes for faster lookups
  
  2. Security
    - Maintains existing RLS policies
*/

-- Drop existing constraints if they exist
ALTER TABLE location_mappings 
DROP CONSTRAINT IF EXISTS location_mappings_variant_name_address_idx;

ALTER TABLE location_mappings 
DROP CONSTRAINT IF EXISTS location_mappings_variant_receiver_name_idx;

-- Add new constraints
CREATE UNIQUE INDEX location_mappings_variant_name_address_idx 
  ON location_mappings (variant_name, variant_address) 
  WHERE variant_address IS NOT NULL;

CREATE UNIQUE INDEX location_mappings_variant_receiver_name_idx 
  ON location_mappings (variant_receiver_name) 
  WHERE variant_receiver_name IS NOT NULL;