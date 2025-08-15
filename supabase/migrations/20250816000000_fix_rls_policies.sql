-- Fix RLS policies for games table
-- The issue is with the comparison between auth.uid() and account_id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own games" ON games;
DROP POLICY IF EXISTS "Users can insert own games" ON games;
DROP POLICY IF EXISTS "Users can update own games" ON games;
DROP POLICY IF EXISTS "Users can delete own games" ON games;

-- Recreate policies with proper type casting
CREATE POLICY "Users can read own games"
  ON games
  FOR SELECT
  TO authenticated
  USING (account_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (account_id::text = auth.uid()::text);

CREATE POLICY "Users can update own games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (account_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own games"
  ON games
  FOR DELETE
  TO authenticated
  USING (account_id::text = auth.uid()::text);

-- Fix RLS policies for player_records table
DROP POLICY IF EXISTS "Users can read own player records" ON player_records;
DROP POLICY IF EXISTS "Users can insert own player records" ON player_records;
DROP POLICY IF EXISTS "Users can update own player records" ON player_records;
DROP POLICY IF EXISTS "Users can delete own player records" ON player_records;

CREATE POLICY "Users can read own player records"
  ON player_records
  FOR SELECT
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can insert own player records"
  ON player_records
  FOR INSERT
  TO authenticated
  WITH CHECK (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can update own player records"
  ON player_records
  FOR UPDATE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can delete own player records"
  ON player_records
  FOR DELETE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

-- Fix RLS policies for round_records table
DROP POLICY IF EXISTS "Users can read own round records" ON round_records;
DROP POLICY IF EXISTS "Users can insert own round records" ON round_records;
DROP POLICY IF EXISTS "Users can update own round records" ON round_records;
DROP POLICY IF EXISTS "Users can delete own round records" ON round_records;

CREATE POLICY "Users can read own round records"
  ON round_records
  FOR SELECT
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can insert own round records"
  ON round_records
  FOR INSERT
  TO authenticated
  WITH CHECK (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can update own round records"
  ON round_records
  FOR UPDATE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can delete own round records"
  ON round_records
  FOR DELETE
  TO authenticated
  USING (game_id IN (
    SELECT id FROM games WHERE account_id::text = auth.uid()::text
  ));

-- Fix RLS policies for accounts table
DROP POLICY IF EXISTS "Users can read own account data" ON accounts;
DROP POLICY IF EXISTS "Users can update own account data" ON accounts;
DROP POLICY IF EXISTS "Users can insert own account data" ON accounts;

CREATE POLICY "Users can read own account data"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (id::text = auth.uid()::text);

CREATE POLICY "Users can update own account data"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text);

CREATE POLICY "Users can insert own account data"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (id::text = auth.uid()::text);
