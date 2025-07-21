import React from 'react';
import { Redirect } from 'expo-router';
import { AuthService } from '@/services/AuthService';

export default function RootIndex() {
  const [loading, setLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // または読み込み画面
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/history" />;
  }

  return <Redirect href="/(auth)/login" />;
}