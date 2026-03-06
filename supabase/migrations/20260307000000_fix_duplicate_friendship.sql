-- 既存の重複データを削除（双方向acceptedのうち新しい方を削除）
DELETE FROM friendships
WHERE id IN (
  SELECT f2.id
  FROM friendships f1
  JOIN friendships f2 ON f1.user_id = f2.friend_id AND f1.friend_id = f2.user_id
  WHERE f1.status = 'accepted' AND f2.status = 'accepted'
    AND f1.created_at < f2.created_at
);

-- INSERT ポリシー修正: 既にフレンド関係がある場合はリクエスト送信を禁止
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.user_id = (SELECT auth.uid()) AND f.friend_id = friendships.friend_id AND f.status = 'accepted')
        OR (f.user_id = friendships.friend_id AND f.friend_id = (SELECT auth.uid()) AND f.status = 'accepted')
      )
    )
  );
