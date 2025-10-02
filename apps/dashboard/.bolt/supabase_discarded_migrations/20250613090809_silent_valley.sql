/*
  # Enhanced User Management System

  1. New Tables
    - Enhanced `users` table (extends auth.users)
    - `user_business_unit_access` - Fine-grained access control
    - `user_activity_log` - Activity tracking
    - `user_sessions` - Session management
    - `user_invitations` - User invitation system

  2. Security
    - Enable RLS on all new tables
    - Add comprehensive policies for data access
    - User profile management policies

  3. Functions
    - User profile creation on signup
    - Activity logging
    - Login tracking
    - Permission checking
    - Organization access management
*/

-- First check if the users table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Create the users table if it doesn't exist
    CREATE TABLE users (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text,
      avatar_url text,
      phone text,
      job_title text,
      department text,
      primary_organization_id uuid REFERENCES organizations(id),
      
      -- User preferences
      preferences jsonb DEFAULT '{}',
      
      -- Activity tracking
      last_login_at timestamptz,
      login_count integer DEFAULT 0,
      email_verified_at timestamptz,
      
      -- Account status
      is_active boolean DEFAULT true,
      is_locked boolean DEFAULT false,
      locked_until timestamptz,
      failed_login_attempts integer DEFAULT 0,
      
      -- Audit fields
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  ELSE
    -- If the table exists, make sure it has all the required columns
    -- Add columns that might be missing
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'primary_organization_id') THEN
        ALTER TABLE users ADD COLUMN primary_organization_id uuid REFERENCES organizations(id);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone text;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'job_title') THEN
        ALTER TABLE users ADD COLUMN job_title text;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department text;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferences') THEN
        ALTER TABLE users ADD COLUMN preferences jsonb DEFAULT '{}';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at timestamptz;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'login_count') THEN
        ALTER TABLE users ADD COLUMN login_count integer DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_locked') THEN
        ALTER TABLE users ADD COLUMN is_locked boolean DEFAULT false;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until timestamptz;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts integer DEFAULT 0;
      END IF;
    END;
  END IF;
END $$;

-- Enhanced organization_users with business unit access
CREATE TABLE IF NOT EXISTS user_business_unit_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  
  -- Permissions
  permissions jsonb DEFAULT '{}',
  
  -- Access control
  can_view_all_locations boolean DEFAULT false,
  can_manage_suppliers boolean DEFAULT false,
  can_approve_purchases boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  
  -- Audit fields
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, organization_id, business_unit_id)
);

-- User activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type text NOT NULL, -- 'login', 'logout', 'view', 'create', 'update', 'delete'
  resource_type text, -- 'supplier', 'location', 'invoice', etc.
  resource_id text,
  description text,
  
  -- Context
  ip_address inet,
  user_agent text,
  session_id text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now()
);

-- User sessions (for better session management)
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session details
  session_token text UNIQUE NOT NULL,
  refresh_token text,
  
  -- Device/browser info
  ip_address inet,
  user_agent text,
  device_type text,
  
  -- Session lifecycle
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true
);

-- User invitations (for inviting users to organizations)
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_units(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  
  -- Invitation details
  invited_by uuid NOT NULL REFERENCES users(id),
  invitation_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  message text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES users(id),
  
  -- Expiration
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(primary_organization_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_business_unit_access_user ON user_business_unit_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_business_unit_access_org ON user_business_unit_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_business_unit_access_bu ON user_business_unit_access(business_unit_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_type ON user_activity_log(activity_type);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_org ON user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- Row Level Security Policies

-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can view their own profile'
  ) THEN
    DROP POLICY "Users can view their own profile" ON users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
  ) THEN
    DROP POLICY "Users can update their own profile" ON users;
  END IF;
END $$;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User business unit access policies
ALTER TABLE user_business_unit_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_business_unit_access' AND policyname = 'Users can view their own access'
  ) THEN
    DROP POLICY "Users can view their own access" ON user_business_unit_access;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_business_unit_access' AND policyname = 'Organization admins can manage user access'
  ) THEN
    DROP POLICY "Organization admins can manage user access" ON user_business_unit_access;
  END IF;
END $$;

CREATE POLICY "Users can view their own access"
  ON user_business_unit_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can manage user access"
  ON user_business_unit_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_business_unit_access uba
      WHERE uba.user_id = auth.uid()
      AND uba.organization_id = user_business_unit_access.organization_id
      AND uba.role IN ('owner', 'admin')
    )
  );

