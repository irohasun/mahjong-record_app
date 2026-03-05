-- friendships DELETE ポリシーを修正
-- 旧: user_id のみ削除可能（リクエスト拒否・フレンド削除が friend_id 側からできなかった）
-- 新: user_id または friend_id どちらからでも削除可能
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id);

-- accounts SELECT ポリシーを修正
-- 旧: 自分のみ読み取り可能（フレンドJOIN時に相手の名前・アバターが取得できなかった）
-- 新: 自分、または friendships に関係するアカウント（pending/accepted を問わず）は読み取り可能
DROP POLICY IF EXISTS "Users can read own account data" ON accounts;

CREATE POLICY "Users can read own account data"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = id::text
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = (SELECT auth.uid()) OR f.friend_id = (SELECT auth.uid()))
        AND (f.user_id::text = id::text OR f.friend_id::text = id::text)
    )
  );
