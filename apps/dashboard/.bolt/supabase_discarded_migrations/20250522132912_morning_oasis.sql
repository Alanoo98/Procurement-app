/*
  # Remove RLS and duplicate relations

  This migration:
  1. Disables RLS on all tables
  2. Removes duplicate relations
  3. Keeps core functionality intact
*/

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can read their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can read organization members" ON organization_users;
DROP POLICY IF EXISTS "Users can read their business units" ON business_units;
DROP POLICY IF EXISTS "Users can read their data sources" ON data_sources;
DROP POLICY IF EXISTS "Users can read their data mappings" ON data_mappings;
DROP POLICY IF EXISTS "Users can read their extracted data" ON extracted_data;
DROP POLICY IF EXISTS "Users can access their organization's locations" ON locations;
DROP POLICY IF EXISTS "Users can access their organization's suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can access their organization's pax data" ON pax_data;
DROP POLICY IF EXISTS "Users can access their organization's price alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can access their organization's product mappings" ON product_mappings;

-- Disable RLS on all tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE pax_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_mappings DISABLE ROW LEVEL SECURITY;

-- Drop and recreate tables with clean relations
DROP TABLE IF EXISTS extracted_data CASCADE;
DROP TABLE IF EXISTS data_mappings CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;
DROP TABLE IF EXISTS business_units CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Create core tables
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE organization_users (
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE data_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
  source_field text NOT NULL,
  target_field text NOT NULL,
  transformation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (data_source_id, source_field)
);

CREATE TABLE extracted_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id) ON DELETE CASCADE,
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
  ADD COLUMN organization_id uuid REFERENCES organizations(id),
  ADD COLUMN business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE suppliers 
  ADD COLUMN organization_id uuid REFERENCES organizations(id),
  ADD COLUMN business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE pax_data 
  ADD COLUMN organization_id uuid REFERENCES organizations(id),
  ADD COLUMN business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE price_alerts 
  ADD COLUMN organization_id uuid REFERENCES organizations(id),
  ADD COLUMN business_unit_id uuid REFERENCES business_units(id);

ALTER TABLE product_mappings 
  ADD COLUMN organization_id uuid REFERENCES organizations(id),
  ADD COLUMN business_unit_id uuid REFERENCES business_units(id);

-- Create indexes for performance
CREATE INDEX idx_extracted_data_organization_status 
  ON extracted_data(organization_id, status);

CREATE INDEX idx_extracted_data_business_unit 
  ON extracted_data(business_unit_id);

CREATE INDEX idx_business_units_organization 
  ON business_units(organization_id);

CREATE INDEX idx_organization_users_user 
  ON organization_users(user_id);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

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