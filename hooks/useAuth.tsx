import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/AuthService';
import { AccountService } from '@/services/AccountService';
import { ProfileService } from '@/services/ProfileService';
import { AuthContextType, EnhancedAccount, UserProfile, SignUpData } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<EnhancedAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize authentication with error handling
    initializeAuth();

    // Listen for auth changes with error handling
    let subscription: any = null;
    
    try {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          try {
            if (event === 'SIGNED_IN' && session?.user) {
              await loadUserData(session.user.id);
            } else if (event === 'SIGNED_OUT') {
              clearUserData();
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            setAuthError(error instanceof Error ? error : new Error('認証状態の変更でエラーが発生しました'));
          }
        }
      );
      subscription = authSubscription;
    } catch (error) {
      console.error('Auth state listener setup error:', error);
      setAuthError(error instanceof Error ? error : new Error('認証リスナーの設定でエラーが発生しました'));
      setLoading(false);
    }
      
      // フォールバック: 基本的なユーザー情報のみ設定
      console.log('useAuth: Using fallback user data for:', userId);
      setUser({
        id: userId,
        monthly_game_count: 0,
        profile: null,
        permissions: ['read_own_data', 'write_own_data'],
      }
      )

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Subscription cleanup error:', error);
        }
      }
    };
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('AuthProvider: Initializing authentication...');
      setAuthError(null);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('AuthProvider: Session error:', error);
          // セッションエラーの場合は匿名ログインを試行
          await handleAnonymousAuth();
        } else if (session?.user) {
          console.log('AuthProvider: Found existing session for user:', session.user.id);
          await loadUserData(session.user.id);
        } else {
          console.log('AuthProvider: No existing session, trying anonymous auth');
          await handleAnonymousAuth();
        }
      } catch (sessionError) {
        console.warn('AuthProvider: Session check failed, trying anonymous auth:', sessionError);
        await handleAnonymousAuth();
      }
    } catch (error) {
      console.error('AuthProvider: Initialization failed:', error);
      setAuthError(error instanceof Error ? error : new Error('認証の初期化に失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    try {
      console.log('AuthProvider: Attempting anonymous authentication...');
      const result = await AuthService.signInAnonymously();
      
      if (result?.user) {
        console.log('AuthProvider: Anonymous auth successful for user:', result.user.id);
        await loadUserData(result.user.id);
      } else {
        console.log('AuthProvider: Anonymous auth returned null user, setting guest mode');
        clearUserData();
      }
    } catch (error) {
      console.warn('AuthProvider: Anonymous auth failed, continuing without auth:', error);
      clearUserData();
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      console.log('AuthProvider: Loading user data for:', userId);
      setLoading(true);
      setAuthError(null);

      // Load account data
      try {
        const accountData = await AccountService.getEnhancedAccount(userId);
        setUser(accountData);
        console.log('AuthProvider: Account data loaded successfully');
      } catch (accountError) {
        console.error('AuthProvider: Failed to load account data:', accountError);
        // アカウントデータの読み込みが失敗してもフォールバックアカウントを設定
        setUser({
          id: userId,
          username: 'プレイヤー',
          email: null,
          email_verified: false,
          avatar_url: null,
          phone: null,
          date_of_birth: null,
          preferred_language: 'ja',
          timezone: 'Asia/Tokyo',
          last_login_at: null,
          status: 'active',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_premium: false,
          purchase_date: null,
          monthly_game_count: 0,
          last_reset_date: new Date().toISOString(),
        });
      }

      // Load profile data (optional)
      try {
        const profileData = await ProfileService.getProfile(userId);
        setProfile(profileData);
        console.log('AuthProvider: Profile data loaded successfully');
      } catch (profileError) {
        console.warn('AuthProvider: Profile not found, will be created on first update:', profileError);
        setProfile(null);
      }
      
      // Load permissions (optional)
      try {
        const userPermissions = await ProfileService.getUserPermissions(userId);
        setPermissions(userPermissions);
        console.log('AuthProvider: Permissions loaded successfully');
      } catch (permissionsError) {
        console.warn('AuthProvider: Failed to load permissions, using defaults:', permissionsError);
        setPermissions(['read_own_data', 'write_own_data']);
      }

      // Update last login (optional, don't fail if it errors)
      try {
        await AccountService.updateLastLogin(userId);
        console.log('AuthProvider: Last login updated successfully');
      } catch (loginError) {
        console.warn('AuthProvider: Failed to update last login:', loginError);
        // This is not critical, so we don't throw
      }

      console.log('AuthProvider: User data loading completed successfully');
    } catch (error) {
      console.error('AuthProvider: Critical error loading user data:', error);
      setAuthError(error instanceof Error ? error : new Error('ユーザーデータの読み込みに失敗しました'));
      // Don't clear user data on error, let user continue with partial data
    } finally {
      setLoading(false);
    }
  };

  const clearUserData = () => {
    console.log('AuthProvider: Clearing user data');
    setUser(null);
    setProfile(null);
    setPermissions([]);
    setAuthError(null);
    setLoading(false);
  };

  const signInAnonymously = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await handleAnonymousAuth();
    } catch (error) {
      console.error('AuthProvider: Sign in anonymously failed:', error);
      setAuthError(error instanceof Error ? error : new Error('匿名ログインに失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      setAuthError(null);
      console.log('useAuth: Starting signup with metadata:', metadata);
      const authResult = await AuthService.signUp(email, password, metadata);
      console.log('useAuth: Auth signup result:', authResult);
      
      // サインアップ成功後、明示的にaccountsテーブルにレコードを作成
      if (authResult.user) {
        try {
          console.log('useAuth: Creating account for user:', authResult.user.id);
          const account = await AccountService.createAccount(authResult.user.id, metadata?.username || 'プレイヤー');
          console.log('useAuth: Account created:', account);
          
          // アカウント作成後、ユーザーデータを読み込み
          if (authResult.session) {
            console.log('useAuth: Loading user data after signup');
            await loadUserData(authResult.user.id);
          }
        } catch (accountError) {
          console.error('useAuth: Account creation failed:', accountError);
          // アカウント作成エラーは致命的ではないので続行
        }
      }
      
      if (authResult.user && !authResult.session) {
        // Email confirmation required
        throw new Error('確認メールを送信しました。メールを確認してアカウントを有効化してください。');
      }
      
      return authResult;
    } catch (error) {
      console.error('useAuth: Signup failed:', error);
      setAuthError(error instanceof Error ? error : new Error('アカウント作成に失敗しました'));
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthError(null);
      await AuthService.signIn(email, password);
      // loadUserData will be called by the auth state change listener
    } catch (error) {
      setAuthError(error instanceof Error ? error : new Error('ログインに失敗しました'));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setAuthError(null);
      await AuthService.signOut();
      clearUserData();
    } catch (error) {
      setAuthError(error instanceof Error ? error : new Error('ログアウトに失敗しました'));
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('ユーザーがログインしていません');

    try {
      const updatedProfile = await ProfileService.updateProfile(user.id, updates);
      setProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const updateAccount = async (updates: Partial<EnhancedAccount>) => {
    if (!user) throw new Error('ユーザーがログインしていません');

    try {
      const updatedAccount = await AccountService.updateAccount(user.id, updates);
      setUser(updatedAccount);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      await AuthService.changePassword(newPassword);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      setAuthError(null);
      await loadUserData(user.id);
    } catch (error) {
      console.error('AuthProvider: Refresh user failed:', error);
      setAuthError(error instanceof Error ? error : new Error('ユーザー情報の更新に失敗しました'));
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission) || permissions.includes('write_all');
  };

  // Show error screen if there's a critical auth error
  if (authError && !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>認証エラーが発生しました</Text>
        <Text style={styles.errorMessage}>
          {authError.message}
        </Text>
        <Text style={styles.errorSubtext}>
          匿名サインインが無効になっている可能性があります。
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setAuthError(null);
            initializeAuth();
          }}
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={() => {
            setAuthError(null);
            clearUserData();
          }}
        >
          <Text style={styles.continueButtonText}>認証なしで続行</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const value: AuthContextType = {
    user,
    profile,
    permissions,
    loading,
    signUp,
    signIn,
    signInAnonymously,
    signOut,
    updateProfile,
    updateAccount,
    resetPassword,
    changePassword,
    refreshUser,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  continueButtonText: {
    color: '#6D6D70',
    fontSize: 16,
    fontWeight: '600',
  },
});
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}