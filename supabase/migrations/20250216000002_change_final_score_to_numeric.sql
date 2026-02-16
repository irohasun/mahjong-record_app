-- player_records.final_scoreをintegerからnumeric(10,1)に変更
-- 麻雀のポイント計算では小数点第1位まで使用するため

-- 既存のデータを保持したまま型を変更
ALTER TABLE player_records
ALTER COLUMN final_score TYPE numeric(10,1);

-- コメントを追加
COMMENT ON COLUMN player_records.final_score IS '最終収支（ポイント）。小数点第1位まで保存。例: +13.3, -58.9';
