/*
  # Add Organization Structure
  
  1. New Tables
    - organizations: Core organization table
    - organization_users: User membership and roles
    - business_units: Organizational divisions
    - data_sources: External data connections
    - data_mappings: Field mapping configurations
    - extracted_data: Imported data storage
  
  2. Changes
    - Add organization and business unit references to existing tables
    - Add performance indexes
    - Add update triggers
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_users table
CREATE TABLE IF NOT EXISTS organization_users (
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- Create business_units table
CREATE TABLE IF NOT EXISTS business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id),
  name text NOT NULL,
  type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Create data_mappings table
CREATE TABLE IF NOT EXISTS data_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
  source_field text NOT NULL,
  target_field text NOT NULL,
  transformation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (data_source_id, source_field)
);

-- Create extracted_data table
CREATE TABLE IF NOT EXISTS extracted_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id),
  data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
  external_id text,
  data jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add organization and business unit references to existing tables
ALTER TABLE locations 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE pax_data 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE price_alerts 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE product_mappings 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES business_units(id);

-- Create indexes for performance
CREATE INDEX idx_extracted_data_organization_status 
  ON extracted_data(organization_id, status);

CREATE INDEX idx_extracted_data_business_unit 
  ON extracted_data(business_unit_id);

CREATE INDEX idx_business_units_organization 
  ON business_units(organization_id);

CREATE INDEX idx_organization_users_user 
  ON organization_users(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_units_updated_at
  BEFORE UPDATE ON business_units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_mappings_updated_at
  BEFORE UPDATE ON data_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracted_data_updated_at
  BEFORE UPDATE ON extracted_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();