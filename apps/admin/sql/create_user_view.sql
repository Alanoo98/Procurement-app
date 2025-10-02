-- Create a view that combines organization_users with user profile data
-- This will make it easier to fetch user data with proper relationships

-- First, create a function to get user email from auth.users
-- This function will be called by the view
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text AS $$
BEGIN
  -- This function will be called by RLS policies
  -- In a real implementation, you might need to use a different approach
  -- depending on your Supabase setup and permissions
  RETURN NULL; -- Placeholder - will be updated based on your auth setup
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view that combines organization_users with user profiles
CREATE OR REPLACE VIEW public.user_organization_view AS
SELECT 
  ou.organization_id,
  ou.user_id,
  ou.role,
  ou.created_at as membership_created_at,
  o.name as organization_name,
  o.slug as organization_slug,
  u.full_name,
  u.avatar_url,
  u.created_at as profile_created_at,
  u.updated_at as profile_updated_at
FROM public.organization_users ou
LEFT JOIN public.organizations o ON ou.organization_id = o.id
LEFT JOIN public.users u ON ou.user_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON public.user_organization_view TO authenticated;

-- Create RLS policies for the view
ALTER VIEW public.user_organization_view SET (security_invoker = true);

-- Note: For getting email addresses, you'll need to use the admin API
-- or create a secure function that can access auth.users
-- The view above provides all the profile data, and email can be fetched
-- separately using the admin API in your application code
