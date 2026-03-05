-- group_invitations テーブル
CREATE TABLE IF NOT EXISTS group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_invitation CHECK (invited_by != invited_user_id),
  CONSTRAINT unique_group_invitation UNIQUE (group_id, invited_user_id)
);

CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_invited_user_id ON group_invitations(invited_user_id);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);

ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- 招待された本人は閲覧可能
CREATE POLICY "Users can view their own invitations"
  ON group_invitations FOR SELECT
  USING ((SELECT auth.uid()) = invited_user_id);

-- グループのオーナー・管理者が招待を送信可能
CREATE POLICY "Group owners and admins can send invitations"
  ON group_invitations FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = invited_by
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_invitations.group_id
        AND gm.member_id = (SELECT auth.uid())
        AND gm.role IN ('owner', 'admin')
    )
  );

-- 招待された本人が拒否（DELETE）可能
CREATE POLICY "Invited users can reject invitations"
  ON group_invitations FOR DELETE
  USING ((SELECT auth.uid()) = invited_user_id);

-- 招待を承認してグループメンバーに追加する RPC 関数
-- SECURITY DEFINER: group_members の INSERT ポリシーをバイパスするため
CREATE OR REPLACE FUNCTION accept_group_invitation(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 招待レコードを取得（自分宛てのみ）
  SELECT group_id INTO v_group_id
  FROM group_invitations
  WHERE id = invitation_id
    AND invited_user_id = v_user_id
    AND status = 'pending';

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or not authorized';
  END IF;

  -- グループメンバーに追加
  INSERT INTO group_members (group_id, member_id, role)
  VALUES (v_group_id, v_user_id, 'member')
  ON CONFLICT (group_id, member_id) DO NOTHING;

  -- 招待レコードを削除
  DELETE FROM group_invitations
  WHERE id = invitation_id;
END;
$$;
