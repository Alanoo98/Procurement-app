/*
  # User Signup and Authentication System

  1. New Tables
    - None (uses existing tables)
  
  2. Security
    - Creates database trigger for new user signup
    - Implements automatic user profile creation
    - Adds organization assignment for new users
    - Sets up proper access control
  
  3. Changes
    - Adds handle_new_user() trigger function
    - Adds assign_user_to_default_organization() function
    - Creates trigger on auth.users table
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id uuid;
  user_role text := 'member';
BEGIN
  -- Only proceed if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Insert into public.users table
    INSERT INTO public.users (id, full_name, avatar_url, created_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url', NOW());
    
    -- Call function to assign user to default organization
    PERFORM assign_user_to_default_organization(NEW.id, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to assign user to default organization
CREATE OR REPLACE FUNCTION public.assign_user_to_default_organization(user_id uuid, user_email text)
RETURNS void AS $$
DECLARE
  default_org_id uuid;
  user_role text := 'member';
  email_domain text;
  matching_org_id uuid;
BEGIN
  -- Extract domain from email
  email_domain := split_part(user_email, '@', 2);
  
  -- Check if there's an organization with a matching domain in settings
  SELECT id INTO matching_org_id
  FROM public.organizations
  WHERE settings->>'allowed_email_domains' ? email_domain
  LIMIT 1;
  
  -- If matching organization found, use it
  IF matching_org_id IS NOT NULL THEN
    default_org_id := matching_org_id;
    
    -- Check if this is the first user for this organization
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_users 
      WHERE organization_id = default_org_id
    ) THEN
      user_role := 'owner';
    END IF;
  ELSE
    -- No matching organization, get the default organization
    SELECT id INTO default_org_id
    FROM public.organizations
    WHERE settings->>'is_default' = 'true'
    LIMIT 1;
    
    -- If no default organization exists, create one
    IF default_org_id IS NULL THEN
      INSERT INTO public.organizations (name, slug, settings)
      VALUES (
        'Default Organization', 
        'default-org-' || floor(random() * 1000)::text,
        jsonb_build_object('is_default', 'true')
      )
      RETURNING id INTO default_org_id;
      
      -- First user of a new organization is the owner
      user_role := 'owner';
    END IF;
  END IF;
  
  -- Add user to the organization
  INSERT INTO public.organization_users (organization_id, user_id, role)
  VALUES (default_org_id, user_id, user_role);
  
  -- Grant access to all business units in the organization for owners and admins
  IF user_role IN ('owner', 'admin') THEN
    INSERT INTO public.user_business_unit_access (
      user_id, 
      organization_id, 
      business_unit_id, 
      role, 
      permissions
    )
    SELECT 
      user_id,
      default_org_id,
      NULL, -- NULL means access to all business units
      user_role,
      '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_business_unit_access
      WHERE user_id = user_id AND organization_id = default_org_id AND business_unit_id IS NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for email confirmation updates
CREATE OR REPLACE TRIGGER on_auth_user_updated
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled on critical tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_business_unit_access ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies for users table
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
  
  -- Create policies
  CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);
    
  CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
END $$;

-- Create or update RLS policies for organization_users table
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read their own organization memberships" ON public.organization_users;
  
  -- Create policies
  CREATE POLICY "Users can read their own organization memberships" 
    ON public.organization_users FOR SELECT 
    USING (auth.uid() = user_id);
END $$;

-- Create or update RLS policies for user_business_unit_access table
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own access" ON public.user_business_unit_access;
  DROP POLICY IF EXISTS "Organization admins can manage user access" ON public.user_business_unit_access;
  
  -- Create policies
  CREATE POLICY "Users can view their own access" 
    ON public.user_business_unit_access FOR SELECT 
    USING (auth.uid() = user_id);
    
  CREATE POLICY "Organization admins can manage user access" 
    ON public.user_business_unit_access FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM user_business_unit_access uba
        WHERE uba.user_id = auth.uid() 
        AND uba.organization_id = user_business_unit_access.organization_id
        AND uba.role IN ('owner', 'admin')
      )
    );
END $$;

-- Create helper function for checking organization membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;