-- User activity log policies
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activity_log' AND policyname = 'Users can view their own activity'
  ) THEN
    DROP POLICY "Users can view their own activity" ON user_activity_log;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activity_log' AND policyname = 'System can insert activity logs'
  ) THEN
    DROP POLICY "System can insert activity logs" ON user_activity_log;
  END IF;
END $$;

CREATE POLICY "Users can view their own activity"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User sessions policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can view their own sessions'
  ) THEN
    DROP POLICY "Users can view their own sessions" ON user_sessions;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can manage their own sessions'
  ) THEN
    DROP POLICY "Users can manage their own sessions" ON user_sessions;
  END IF;
END $$;

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON user_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- User invitations policies
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_invitations' AND policyname = 'Organization admins can manage invitations'
  ) THEN
    DROP POLICY "Organization admins can manage invitations" ON user_invitations;
  END IF;
END $$;

CREATE POLICY "Organization admins can manage invitations"
  ON user_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_business_unit_access uba
      WHERE uba.user_id = auth.uid()
      AND uba.organization_id = user_invitations.organization_id
      AND uba.role IN ('owner', 'admin')
    )
  );

-- Functions for user management

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (id, full_name, email_verified_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_activity_log (
    user_id,
    activity_type,
    resource_type,
    resource_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_resource_type,
    p_resource_id,
    p_description,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last login
CREATE OR REPLACE FUNCTION update_user_last_login(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- First check if the column exists to avoid errors
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login_at'
  ) THEN
    UPDATE users 
    SET 
      last_login_at = now(),
      login_count = COALESCE(login_count, 0) + 1,
      failed_login_attempts = 0,
      is_locked = false,
      locked_until = NULL
    WHERE id = p_user_id;
  END IF;
  
  -- Log the login activity
  PERFORM log_user_activity(p_user_id, 'login', NULL, NULL, 'User logged in');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login(p_email text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_attempts integer;
BEGIN
  -- Get user ID and current failed attempts
  SELECT u.id, COALESCE(u.failed_login_attempts, 0)
  INTO v_user_id, v_attempts
  FROM auth.users au
  JOIN users u ON au.id = u.id
  WHERE au.email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    v_attempts := v_attempts + 1;
    
    -- Lock account after 5 failed attempts
    IF v_attempts >= 5 THEN
      UPDATE users 
      SET 
        failed_login_attempts = v_attempts,
        is_locked = true,
        locked_until = now() + interval '30 minutes'
      WHERE id = v_user_id;
    ELSE
      UPDATE users 
      SET failed_login_attempts = v_attempts
      WHERE id = v_user_id;
    END IF;
    
    -- Log the failed attempt
    PERFORM log_user_activity(v_user_id, 'failed_login', NULL, NULL, 'Failed login attempt');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_permission text,
  p_business_unit_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_has_permission boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_business_unit_access uba
    WHERE uba.user_id = p_user_id
    AND uba.organization_id = p_organization_id
    AND (p_business_unit_id IS NULL OR uba.business_unit_id = p_business_unit_id)
    AND (
      uba.role IN ('owner', 'admin') OR
      uba.permissions ? p_permission OR
      (p_permission = 'view_locations' AND uba.can_view_all_locations) OR
      (p_permission = 'manage_suppliers' AND uba.can_manage_suppliers) OR
      (p_permission = 'approve_purchases' AND uba.can_approve_purchases) OR
      (p_permission = 'manage_users' AND uba.can_manage_users)
    )
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  user_role text,
  business_unit_id uuid,
  business_unit_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    uba.role,
    uba.business_unit_id,
    bu.name
  FROM user_business_unit_access uba
  JOIN organizations o ON o.id = uba.organization_id
  LEFT JOIN business_units bu ON bu.id = uba.business_unit_id
  WHERE uba.user_id = p_user_id
  ORDER BY o.name, bu.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing organization_users data to the new system
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_users') THEN
    INSERT INTO user_business_unit_access (user_id, organization_id, role)
    SELECT user_id, organization_id, role
    FROM organization_users
    ON CONFLICT (user_id, organization_id, business_unit_id) DO NOTHING;
  END IF;
END $$;