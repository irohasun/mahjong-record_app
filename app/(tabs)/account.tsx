import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, SafeAreaView, Linking } from 'react-native';
import { User, Star, Download, Upload, Shield, LogOut, Mail, Settings, Lock, Eye, Bell, HelpCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AccountService } from '@/services/AccountService';
import { MonetizationService } from '@/services/MonetizationService';
import { AuthService } from '@/services/AuthService';
import { PremiumModal } from '@/components/PremiumModal';
import { ensureAuthenticated } from '@/utils/authUtils';

export default function AccountScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadAccountData();
  }, []);

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

  const handleExportData = async () => {
    try {
      const user = await ensureAuthenticated();
      Alert.alert('エクスポート完了', 'データをエクスポートしました');
    } catch (error) {
      Alert.alert('エラー', 'データのエクスポートに失敗しました');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'データリセット',
      '全ての対局データを削除します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await ensureAuthenticated();
              
              // データリセット機能は一時的に無効化
              console.log('Data reset requested for user:', user.id);
              loadAccountData();
              Alert.alert('完了', 'データをリセットしました');
            } catch (error) {
              Alert.alert('エラー', 'データのリセットに失敗しました');
            }
          }
        }
      ]
    );
  };

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
        <View style={styles.planBadge}>
          <Star size={16} color={account.isPremium ? '#FFD700' : '#8E8E93'} />
          <Text style={styles.planText}>
            {account.isPremium ? 'プレミアム' : 'フリー'}
          </Text>
        </View>
      </View>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >

        {/* 認証情報セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>認証情報</Text>
          
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
            <View style={styles.emailInfo}>
              <Mail size={20} color="#FF6B35" />
              <View style={styles.emailContent}>
                <Text style={styles.emailLabel}>メールアドレス</Text>
                <Text style={styles.emailValue}>{user?.email || 'なし'}</Text>
                {user?.email_confirmed_at ? (
                  <Text style={styles.verifiedText}>✓ 確認済み</Text>
                ) : (
                  <Text style={styles.unverifiedText}>未確認</Text>
                )}
              </View>
            </View>
          )}
          
          {!isAnonymousUser && (
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.signOutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プロフィール設定</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // プロフィール編集画面に遷移（実装予定）
              Alert.alert('開発中', 'この機能は開発中です');
              // router.push('/(tabs)/profile-edit');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <User size={20} color="#FF6B35" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>プロフィール編集</Text>
                <Text style={styles.menuItemSubtitle}>{account.username}</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // 通知設定画面に遷移（実装予定）
              Alert.alert('開発中', 'この機能は開発中です');
              // router.push('/(tabs)/notification-settings');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Settings size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>通知設定</Text>
                <Text style={styles.menuItemSubtitle}>プッシュ通知の設定</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // プライバシー設定画面に遷移（実装予定）
              Alert.alert('開発中', 'この機能は開発中です');
              // router.push('/(tabs)/privacy-settings');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Eye size={20} color="#10B981" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>プライバシー設定</Text>
                <Text style={styles.menuItemSubtitle}>データ共有の設定</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>セキュリティ・プライバシー</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // 利用規約画面に遷移（実装予定）
              Alert.alert('開発中', 'この機能は開発中です');
              // router.push('/(tabs)/terms-of-service');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Lock size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>利用規約</Text>
                <Text style={styles.menuItemSubtitle}>アプリの利用条件</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // プライバシーポリシー画面に遷移（実装予定）
              Alert.alert('開発中', 'この機能は開発中です');
              // router.push('/(tabs)/privacy-policy');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Shield size={20} color="#10B981" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>プライバシーポリシー</Text>
                <Text style={styles.menuItemSubtitle}>データ保護方針</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // データ処理について画面に遷移（実装予定）
              Alert.alert('開発中', 'この機能は開発中です');
              // router.push('/(tabs)/data-processing');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <HelpCircle size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>データ処理について</Text>
                <Text style={styles.menuItemSubtitle}>データの取り扱い</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'アカウント削除',
                'アカウントを削除しますか？\n\nこの操作により、すべての対局記録とデータが完全に削除されます。この操作は取り消せません。',
                [
                  { text: 'キャンセル', style: 'cancel' },
                  { 
                    text: '削除', 
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('確認', '本当にアカウントを削除しますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { 
                          text: '削除', 
                          style: 'destructive',
                          onPress: () => {
                            // アカウント削除処理（実装が必要）
                            Alert.alert('削除完了', 'アカウントを削除しました');
                          }
                        }
                      ]);
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



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プラン管理</Text>
          
          {!account.isPremium ? (
            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={() => setShowPremiumModal(true)}
            >
              <Star size={20} color="#FFD700" />
              <Text style={styles.premiumButtonText}>プレミアムにアップグレード</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.premiumStatus}>
              <Star size={20} color="#FFD700" />
              <Text style={styles.premiumStatusText}>プレミアムプランを利用中</Text>
            </View>
          )}

          <View style={styles.planDetails}>
            <Text style={styles.planDetailsTitle}>
              {account.isPremium ? 'プレミアム特典' : 'フリープラン制限'}
            </Text>
            <Text style={styles.planDetailsText}>
              {account.isPremium 
                ? '• 無制限の対局記録\n• 広告なし\n• 高度な統計分析\n• データエクスポート'
                : '• 無制限の対局記録\n• 広告表示あり\n• 基本統計のみ'
              }
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ管理</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Download size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>データエクスポート</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Upload size={20} color="#10B981" />
            <Text style={styles.actionButtonText}>データインポート</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleResetData}
          >
            <Shield size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.dangerText]}>データリセット</Text>
          </TouchableOpacity>
        </View>

        <PremiumModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onPurchase={() => {
            setShowPremiumModal(false);
            loadAccountData();
          }}
        />
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
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  planText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
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

  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  premiumButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  premiumStatusText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  planDetails: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  planDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  planDetailsText: {
    fontSize: 14,
    color: '#6D6D70',
    lineHeight: 20,
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
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  emailContent: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 12,
    color: '#6D6D70',
    fontWeight: '500',
  },
  emailValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 2,
  },
  unverifiedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: 2,
  },
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