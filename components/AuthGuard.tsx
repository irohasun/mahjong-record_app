import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { AuthService } from '@/services/AuthService';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 起動時に匿名サインインを試行し、失敗しても続行（ダミーで動作）
        let currentUser = await AuthService.getCurrentUser();
        if (!currentUser) {
          try {
            const anon = await AuthService.signInAnonymously();
            currentUser = anon?.user ?? null;
          } catch {
            // 無視して続行
          }
        }
        setUser(currentUser);
        
        // 強制リダイレクトは廃止。
        // 認証画面にいる場合でも「匿名ユーザー or ダミーユーザー」はリダイレクトしない（登録フローを妨げないため）
        const inAuthGroup = segments[0] === '(auth)';
        const isAnonymous = (currentUser as any)?.is_anonymous || (currentUser as any)?.id === 'dummy-user-id';
        if (currentUser && inAuthGroup && !isAnonymous) {
          router.replace('/(tabs)/history');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const unsubscribe = AuthService.onAuthStateChange((newUser) => {
      setUser(newUser);
      const inAuthGroup = segments[0] === '(auth)';
      const isAnonymous = (newUser as any)?.is_anonymous || (newUser as any)?.id === 'dummy-user-id';
      if (newUser && inAuthGroup && !isAnonymous) {
        router.replace('/(tabs)/history');
      }
    });

    return unsubscribe;
  }, [segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>認証状態を確認中...</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6D6D70',
  },
});