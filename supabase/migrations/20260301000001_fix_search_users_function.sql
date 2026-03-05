-- 既存の誤った関数を削除
DROP FUNCTION IF EXISTS search_users_by_username(text);

-- 修正版: rating列を除去し型不一致を解消
CREATE OR REPLACE FUNCTION search_users_by_username(search_query text)
RETURNS TABLE (id uuid, username text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF length(trim(search_query)) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT a.id, a.username, a.avatar_url
  FROM accounts a
  WHERE a.username ILIKE '%' || trim(search_query) || '%'
    AND a.id != auth.uid()
  LIMIT 20;
END;
$$;
