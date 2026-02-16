-- chip_counts列をgamesテーブルに追加
-- チップ枚数の配列（プレイヤーごと）を保存するためのフィールド
ALTER TABLE games
ADD COLUMN chip_counts jsonb DEFAULT NULL;

-- インデックスを追加（検索性能向上のため）
CREATE INDEX IF NOT EXISTS idx_games_chip_counts
  ON games USING gin (chip_counts);

-- コメントを追加
COMMENT ON COLUMN games.chip_counts IS 'チップ枚数の配列（プレイヤーごと）。例: [2, 1, -1, -2]';
