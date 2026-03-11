import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Settings, UserPlus, Swords, Camera, Pencil, Calendar, Flag, Trophy, Target } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '@/services/StorageService';
import { supabase } from '@/lib/supabase';
import { GroupDetails } from '@/types/Groups';
import { GroupStatistics as GroupStatisticsType } from '@/types/Groups';
import { GroupService } from '@/services/GroupService';
import { FriendService } from '@/services/FriendService';
import { GroupMatchModal } from '@/components/groups/GroupMatchModal';
import { ScoreChart } from '@/components/groups/ScoreChart';
import { MemberRankingList } from '@/components/groups/MemberRanking';


export default function GroupDetailsScreen() {
  const router = useRouter();
  const { groupId, groupName } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
  }>();

  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [statistics, setStatistics] = useState<GroupStatisticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);


  const loadData = useCallback(async () => {
    if (!groupId) return;

    try {
      const [groupDetails, groupStats] = await Promise.all([
        GroupService.getGroupDetails(groupId),
        GroupService.getGroupStatistics(groupId),
      ]);

      setDetails(groupDetails);
      setStatistics(groupStats);

      // オーナーチェック
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && groupDetails) {
        setIsOwner(groupDetails.ownerId === user.id);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      Alert.alert('エラー', 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddMember = useCallback(async () => {
    if (!groupId) return;

    // フレンドリストからメンバーを追加するシンプルなフロー
    try {
      const friends = await FriendService.getFriends();
      const existingMemberIds = new Set(
        details?.members.map((m) => m.memberId) ?? []
      );
      const availableFriends = friends.filter(
        (f) => f.status === 'accepted' && !existingMemberIds.has(f.friendId)
      );

      if (availableFriends.length === 0) {
        Alert.alert('', '追加できるフレンドがいません');
        return;
      }

      // シンプルなアラートで選択
      const buttons: { text: string; onPress?: () => void; style?: string }[] =
        availableFriends.slice(0, 5).map((friend) => ({
          text: friend.username,
          onPress: () => {
            (async () => {
              try {
                await GroupService.addMember(groupId, friend.friendId);
                await loadData();
                Alert.alert('追加完了', `${friend.username}をメンバーに追加しました`);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'メンバーの追加に失敗しました';
                Alert.alert('エラー', message);
              }
            })();
          },
        }));

      buttons.push({ text: 'キャンセル', style: 'cancel' });

      Alert.alert('メンバーを追加', 'フレンドを選択してください', buttons as any);
    } catch (error) {
      Alert.alert('エラー', 'フレンドリストの取得に失敗しました');
    }
  }, [groupId, details, loadData]);

  const handleRenameGroup = useCallback(() => {
    Alert.prompt(
      'グループ名を変更',
      '',
      (newName) => {
        const trimmed = newName?.trim();
        if (!trimmed) return;
        GroupService.updateGroup(groupId!, { name: trimmed })
          .then(loadData)
          .catch(() => Alert.alert('エラー', 'グループ名の変更に失敗しました'));
      },
      'plain-text',
      details?.name ?? ''
    );
  }, [groupId, details, loadData]);

  const handleChangeGroupPhoto = useCallback(async () => {
    if (!groupId || !isOwner) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限が必要', '写真へのアクセス権限が必要です');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const localUri = result.assets[0].uri;
      setLocalAvatarUri(localUri);
      setUploadingPhoto(true);
      try {
        const storagePath = await StorageService.uploadGroupPhoto(groupId, localUri);
        await GroupService.updateGroup(groupId, { avatarUrl: storagePath });
        await loadData();
        setLocalAvatarUri(null);
      } catch {
        setLocalAvatarUri(null);
        Alert.alert('エラー', 'アイコンのアップロードに失敗しました');
      } finally {
        setUploadingPhoto(false);
      }
    } catch {
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  }, [groupId, isOwner, loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/friends')}>
            <ArrowLeft size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>グループ</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>グループが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/friends')}>
          <ArrowLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerTitleRow} onPress={handleRenameGroup} disabled={!isOwner}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {details.name}
          </Text>
          {isOwner && <Pencil size={14} color="#1C1C1E" />}
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {isOwner && (
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleChangeGroupPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto && !localAvatarUri ? (
                <ActivityIndicator size="small" color="#FF6B35" />
              ) : localAvatarUri || details.avatarUrl ? (
                <Image
                  source={{ uri: (localAvatarUri ?? details.avatarUrl)! }}
                  style={styles.photoThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <Camera size={20} color="#FF6B35" />
              )}
            </TouchableOpacity>
          )}
          {details.members.length >= 3 && currentUserId && (
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowMatchModal(true)}>
              <View style={styles.swordsContainer}>
                <Swords size={20} color="#FF6B35" />
                <Text style={styles.swordsPlusBadge}>+</Text>
              </View>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity style={styles.iconButton} onPress={handleAddMember}>
              <UserPlus size={20} color="#FF6B35" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B35"
          />
        }
      >
        {/* コンパクト統計グリッド */}
        {statistics && (
          <>
          <Text style={styles.sectionTitle}>個人成績</Text>
          <View style={styles.compactGrid}>
            <View style={styles.compactCard}>
              <View style={[styles.compactIcon, { backgroundColor: '#FF6B3520' }]}>
                <Calendar size={18} color="#FF6B35" />
              </View>
              <View style={styles.compactTextGroup}>
                <Text style={styles.compactValue}>{details.gameCount}</Text>
                <Text style={styles.compactLabel}>総対局数</Text>
              </View>
            </View>
            <View style={styles.compactCard}>
              <View style={[styles.compactIcon, { backgroundColor: '#3B82F620' }]}>
                <Flag size={18} color="#3B82F6" />
              </View>
              <View style={styles.compactTextGroup}>
                <Text style={styles.compactValue}>{statistics.averageRank.toFixed(2)}</Text>
                <Text style={styles.compactLabel}>平均順位</Text>
              </View>
            </View>
            <View style={styles.compactCard}>
              <View style={[styles.compactIcon, { backgroundColor: '#10B98120' }]}>
                <Trophy size={18} color="#10B981" />
              </View>
              <View style={styles.compactTextGroup}>
                <Text style={styles.compactValue}>
                  {statistics.rankDistribution.find(r => r.rank === 1)?.percentage
                    ? `${statistics.rankDistribution.find(r => r.rank === 1)!.percentage.toFixed(1)}%`
                    : '-'}
                </Text>
                <Text style={styles.compactLabel}>1位率</Text>
              </View>
            </View>
            <View style={styles.compactCard}>
              <View style={[styles.compactIcon, { backgroundColor: '#F59E0B20' }]}>
                <Target size={18} color="#F59E0B" />
              </View>
              <View style={styles.compactTextGroup}>
                <Text style={styles.compactValue}>
                  {statistics.totalScore > 0 ? `+${statistics.totalScore}` : `${statistics.totalScore}`}
                </Text>
                <Text style={styles.compactLabel}>合計収支</Text>
              </View>
            </View>
          </View>
          </>
        )}


        {/* 統計 */}
        {statistics ? (
          <>
            <MemberRankingList rankings={statistics.memberRankings} />
            <ScoreChart scoreHistory={statistics.scoreHistory} memberRankings={statistics.memberRankings} />
          </>
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>
              まだ対局データがありません
            </Text>
            <Text style={styles.noDataSubText}>
              対局をグループに紐づけると統計が表示されます
            </Text>
          </View>
        )}
      </ScrollView>

      {currentUserId && details && (
        <GroupMatchModal
          visible={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          members={details.members}
          currentUserId={currentUserId}
          groupId={groupId!}
          groupName={details.name}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minWidth: 36,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
  },
  swordsContainer: {
    position: 'relative',
  },
  swordsPlusBadge: {
    position: 'absolute',
    right: -5,
    top: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    lineHeight: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    marginTop: 4,
  },
  compactTextGroup: {
    flex: 1,
    alignItems: 'center',
  },
  compactValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  compactLabel: {
    fontSize: 11,
    color: '#6D6D70',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  photoButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  noDataCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  noDataSubText: {
    fontSize: 13,
    color: '#AEAEB2',
    marginTop: 4,
    textAlign: 'center',
  },
});
