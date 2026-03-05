export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  username: string;
  avatarUrl?: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  updatedAt: string;
  rating4p?: number;
  rating3p?: number;
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
