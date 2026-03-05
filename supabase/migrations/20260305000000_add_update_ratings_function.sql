-- update_ratings_for_game: SECURITY DEFINER RPC でレーティング更新を行う
-- 呼び出し元ユーザーの RLS を bypass し、他プレイヤーの accounts/rating_history を更新できるようにする

CREATE OR REPLACE FUNCTION update_ratings_for_game(
  p_game_id uuid,
  p_changes jsonb,
  p_player_count integer,
  p_rating_field text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change jsonb;
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- p_rating_field のバリデーション（SQLインジェクション防止）
  IF p_rating_field NOT IN ('rating_4p', 'rating_3p') THEN
    RAISE EXCEPTION 'Invalid rating field: %', p_rating_field;
  END IF;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes)
  LOOP
    -- accounts テーブルのレーティングを更新
    IF p_rating_field = 'rating_4p' THEN
      UPDATE accounts
      SET rating_4p = (v_change->>'ratingAfter')::integer
      WHERE id = (v_change->>'accountId')::uuid;
    ELSE
      UPDATE accounts
      SET rating_3p = (v_change->>'ratingAfter')::integer
      WHERE id = (v_change->>'accountId')::uuid;
    END IF;

    -- rating_history に履歴を挿入
    INSERT INTO rating_history (
      account_id,
      game_id,
      player_count,
      rating_before,
      rating_after,
      rating_change,
      rank
    ) VALUES (
      (v_change->>'accountId')::uuid,
      p_game_id,
      p_player_count,
      (v_change->>'ratingBefore')::integer,
      (v_change->>'ratingAfter')::integer,
      (v_change->>'ratingChange')::integer,
      (v_change->>'rank')::integer
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_ratings_for_game(uuid, jsonb, integer, text) TO authenticated;
