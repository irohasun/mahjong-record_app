import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { User, Settings, Star, Download, Upload, Shield, Info } from 'lucide-react-native';
import { AccountService } from '@/services/AccountService';
import { MonetizationService } from '@/services/MonetizationService';
import { GameService } from '@/services/GameService';
import { PremiumModal } from '@/components/PremiumModal';

export default function AccountScreen() {
  const [account, setAccount] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      const accountData = await AccountService.getAccount();
      const statsData = await GameService.getPlayerStats(accountData.accountId);
      setAccount(accountData);
      setStats(statsData);
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
      const data = await GameService.exportData(account.accountId);
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
              await GameService.resetData(account.accountId);
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

  const InfoCard = ({ title, value, icon: Icon }: any) => (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Icon size={20} color="#FF6B35" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  if (!account) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>アカウント</Text>
        <View style={styles.planBadge}>
          <Star size={16} color={account.isPremium ? '#FFD700' : '#8E8E93'} />
          <Text style={styles.planText}>
            {account.isPremium ? 'プレミアム' : 'フリー'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={32} color="#FF6B35" />
          </View>
          <View style={styles.userDetails}>
            {editing ? (
              <View style={styles.editingRow}>
                <TextInput
                  style={styles.usernameInput}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholder="ユーザー名"
                />
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleUsernameChange}
                >
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.usernameRow}>
                <Text style={styles.username}>{account.username}</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.editButtonText}>編集</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.accountId}>ID: {account.accountId.slice(0, 8)}...</Text>
            <Text style={styles.createdDate}>
              作成日: {new Date(account.createdDate).toLocaleDateString('ja-JP')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>統計情報</Text>
        <View style={styles.statsGrid}>
          <InfoCard 
            title="総対局数" 
            value={stats?.totalGames || 0} 
            icon={Settings}
          />
          <InfoCard 
            title="平均順位" 
            value={stats?.averageRank?.toFixed(2) || '-'} 
            icon={Info}
          />
        </View>
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
              : '• 月間3対局まで\n• 広告表示あり\n• 基本統計のみ'
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
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B3520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#6D6D70',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '700',
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
});