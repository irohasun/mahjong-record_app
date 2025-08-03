/*
  # 麻雀対局記録アプリ - クリーンなデータベース設計

  必要なテーブルのみを含む、シンプルで効率的な設計

  1. テーブル構成
    - `accounts`: ユーザーアカウント情報
    - `games`: 対局記録
    - `player_records`: プレイヤー記録
    - `round_records`: 局記録

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 適切なポリシーを設定

  3. パフォーマンス
    - 必要なインデックスを作成
*/

-- 既存のテーブルを削除（不要なテーブル）
DROP TABLE IF EXISTS game_photos CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- accounts テーブルを再作成（シンプルな構造）
DROP TABLE IF EXISTS accounts CASCADE;
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL DEFAULT 'プレイヤー',
  created_at timestamptz DEFAULT now(),
  is_premium boolean DEFAULT false,
  purchase_date timestamptz,
  monthly_game_count integer DEFAULT 0,
  last_reset_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- games テーブルを再作成
DROP TABLE IF EXISTS games CASCADE;
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
  created_at timestamptz DEFAULT now()
);

-- player_records テーブルを再作成
DROP TABLE IF EXISTS player_records CASCADE;
CREATE TABLE player_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  is_main_account boolean DEFAULT false,
  final_score integer NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 4),
  starting_position text NOT NULL CHECK (starting_position IN ('East', 'South', 'West', 'North')),
  created_at timestamptz DEFAULT now()
);

-- round_records テーブルを再作成
DROP TABLE IF EXISTS round_records CASCADE;
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
  created_at timestamptz DEFAULT now()
);

-- Row Level Security を有効化
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_records ENABLE ROW LEVEL SECURITY;

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

-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_games_account_date ON games(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_player_records_game ON player_records(game_id);
CREATE INDEX IF NOT EXISTS idx_player_records_main ON player_records(is_main_account, game_id);
CREATE INDEX IF NOT EXISTS idx_round_records_game ON round_records(game_id);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- accounts テーブルの updated_at を自動更新
CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 統計情報を取得するための関数
CREATE OR REPLACE FUNCTION get_player_stats(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'totalGames', COUNT(*),
        'averageRank', AVG(pr.rank),
        'firstPlaceRate', COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::float / COUNT(*),
        'averageScore', AVG(pr.final_score),
        'highestScore', MAX(pr.final_score),
        'lowestScore', MIN(pr.final_score),
        'topTwoRate', COUNT(CASE WHEN pr.rank <= 2 THEN 1 END)::float / COUNT(*),
        'avoidLastRate', COUNT(CASE WHEN pr.rank < 4 THEN 1 END)::float / COUNT(*),
        'rankDistribution', json_build_object(
            '1', COUNT(CASE WHEN pr.rank = 1 THEN 1 END),
            '2', COUNT(CASE WHEN pr.rank = 2 THEN 1 END),
            '3', COUNT(CASE WHEN pr.rank = 3 THEN 1 END),
            '4', COUNT(CASE WHEN pr.rank = 4 THEN 1 END)
        )
    ) INTO result
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    WHERE g.account_id = user_id AND pr.is_main_account = true;
    
    RETURN result;
END;
$$; 