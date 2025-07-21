import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';

export class AuthService {
  static async signUp(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to sign up:', error);
      throw new Error('アカウント作成に失敗しました');
    }
  }

  static async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw new Error('ログインに失敗しました');
    }
  }

  static async signOut() {
    if (!isSupabaseConfigured) {
      return; // サイレントに成功とする
    }
    
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw new Error('ログアウトに失敗しました');
    }
  }

  static async signInAnonymously() {
    if (!isSupabaseConfigured) {
      // Supabaseが設定されていない場合はダミーユーザーを返す
      return {
        user: {
          id: 'dummy-user-id',
          email: null,
          is_anonymous: true
        },
        session: null
      };
    }
    
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      // エラーがある場合は直接ハンドリング（throwしない）
      if (error) {
        // 匿名認証が無効化されている場合は静かにダミーユーザーを返す
        if (error.message.includes('Anonymous sign-ins are disabled') || 
            error.message.includes('anonymous_provider_disabled')) {
          // 匿名認証が無効な場合はログを出さずにダミーユーザーを返す
        } else {
          // その他のエラーの場合のみログを出力
          console.error('Failed to sign in anonymously:', error);
        }
        
        // いずれの場合もダミーユーザーを返す
        return {
          user: {
            id: 'dummy-user-id',
            email: null,
            is_anonymous: true
          },
          session: null
        };
      }

      return data;
    } catch (error) {
      // 予期しないエラーの場合のみログを出力
      console.error('Unexpected error during anonymous sign in:', error);
      
      return {
        user: {
          id: 'dummy-user-id',
          email: null,
          is_anonymous: true
        },
        session: null
      };
    }
  }

  static async getCurrentUser() {
    if (!isSupabaseConfigured) {
      return null;
    }
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return user;
    } catch (error) {
      // Don't log "Auth session missing!" as it's expected when not authenticated
      if (error instanceof Error && error.message === 'Auth session missing!') {
        return null;
      }
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  static async resetPassword(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw new Error('パスワードリセットに失敗しました');
    }
  }
}