import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

/**
 * データの取り扱い（データ処理について）画面
 * - EXPO_PUBLIC_DATA_PROCESSING_URL が設定されていれば WebView で外部ページを表示
 * - 未設定の場合はアプリ内文面を表示
 */
export default function DataProcessingScreen() {
  const router = useRouter();
  const dpUrl = process.env.EXPO_PUBLIC_DATA_PROCESSING_URL;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/account')} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>データの取り扱い</Text>
        <View style={styles.headerSpacer} />
      </View>

      {dpUrl ? (
        <WebView source={{ uri: dpUrl }} style={styles.webview} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>データの取り扱いについて</Text>
          <Text style={styles.paragraph}>
            本アプリでは、機能提供と品質改善のために、必要最小限のデータを適切な安全管理措置のもと取り扱います。
          </Text>

          <Text style={styles.sectionTitle}>1. 処理の目的</Text>
          <Text style={styles.paragraph}>
            - アカウント認証・同期
            {'\n'}- 通知機能提供
            {'\n'}- 統計・利便性向上のための分析
          </Text>

          <Text style={styles.sectionTitle}>2. データの最小化</Text>
          <Text style={styles.paragraph}>
            目的達成に必要なデータのみ収集・保存します。不要となった情報は削除または匿名化します。
          </Text>

          <Text style={styles.sectionTitle}>3. 保管と安全管理</Text>
          <Text style={styles.paragraph}>
            アクセス制御、暗号化、監査ログなどの適切な措置を講じ、データの機密性・完全性・可用性を保護します。
          </Text>

          <Text style={styles.sectionTitle}>4. 第三者提供</Text>
          <Text style={styles.paragraph}>
            法令に基づく場合を除き、本人の同意なく第三者に提供いたしません。業務委託先には契約により適切な管理を義務付けます。
          </Text>

          <Text style={styles.note}>最終更新日: 2025-08-27</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 16,
  },
});


