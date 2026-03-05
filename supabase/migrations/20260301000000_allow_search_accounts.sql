-- フレンド検索のため、認証済みユーザーが他ユーザーの公開情報のみ検索できるRPC関数を追加
-- accounts テーブルには email, phone, date_of_birth 等の個人情報があるため、
-- RLSで全カラムを公開するのではなく、必要最小限のカラムのみ返す関数で対応

CREATE OR REPLACE FUNCTION search_users_by_username(search_query text)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  rating_4p numeric,
  rating_3p numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  escaped_query text;
BEGIN
  -- 認証チェック
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 検索文字が2文字未満なら空を返す
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- LIKE用のワイルドカード文字をエスケープ
  escaped_query := replace(replace(replace(trim(search_query), '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  SELECT
    a.id,
    a.username,
    a.avatar_url,
    a.rating_4p,
    a.rating_3p
  FROM accounts a
  WHERE a.username ILIKE '%' || escaped_query || '%'
    AND a.id != current_user_id
  LIMIT 20;
END;
$$;
