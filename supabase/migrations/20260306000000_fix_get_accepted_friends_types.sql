-- Fix get_accepted_friends: RETURNS TABLE の型を accounts テーブルに合わせる
-- rating_4p / rating_3p は integer なのに numeric と定義していたため
-- PostgreSQL 15 で "structure of query does not match function result type" エラーが発生していた

DROP FUNCTION IF EXISTS get_accepted_friends();

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

  RETURN QUERY
  SELECT
    f.id, f.user_id, f.friend_id, f.status::text, f.created_at, f.updated_at,
    a.id, a.username, a.avatar_url, a.rating_4p, a.rating_3p,
    'sent'::text
  FROM friendships f
  JOIN accounts a ON a.id = f.friend_id
  WHERE f.user_id = auth.uid() AND f.status = 'accepted'

  UNION ALL

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
