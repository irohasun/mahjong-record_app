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
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
        
        const inAuthGroup = segments[0] === '(auth)';
        
        if (!currentUser && !inAuthGroup) {
          router.replace('/(auth)/sign-in');
        } else if (currentUser && inAuthGroup) {
          router.replace('/(tabs)/history');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/(auth)/sign-in');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const unsubscribe = AuthService.onAuthStateChange((newUser) => {
      setUser(newUser);
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!newUser && !inAuthGroup) {
        router.replace('/(auth)/sign-in');
      } else if (newUser && inAuthGroup) {
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