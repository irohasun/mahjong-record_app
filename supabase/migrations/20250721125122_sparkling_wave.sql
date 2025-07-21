/*
  # Enhanced Authentication System

  1. Enhanced Tables
    - Enhanced `accounts` table with profile information
    - New `user_profiles` table for extended profile data
    - New `user_sessions` table for session management
    - New `user_roles` table for role-based access control

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for secure data access
    - Add functions for user management
    - Add triggers for automatic profile creation

  3. Indexes
    - Performance optimization indexes
    - Unique constraints for data integrity
*/

-- Enhanced accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ja';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Tokyo';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_last_login ON accounts(last_login_at);

-- User profiles table for extended information
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- User roles table for role-based access control
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- User role assignments
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES accounts(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, role_id)
);

ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Insert default roles
INSERT INTO user_roles (name, description, permissions) VALUES
  ('user', 'Standard user', '["read_own_data", "write_own_data"]'),
  ('premium', 'Premium user', '["read_own_data", "write_own_data", "unlimited_games", "advanced_stats"]'),
  ('admin', 'Administrator', '["read_all", "write_all", "user_management"]')
ON CONFLICT (name) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);

-- RLS Policies for accounts table (enhanced)
DROP POLICY IF EXISTS "Users can read own account data" ON accounts;
DROP POLICY IF EXISTS "Users can update own account data" ON accounts;
DROP POLICY IF EXISTS "Users can insert own account data" ON accounts;

CREATE POLICY "Users can read own account data"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR id = 'dummy-user-id');

CREATE POLICY "Users can update own account data"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own account data"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text OR id = 'dummy-user-id');

-- RLS Policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can read own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_roles (read-only for users)
CREATE POLICY "Users can read roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_role_assignments
CREATE POLICY "Users can read own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Functions for user management
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create account record
  INSERT INTO public.accounts (id, username, email, email_verified, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'プレイヤー'),
    new.email,
    new.email_confirmed_at IS NOT NULL,
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = now();

  -- Create user profile
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'プレイヤー')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign default user role
  INSERT INTO public.user_role_assignments (user_id, role_id)
  SELECT new.id, id FROM public.user_roles WHERE name = 'user'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic user setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update user last login
CREATE OR REPLACE FUNCTION public.update_last_login(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.accounts
  SET last_login_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  permissions jsonb := '[]'::jsonb;
  role_permissions jsonb;
BEGIN
  SELECT array_agg(ur.permissions)::jsonb INTO role_permissions
  FROM user_role_assignments ura
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ura.user_id = get_user_permissions.user_id
    AND (ura.expires_at IS NULL OR ura.expires_at > now());

  IF role_permissions IS NOT NULL THEN
    SELECT jsonb_agg(DISTINCT perm)
    INTO permissions
    FROM jsonb_array_elements_text(
      (SELECT jsonb_agg(jsonb_array_elements_text(p)) FROM jsonb_array_elements(role_permissions) p)
    ) perm;
  END IF;

  RETURN COALESCE(permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS handle_accounts_updated_at ON accounts;
CREATE TRIGGER handle_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();