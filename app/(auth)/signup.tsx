import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !username.trim()) {
      Alert.alert(
        '❌ 入力エラー', 
        'すべての項目を入力してください\n\n• メールアドレス\n• パスワード\n• パスワード確認\n• ユーザー名'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        '❌ 入力エラー', 
        'パスワードが一致しません\n\nパスワードとパスワード確認欄に同じ内容を入力してください'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        '❌ 入力エラー', 
        'パスワードは6文字以上で入力してください\n\n現在の文字数: ' + password.length + '文字'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process with:', { email: email.trim(), username: username.trim() });
      
      const result = await signUp(email.trim(), password, {
        username: username.trim(),
        display_name: username.trim(),
      });
      
      console.log('Signup completed successfully:', result);
      
      Alert.alert(
        '✅ 登録完了！',
        `おめでとうございます！\n\nアカウントが正常に作成されました：\n\n📧 メール: ${email.trim()}\n👤 ユーザー名: ${username.trim()}\n\nアプリの利用を開始できます。`,
        [
          { 
            text: '🎉 アプリを開始', 
            onPress: () => router.replace('/(tabs)/history'),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);
      
      let errorTitle = '❌ 登録エラー';
      let errorMessage = 'アカウント作成に失敗しました';
      
      if (error instanceof Error) {
        // エラーメッセージを詳細に分析
        if (error.message.includes('Email address is invalid')) {
          errorTitle = '📧 メールアドレスエラー';
          errorMessage = 'メールアドレスの形式が正しくありません\n\n正しい形式：example@example.com';
        } else if (error.message.includes('Password should be at least')) {
          errorTitle = '🔒 パスワードエラー';
          errorMessage = 'パスワードは6文字以上で入力してください';
        } else if (error.message.includes('User already registered')) {
          errorTitle = '👤 アカウント重複エラー';
          errorMessage = `このメールアドレスは既に登録されています\n\n📧 ${email.trim()}\n\nログイン画面から既存アカウントでログインしてください`;
        } else if (error.message.includes('Supabase')) {
          errorTitle = '🔧 システムエラー';
          errorMessage = 'データベース接続でエラーが発生しました\n\nしばらく時間をおいてから再度お試しください';
        } else {
          errorMessage = `エラー詳細：\n${error.message}\n\n問題が続く場合は、入力内容を確認してください`;
        }
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: '🔄 再試行', style: 'default' },
          { 
            text: '📝 ログイン画面へ', 
            onPress: () => router.replace('/(auth)/login'),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FF6B35" />
          </TouchableOpacity>
          <Text style={styles.title}>新規登録</Text>
          <Text style={styles.subtitle}>麻雀記録アプリのアカウントを作成</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <User size={20} color="#6D6D70" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="ユーザー名"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

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
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#6D6D70" />
            </View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="パスワード（6文字以上）"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#6D6D70" />
              ) : (
                <Eye size={20} color="#6D6D70" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#6D6D70" />
            </View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="パスワード確認"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#6D6D70" />
              ) : (
                <Eye size={20} color="#6D6D70" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? '登録中...' : 'アカウント作成'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.loginContainer}
            onPress={() => router.replace('/(auth)/login')}
          >
            <User size={16} color="#FF6B35" />
            <Text style={styles.loginText}>既にアカウントをお持ちの方</Text>
            <Text style={styles.loginLink}>ログイン</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  signupButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6D6D70',
  },
  loginLink: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
});