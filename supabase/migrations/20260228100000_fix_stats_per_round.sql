/*
  # 統計計算を半荘(round)単位に修正

  ## 問題
  get_player_stats / get_chart_data が player_records (1 game = 1行) から集計していたため、
  1対局に複数半荘を記録した場合に統計が正しく計算されなかった。

  ## 修正内容
  - round_records (1半荘 = 1行) から集計するように変更
  - 各半荘の points JSONB配列からメインプレイヤー(index 0)のスコアと順位を導出
  - 順位 = 1 + (自分より高いスコアを持つプレイヤーの数)

  ## 互換性
  - 関数シグネチャ（引数・戻り値の型）は変更なし
  - TypeScript側の変更は不要
*/

-- 既存の関数を置き換え
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
    WITH round_stats AS (
        SELECT
            (rr.points->>0)::numeric AS score,
            1 + (
                SELECT COUNT(*)
                FROM jsonb_array_elements_text(rr.points)
                         WITH ORDINALITY AS elem(val, idx)
                WHERE idx > 1
                  AND (elem.val)::numeric > (rr.points->>0)::numeric
            ) AS rank
        FROM round_records rr
        JOIN games g ON rr.game_id = g.id
        WHERE g.account_id = user_id
          AND jsonb_array_length(rr.points) > 0
          AND (period_start IS NULL OR g.date >= period_start)
          AND (period_end IS NULL OR g.date <= period_end)
          AND (
              player_count IS NULL
              OR (g.rules->>'playerCount')::int = player_count
              OR (player_count = 4 AND g.rules->>'playerCount' IS NULL)
          )
    )
    SELECT json_build_object(
        'totalGames', COUNT(*),
        'averageRank', AVG(rank),
        'firstPlaceRate', COUNT(CASE WHEN rank = 1 THEN 1 END)::float
                          / NULLIF(COUNT(*), 0),
        'averageScore', AVG(score),
        'highestScore', MAX(score),
        'lowestScore', MIN(score),
        'topTwoRate', COUNT(CASE WHEN rank <= 2 THEN 1 END)::float
                      / NULLIF(COUNT(*), 0),
        'avoidLastRate', COUNT(CASE WHEN rank < 4 THEN 1 END)::float
                         / NULLIF(COUNT(*), 0),
        'rankDistribution', json_build_object(
            '1', COUNT(CASE WHEN rank = 1 THEN 1 END),
            '2', COUNT(CASE WHEN rank = 2 THEN 1 END),
            '3', COUNT(CASE WHEN rank = 3 THEN 1 END),
            '4', COUNT(CASE WHEN rank = 4 THEN 1 END)
        )
    ) INTO result
    FROM round_stats;

    RETURN result;
END;
$$;

-- チャートデータを取得するための関数
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
    WITH round_stats AS (
        SELECT
            g.date,
            g.id AS game_id,
            rr.round,
            (rr.points->>0)::numeric AS score,
            1 + (
                SELECT COUNT(*)
                FROM jsonb_array_elements_text(rr.points)
                         WITH ORDINALITY AS elem(val, idx)
                WHERE idx > 1
                  AND (elem.val)::numeric > (rr.points->>0)::numeric
            ) AS rank
        FROM round_records rr
        JOIN games g ON rr.game_id = g.id
        WHERE g.account_id = user_id
          AND jsonb_array_length(rr.points) > 0
          AND (period_start IS NULL OR g.date >= period_start)
          AND (period_end IS NULL OR g.date <= period_end)
          AND (
              player_count IS NULL
              OR (g.rules->>'playerCount')::int = player_count
              OR (player_count = 4 AND g.rules->>'playerCount' IS NULL)
          )
    )
    SELECT json_build_object(
        'scores', json_agg(
            json_build_object(
                'date', date,
                'score', score,
                'rank', rank,
                'gameId', game_id
            ) ORDER BY date DESC, round DESC
        ),
        'rankHistory', json_agg(
            json_build_object(
                'date', date,
                'rank', rank
            ) ORDER BY date DESC, round DESC
        )
    ) INTO result
    FROM round_stats;

    RETURN result;
END;
$$;

-- コメントを更新
COMMENT ON FUNCTION get_player_stats(uuid, timestamptz, timestamptz, integer)
  IS '半荘(round)単位でプレイヤーの統計情報を取得（プレイヤー人数フィルタ対応）';
COMMENT ON FUNCTION get_chart_data(uuid, timestamptz, timestamptz, integer)
  IS '半荘(round)単位でチャート用データを取得（プレイヤー人数フィルタ対応）';
