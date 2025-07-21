import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function RootIndex() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // または読み込み画面
  }

  if (user) {
    return <Redirect href="/(tabs)/history" />;
  }

  return <Redirect href="/(auth)/login" />;
}