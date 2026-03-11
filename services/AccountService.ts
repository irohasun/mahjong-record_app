import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Account = Database['public']['Tables']['accounts']['Row'];
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

type AccountsTable = Database['public']['Tables']['accounts'];

type PostgrestInsertArg = AccountsTable['Insert'];

type PostgrestUpdateArg = AccountsTable['Update'];

import { MockDataService } from './MockDataService';
import { LocalStorageService } from './LocalStorageService';
import { AuthService } from './AuthService';

export class AccountService {
  /**
   * アカウントデータを取得（キャッシュ対応）
   * キャッシュが有効な場合はキャッシュから返し、無効な場合はサーバーから取得してキャッシュに保存
   * @param forceRefresh キャッシュを無視して強制的にサーバーから取得する場合はtrue
   * @returns アカウントデータとユーザー情報
   */
  static async getAccount(forceRefresh: boolean = false): Promise<{ account: Account; user: any }> {
    try {
      // 強制更新でない場合、キャッシュから取得を試みる
      if (!forceRefresh) {
        const isCacheValid = await LocalStorageService.isAccountCacheValid();
        if (isCacheValid) {
          const cachedAccount = await LocalStorageService.getAccount();
          if (cachedAccount) {
            // キャッシュ使用時もユーザー情報を取得（軽量）
            const { data: { user } } = await supabase.auth.getUser();
            return { account: cachedAccount as Account, user: user || null };
          }
        }
      }

      // キャッシュが無効または強制更新の場合はサーバーから取得
      const { account, user } = await this.fetchAccountFromServer();
      
      // 取得したデータをキャッシュに保存
      await LocalStorageService.saveAccount(account);
      
      return { account, user };
    } catch (error) {
      // エラー時はキャッシュから取得を試みる
      const cachedAccount = await LocalStorageService.getAccount();
      if (cachedAccount) {
        // エラー時もユーザー情報を取得を試みる
        try {
          const { data: { user } } = await supabase.auth.getUser();
          return { account: cachedAccount as Account, user: user || null };
        } catch {
          return { account: cachedAccount as Account, user: null };
        }
      }
      
      throw new Error('アカウントの取得に失敗しました');
    }
  }

  /**
   * サーバーからアカウントデータを取得（内部メソッド）
   * @returns アカウントデータとユーザー情報
   */
  private static async fetchAccountFromServer(): Promise<{ account: Account; user: any }> {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const authResult = await AuthService.signInAnonymously();
        user = authResult.user as any;
      }
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // ダミーユーザーの場合はデフォルトアカウントを返す
      if (user.id === 'dummy-user-id') {
        const mockAccount = MockDataService.generateMockAccount();
        const now = new Date().toISOString();
        const account = {
          id: 'dummy-user-id',
          username: mockAccount.username,
          email: null,
          email_verified: false,
          avatar_url: null,
          phone: null,
          date_of_birth: null,
          preferred_language: 'ja',
          timezone: 'Asia/Tokyo',
          last_login_at: now,
          status: 'active',
          metadata: {},
          is_premium: mockAccount.isPremium,
          purchase_date: mockAccount.purchaseDate ?? null,
          monthly_game_count: mockAccount.monthlyGameCount,
          last_reset_date: mockAccount.lastResetDate,
          created_at: mockAccount.createdDate,
          updated_at: now,
        } as Account;
        return { account, user };
      }

      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!account) {
        // 新しいアカウントを作成
        const newAccount: PostgrestInsertArg = {
          id: user.id,
          username: AccountService.generateRandomUsername(),
          created_at: new Date().toISOString(),
          is_premium: false,
          monthly_game_count: 0,
          last_reset_date: new Date().toISOString(),
        };

        const { data: createdAccount, error: createError } = await (supabase as any)
          .from('accounts')
          .insert(newAccount)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return { account: createdAccount as Account, user };
      }

      return { account: account as Account, user };
    } catch (error) {
      throw error;
    }
  }

  /**
   * アカウントデータを更新した後にキャッシュをクリア
   */
  static async invalidateCache(): Promise<void> {
    await LocalStorageService.clearAccountCache();
  }

  static async updateUsername(username: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // ダミーユーザーの場合は何もしない
      if (user.id === 'dummy-user-id') {
        return;
      }

      const updateArg: PostgrestUpdateArg = { username };

      const { error } = await (supabase as any)
        .from('accounts')
        .update(updateArg)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // ユーザー名更新後はキャッシュを無効化
      await this.invalidateCache();
    } catch (error) {
      throw new Error('ユーザー名の更新に失敗しました');
    }
  }

  static async setPremium(isPremium: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // ダミーユーザーの場合は何もしない
      if (user.id === 'dummy-user-id') {
        return;
      }

      const updateData: PostgrestUpdateArg = {
        is_premium: isPremium,
      };

      if (isPremium) {
        updateData.purchase_date = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from('accounts')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new Error('プレミアムステータスの更新に失敗しました');
    }
  }

  static async incrementMonthlyGameCount(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // ダミーユーザーの場合は何もしない
      if (user?.id === 'dummy-user-id') {
        return;
      }

      const { account } = await this.getAccount();
      
      // 月が変わったかチェック
      const now = new Date();
      const lastReset = new Date(account.last_reset_date ?? new Date().toISOString());

      let newCount = (account.monthly_game_count ?? 0) + 1;
      let newResetDate = account.last_reset_date;
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        newCount = 1;
        newResetDate = now.toISOString();
      }

      const updateArg: PostgrestUpdateArg = {
        monthly_game_count: newCount,
        last_reset_date: newResetDate,
      };

      const { error } = await (supabase as any)
        .from('accounts')
        .update(updateArg)
        .eq('id', account.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new Error('対局数の更新に失敗しました');
    }
  }

  static async getMonthlyGameCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // ダミーユーザーの場合は0を返す
      if (user?.id === 'dummy-user-id') {
        return 0;
      }

      const { account } = await this.getAccount();
      
      // 月が変わったかチェック
      const now = new Date();
      const lastReset = new Date(account.last_reset_date ?? new Date().toISOString());

      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        return 0;
      }

      return account.monthly_game_count ?? 0;
    } catch {
      return 0;
    }
  }

  static async getMyRating(): Promise<{ rating4p: number; rating3p: number }> {
    try {
      const { account } = await this.getAccount();
      return {
        rating4p: account.rating_4p ?? 1500,
        rating3p: account.rating_3p ?? 1500,
      };
    } catch {
      return { rating4p: 1500, rating3p: 1500 };
    }
  }

  static async getAllRatings(): Promise<Array<{ id: string; username: string; avatarUrl?: string; rating4p: number; rating3p: number }>> {
    const { data, error } = await supabase.rpc('get_all_ratings');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      username: r.username,
      avatarUrl: r.avatar_url ?? undefined,
      rating4p: r.rating_4p ?? 1500,
      rating3p: r.rating_3p ?? 1500,
    }));
  }

  private static generateRandomUsername(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async resetAccount(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // ダミーユーザーの場合は何もしない
      if (user.id === 'dummy-user-id') {
        return;
      }

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new Error('アカウントのリセットに失敗しました');
    }
  }
}