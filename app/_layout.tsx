import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthGuard } from '@/components/AuthGuard';
import { NotificationService } from '@/services/NotificationService';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useRouter, useSegments } from 'expo-router';
import { AuthService } from '@/services/AuthService';
import { View, Text, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);

  const [loaded] = useFonts({
    Inter: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    'Inter-Medium': require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    'Inter-SemiBold': require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    'Inter-Bold': require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 通知サービスの初期化
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log('🔔 DEBUG: Initializing notifications in app layout...');
        await NotificationService.initialize();
      } catch (error) {
        console.error('❌ DEBUG: Failed to initialize notifications in app layout:', error);
      }
    };

    initializeNotifications();
  }, []);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        const inAuthGroup = segments[0] === '(auth)';
        
        if (!user && !inAuthGroup) {
          // ユーザーが認証されていない場合はログイン画面へ
          router.replace('/(auth)/sign-in');
        } else if (user && inAuthGroup) {
          // ユーザーが認証済みで認証画面にいる場合はメイン画面へ
          router.replace('/(tabs)/history');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // エラーの場合はログイン画面へ
        router.replace('/(auth)/sign-in');
      } finally {
        setIsLoading(false);
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
      
      // 認証状態の変更が完了したらローディングを終了
      setIsLoading(false);
    });

    return unsubscribe;
  }, [segments]);

  // ローディング中はローディング画面を表示
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6D6D70' }}>
          読み込み中...
        </Text>
      </View>
    );
  }

  if (!loaded) return null;

  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </AuthGuard>
  );
}
