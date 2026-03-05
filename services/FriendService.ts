import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Friend, FriendRequest } from '@/types/Friends';
import { LocalStorageService } from './LocalStorageService';
import { StorageService } from './StorageService';
import { notifyFriendsChanged } from '@/utils/cacheInvalidation';

export class FriendService {
  /**
   * 現在のユーザーを取得
   */
  private static async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('認証されていません');
    }
    return user;
  }

  /**
   * フレンドリスト取得（accepted のみ）
   * SECURITY DEFINER RPC を使用して RLS の JOIN 問題を回避
   */
  static async getFriends(): Promise<Friend[]> {
    try {
      const cached = await LocalStorageService.getFriends();
      if (cached) return cached;

      if (!isSupabaseConfigured) return [];

      const { data, error } = await (supabase as any).rpc('get_accepted_friends');

      if (error) throw error;

      const friends = await Promise.all(
        (data || []).map(async (row: any) => ({
          id: row.id,
          userId: row.user_id,
          friendId: row.friend_id,
          username: row.friend_username ?? '不明',
          avatarUrl: row.friend_avatar_url
            ? (await StorageService.getPublicUrl(row.friend_avatar_url)) ?? undefined
            : undefined,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          rating4p: row.friend_rating_4p ?? 1500,
          rating3p: row.friend_rating_3p ?? 1500,
        }))
      );

      await LocalStorageService.saveFriends(friends);
      return friends;
    } catch (error) {
      const cached = await LocalStorageService.getFriends();
      return cached ?? [];
    }
  }

  /**
   * 保留中のフレンドリクエスト取得（自分宛て）
   * SECURITY DEFINER RPC を使用して RLS の JOIN 問題を回避
   */
  static async getPendingRequests(): Promise<FriendRequest[]> {
    try {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await (supabase as any).rpc('get_pending_friend_requests');

      if (error) throw error;

      return Promise.all(
        (data || []).map(async (row: any) => ({
          id: row.id,
          fromUser: {
            id: row.requester_id ?? row.user_id,
            username: row.requester_username ?? '不明',
            avatarUrl: row.requester_avatar_url
              ? (await StorageService.getPublicUrl(row.requester_avatar_url)) ?? undefined
              : undefined,
          },
          status: 'pending' as const,
          createdAt: row.created_at,
        }))
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * 送信済みのフレンドリクエスト取得
   */
  static async getSentRequests(): Promise<FriendRequest[]> {
    try {
      if (!isSupabaseConfigured) return [];

      const user = await this.getCurrentUser();

      const { data, error } = (await (supabase as any)
        .from('friendships')
        .select(
          `
          id, user_id, friend_id, status, created_at,
          accounts!friendships_friend_id_fkey (id, username, avatar_url)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'pending')) as any;

      if (error) throw error;

      return Promise.all(
        (data || []).map(async (row: any) => ({
          id: row.id,
          fromUser: {
            id: row.accounts?.id ?? row.friend_id,
            username: row.accounts?.username ?? '不明',
            avatarUrl: row.accounts?.avatar_url
              ? (await StorageService.getPublicUrl(row.accounts.avatar_url)) ?? undefined
              : undefined,
          },
          status: 'pending' as const,
          createdAt: row.created_at,
        }))
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * フレンドリクエスト送信
   */
  static async sendFriendRequest(friendId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const user = await this.getCurrentUser();

      if (user.id === friendId) {
        throw new Error('自分自身にフレンドリクエストを送信できません');
      }

      const { error } = await (supabase as any).from('friendships').insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('既にフレンドリクエストを送信済みです');
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * フレンドリクエスト承認
   * SECURITY DEFINER RPC を使用して PostgREST UPDATE + RLS のサイレントブロック問題を回避
   */
  static async acceptFriendRequest(friendshipId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any).rpc('accept_friend_request', {
        p_friendship_id: friendshipId,
      });

      if (error) throw error;
      // キャッシュ操作・イベント通知は呼び出し側（handleAcceptRequest）で一度だけ実行する
    } catch (error) {
      throw error;
    }
  }

  /**
   * フレンドリクエスト拒否
   */
  static async rejectFriendRequest(friendshipId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * フレンド削除
   */
  static async removeFriend(friendshipId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await LocalStorageService.clearFriendsCache();
      notifyFriendsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * ユーザーをブロック
   */
  static async blockUser(friendshipId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('friendships')
        .update({ status: 'blocked', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      await LocalStorageService.clearFriendsCache();
      notifyFriendsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * ユーザー検索（ユーザー名で検索）
   * SECURITY DEFINER のRPC関数を使い、公開情報のみ返す
   */
  static async searchUsers(
    query: string
  ): Promise<{ id: string; username: string; avatarUrl?: string }[]> {
    try {
      const trimmed = query.trim();
      if (!isSupabaseConfigured || trimmed.length < 2) return [];

      const { data, error } = await (supabase as any).rpc('search_users_by_username', {
        search_query: trimmed,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        avatarUrl: row.avatar_url ?? undefined,
      }));
    } catch (error) {
      return [];
    }
  }
}
