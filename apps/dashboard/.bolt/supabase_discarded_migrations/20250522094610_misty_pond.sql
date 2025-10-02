/*
  # Fix location mappings indexes

  1. Changes
    - Drop all existing location mapping indexes to avoid conflicts
    - Create new optimized indexes for performance
    - Add composite unique constraint to prevent exact duplicates while allowing similar variants
    
  2. Indexes
    - variant_name for general lookups
    - variant_address for address-based lookups
    - variant_receiver_name for receiver name lookups
    - Composite unique index to prevent exact duplicates
*/

-- Drop all existing indexes to avoid conflicts
DROP INDEX IF EXISTS location_mappings_variant_name_idx;
DROP INDEX IF EXISTS location_mappings_variant_address_idx;
DROP INDEX IF EXISTS location_mappings_variant_receiver_name_idx;
DROP INDEX IF EXISTS location_mappings_unique_variant_idx;

-- Create optimized indexes for lookups
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