/*
  # Fix Authentication RLS Policies

  1. Security Updates
    - Add policy to allow user profile creation during sign-up
    - Add policy to allow users to read their own profile data
    - Add policy to allow organization_users insertion during sign-up
    - Ensure proper authentication flow

  2. Changes
    - Add INSERT policy for users table to allow profile creation
    - Add SELECT policy for users table for authenticated users
    - Update organization_users policies to support sign-up flow
    - Add policy to allow anon users to insert organization_users during sign-up process
*/

-- First, ensure the users table has proper RLS policies for authentication
-- Allow users to insert their own profile during sign-up
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Allow users to read their own profile (this should already exist but let's ensure it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Allow organization_users insertion during sign-up process
-- This is needed if your app automatically assigns users to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' 
    AND policyname = 'Allow user organization assignment during signup'
  ) THEN
    CREATE POLICY "Allow user organization assignment during signup"
      ON organization_users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure organization_users has proper SELECT policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' 
    AND policyname = 'Users can read their own organization memberships'
  ) THEN
    CREATE POLICY "Users can read their own organization memberships"
      ON organization_users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to update their organization membership (for role changes, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' 
    AND policyname = 'Users can update their own organization membership'
  ) THEN
    CREATE POLICY "Users can update their own organization membership"
      ON organization_users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure organizations table allows reading for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Users can view their own organizations'
  ) THEN
    CREATE POLICY "Users can view their own organizations"
      ON organizations
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM organization_users
        WHERE organization_users.organization_id = organizations.id
        AND organization_users.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Allow organization creation for authenticated users (if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Authenticated users can create organizations'
  ) THEN
    CREATE POLICY "Authenticated users can create organizations"
      ON organizations
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;