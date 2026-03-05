-- friendships テーブル
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their friendships"
  ON friendships FOR UPDATE
  USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id);

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- groups テーブル
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  avatar_url text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_groups_owner_id ON groups(owner_id);
CREATE INDEX idx_groups_is_public ON groups(is_public);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Group owners can update their groups"
  ON groups FOR UPDATE
  USING ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Group owners can delete their groups"
  ON groups FOR DELETE
  USING ((SELECT auth.uid()) = owner_id);

-- group_members テーブル
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT unique_group_member UNIQUE (group_id, member_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_member_id ON group_members(member_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- groups の SELECT ポリシー（group_members テーブル作成後に定義）
CREATE POLICY "Group members can view their groups"
  ON groups FOR SELECT
  USING (
    is_public = true
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.member_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Group members can view members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.member_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Group owners and admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    -- Allow self-insert when creating a group (owner role)
    ((SELECT auth.uid()) = member_id AND role = 'owner')
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.member_id = (SELECT auth.uid())
      AND gm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners and admins can remove members"
  ON group_members FOR DELETE
  USING (
    -- Members can remove themselves
    (SELECT auth.uid()) = member_id
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.member_id = (SELECT auth.uid())
      AND gm.role IN ('owner', 'admin')
    )
  );

-- game_groups テーブル
CREATE TABLE IF NOT EXISTS game_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_game_group UNIQUE (game_id, group_id)
);

CREATE INDEX idx_game_groups_game_id ON game_groups(game_id);
CREATE INDEX idx_game_groups_group_id ON game_groups(group_id);

ALTER TABLE game_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view game_groups"
  ON game_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_groups.group_id
      AND group_members.member_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Group members can add games"
  ON game_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_groups.group_id
      AND group_members.member_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Group members can remove games"
  ON game_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_groups.group_id
      AND group_members.member_id = (SELECT auth.uid())
    )
  );
