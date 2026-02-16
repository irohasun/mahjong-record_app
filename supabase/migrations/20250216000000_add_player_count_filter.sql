/*
  # プレイヤー人数フィルタ機能の追加

  このマイグレーションは統計取得関数にプレイヤー人数フィルタを追加します。

  変更点:
  1. `get_player_stats` 関数に `player_count integer DEFAULT NULL` 引数を追加
  2. `get_chart_data` 関数に `player_count integer DEFAULT NULL` 引数を追加
  3. WHERE条件に `(g.rules->>'playerCount')::int = player_count` を追加

  互換性:
  - `player_count IS NULL` の場合は全データを返す（既存の動作を維持）
  - `rules->>'playerCount' IS NULL` の場合は4人麻雀として扱う
*/

-- 既存の関数を削除
DROP FUNCTION IF EXISTS get_player_stats(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS get_chart_data(uuid, timestamptz, timestamptz);

-- 統計情報を取得するための関数（プレイヤー人数フィルタ対応）
CREATE OR REPLACE FUNCTION get_player_stats(
    user_id uuid,
    period_start timestamptz DEFAULT NULL,
    period_end timestamptz DEFAULT NULL,
    player_count integer DEFAULT NULL
)
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
        'firstPlaceRate', COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::float / NULLIF(COUNT(*), 0),
        'averageScore', AVG(pr.final_score),
        'highestScore', MAX(pr.final_score),
        'lowestScore', MIN(pr.final_score),
        'topTwoRate', COUNT(CASE WHEN pr.rank <= 2 THEN 1 END)::float / NULLIF(COUNT(*), 0),
        'avoidLastRate', COUNT(CASE WHEN pr.rank < 4 THEN 1 END)::float / NULLIF(COUNT(*), 0),
        'rankDistribution', json_build_object(
            '1', COUNT(CASE WHEN pr.rank = 1 THEN 1 END),
            '2', COUNT(CASE WHEN pr.rank = 2 THEN 1 END),
            '3', COUNT(CASE WHEN pr.rank = 3 THEN 1 END),
            '4', COUNT(CASE WHEN pr.rank = 4 THEN 1 END)
        )
    ) INTO result
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    WHERE g.account_id = user_id
      AND pr.is_main_account = true
      AND (period_start IS NULL OR g.date >= period_start)
      AND (period_end IS NULL OR g.date <= period_end)
      AND (
        player_count IS NULL
        OR (g.rules->>'playerCount')::int = player_count
        OR (player_count = 4 AND g.rules->>'playerCount' IS NULL)
      );

    RETURN result;
END;
$$;

-- チャートデータを取得するための関数（プレイヤー人数フィルタ対応）
CREATE OR REPLACE FUNCTION get_chart_data(
    user_id uuid,
    period_start timestamptz DEFAULT NULL,
    period_end timestamptz DEFAULT NULL,
    player_count integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'scores', json_agg(
            json_build_object(
                'date', g.date,
                'score', pr.final_score,
                'rank', pr.rank,
                'gameId', g.id
            ) ORDER BY g.date DESC
        ),
        'rankHistory', json_agg(
            json_build_object(
                'date', g.date,
                'rank', pr.rank
            ) ORDER BY g.date DESC
        )
    ) INTO result
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    WHERE g.account_id = user_id
      AND pr.is_main_account = true
      AND (period_start IS NULL OR g.date >= period_start)
      AND (period_end IS NULL OR g.date <= period_end)
      AND (
        player_count IS NULL
        OR (g.rules->>'playerCount')::int = player_count
        OR (player_count = 4 AND g.rules->>'playerCount' IS NULL)
      );

    RETURN result;
END;
$$;

-- コメントを追加
COMMENT ON FUNCTION get_player_stats(uuid, timestamptz, timestamptz, integer) IS 'プレイヤーの統計情報を取得（プレイヤー人数フィルタ対応）';
COMMENT ON FUNCTION get_chart_data(uuid, timestamptz, timestamptz, integer) IS 'チャート用データを取得（プレイヤー人数フィルタ対応）';

-- パフォーマンス向上のためのインデックス（既存のものがあれば作成しない）
CREATE INDEX IF NOT EXISTS idx_games_account_playercount_date
  ON games(account_id, ((rules->>'playerCount')::int), date DESC);
