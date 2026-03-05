-- フレンドリクエスト承認のSECURITY DEFINER関数
-- PostgREST UPDATE + RLS のサイレントブロック問題を回避する
CREATE OR REPLACE FUNCTION accept_friend_request(p_friendship_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE friendships
  SET status = 'accepted', updated_at = now()
  WHERE id = p_friendship_id
    AND friend_id = auth.uid()   -- 受信者のみ承認可能
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_friend_request(uuid) TO authenticated;
