import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, ArrowLeft, Key } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('入力エラー', 'メールアドレスを入力してください');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('入力エラー', '正しいメールアドレスを入力してください');
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword(email.trim());
      setEmailSent(true);
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'パスワードリセットに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    handleResetPassword();
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Mail size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>メールを送信しました</Text>
          <Text style={styles.successDescription}>
            {email} にパスワードリセット用のリンクを送信しました。
            メールをご確認いただき、指示に従ってパスワードをリセットしてください。
          </Text>
          
          <View style={styles.successActions}>
            <TouchableOpacity style={styles.resendButton} onPress={handleResendEmail}>
              <Text style={styles.resendButtonText}>メールを再送信</Text>
            </TouchableOpacity>
            
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity style={styles.backButton}>
                <Text style={styles.backButtonText}>ログイン画面に戻る</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.emailNote}>
            <Text style={styles.emailNoteTitle}>メールが届かない場合</Text>
            <Text style={styles.emailNoteText}>
              • 迷惑メールフォルダをご確認ください{'\n'}
              • メールアドレスに間違いがないかご確認ください{'\n'}
              • 数分待ってから再度お試しください
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>パスワードリセット</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Key size={48} color="#FF6B35" />
            </View>
            <Text style={styles.title}>パスワードを忘れた方</Text>
            <Text style={styles.subtitle}>
              ご登録のメールアドレスを入力してください。
              パスワードリセット用のリンクをお送りします。
            </Text>
          </View>

          <View style={styles.form}>
            {/* メールアドレス入力 */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Mail size={20} color="#6D6D70" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* リセットボタン */}
            <TouchableOpacity
              style={[styles.resetButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>
                {loading ? 'メール送信中...' : 'パスワードリセットメールを送信'}
              </Text>
            </TouchableOpacity>

            {/* ログインリンク */}
            <View style={styles.signInPrompt}>
              <Text style={styles.signInPromptText}>
                パスワードを思い出した方は{' '}
              </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text style={styles.signInLink}>ログイン</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* セキュリティ情報 */}
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>セキュリティについて</Text>
            <Text style={styles.securityText}>
              • リセットリンクは24時間有効です{'\n'}
              • リンクは1回のみ使用可能です{'\n'}
              • 安全な場所でパスワードを変更してください
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  content: {
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B3520',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 12,
  },
  resetButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPromptText: {
    fontSize: 14,
    color: '#6D6D70',
  },
  signInLink: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  securityInfo: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#6D6D70',
    lineHeight: 20,
  },
  // 成功画面のスタイル
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  successActions: {
    width: '100%',
    marginBottom: 30,
  },
  resendButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  resendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '500',
  },
  emailNote: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  emailNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emailNoteText: {
    fontSize: 14,
    color: '#6D6D70',
    lineHeight: 20,
  },
});