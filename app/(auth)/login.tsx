import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInAnonymously } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        '❌ 入力エラー', 
        'ログインに必要な情報を入力してください\n\n• メールアドレス\n• パスワード'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('Starting login process for:', email.trim());
      await signIn(email.trim(), password);
      console.log('Login successful, redirecting to app');
      
      Alert.alert(
        '✅ ログイン成功！',
        `おかえりなさい！\n\n📧 ${email.trim()}\n\nアプリにログインしました。`,
        [
          { 
            text: '📱 アプリを開く', 
            onPress: () => router.replace('/(tabs)/history'),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Login error:', error);
      
      let errorTitle = '❌ ログインエラー';
      let errorMessage = 'ログインに失敗しました';
      
      if (error instanceof Error) {
        if (error.message.includes('メールアドレスまたはパスワードが正しくありません')) {
          errorTitle = '🔐 ログイン情報エラー';
          errorMessage = 'ログインできませんでした\n\n考えられる原因：\n• メールアドレスまたはパスワードが間違っている\n• アカウントがまだ作成されていない\n• メールアドレスが確認されていない\n\n解決方法：\n• 入力内容を確認してください\n• アカウントを持っていない場合は新規登録してください';
        } else if (error.message.includes('メールアドレスが確認されていません')) {
          errorTitle = '📧 メール確認エラー';
          errorMessage = 'アカウントが確認されていません\n\n登録時に送信された確認メールから\nアカウントを有効化してください';
        } else if (error.message.includes('ログイン試行回数が上限に達しました')) {
          errorTitle = '⏰ アクセス制限';
          errorMessage = 'ログイン試行回数が上限に達しました\n\nしばらく時間をおいてから再度お試しください';
        } else if (error.message.includes('Email not confirmed')) {
          errorTitle = '📧 メール確認エラー';
          errorMessage = 'アカウントが確認されていません\n\n登録時に送信された確認メールから\nアカウントを有効化してください';
        } else if (error.message.includes('Too many requests')) {
          errorTitle = '⏰ アクセス制限';
          errorMessage = 'ログイン試行回数が上限に達しました\n\nしばらく時間をおいてから再度お試しください';
        } else {
          errorMessage = `予期しないエラーが発生しました\n\nエラー詳細：\n${error.message}\n\n解決方法：\n• アカウントがない場合は新規登録してください\n• Supabase設定を確認してください`;
        }
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: '🔄 再試行', style: 'default' },
          { 
            text: '👤 新規登録', 
            onPress: () => router.push('/(auth)/signup'),
            style: 'cancel'
          },
          { 
            text: '🔑 パスワードリセット', 
            onPress: () => router.push('/(auth)/forgot-password'),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      console.log('Starting guest login process');
      await signInAnonymously();
      console.log('Guest login successful');
      
      Alert.alert(
        '👤 ゲストログイン完了',
        'ゲストとしてアプリを利用できます\n\n⚠️ 注意：データは一時的に保存されます\nアカウント作成をお勧めします',
        [
          { 
            text: '📱 アプリを開始', 
            onPress: () => router.replace('/(tabs)/history'),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Guest login error:', error);
      Alert.alert(
        '❌ ゲストログインエラー', 
        'ゲストログインに失敗しました\n\nネットワーク接続を確認して\n再度お試しください'
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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ログイン</Text>
          <Text style={styles.subtitle}>麻雀記録アプリにログインしましょう</Text>
        </View>

        <View style={styles.form}>
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
              placeholder="パスワード"
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

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.guestButton}
            onPress={handleGuestLogin}
            disabled={loading}
          >
            <Text style={styles.guestButtonText}>ゲストとして続行</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.signupContainer}
            onPress={() => router.push('/(auth)/signup')}
          >
            <UserPlus size={16} color="#FF6B35" />
            <Text style={styles.signupText}>アカウントをお持ちでない方</Text>
            <Text style={styles.signupLink}>新規登録</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>パスワードを忘れた方</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
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
  loginButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  guestButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  guestButtonText: {
    color: '#6D6D70',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  signupText: {
    fontSize: 14,
    color: '#6D6D70',
  },
  signupLink: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  forgotPassword: {
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#8E8E93',
    textDecorationLine: 'underline',
  },
});