import { useState, useEffect, useRef } from 'react';
import { AuthService } from '@/services/AuthService';

export interface User {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const isMountedRef = useRef(true);

  // マウント/アンマウントのガード（アンマウント後の setState を防止）
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const safeSetState = <T,>(setter: (value: T) => void) => (value: T) => {
      if (isMountedRef.current) setter(value);
    };

    const setUserSafe = safeSetState<User | null>(setUser);
    const setLoadingSafe = safeSetState<boolean>(setLoading);
    const setInitializedSafe = safeSetState<boolean>(setInitialized);

    const initAuth = async () => {
      try {
        let currentUser = await AuthService.getCurrentUser();
        if (!currentUser) {
          try {
            const anon = await AuthService.signInAnonymously();
            // supabase-js の戻りは { user, session }
            currentUser = (anon as any)?.user ?? null;
          } catch {
            // 無視して続行
          }
        }
        setUserSafe(currentUser);
      } catch (error) {
        console.error('Failed to get current user:', error);
        setUserSafe(null);
      } finally {
        setLoadingSafe(false);
        setInitializedSafe(true);
      }
    };

    initAuth();

    // 認証状態の変更を監視（ロード中フラグを false に）
    const unsubscribe = AuthService.onAuthStateChange((newUser) => {
      setUserSafe(newUser);
      setLoadingSafe(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    // 匿名ユーザー判定は既存挙動を維持
    isAnonymous: user?.is_anonymous || user?.id === 'dummy-user-id',
    isEmailVerified: !!user?.email_confirmed_at,
  } as const;
}