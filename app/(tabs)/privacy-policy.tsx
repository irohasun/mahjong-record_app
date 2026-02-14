import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

/**
 * プライバシーポリシー画面
 * - アカウントタブから遷移して表示します
 * - EXPO_PUBLIC_PRIVACY_POLICY_URL が設定されていれば WebView で外部のポリシーURLを表示
 * - 未設定の場合は、アプリ内に用意した文面をスクロール表示します
 *
 * 変更理由:
 * - ユーザーが「プライバシーポリシー」をタップした際に、作成済みのポリシー内容を閲覧できるようにするため
 */
export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const policyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

  return (
    <SafeAreaView style={styles.container}>
      {/* シンプルなヘッダー。戻る操作を提供 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/account')} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 外部URLが設定されていればWebViewで表示 */}
      {policyUrl ? (
        <WebView source={{ uri: policyUrl }} style={styles.webview} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/*
            注意:
            - 下記はアプリ内に同梱する簡易版のプライバシーポリシー文面です。
            - 実運用では、法務確認済みの文章に置き換えてください。
            - 外部ホスティングされたページがある場合は EXPO_PUBLIC_PRIVACY_POLICY_URL を設定してください。
          */}
          <Text style={styles.title}>プライバシーポリシー</Text>
          <Text style={styles.paragraph}>
            本アプリは、ユーザーの皆さまの個人情報の保護を最優先に取り組みます。本ポリシーでは、
            取得する情報、利用目的、保存期間、第三者提供、安全管理措置、利用者の権利、
            お問い合わせ窓口等について定めます。
          </Text>

          <Text style={styles.sectionTitle}>1. 取得する情報</Text>
          <Text style={styles.paragraph}>
            アカウント登録・ログインのためのメールアドレス、分析のための利用状況データ、
            通知機能に必要なトークンなど、アプリ提供に必要な最小限の情報を取得します。
          </Text>

          <Text style={styles.sectionTitle}>2. 利用目的</Text>
          <Text style={styles.paragraph}>
            認証、データ同期、通知配信、機能改善、障害対応、法令遵守のために情報を利用します。
          </Text>

          <Text style={styles.sectionTitle}>3. 保存期間</Text>
          <Text style={styles.paragraph}>
            利用目的の達成に必要な期間、または法令で定められた期間保存します。不要となった情報は
            適切な方法で削除・匿名化します。
          </Text>

          <Text style={styles.sectionTitle}>4. 第三者提供</Text>
          <Text style={styles.paragraph}>
            法令に基づく場合を除き、本人の同意なく第三者に提供しません。業務委託先へ提供する場合は、
            契約等により適切な管理を実施します。
          </Text>

          <Text style={styles.sectionTitle}>5. 安全管理措置</Text>
          <Text style={styles.paragraph}>
            アクセス制御、暗号化、監査ログなど、適切な技術的・組織的安全管理措置を講じます。
          </Text>

          <Text style={styles.sectionTitle}>6. ユーザーの権利</Text>
          <Text style={styles.paragraph}>
            ご本人確認の上、保有個人データの開示、訂正、利用停止、削除等の要請に対応します。
          </Text>

          <Text style={styles.sectionTitle}>7. お問い合わせ</Text>
          <Text style={styles.paragraph}>
            本ポリシーに関するお問い合わせは、アプリ内のお問い合わせ機能またはサポート窓口までご連絡ください。
          </Text>

          <Text style={styles.note}>
            最終更新日: 2025-08-27
          </Text>
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


