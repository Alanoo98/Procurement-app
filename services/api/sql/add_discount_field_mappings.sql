-- Add discount field mappings to data_mappings table
-- This will map the 'discount_percentage' field from nanonets data to the 'discount_percentage' field in invoice_lines

-- First, let's see what data sources exist
SELECT 
    ds.id as data_source_id,
    ds.name as source_name,
    ds.type as source_type,
    ds.organization_id
FROM data_sources ds
WHERE ds.is_active = true
ORDER BY ds.name;

-- Add discount_percentage mapping for all active nanonets data sources
INSERT INTO data_mappings (data_source_id, source_field, target_field, transformation)
SELECT 
    ds.id as data_source_id,
    'discount_percentage' as source_field,
    'discount_percentage' as target_field,
    'to_number' as transformation
FROM data_sources ds
WHERE ds.type = 'nanonets' 
  AND ds.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM data_mappings dm 
    WHERE dm.data_source_id = ds.id 
    AND dm.source_field = 'discount_percentage'
  );

-- Add discount_value mapping for all active nanonets data sources (if it exists)
INSERT INTO data_mappings (data_source_id, source_field, target_field, transformation)
SELECT 
    ds.id as data_source_id,
    'discount_value' as source_field,
    'discount_amount' as target_field,
    'to_number' as transformation
FROM data_sources ds
WHERE ds.type = 'nanonets' 
  AND ds.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM data_mappings dm 
    WHERE dm.data_source_id = ds.id 
    AND dm.source_field = 'discount_value'
  );

-- Verify the mappings were added
SELECT 
    dm.id,
    ds.name as source_name,
    dm.source_field,
    dm.target_field,
    dm.transformation
FROM data_mappings dm
JOIN data_sources ds ON dm.data_source_id = ds.id
WHERE dm.source_field IN ('discount_percentage', 'discount_value', 'total_tax')
ORDER BY ds.name, dm.source_field;

-- Show count of mappings added
SELECT 
    COUNT(*) as discount_mappings_added
FROM data_mappings dm
JOIN data_sources ds ON dm.data_source_id = ds.id
WHERE dm.source_field IN ('discount_percentage', 'discount_value') 
  AND ds.type = 'nanonets';
