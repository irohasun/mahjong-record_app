-- player_records に account_id カラムを追加
-- 会員プレイヤーの場合、accounts.id を紐付ける（nullable: ゲストは null）
ALTER TABLE player_records
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- account_id のインデックス
CREATE INDEX IF NOT EXISTS idx_player_records_account_id
  ON player_records(account_id)
  WHERE account_id IS NOT NULL;

-- rating_history テーブル
CREATE TABLE IF NOT EXISTS rating_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_count smallint NOT NULL CHECK (player_count IN (3, 4)),
  rating_before integer NOT NULL,
  rating_after integer NOT NULL,
  rating_change integer NOT NULL,
  rank smallint NOT NULL CHECK (rank BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- rating_history インデックス
CREATE INDEX IF NOT EXISTS idx_rating_history_account_id
  ON rating_history(account_id);

CREATE INDEX IF NOT EXISTS idx_rating_history_game_id
  ON rating_history(game_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rating_history_account_game
  ON rating_history(account_id, game_id);

-- RLS ポリシー: rating_history
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rating_history_select_own"
  ON rating_history FOR SELECT
  USING (account_id = auth.uid());

CREATE POLICY "rating_history_insert_own"
  ON rating_history FOR INSERT
  WITH CHECK (account_id = auth.uid());

-- player_records の RLS に account_id は既存ポリシーで game_id 経由でカバーされるため追加不要
