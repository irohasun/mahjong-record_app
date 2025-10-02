import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { FriendProfile, FriendRequest, FriendRequestStatus } from '@/types/Friend';

/**
 * 友だち機能のための最小限のサービス雛形
 * - 動作は変えず、実装はモック/スタブに留める
 * - 将来、Supabaseのテーブル（例: friends, friend_requests）に接続する
 */
export class FriendService {
  /**
   * 自分の友だち一覧を取得（現状は空配列）
   */
  static async getFriends(accountId: string): Promise<FriendProfile[]> {
    try {
      if (!isSupabaseConfigured) return [];
      // 将来の実装例:
      // const { data, error } = await supabase.from('friends_view').select('*').eq('account_id', accountId);
      // if (error) throw error;
      // return data.map(...);
      return [];
    } catch (error) {
      console.error('getFriends error:', error);
      return [];
    }
  }

  /**
   * 友だちリクエストを送信（現状はモックIDを返す）
   */
  static async sendFriendRequest(fromAccountId: string, toAccountId: string): Promise<FriendRequest> {
    try {
      if (!isSupabaseConfigured) {
        return {
          id: `mock-${Date.now()}`,
          fromAccountId,
          toAccountId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      }
      // 将来の実装例:
      // const { data, error } = await supabase.from('friend_requests').insert({...}).select().single();
      // if (error) throw error;
      // return mapToFriendRequest(data);
      return {
        id: `mock-${Date.now()}`,
        fromAccountId,
        toAccountId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('sendFriendRequest error:', error);
      throw new Error('友だちリクエストの送信に失敗しました');
    }
  }

  /**
   * 友だちリクエストを承認/却下（現状はステータスのみ変更して返す）
   */
  static async respondFriendRequest(requestId: string, status: Extract<FriendRequestStatus, 'accepted' | 'declined'>): Promise<FriendRequest> {
    try {
      if (!isSupabaseConfigured) {
        return {
          id: requestId,
          fromAccountId: 'unknown',
          toAccountId: 'unknown',
          status,
          createdAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
        };
      }
      // 将来の実装例:
      // const { data, error } = await supabase.from('friend_requests').update({ status }).eq('id', requestId).select().single();
      // if (error) throw error;
      // return mapToFriendRequest(data);
      return {
        id: requestId,
        fromAccountId: 'unknown',
        toAccountId: 'unknown',
        status,
        createdAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('respondFriendRequest error:', error);
      throw new Error('友だちリクエストの更新に失敗しました');
    }
  }
}


