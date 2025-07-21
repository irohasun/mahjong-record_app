import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to get current user:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // 認証状態の変更を監視
    const unsubscribe = AuthService.onAuthStateChange((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAnonymous: user?.is_anonymous || user?.id === 'dummy-user-id',
    isEmailVerified: !!user?.email_confirmed_at,
  };
}