-- Pending friend requestsを取得するSECURITY DEFINER関数
-- PostgREST JOIN経由のRLS問題を回避する
CREATE OR REPLACE FUNCTION get_pending_friend_requests()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  friend_id uuid,
  status text,
  created_at timestamptz,
  requester_id uuid,
  requester_username text,
  requester_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.user_id,
    f.friend_id,
    f.status::text,
    f.created_at,
    a.id AS requester_id,
    a.username AS requester_username,
    a.avatar_url AS requester_avatar_url
  FROM friendships f
  JOIN accounts a ON a.id = f.user_id
  WHERE f.friend_id = auth.uid()
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_friend_requests() TO authenticated;

-- Accepted friendsを取得するSECURITY DEFINER関数（受信側も正しく取得）
CREATE OR REPLACE FUNCTION get_accepted_friends()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  friend_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  friend_account_id uuid,
  friend_username text,
  friend_avatar_url text,
  friend_rating_4p integer,
  friend_rating_3p integer,
  direction text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 自分が送った側（friend_id が相手）
  RETURN QUERY
  SELECT
    f.id, f.user_id, f.friend_id, f.status::text, f.created_at, f.updated_at,
    a.id, a.username, a.avatar_url, a.rating_4p, a.rating_3p,
    'sent'::text
  FROM friendships f
  JOIN accounts a ON a.id = f.friend_id
  WHERE f.user_id = auth.uid() AND f.status = 'accepted'

  UNION ALL

  -- 自分が受け取った側（user_id が相手）
  SELECT
    f.id, f.user_id, f.friend_id, f.status::text, f.created_at, f.updated_at,
    a.id, a.username, a.avatar_url, a.rating_4p, a.rating_3p,
    'received'::text
  FROM friendships f
  JOIN accounts a ON a.id = f.user_id
  WHERE f.friend_id = auth.uid() AND f.status = 'accepted'

  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_accepted_friends() TO authenticated;
