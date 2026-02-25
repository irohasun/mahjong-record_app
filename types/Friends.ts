export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  username: string;
  avatarUrl?: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  status: 'pending';
  createdAt: string;
}

export interface FriendshipResponse {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  accounts?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}
