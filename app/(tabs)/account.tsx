import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Shield, LogOut, Lock, Cloud } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AccountService } from '@/services/AccountService';
import { DeletionService } from '@/services/DeletionService';
// 仕様変更: プラン管理機能は不要のため関連インポートを削除
import { AuthService } from '@/services/AuthService';
// 仕様変更: プレミアム関連UIは不要のため削除
import { supabase } from '@/lib/supabase';
import { LocalStorageService } from '@/services/LocalStorageService';
import { StorageService } from '@/services/StorageService';

export default function AccountScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  // 仕様変更: プラン管理機能削除に伴い状態を削除
  const [user, setUser] = useState<any>(null);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastLoadTimeRef = React.useRef<number>(0);
  const isLoadingRef = React.useRef<boolean>(false);

  /**
   * アカウントデータを読み込む
   * @param isInitialLoad 初回読み込みの場合はtrue
   */
  const loadAccountData = React.useCallback(async (isInitialLoad: boolean = false) => {
    // 重複読み込みを防止
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;

      if (isInitialLoad) {
        setIsLoading(true);

        // 初回読み込み時はキャッシュから即座に表示
        const cachedAccount = await LocalStorageService.getAccount();
        if (cachedAccount) {
          setAccount(cachedAccount);

          setIsLoading(false);
        }
      }

      // AccountService.getAccount()が認証チェックとアカウント取得を同時に行う
      // ensureAuthenticated()の重複呼び出しを削除してパフォーマンスを改善
      const { account: accountData, user: userData } = await AccountService.getAccount(!isInitialLoad);

      setUser(userData);
      setAccount(accountData);
      lastLoadTimeRef.current = Date.now();
    } catch (error) {
      // Error loading account data - fall through to cache
      // エラー時もキャッシュがあれば表示
      if (!account) {
        const cachedAccount = await LocalStorageService.getAccount();
        if (cachedAccount) {
          setAccount(cachedAccount);

          // ユーザー情報のみ取得を試みる（軽量）
          try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
          } catch {
            // 無視
          }
        }
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // 初回マウント時のみ実行
  useEffect(() => {
    loadAccountData(true);
  }, [loadAccountData]);

  // avatar_url が変わったら署名付きURLに変換して表示
  useEffect(() => {
    if (account?.avatar_url) {
      StorageService.getPublicUrl(account.avatar_url)
        .then(url => setAvatarDisplayUrl(url))
        .catch(() => setAvatarDisplayUrl(null));
    } else {
      setAvatarDisplayUrl(null);
    }
  }, [account?.avatar_url]);

  // 画面がフォーカスされた時にデータを再読み込み（キャッシュ有効時は軽量）
  useFocusEffect(
    React.useCallback(() => {
      // 初回ロード後のフォーカス時は常に再読み込みを試みる
      // AccountService.getAccount() がキャッシュを管理するため、
      // キャッシュが有効なら軽量、無効なら（プロフィール更新後など）サーバーから取得
      if (lastLoadTimeRef.current > 0) {
        loadAccountData(false);
      }
    }, [loadAccountData])
  );

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

  const executeAccountDeletion = async () => {
    try {
      Alert.alert('削除中', 'データを削除しています...');

      await DeletionService.deleteAllUserData();
      await AuthService.signOut();

      Alert.alert(
        '削除完了',
        'アカウントとすべてのデータが削除されました。',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                await AuthService.signInAnonymously();
                router.replace('/(tabs)/history');
              } catch {
                router.replace('/(auth)/sign-up');
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

      Alert.alert(
        'エラー',
        `アカウント削除に失敗しました。\n\n詳細: ${errorMessage}\n\nもう一度お試しいただくか、サポートにお問い合わせください。`
      );
    }
  };

  const confirmFinalDeletion = () => {
    Alert.alert(
      '最終確認',
      'すべてのデータが完全に削除されます。\nこの操作は絶対に取り消せません。\n\n本当によろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '完全に削除', style: 'destructive', onPress: executeAccountDeletion }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除の確認',
      '以下のデータが完全に削除されます：\n\n' +
      '• 対局記録（すべての履歴）\n' +
      '• 統計データ\n' +
      '• プロフィール情報\n' +
      '• アカウント情報\n' +
      '• アップロードした写真\n\n' +
      'この操作は取り消せません。\n本当に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: confirmFinalDeletion }
      ]
    );
  };

  const isAnonymousUser = user?.id === 'dummy-user-id' || user?.is_anonymous;

  // 初回読み込み中で、キャッシュもない場合はローディング表示
  if (isLoading && !account) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // アカウントデータがない場合（エラー時など）
  if (!account) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>データの読み込みに失敗しました</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <View style={styles.header} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プロフィール設定</Text>

          {/* プロフィールカード: アバター・名前・ゲストバッジ */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/profile-edit')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.profileAvatar}>
                {avatarDisplayUrl ? (
                  <Image
                    source={{ uri: avatarDisplayUrl }}
                    style={styles.profileAvatarImage}
                  />
                ) : (
                  <User size={24} color="#FF6B35" />
                )}
              </View>
              <View style={styles.menuItemContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.menuItemTitle}>
                    {account.username || '名前未設定'}
                  </Text>
                  {isAnonymousUser && (
                    <Text style={styles.guestBadge}>ゲスト</Text>
                  )}
                </View>
                <Text style={styles.menuItemSubtitle}>プロフィールを編集</Text>
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
          <Text style={styles.sectionTitleSmall}>セキュリティ・プライバシー</Text>

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
            onPress={handleDeleteAccount}
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
  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  dangerText: {
    color: '#EF4444',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  guestBadge: {
    fontSize: 11,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
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