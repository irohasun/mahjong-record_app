import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, UserPlus, Check } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('入力エラー', 'メールアドレスを入力してください');
      return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('入力エラー', '正しいメールアドレスを入力してください');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('入力エラー', 'パスワードは6文字以上で入力してください');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('入力エラー', 'パスワードが一致しません');
      return false;
    }

    if (!acceptTerms) {
      Alert.alert('確認事項', '利用規約に同意してください');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await AuthService.signUp(email.trim(), password);
      
      Alert.alert(
        'アカウント作成完了',
        'アカウントが作成されました。メールアドレスの確認が完了次第、ログインできます。',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/sign-in')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'アカウント作成に失敗しました');
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
          <View style={styles.logoContainer}>
            <UserPlus size={48} color="#FF6B35" />
          </View>
          <Text style={styles.title}>アカウント作成</Text>
          <Text style={styles.subtitle}>
            メールアドレスとパスワードでアカウントを作成
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

          {/* パスワード入力 */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#6D6D70" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="パスワード（6文字以上）"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
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

          {/* パスワード確認入力 */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#6D6D70" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="パスワード（確認）"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
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

          {/* 利用規約同意 */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
              {acceptTerms && <Check size={16} color="#FFF" />}
            </View>
            <Text style={styles.termsText}>
              <Text style={styles.termsLink}>利用規約</Text>
              と
              <Text style={styles.termsLink}>プライバシーポリシー</Text>
              に同意します
            </Text>
          </TouchableOpacity>

          {/* 登録ボタン */}
          <TouchableOpacity
            style={[styles.signUpButton, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.signUpButtonText}>
              {loading ? 'アカウント作成中...' : 'アカウント作成'}
            </Text>
          </TouchableOpacity>

          {/* ログインリンク */}
          <View style={styles.signInPrompt}>
            <Text style={styles.signInPromptText}>
              すでにアカウントをお持ちの方は{' '}
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
          <Text style={styles.securityTitle}>セキュリティ</Text>
          <Text style={styles.securityText}>
            • パスワードは暗号化して安全に保存されます{'\n'}
            • メールアドレスの確認が必要です{'\n'}
            • 個人情報は適切に保護されます
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
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
    marginBottom: 8,
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
    marginBottom: 16,
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
  eyeIcon: {
    padding: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#6D6D70',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  signUpButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  signUpButtonText: {
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
});