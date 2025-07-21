import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    // Get initial session
    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          clearUserData();
        }
      }
    );
      
      // フォールバック: 基本的なユーザー情報のみ設定
      console.log('useAuth: Using fallback user data for:', userId);
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
        profile: null,
        permissions: ['read_own_data', 'write_own_data'],
      });
    return () => subscription.unsubscribe();
  }, []);

  const getInitialSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Error getting initial session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      setLoading(true);

      // Load account data
      const accountData = await AccountService.getEnhancedAccount(userId);
      setUser(accountData);

      // Load profile data
      try {
        const profileData = await ProfileService.getProfile(userId);
        setProfile(profileData);
      } catch (profileError) {
        console.log('Profile not found, will be created on first update');
        setProfile(null);
      }
      
      // アカウント情報を最初に取得
      const account = await AccountService.getEnhancedAccount(userId);
      console.log('useAuth: Account loaded:', account);
      
      // プロフィールと権限は失敗しても続行
      let profile = null;
      let permissions: string[] = [];
      
      try {
        profile = await ProfileService.getProfile(userId);
        console.log('useAuth: Profile loaded:', profile);
      } catch (error) {
        console.warn('useAuth: Failed to load profile, using fallback:', error);
        profile = null;
      }
      
      try {
        permissions = await ProfileService.getUserPermissions(userId);
        console.log('useAuth: Permissions loaded:', permissions);
      } catch (error) {
        console.warn('useAuth: Failed to load permissions, using fallback:', error);
        permissions = ['read_own_data', 'write_own_data'];
      }
      // Update last login
      await AccountService.updateLastLogin(userId);
      console.log('useAuth: Last login updated for:', userId);
    } catch (error) {
      console.error('Error loading user data:', error);
      clearUserData();
    } finally {
      setLoading(false);
    }
  };

  const clearUserData = () => {
    setUser(null);
    setProfile(null);
    setPermissions([]);
    setLoading(false);
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
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
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await AuthService.signIn(email, password);
      // loadUserData will be called by the auth state change listener
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AuthService.signOut();
      clearUserData();
    } catch (error) {
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
    await loadUserData(user.id);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission) || permissions.includes('write_all');
  };

  const value: AuthContextType = {
    user,
    profile,
    permissions,
    loading,
    signUp,
    signIn,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}