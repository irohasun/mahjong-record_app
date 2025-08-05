/*
  # 麻雀対局記録アプリ - 完全なデータベース設計

  このマイグレーションは麻雀対局記録アプリの完全なデータベース設計を実装します。

  1. テーブル構成
    - `accounts`: ユーザーアカウント情報
    - `games`: 対局記録
    - `player_records`: プレイヤー記録
    - `round_records`: 局記録
    - `user_profiles`: ユーザープロフィール（拡張機能）

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 適切なポリシーを設定

  3. パフォーマンス
    - 必要なインデックスを作成
    - 統計関数を実装

  4. 機能
    - プレミアム機能対応
    - 統計分析機能
    - データ整合性保証
*/

-- 既存のテーブルを削除（クリーンアップ）
DROP TABLE IF EXISTS round_records CASCADE;
DROP TABLE IF EXISTS player_records CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- 関数を削除
DROP FUNCTION IF EXISTS get_player_stats(uuid);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_user_permissions(uuid);

-- accounts テーブルを作成
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL DEFAULT 'プレイヤー',
  email text,
  email_verified boolean DEFAULT false,
  avatar_url text,
  phone text,
  date_of_birth date,
  preferred_language text DEFAULT 'ja',
  timezone text DEFAULT 'Asia/Tokyo',
  last_login_at timestamptz,
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  is_premium boolean DEFAULT false,
  purchase_date timestamptz,
  monthly_game_count integer DEFAULT 0,
  last_reset_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- games テーブルを作成
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date timestamptz NOT NULL,
  location text,
  game_type text NOT NULL CHECK (game_type IN ('東風戦', '東南戦')),
  rules jsonb NOT NULL DEFAULT '{}',
  memo text,
  duration_minutes integer,
  game_end_condition text DEFAULT 'normal' CHECK (game_end_condition IN ('normal', 'bankruptcy', 'timeout', 'time_limit')),
  final_riichi_sticks integer DEFAULT 0,
  final_honba integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- player_records テーブルを作成
