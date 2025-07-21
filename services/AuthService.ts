import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SignUpData } from '@/types/auth';

// Storage key for tracking if anonymous auth is disabled
const ANONYMOUS_AUTH_DISABLED_KEY = 'anonymousAuthDisabled';

// Flag to track if anonymous auth is disabled
let anonymousAuthDisabled = false;

// Initialize the flag from storage
const initializeAuthState = () => {
  try {
    const stored = localStorage.getItem(ANONYMOUS_AUTH_DISABLED_KEY);
    anonymousAuthDisabled = stored === 'true';
  } catch (error) {
    // Ignore localStorage errors, default to false
    anonymousAuthDisabled = false;
  }
};

// Save the flag to storage
const saveAnonymousAuthDisabled = (disabled: boolean) => {
  try {
    localStorage.setItem(ANONYMOUS_AUTH_DISABLED_KEY, disabled.toString());
    anonymousAuthDisabled = disabled;
  } catch (error) {
    // Ignore localStorage errors
    anonymousAuthDisabled = disabled;
  }
};

// Initialize on module load
initializeAuthState();

export class AuthService {
  static async signUp(email: string, password: string, metadata?: Record<string, any>) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
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
    if (!isSupabaseConfigured || anonymousAuthDisabled) {
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
      // Check if Supabase is properly configured before attempting authentication
      if (!isSupabaseConfigured) {
        return {
          id: 'dummy-user',
          aud: '',
          role: '',
          email: '',
          email_confirmed_at: '',
          phone: '',
          confirmed_at: '',
          last_sign_in_at: '',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '',
          updated_at: ''
        };
      }

      const { data, error } = await supabase.auth.signInAnonymously();

      // エラーがある場合は直接ハンドリング（throwしない）
      if (error) {
        // 匿名認証が無効化されている場合は静かにダミーユーザーを返す
        if (error.message.includes('Anonymous sign-ins are disabled') || 
            error.message.includes('anonymous_provider_disabled')) {
          // Set flag to prevent future attempts and persist it
          saveAnonymousAuthDisabled(true);
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
    if (!isSupabaseConfigured || anonymousAuthDisabled) {
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

  static async changePassword(newPassword: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      throw new Error('パスワード変更に失敗しました');
    }
  }

  static async updateEmail(newEmail: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update email:', error);
      throw new Error('メールアドレス変更に失敗しました');
    }
  }

  static async refreshSession() {
    if (!isSupabaseConfigured) {
      return null;
    }
    
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  }

  static async getSession() {
    if (!isSupabaseConfigured) {
      return null;
    }
    
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return data.session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  static async resendConfirmation(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to resend confirmation:', error);
      throw new Error('確認メールの再送信に失敗しました');
    }
  }
}