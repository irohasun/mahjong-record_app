import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  fallbackPath?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  requiredPermissions = [],
  fallbackPath = '/(auth)/login'
}: AuthGuardProps) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (requireAuth && !user) {
    return <Redirect href={fallbackPath} />;
  }

  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );

    if (!hasRequiredPermissions) {
      return (
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>アクセス権限がありません</Text>
          <Text style={styles.accessDeniedMessage}>
            この機能を使用するには適切な権限が必要です。
          </Text>
        </View>
      );
    }
  }

  return <>{children}</>;
}

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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
    lineHeight: 24,
  },
});