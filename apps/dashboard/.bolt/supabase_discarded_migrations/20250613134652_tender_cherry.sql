/*
  # Fix authentication RLS policies

  1. New Policies
    - Add INSERT policy for users table to allow new user creation
    - Add INSERT policy for organization_users to allow membership creation
    - Add SELECT policy for organizations to allow viewing during signup
    - Add INSERT policy for organizations to allow creation during signup
  
  2. Security
    - Ensure proper RLS policies for authentication flow
    - Fix database error during user signup
    - Enable proper user profile creation
*/

-- Create INSERT policy for users table to allow new user creation during signup
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" 
    ON public.users 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Create INSERT policy for organization_users to allow membership creation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" 
    ON public.organization_users 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create INSERT policy for organizations to allow creation during signup
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" 
    ON public.organizations 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);
  END IF;
END $$;

-- Create SELECT policy for organizations to allow viewing during signup
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Enable select for all users'
  ) THEN
    CREATE POLICY "Enable select for all users" 
    ON public.organizations 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);
  END IF;
END $$;

-- Create INSERT policy for users table to allow service role to create users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Enable insert for service role'
  ) THEN
    CREATE POLICY "Enable insert for service role" 
    ON public.users 
    FOR INSERT 
    TO service_role 
    WITH CHECK (true);
  END IF;
END $$;

-- Create INSERT policy for organization_users to allow service role to create memberships
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' 
    AND policyname = 'Enable insert for service role'
  ) THEN
    CREATE POLICY "Enable insert for service role" 
    ON public.organization_users 
    FOR INSERT 
    TO service_role 
    WITH CHECK (true);
  END IF;
END $$;

-- Ensure the handle_new_user trigger function exists and is properly configured
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    DECLARE
      default_org_id uuid;
    BEGIN
      -- Find or create a default organization
      SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
      
      IF default_org_id IS NULL THEN
        INSERT INTO public.organizations (name, slug)
        VALUES ('Default Organization', 'default-organization')
        RETURNING id INTO default_org_id;
      END IF;
      
      -- Create user profile
      INSERT INTO public.users (id, full_name, avatar_url, organization_id)
      VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', default_org_id);
      
      -- Add user to organization with owner role
      INSERT INTO public.organization_users (organization_id, user_id, role)
      VALUES (default_org_id, NEW.id, 'owner');
      
      -- Grant access to all business units in the organization
      INSERT INTO public.user_business_unit_access (
        user_id, 
        organization_id, 
        business_unit_id, 
        role, 
        permissions
      )
      SELECT 
        NEW.id, 
        default_org_id, 
        NULL, -- NULL means access to all business units
        'owner', 
        '{}'::jsonb;
      
      RETURN NEW;
    END;
    $function$;
  END IF;
END $$;

-- Ensure the trigger is attached to auth.users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;