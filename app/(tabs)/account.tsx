import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, SafeAreaView } from 'react-native';
import { User, Shield, LogOut, Lock, Cloud, CheckCircle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AccountService } from '@/services/AccountService';
import { DeletionService } from '@/services/DeletionService';
// 仕様変更: プラン管理機能は不要のため関連インポートを削除
import { AuthService } from '@/services/AuthService';
// 仕様変更: プレミアム関連UIは不要のため削除
import { ensureAuthenticated } from '@/utils/authUtils';

export default function AccountScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  // 仕様変更: プラン管理機能削除に伴い状態を削除
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadAccountData();
  }, []);

  // 画面がフォーカスされた時にデータを再読み込み（会員登録後の遷移に対応）
  useFocusEffect(
    React.useCallback(() => {
      loadAccountData();
    }, [])
  );

  const loadAccountData = async () => {
    try {
      const user = await ensureAuthenticated();
      setUser(user);
      const accountData = await AccountService.getAccount();
      setAccount(accountData);
      setNewUsername(accountData.username);
    } catch (error) {
      console.error('Failed to load account data:', error);
    }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) {
      Alert.alert('エラー', 'ユーザー名を入力してください');
      return;
    }

    try {
      await AccountService.updateUsername(newUsername.trim());
      setEditing(false);
      loadAccountData();
      Alert.alert('成功', 'ユーザー名を変更しました');
    } catch (error) {
      Alert.alert('エラー', 'ユーザー名の変更に失敗しました');
    }
  };

  // 仕様変更: データ管理機能（エクスポート/インポート/リセット）は削除

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          }
        }
      ]
    );
  };

  const isAnonymousUser = user?.id === 'dummy-user-id' || user?.is_anonymous;

  if (!account) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <View style={styles.header}>
        <Text style={styles.title}>アカウント</Text>
        {/* 仕様変更: プランバッジは削除 */}
      </View>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プロフィール設定</Text>
          
          {/* 認証情報: ゲスト警告または正式アカウント表示 */}
          {isAnonymousUser ? (
            <View style={styles.anonymousWarning}>
              <Shield size={20} color="#F59E0B" />
              <View style={styles.anonymousWarningContent}>
                <Text style={styles.anonymousWarningTitle}>
                  ゲストアカウントを使用中
                </Text>
                <Text style={styles.anonymousWarningText}>
                  データの永続保存のため、アカウント登録をおすすめします
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.registeredBanner}>
              <CheckCircle size={20} color="#10B981" />
              <View style={styles.registeredBannerContent}>
                <Text style={styles.registeredBannerTitle}>
                  アカウント登録済み
                </Text>
                <Text style={styles.registeredBannerText}>
                  データはクラウドに安全に保存されています
                </Text>
              </View>
            </View>
          )}
          
          {/* 仕様追加: お客様情報（名前・アイコン編集、メール閲覧） */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/profile-edit')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <User size={20} color="#FF6B35" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>お客様情報</Text>
                <Text style={styles.menuItemSubtitle}>名前・アイコン・メール</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          {/* 仕様追加: データをバックアップする（匿名ユーザー向けに会員登録へ遷移） */}
          {isAnonymousUser && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/(auth)/sign-up')}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Cloud size={20} color="#0EA5E9" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>データをバックアップする</Text>
                  <Text style={styles.menuItemSubtitle}>会員登録してクラウドに保存</Text>
                </View>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* 通知設定は不要のため削除しました */}

          {/* プライバシー設定は不要のため削除しました */}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>セキュリティ・プライバシー</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/terms-of-service')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Lock size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>利用規約</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/privacy-policy')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Shield size={20} color="#10B981" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>プライバシーポリシー</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          {/* 仕様変更: データ処理に関する案内リンクは削除 */}

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'アカウント削除',
                'アカウントと全データを削除します。よろしいですか？',
                [
                  { text: 'キャンセル', style: 'cancel' },
                  { 
                    text: '削除', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        // 全データ削除
                        await DeletionService.deleteAllUserData();
                        // サインアウトして新規登録へ
                        await AuthService.signOut();
                        router.replace('/(auth)/sign-up');
                      } catch (error) {
                        Alert.alert('エラー', 'アカウント削除に失敗しました');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <LogOut size={20} color="#EF4444" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, styles.dangerText]}>アカウント削除</Text>
                <Text style={styles.menuItemSubtitle}>アカウントとデータの完全削除</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
        </View>



        {/* 仕様変更: プラン管理は不要のためセクションを削除しました */}

        {/* 仕様変更: データ管理セクション（エクスポート/インポート/リセット）は削除 */}

        {/* 仕様変更: プレミアムモーダルは廃止 */}

        {/* 最下部に独立したログアウト */}
        {!isAnonymousUser && (
          <View style={[styles.section, { marginTop: 12 }]}> 
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.signOutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#6D6D70',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  // 仕様変更: プラン表示関連のスタイルは不要になったため削除可（残骸があれば段階的に整理）
  section: {
    backgroundColor: '#FFF',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B3520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  editingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usernameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  editButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  accountId: {
    fontSize: 14,
    color: '#6D6D70',
    marginTop: 4,
  },
  createdDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  dangerButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerText: {
    color: '#EF4444',
  },
  anonymousWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  anonymousWarningContent: {
    flex: 1,
  },
  anonymousWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  anonymousWarningText: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 20,
  },
  // 登録済みアカウント用のバナー
  registeredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  registeredBannerContent: {
    flex: 1,
  },
  registeredBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  registeredBannerText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  // メールアドレス表示は仕様により削除
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 12,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6D6D70',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '300',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});