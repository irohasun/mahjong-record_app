/*
  # 麻雀対局記録アプリのデータベーススキーマ

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `username` (text)
      - `created_at` (timestamp)
      - `is_premium` (boolean)
      - `purchase_date` (timestamp, nullable)
      - `monthly_game_count` (integer)
      - `last_reset_date` (timestamp)
    
    - `games`
      - `id` (uuid, primary key)
      - `account_id` (uuid, foreign key)
      - `date` (timestamp)
      - `location` (text, nullable)
      - `game_type` (text)
      - `rules` (jsonb)
      - `memo` (text, nullable)
      - `duration_minutes` (integer, nullable)
      - `game_end_condition` (text)
      - `final_riichi_sticks` (integer)
      - `final_honba` (integer)
      - `created_at` (timestamp)
    
    - `player_records`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `player_name` (text)
      - `is_main_account` (boolean)
      - `final_score` (integer)
      - `rank` (integer)
      - `starting_position` (text)
      - `created_at` (timestamp)
    
    - `round_records`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `round` (text)
      - `honba` (integer)
      - `riichi_sticks` (integer)
      - `winner` (integer, nullable)
      - `loser` (integer, nullable)
      - `hand_type` (text)
      - `points` (jsonb)
      - `han` (integer, nullable)
      - `fu` (integer, nullable)
      - `yakuman` (boolean)
      - `memo` (text, nullable)
      - `created_at` (timestamp)
    
    - `game_photos`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `photo_uri` (text)
      - `description` (text, nullable)
      - `taken_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their own data
*/

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL DEFAULT 'プレイヤー',
  created_at timestamptz DEFAULT now(),
  is_premium boolean DEFAULT false,
  purchase_date timestamptz,
  monthly_game_count integer DEFAULT 0,
  last_reset_date timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
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

-- Create player_records table
CREATE TABLE IF NOT EXISTS player_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  is_main_account boolean DEFAULT false,
  final_score integer NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 4),
  starting_position text NOT NULL CHECK (starting_position IN ('East', 'South', 'West', 'North')),
  created_at timestamptz DEFAULT now()
);

-- Create round_records table
CREATE TABLE IF NOT EXISTS round_records (
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

-- Create game_photos table
CREATE TABLE IF NOT EXISTS game_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  photo_uri text NOT NULL,
  description text,
  taken_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
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

-- Create RLS policies for games
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

-- Create RLS policies for player_records
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

-- Create RLS policies for round_records
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

-- Create RLS policies for game_photos
CREATE POLICY "Users can read own game photos"
  ON game_photos
  FOR SELECT
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can insert own game photos"
  ON game_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can update own game photos"
  ON game_photos
  FOR UPDATE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can delete own game photos"
  ON game_photos
  FOR DELETE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id IN (
      SELECT id FROM accounts WHERE auth.uid()::text = id::text
    )
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_account_date ON games(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_player_records_game ON player_records(game_id);
CREATE INDEX IF NOT EXISTS idx_player_records_main ON player_records(is_main_account, game_id);
CREATE INDEX IF NOT EXISTS idx_round_records_game ON round_records(game_id);
CREATE INDEX IF NOT EXISTS idx_game_photos_game ON game_photos(game_id);