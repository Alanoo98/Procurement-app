-- Add foreign key relationship between organization_users and users table
-- This will allow proper joins and improve query performance

-- First, ensure the users table exists (it should from the previous migration)
-- If it doesn't exist, this will fail gracefully

-- Add foreign key constraint from organization_users to users table
-- This creates a proper relationship for joins
ALTER TABLE public.organization_users 
ADD CONSTRAINT organization_users_user_id_users_fkey 
FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

-- Create an index for better performance on the new relationship
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id_users 
ON public.organization_users (user_id);

-- Update RLS policies to work with the new relationship
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_users;
DROP POLICY IF EXISTS "Admins can view org members" ON public.organization_users;

-- Create updated RLS policies
-- Users can view their own organization memberships
CREATE POLICY "Users can view own memberships" ON public.organization_users
  FOR SELECT USING (auth.uid() = user_id);

-- Organization admins can view all members in their organization
CREATE POLICY "Admins can view org members" ON public.organization_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_users admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.organization_id = organization_users.organization_id
      AND admin_check.role IN ('admin', 'owner')
    )
  );

-- Super admins can view all organization memberships
CREATE POLICY "Super admins can view all memberships" ON public.organization_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.role = 'owner'
      AND ou.organization_id IN (
        SELECT id FROM public.organizations WHERE slug = 'admin'
      )
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_users TO authenticated;
