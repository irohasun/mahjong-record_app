CREATE OR REPLACE FUNCTION get_all_ratings()
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  rating_4p integer,
  rating_3p integer
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
  SELECT a.id, a.username, a.avatar_url, a.rating_4p, a.rating_3p
  FROM accounts a
  ORDER BY a.rating_4p DESC
  LIMIT 200;
END;
$$;
