/*
  # Fix Location Mapping Constraints

  1. Changes
    - Remove unique constraints from location_mappings table to allow multiple variants
    - Add non-unique indexes for better query performance
  
  2. Impact
    - Allows multiple locations to be mapped to the same standard location
    - Maintains query performance with non-unique indexes
*/

-- Drop existing unique constraints
DROP INDEX IF EXISTS location_mappings_variant_name_address_idx;
DROP INDEX IF EXISTS location_mappings_variant_receiver_name_idx;

-- Create non-unique indexes for performance
CREATE INDEX location_mappings_variant_name_address_idx 
  ON location_mappings (variant_name, variant_address) 
  WHERE variant_address IS NOT NULL;

CREATE INDEX location_mappings_variant_receiver_name_idx 
  ON location_mappings (variant_receiver_name) 
  WHERE variant_receiver_name IS NOT NULL;