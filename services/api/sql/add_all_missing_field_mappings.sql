-- Add all missing field mappings for nanonets data sources
-- This includes total_tax, discount_percentage, and discount_value mappings

-- First, let's see what data sources exist
SELECT 
    ds.id as data_source_id,
    ds.name as source_name,
    ds.type as source_type,
    ds.organization_id
FROM data_sources ds
WHERE ds.is_active = true
ORDER BY ds.name;

-- Add total_tax mapping for all active nanonets data sources
INSERT INTO data_mappings (data_source_id, source_field, target_field, transformation)
SELECT 
    ds.id as data_source_id,
    'total_tax' as source_field,
    'total_tax' as target_field,
    'to_number' as transformation
FROM data_sources ds
WHERE ds.type = 'nanonets' 
  AND ds.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM data_mappings dm 
    WHERE dm.data_source_id = ds.id 
    AND dm.source_field = 'total_tax'
  );

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

-- Add discount_amount mapping for all active nanonets data sources
INSERT INTO data_mappings (data_source_id, source_field, target_field, transformation)
SELECT 
    ds.id as data_source_id,
    'discount_amount' as source_field,
    'discount_amount' as target_field,
    'to_number' as transformation
FROM data_sources ds
WHERE ds.type = 'nanonets' 
  AND ds.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM data_mappings dm 
    WHERE dm.data_source_id = ds.id 
    AND dm.source_field = 'discount_amount'
  );

-- Verify all mappings were added
SELECT 
    dm.id,
    ds.name as source_name,
    dm.source_field,
    dm.target_field,
    dm.transformation
FROM data_mappings dm
JOIN data_sources ds ON dm.data_source_id = ds.id
WHERE dm.source_field IN ('total_tax', 'discount_percentage', 'discount_amount')
ORDER BY ds.name, dm.source_field;

-- Show summary of mappings added
SELECT 
    dm.source_field,
    COUNT(*) as mappings_count
FROM data_mappings dm
JOIN data_sources ds ON dm.data_source_id = ds.id
WHERE dm.source_field IN ('total_tax', 'discount_percentage', 'discount_amount')
  AND ds.type = 'nanonets'
GROUP BY dm.source_field
ORDER BY dm.source_field;