CREATE TABLE player_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  is_main_account boolean DEFAULT false,
  final_score integer NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 4),
  starting_position text NOT NULL CHECK (starting_position IN ('East', 'South', 'West', 'North')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- round_records テーブルを作成
CREATE TABLE round_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round text NOT NULL,
  honba integer DEFAULT 0,
  riichi_sticks integer DEFAULT 0,
  winner integer,
  loser integer,
  hand_type text NOT NULL CHECK (hand_type IN ('ron', 'tsumo', 'draw', 'abort')),
  points jsonb NOT NULL DEFAULT '[]',
  han integer,
  fu integer,
  yakuman boolean DEFAULT false,
  memo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- user_profiles テーブルを作成（拡張機能）
CREATE TABLE user_profiles (
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

-- Row Level Security を有効化
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- accounts のポリシー
CREATE POLICY "Users can read own account data"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own account data"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own account data"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- games のポリシー
CREATE POLICY "Users can read own games"
  ON games
  FOR SELECT
  TO authenticated
  USING (account_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

CREATE POLICY "Users can insert own games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (account_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

CREATE POLICY "Users can update own games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (account_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

CREATE POLICY "Users can delete own games"
  ON games
  FOR DELETE
  TO authenticated
  USING (account_id IN (
    SELECT id FROM accounts WHERE auth.uid()::text = id::text
  ));

-- player_records のポリシー
CREATE POLICY "Users can read own player records"
  ON player_records
  FOR SELECT
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can insert own player records"
  ON player_records
  FOR INSERT
  TO authenticated
  WITH CHECK (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can update own player records"
  ON player_records
  FOR UPDATE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can delete own player records"
  ON player_records
  FOR DELETE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

-- round_records のポリシー
CREATE POLICY "Users can read own round records"
  ON round_records
  FOR SELECT
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can insert own round records"
  ON round_records
  FOR INSERT
  TO authenticated
  WITH CHECK (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can update own round records"
  ON round_records
  FOR UPDATE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can delete own round records"
  ON round_records
  FOR DELETE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

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

-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_games_account_date ON games(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date DESC);
CREATE INDEX IF NOT EXISTS idx_player_records_game ON player_records(game_id);
CREATE INDEX IF NOT EXISTS idx_player_records_main ON player_records(is_main_account, game_id);
CREATE INDEX IF NOT EXISTS idx_player_records_rank ON player_records(rank);
CREATE INDEX IF NOT EXISTS idx_round_records_game ON round_records(game_id);
CREATE INDEX IF NOT EXISTS idx_round_records_round ON round_records(game_id, round);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルの updated_at を自動更新するトリガー
CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_records_updated_at 
    BEFORE UPDATE ON player_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_round_records_updated_at 
    BEFORE UPDATE ON round_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 統計情報を取得するための関数
CREATE OR REPLACE FUNCTION get_player_stats(user_id uuid, period_start timestamptz DEFAULT NULL, period_end timestamptz DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    where_clause text := 'g.account_id = $1 AND pr.is_main_account = true';
    params uuid[] := ARRAY[user_id];
BEGIN
    -- 期間フィルターを追加
    IF period_start IS NOT NULL THEN
        where_clause := where_clause || ' AND g.date >= $2';
        params := params || period_start;
    END IF;
    
    IF period_end IS NOT NULL THEN
        where_clause := where_clause || ' AND g.date <= $' || array_length(params, 1) + 1;
        params := params || period_end;
    END IF;

    EXECUTE format('
        SELECT json_build_object(
            ''totalGames'', COUNT(*),
            ''averageRank'', AVG(pr.rank),
            ''firstPlaceRate'', COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::float / NULLIF(COUNT(*), 0),
            ''averageScore'', AVG(pr.final_score),
            ''highestScore'', MAX(pr.final_score),
            ''lowestScore'', MIN(pr.final_score),
            ''topTwoRate'', COUNT(CASE WHEN pr.rank <= 2 THEN 1 END)::float / NULLIF(COUNT(*), 0),
            ''avoidLastRate'', COUNT(CASE WHEN pr.rank < 4 THEN 1 END)::float / NULLIF(COUNT(*), 0),
            ''rankDistribution'', json_build_object(
                ''1'', COUNT(CASE WHEN pr.rank = 1 THEN 1 END),
                ''2'', COUNT(CASE WHEN pr.rank = 2 THEN 1 END),
                ''3'', COUNT(CASE WHEN pr.rank = 3 THEN 1 END),
                ''4'', COUNT(CASE WHEN pr.rank = 4 THEN 1 END)
            )
        )
        FROM player_records pr
        JOIN games g ON pr.game_id = g.id
        WHERE %s
    ', where_clause) INTO result USING params;
    
    RETURN result;
END;
$$;

-- チャートデータを取得するための関数
CREATE OR REPLACE FUNCTION get_chart_data(user_id uuid, period_start timestamptz DEFAULT NULL, period_end timestamptz DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    where_clause text := 'g.account_id = $1 AND pr.is_main_account = true';
    params uuid[] := ARRAY[user_id];
BEGIN
    -- 期間フィルターを追加
    IF period_start IS NOT NULL THEN
        where_clause := where_clause || ' AND g.date >= $2';
        params := params || period_start;
    END IF;
    
    IF period_end IS NOT NULL THEN
        where_clause := where_clause || ' AND g.date <= $' || array_length(params, 1) + 1;
        params := params || period_end;
    END IF;

    EXECUTE format('
        SELECT json_build_object(
            ''scores'', json_agg(
                json_build_object(
                    ''date'', g.date,
                    ''score'', pr.final_score,
                    ''rank'', pr.rank,
                    ''gameId'', g.id
                ) ORDER BY g.date DESC
            ),
            ''rankHistory'', json_agg(
                json_build_object(
                    ''date'', g.date,
                    ''rank'', pr.rank
                ) ORDER BY g.date DESC
            )
        )
        FROM player_records pr
        JOIN games g ON pr.game_id = g.id
        WHERE %s
    ', where_clause) INTO result USING params;
    
    RETURN result;
END;
$$;

-- 月間ゲーム数をリセットする関数
CREATE OR REPLACE FUNCTION reset_monthly_game_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE accounts 
    SET monthly_game_count = 0, last_reset_date = now()
    WHERE last_reset_date < date_trunc('month', now());
END;
$$;

-- プレミアム機能の月間リセットを自動実行するトリガー
CREATE OR REPLACE FUNCTION check_monthly_reset()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 新しいゲームが追加された時に月間リセットをチェック
    PERFORM reset_monthly_game_count();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_monthly_reset
    AFTER INSERT ON games
    FOR EACH ROW
    EXECUTE FUNCTION check_monthly_reset();

-- データ整合性を保証する制約
ALTER TABLE games ADD CONSTRAINT check_game_duration 
    CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE player_records ADD CONSTRAINT check_final_score 
    CHECK (final_score >= -32000 AND final_score <= 32000);

ALTER TABLE round_records ADD CONSTRAINT check_han_fu 
    CHECK ((han IS NULL AND fu IS NULL) OR (han IS NOT NULL AND fu IS NOT NULL));

-- コメントを追加
COMMENT ON TABLE accounts IS 'ユーザーアカウント情報';
COMMENT ON TABLE games IS '対局記録';
COMMENT ON TABLE player_records IS 'プレイヤー記録';
COMMENT ON TABLE round_records IS '局記録';
COMMENT ON TABLE user_profiles IS 'ユーザープロフィール';

COMMENT ON FUNCTION get_player_stats(uuid, timestamptz, timestamptz) IS 'プレイヤーの統計情報を取得';
COMMENT ON FUNCTION get_chart_data(uuid, timestamptz, timestamptz) IS 'チャート用データを取得';
COMMENT ON FUNCTION reset_monthly_game_count() IS '月間ゲーム数をリセット'; 