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

      // Load permissions
      const userPermissions = await ProfileService.getUserPermissions(userId);
      setPermissions(userPermissions);

      // Update last login
      await AccountService.updateLastLogin(userId);
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
      const result = await AuthService.signUp(email, password, metadata);
      
      if (result.user && !result.session) {
        // Email confirmation required
        throw new Error('確認メールを送信しました。メールを確認してアカウントを有効化してください。');
      }
    } catch (error) {
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