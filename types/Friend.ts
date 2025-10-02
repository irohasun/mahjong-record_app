// 友だち機能に関する型定義
// 目的: 将来の「友だち追加」機能に備え、画面・サービスで共通利用する最小限の型を用意

export interface FriendProfile {
  id: string; // アカウントID（= Supabase auth user id を想定）
  username: string;
  avatarUrl?: string;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequest {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  status: FriendRequestStatus;
  createdAt: string; // ISO8601
  respondedAt?: string; // ISO8601
}
