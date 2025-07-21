import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useRouter, useSegments } from 'expo-router';
import { AuthService } from '@/services/AuthService';

export default function RootLayout() {
  useFrameworkReady();
  
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkAuthState = async () => {
      const user = await AuthService.getCurrentUser();
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!user && !inAuthGroup) {
        // ユーザーが認証されていない場合はログイン画面へ
        router.replace('/(auth)/sign-in');
      } else if (user && inAuthGroup) {
        // ユーザーが認証済みで認証画面にいる場合はメイン画面へ
        router.replace('/(tabs)/history');
      }
    };

    checkAuthState();

    // 認証状態の変更を監視
    const unsubscribe = AuthService.onAuthStateChange((user) => {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/sign-in');
      } else if (user && inAuthGroup) {
        router.replace('/(tabs)/history');
      }
    });

    return unsubscribe;
  }, [segments]);

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
