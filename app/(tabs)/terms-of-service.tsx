import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

/**
 * 利用規約画面
 * - アカウントタブから遷移して表示します
 * - EXPO_PUBLIC_TOS_URL が設定されていれば WebView で外部の規約URLを表示
 * - 未設定の場合は、アプリ内に用意した文面をスクロール表示します
 */
export default function TermsOfServiceScreen() {
  const router = useRouter();
  const tosUrl = process.env.EXPO_PUBLIC_TOS_URL;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/account')} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={styles.headerSpacer} />
      </View>

      {tosUrl ? (
        <WebView source={{ uri: tosUrl }} style={styles.webview} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>利用規約</Text>
          <Text style={styles.paragraph}>
            本規約は、本アプリの提供条件および運用ポリシーを定めるものです。ユーザーは本アプリを利用することにより、
            本規約に同意したものとみなされます。
          </Text>

          <Text style={styles.sectionTitle}>1. 禁止事項</Text>
          <Text style={styles.paragraph}>
            法令に違反する行為、不正アクセス、リバースエンジニアリング、他者の権利侵害、
            運営の妨害となる行為を禁止します。
          </Text>

          <Text style={styles.sectionTitle}>2. 免責事項</Text>
          <Text style={styles.paragraph}>
            当社は、本アプリの提供、機能、可用性等について、いかなる保証も行いません。ユーザーが本アプリの利用により
            被った損害について、当社は一切の責任を負いません。
          </Text>

          <Text style={styles.sectionTitle}>3. サービスの変更・停止</Text>
          <Text style={styles.paragraph}>
            当社は、事前の通知なく、本アプリの内容の変更・一時停止・終了を行うことがあります。
          </Text>

          <Text style={styles.sectionTitle}>4. 準拠法・裁判管轄</Text>
          <Text style={styles.paragraph}>
            本規約は日本法に準拠し、紛争が生じた場合は日本の裁判所を専属的合意管轄裁判所とします。
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


