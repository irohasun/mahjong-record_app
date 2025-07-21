import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Account = Database['public']['Tables']['accounts']['Row'];
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

export class AccountService {
  static async getAccount(): Promise<Account> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // ダミーユーザーの場合はデフォルトアカウントを返す
      if (user.id === 'dummy-user-id') {
        return {
          id: 'dummy-user-id',
          username: 'プレイヤー',
          created_at: new Date().toISOString(),
          is_premium: false,
          monthly_game_count: 0,
          last_reset_date: new Date().toISOString(),
          purchase_date: null,
        };
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
        const newAccount: AccountInsert = {
          id: user.id,
          username: 'プレイヤー',
          created_at: new Date().toISOString(),
          is_premium: false,
          monthly_game_count: 0,
          last_reset_date: new Date().toISOString(),
        };

        const { data: createdAccount, error: createError } = await supabase
          .from('accounts')
          .insert(newAccount)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return createdAccount;
      }

      return account;
    } catch (error) {
      console.error('Failed to get account:', error);
      throw new Error('アカウントの取得に失敗しました');
    }
  }

  static async createAccount(userId: string, username: string): Promise<Account> {
    try {
      const newAccount: AccountInsert = {
        id: userId,
        username: username,
        created_at: new Date().toISOString(),
        is_premium: false,
        monthly_game_count: 0,
        last_reset_date: new Date().toISOString(),
      };

      const { data: createdAccount, error } = await supabase
        .from('accounts')
        .insert(newAccount)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createdAccount;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw new Error('アカウント作成に失敗しました');
    }
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

      const { error } = await supabase
        .from('accounts')
        .update({ username })
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update username:', error);
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

      const updateData: AccountUpdate = {
        is_premium: isPremium,
      };

      if (isPremium) {
        updateData.purchase_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update premium status:', error);
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

      const account = await this.getAccount();
      
      // 月が変わったかチェック
      const now = new Date();
      const lastReset = new Date(account.last_reset_date);
      
      let newCount = account.monthly_game_count + 1;
      let newResetDate = account.last_reset_date;
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        newCount = 1;
        newResetDate = now.toISOString();
      }

      const { error } = await supabase
        .from('accounts')
        .update({
          monthly_game_count: newCount,
          last_reset_date: newResetDate,
        })
        .eq('id', account.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to increment game count:', error);
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

      const account = await this.getAccount();
      
      // 月が変わったかチェック
      const now = new Date();
      const lastReset = new Date(account.last_reset_date);
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        return 0;
      }
      
      return account.monthly_game_count;
    } catch (error) {
      console.error('Failed to get monthly game count:', error);
      return 0;
    }
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
      console.error('Failed to reset account:', error);
      throw new Error('アカウントのリセットに失敗しました');
    }
  }
}