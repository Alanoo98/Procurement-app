-- Drop the complex tables and views if they exist
DROP VIEW IF EXISTS case_concern_timeline;
DROP VIEW IF EXISTS cases_of_concern_with_users;
DROP FUNCTION IF EXISTS get_organization_users(UUID);
DROP TABLE IF EXISTS case_concern_updates;
-- Drop case_comments first since it depends on cases_of_concern
DROP TABLE IF EXISTS case_comments CASCADE;
DROP TABLE IF EXISTS cases_of_concern CASCADE;

-- Simple cases of concern table
CREATE TABLE cases_of_concern (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic fields
  title TEXT NOT NULL,
  description TEXT,
  concern_type TEXT DEFAULT 'other' CHECK (concern_type IN (
    'product', 'supplier', 'spend_per_pax', 'price_variation', 
    'efficiency', 'quality', 'delivery', 'contract', 'other'
  )),
  
  -- Simple status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  
  -- User tracking
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple indexes
CREATE INDEX idx_cases_org ON cases_of_concern(organization_id);
CREATE INDEX idx_cases_status ON cases_of_concern(status);
CREATE INDEX idx_cases_created ON cases_of_concern(created_at DESC);

-- Enable RLS
ALTER TABLE cases_of_concern ENABLE ROW LEVEL SECURITY;

-- Add comments table for cases
CREATE TABLE case_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases_of_concern(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX idx_case_comments_case_id ON case_comments(case_id);
CREATE INDEX idx_case_comments_created ON case_comments(created_at DESC);

-- Enable RLS for comments
ALTER TABLE case_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Users can view comments in their organization" ON case_comments
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM cases_of_concern 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments in their organization" ON case_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    case_id IN (
      SELECT id FROM cases_of_concern 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments" ON case_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND
    case_id IN (
      SELECT id FROM cases_of_concern 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own comments" ON case_comments
  FOR DELETE USING (
    user_id = auth.uid() AND
    case_id IN (
      SELECT id FROM cases_of_concern 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Simple RLS policies
CREATE POLICY "Users can view cases in their organization" ON cases_of_concern
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cases in their organization" ON cases_of_concern
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own cases" ON cases_of_concern
  FOR UPDATE USING (
    created_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cases" ON cases_of_concern
  FOR DELETE USING (
    created_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure user profiles are created automatically
-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Insert into public.users table if not exists
    INSERT INTO public.users (id, full_name, avatar_url, created_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
      NEW.raw_user_meta_data->>'avatar_url', 
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update user profile when auth user is updated
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile if it exists
  UPDATE public.users
  SET 
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
    updated_at = now()
  WHERE id = NEW.id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.users (id, full_name, avatar_url, created_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
      NEW.raw_user_meta_data->>'avatar_url', 
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update user profile when auth user is updated
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Function to ensure all existing auth users have profiles
CREATE OR REPLACE FUNCTION public.ensure_user_profiles()
RETURNS void AS $$
BEGIN
  -- Insert missing user profiles for existing auth users
  INSERT INTO public.users (id, full_name, avatar_url, created_at)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    au.raw_user_meta_data->>'avatar_url',
    au.created_at
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  AND au.email_confirmed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create missing profiles
SELECT public.ensure_user_profiles();

-- Add policy to allow users to see other users in their organization
CREATE POLICY "Users can view other users in their organization" ON users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

