import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Friend, FriendRequest, FriendshipResponse } from '@/types/Friends';
import { LocalStorageService } from './LocalStorageService';
import { notifyFriendsChanged } from '@/utils/cacheInvalidation';

export class FriendService {
  /**
   * FriendshipResponseからFriend型に変換
   */
  private static mapFriendFromDb(
    row: FriendshipResponse,
    currentUserId: string
  ): Friend {
    const isSender = row.user_id === currentUserId;
    return {
      id: row.id,
      userId: row.user_id,
      friendId: row.friend_id,
      username: row.accounts?.username ?? '不明',
      avatarUrl: row.accounts?.avatar_url ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

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
   */
  static async getFriends(): Promise<Friend[]> {
    try {
      // キャッシュチェック
      const cached = await LocalStorageService.getFriends();
      if (cached) return cached;

      if (!isSupabaseConfigured) return [];

      const user = await this.getCurrentUser();

      // 自分が送った友達関係
      const { data: sentData, error: sentError } = (await (supabase as any)
        .from('friendships')
        .select(
          `
          id, user_id, friend_id, status, created_at, updated_at,
          accounts!friendships_friend_id_fkey (id, username, avatar_url)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'accepted')) as any;

      if (sentError) throw sentError;

      // 自分が受けた友達関係
      const { data: receivedData, error: receivedError } = (await (supabase as any)
        .from('friendships')
        .select(
          `
          id, user_id, friend_id, status, created_at, updated_at,
          accounts!friendships_user_id_fkey (id, username, avatar_url)
        `
        )
        .eq('friend_id', user.id)
        .eq('status', 'accepted')) as any;

      if (receivedError) throw receivedError;

      const friends = [
        ...(sentData || []).map((row: any) => this.mapFriendFromDb(row, user.id)),
        ...(receivedData || []).map((row: any) => this.mapFriendFromDb(row, user.id)),
      ];

      await LocalStorageService.saveFriends(friends);
      return friends;
    } catch (error) {
      const cached = await LocalStorageService.getFriends();
      return cached ?? [];
    }
  }

  /**
   * 保留中のフレンドリクエスト取得（自分宛て）
   */
  static async getPendingRequests(): Promise<FriendRequest[]> {
    try {
      if (!isSupabaseConfigured) return [];

      const user = await this.getCurrentUser();

      const { data, error } = (await (supabase as any)
        .from('friendships')
        .select(
          `
          id, user_id, friend_id, status, created_at,
          accounts!friendships_user_id_fkey (id, username, avatar_url)
        `
        )
        .eq('friend_id', user.id)
        .eq('status', 'pending')) as any;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        fromUser: {
          id: row.accounts?.id ?? row.user_id,
          username: row.accounts?.username ?? '不明',
          avatarUrl: row.accounts?.avatar_url ?? undefined,
        },
        status: 'pending' as const,
        createdAt: row.created_at,
      }));
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

      return (data || []).map((row: any) => ({
        id: row.id,
        fromUser: {
          id: row.accounts?.id ?? row.friend_id,
          username: row.accounts?.username ?? '不明',
          avatarUrl: row.accounts?.avatar_url ?? undefined,
        },
        status: 'pending' as const,
        createdAt: row.created_at,
      }));
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
   */
  static async acceptFriendRequest(friendshipId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      await LocalStorageService.clearFriendsCache();
      notifyFriendsChanged();
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
   */
  static async searchUsers(
    query: string
  ): Promise<{ id: string; username: string; avatarUrl?: string }[]> {
    try {
      const trimmed = query.trim();
      if (!isSupabaseConfigured || trimmed.length < 2) return [];

      const user = await this.getCurrentUser();

      // LIKE ワイルドカード文字をエスケープ（% と _ は特殊文字）
      const escaped = trimmed.replace(/[%_\\]/g, '\\$&');

      const { data, error } = (await supabase
        .from('accounts')
        .select('id, username, avatar_url')
        .ilike('username', `%${escaped}%`)
        .neq('id', user.id)
        .limit(20)) as any;

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
