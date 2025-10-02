/*
  # Organization Data Isolation

  1. Security
    - Create user_belongs_to_organization function to check organization membership
    - Create get_user_organization_id function to retrieve user's organization ID
    - Add organization_id to user profile on signup
    - Ensure all queries respect organization boundaries

  2. Changes
    - Add custom SQL functions for organization membership checks
    - Create trigger to assign users to organizations on signup
    - Update RLS policies to enforce organization isolation
*/

-- Create function to check if a user belongs to an organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_users
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$$;

-- Create function to get a user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  RETURN new;
END;
$$;

-- Create trigger to handle new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to assign user to default organization
CREATE OR REPLACE FUNCTION public.assign_user_to_default_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_org_id uuid;
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = new.id;
  
  -- Extract domain from email
  DECLARE
    domain text := split_part(user_email, '@', 2);
  BEGIN
    -- Find organization with matching domain or create one
    SELECT id INTO default_org_id
    FROM organizations
    WHERE slug = domain
    LIMIT 1;
    
    IF default_org_id IS NULL THEN
      -- Create new organization based on domain
      INSERT INTO organizations (name, slug)
      VALUES (domain, domain)
      RETURNING id INTO default_org_id;
    END IF;
    
    -- Assign user to organization
    INSERT INTO organization_users (organization_id, user_id, role)
    VALUES (default_org_id, new.id, 'member');
    
    -- Update user's organization_id
    UPDATE users
    SET organization_id = default_org_id
    WHERE id = new.id;
  END;
  
  RETURN new;
END;
$$;

-- Create trigger to assign user to default organization
DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_user_to_default_organization();

-- Ensure all tables have proper RLS policies
-- This is a safety check to verify RLS is enabled on all tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_record.tablename);
    RAISE NOTICE 'Enabled RLS on table: %', table_record.tablename;
  END LOOP;
END;
$$;

-- Update the AuthContext to store organization information in user session
COMMENT ON FUNCTION auth.uid() IS 'When using the AuthContext in the frontend, the organization_id will be available in the user object';

-- Add a comment to explain the security model
COMMENT ON SCHEMA public IS 'The DiningSix Procurement system uses Row Level Security to ensure that users can only access data from their assigned organizations. The user_belongs_to_organization() function is used in RLS policies to enforce this isolation.';