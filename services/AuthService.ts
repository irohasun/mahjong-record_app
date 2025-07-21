import { supabase } from '@/lib/supabase';

export class AuthService {
  static async signUp(email: string, password: string) {
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

  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  static async resetPassword(email: string) {
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