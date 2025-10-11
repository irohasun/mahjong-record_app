import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for tracking if anonymous auth is disabled
const ANONYMOUS_AUTH_DISABLED_KEY = 'anonymousAuthDisabled';
const AUTH_STATE_KEY = 'authState';

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
  /**
   * メールアドレスとパスワードでユーザー登録
   * メール認証が必要で、確認メールが送信されます
   * @param email メールアドレス
   * @param password パスワード
   * @returns ユーザー情報とセッション情報
   */
  static async signUp(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // メール確認後のリダイレクト先（アプリのディープリンク）
          emailRedirectTo: undefined,
        }
      });

      if (error) {
        // Supabaseのエラーメッセージを日本語に変換
        const message = this.translateAuthError(error.message);
        throw new Error(message);
      }

      // メール確認が必要な場合、セッションは作成されない
      // data.user は存在するが、data.session は null の可能性がある
      if (data.user) {
        // メール未確認の場合でも、ユーザー情報は保存
        // ただし、セッションがない場合はログイン状態にはならない
        if (data.session) {
          await this.saveAuthState(data.user, data.session);
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to sign up:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('アカウント作成に失敗しました');
    }
  }

  /**
   * メールアドレスとパスワードでログイン
   * メール確認が完了していない場合はエラーを返します
   * @param email メールアドレス  
   * @param password パスワード
   * @returns ユーザー情報とセッション情報
   */
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
        const message = this.translateAuthError(error.message);
        throw new Error(message);
      }

      // メール確認が完了していない場合はエラー
      if (data.user && !data.user.email_confirmed_at) {
        // メール未確認エラーを特別に処理
        const unverifiedError = new Error('メールアドレスの確認が完了していません');
        (unverifiedError as any).code = 'EMAIL_NOT_VERIFIED';
        (unverifiedError as any).email = email;
        throw unverifiedError;
      }

      // 認証状態をローカルに保存
      if (data.user) {
        await this.saveAuthState(data.user, data.session);
      }

      return data;
    } catch (error) {
      console.error('Failed to sign in:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('ログインに失敗しました');
    }
  }

  /**
   * ログアウト
   */
  static async signOut() {
    if (!isSupabaseConfigured) {
      // ローカル認証状態をクリア
      await this.clearAuthState();
      return;
    }
    
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // ローカル認証状態をクリア
      await this.clearAuthState();
    } catch (error) {
      console.error('Failed to sign out:', error);
      // エラーが発生してもローカル状態はクリア
      await this.clearAuthState();
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

  /**
   * 現在のユーザー情報を取得
   * @returns ユーザー情報またはnull
   */
  static async getCurrentUser() {
    if (!isSupabaseConfigured || anonymousAuthDisabled) {
      // ローカル認証状態を確認
      return await this.getLocalAuthState();
    }
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        // セッションエラーの場合はローカル状態もクリア
        if (error.message === 'Auth session missing!') {
          await this.clearAuthState();
        }
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

  /**
   * パスワードリセットメール送信
   * @param email メールアドレス
   */
  static async resetPassword(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined, // パスワードリセット後のリダイレクト先（オプション）
      });

      if (error) {
        const message = this.translateAuthError(error.message);
        throw new Error(message);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('パスワードリセットに失敗しました');
    }
  }

  /**
   * メールアドレス確認状態をチェック
   * @returns 確認済みかどうか
   */
  static async isEmailVerified(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.email_confirmed_at != null;
    } catch (error) {
      return false;
    }
  }

  /**
   * メール確認メールを再送信
   * @param email メールアドレス
   */
  static async resendVerificationEmail(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        const message = this.translateAuthError(error.message);
        throw new Error(message);
      }
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('確認メールの再送信に失敗しました');
    }
  }

  /**
   * 匿名ユーザーを正式アカウントにアップグレード
   * 既存の匿名ユーザーにメールアドレスとパスワードを設定
   * @param email メールアドレス
   * @param password パスワード
   * @returns ユーザー情報とセッション情報
   */
  static async upgradeAnonymousUser(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabaseが設定されていません');
    }

    try {
      console.log('🔄 Upgrading anonymous user to permanent account');

      // 現在のユーザーを確認
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('認証されていません');
      }

      // 匿名ユーザーでない場合はエラー
      if (!currentUser.is_anonymous && currentUser.id !== 'dummy-user-id') {
        throw new Error('このアカウントは既に登録済みです');
      }

      // ダミーユーザーの場合は通常の登録を行う
      if (currentUser.id === 'dummy-user-id') {
        console.log('⚠️ Dummy user detected, performing normal sign up');
        return await this.signUp(email, password);
      }

      // 匿名ユーザーを更新（メールアドレスとパスワードを設定）
      const { data, error } = await supabase.auth.updateUser({
        email: email,
        password: password,
      });

      if (error) {
        const message = this.translateAuthError(error.message);
        throw new Error(message);
      }

      console.log('✅ Anonymous user upgraded successfully');

      // 認証状態を更新
      if (data.user) {
        await this.saveAuthState(data.user, null);
      }

      return data;
    } catch (error) {
      console.error('Failed to upgrade anonymous user:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('アカウントのアップグレードに失敗しました');
    }
  }

  /**
   * 認証状態を監視するリスナーを設定
   * @param callback 認証状態変更時のコールバック
   * @returns リスナーを削除する関数
   */
  static onAuthStateChange(callback: (user: any) => void) {
    if (!isSupabaseConfigured) {
      return () => {}; // 何もしない関数を返す
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await this.saveAuthState(session.user, session);
        } else {
          await this.clearAuthState();
        }
        callback(session?.user || null);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }

  // プライベートメソッド

  /**
   * 認証状態をローカルストレージに保存
   */
  private static async saveAuthState(user: any, session: any) {
    try {
      const authState = {
        user,
        session,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  /**
   * ローカルストレージから認証状態を取得
   */
  private static async getLocalAuthState() {
    try {
      const authStateStr = await AsyncStorage.getItem(AUTH_STATE_KEY);
      if (!authStateStr) return null;
      
      const authState = JSON.parse(authStateStr);
      return authState.user;
    } catch (error) {
      console.error('Failed to get local auth state:', error);
      return null;
    }
  }

  /**
   * ローカル認証状態をクリア
   */
  private static async clearAuthState() {
    try {
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  }

  /**
   * Supabaseのエラーメッセージを日本語に翻訳
   */
  private static translateAuthError(errorMessage: string): string {
    const errorMap: { [key: string]: string } = {
      'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
      'Email not confirmed': 'メールアドレスの確認が完了していません',
      'User already registered': 'このメールアドレスは既に登録されています',
      'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
      'Invalid email': 'メールアドレスの形式が正しくありません',
      'User not found': 'ユーザーが見つかりません',
      'Too many requests': 'リクエストが多すぎます。しばらく待ってから再度お試しください',
      'Email rate limit exceeded': 'メール送信の制限に達しました。しばらく待ってから再度お試しください',
    };

    return errorMap[errorMessage] || errorMessage;
  }

  // 既存の匿名認証関連メソッドはそのまま維持
}