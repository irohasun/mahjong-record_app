/*
  # アカウント機能の拡張

  1. テーブル変更
    - `accounts` テーブルに不足している列を追加
      - `email` (text): ユーザーのメールアドレス
      - `email_verified` (boolean): メール認証状態
      - `avatar_url` (text): プロフィール画像URL
      - `phone` (text): 電話番号
      - `date_of_birth` (date): 生年月日
      - `preferred_language` (text): 優先言語
      - `timezone` (text): タイムゾーン
      - `last_login_at` (timestamp): 最終ログイン日時
      - `status` (text): アカウントステータス
      - `metadata` (jsonb): メタデータ
      - `updated_at` (timestamp): 更新日時

  2. 新規テーブル作成
    - `user_profiles`: ユーザープロフィール情報
    - `user_roles`: ユーザーロール定義
    - `user_role_assignments`: ユーザーロール割り当て

  3. セキュリティ
    - 全テーブルでRLSを有効化
    - 適切なポリシーを設定

  4. 関数作成
    - `get_user_permissions`: ユーザー権限取得関数
*/

-- accounts テーブルに不足している列を追加
DO $$
BEGIN
  -- email 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'email'
  ) THEN
    ALTER TABLE accounts ADD COLUMN email text;
  END IF;

  -- email_verified 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE accounts ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  -- avatar_url 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE accounts ADD COLUMN avatar_url text;
  END IF;

  -- phone 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'phone'
  ) THEN
    ALTER TABLE accounts ADD COLUMN phone text;
  END IF;

  -- date_of_birth 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE accounts ADD COLUMN date_of_birth date;
  END IF;

  -- preferred_language 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE accounts ADD COLUMN preferred_language text DEFAULT 'ja';
  END IF;

  -- timezone 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE accounts ADD COLUMN timezone text DEFAULT 'Asia/Tokyo';
  END IF;

  -- last_login_at 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE accounts ADD COLUMN last_login_at timestamptz;
  END IF;

  -- status 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'status'
  ) THEN
    ALTER TABLE accounts ADD COLUMN status text DEFAULT 'active';
  END IF;

  -- metadata 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE accounts ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;

  -- updated_at 列を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE accounts ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- user_profiles テーブルを作成
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  location text,
  website text,
  social_links jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  privacy_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- user_roles テーブルを作成
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- user_role_assignments テーブルを作成
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  role_id uuid REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- RLS を有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- user_profiles のポリシー
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

-- user_roles のポリシー
CREATE POLICY "Users can read roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- user_role_assignments のポリシー
CREATE POLICY "Users can read own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

-- get_user_permissions 関数を作成
CREATE OR REPLACE FUNCTION get_user_permissions(user_id uuid)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(ur.permissions) as permission
  FROM user_role_assignments ura
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ura.user_id = get_user_permissions.user_id
    AND (ura.expires_at IS NULL OR ura.expires_at > now());
END;
$$;

-- デフォルトロールを挿入
INSERT INTO user_roles (name, description, permissions) VALUES
('user', 'Default user role', ARRAY['read_own_data', 'write_own_data'])
ON CONFLICT (name) DO NOTHING;