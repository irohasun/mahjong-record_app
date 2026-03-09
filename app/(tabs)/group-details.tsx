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
import { ArrowLeft, Settings, UserPlus, Swords, Camera, Users, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '@/services/StorageService';
import { supabase } from '@/lib/supabase';
import { GroupDetails } from '@/types/Groups';
import { GroupStatistics as GroupStatisticsType } from '@/types/Groups';
import { GroupService } from '@/services/GroupService';
import { FriendService } from '@/services/FriendService';
import { GroupStatisticsView } from '@/components/groups/GroupStatistics';
import { GroupMatchModal } from '@/components/groups/GroupMatchModal';
import { ScoreChart } from '@/components/groups/ScoreChart';
import { MemberRankingList } from '@/components/groups/MemberRanking';
import PlayerAvatar from '@/components/PlayerAvatar';

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

      setUploadingPhoto(true);
      try {
        const storagePath = await StorageService.uploadGroupPhoto(groupId, result.assets[0].uri);
        await GroupService.updateGroup(groupId, { avatarUrl: storagePath });
        await loadData();
      } catch {
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {details.name}
        </Text>
        <View style={styles.headerRight}>
          {details.members.length >= 3 && currentUserId && (
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowMatchModal(true)}>
              <View style={styles.swordsContainer}>
                <Swords size={20} color="#FF6B35" />
                <Text style={styles.swordsPlusBadge}>+</Text>
              </View>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity style={styles.iconButton} onPress={handleRenameGroup}>
              <Pencil size={20} color="#FF6B35" />
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleChangeGroupPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FF6B35" />
              ) : (
                <Camera size={20} color="#FF6B35" />
              )}
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
        {/* グループ情報 */}
        <View style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            {/* 左: グループアバター */}
            <View style={styles.avatarSide}>
              {details.avatarUrl ? (
                <Image source={{ uri: details.avatarUrl }} style={styles.groupAvatar} />
              ) : (
                <View style={[styles.groupAvatar, styles.groupAvatarPlaceholder]}>
                  <Users size={28} color="#8E8E93" />
                </View>
              )}
            </View>
            {/* 右: メンバー・対局数 */}
            <View style={styles.infoSide}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>メンバー</Text>
                <View style={styles.memberRight}>
                  {details.members.slice(0, 5).map((member, i) => (
                    <View key={member.memberId} style={i > 0 ? styles.avatarOverlap : undefined}>
                      <PlayerAvatar name={member.username} avatarUrl={member.avatarUrl} size={36} />
                    </View>
                  ))}
                  <Text style={[styles.infoValue, styles.memberCount]}>{details.memberCount}人</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>対局数</Text>
                <Text style={styles.infoValue}>{details.gameCount}戦</Text>
              </View>
            </View>
          </View>
          {details.description ? (
            <Text style={styles.descriptionText}>{details.description}</Text>
          ) : null}
        </View>

        {/* 統計 */}
        {statistics ? (
          <>
            <GroupStatisticsView statistics={statistics} />
            <ScoreChart scoreHistory={statistics.scoreHistory} />
            <MemberRankingList rankings={statistics.memberRankings} />
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
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginHorizontal: 8,
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
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  avatarSide: {
    flexShrink: 0,
  },
  infoSide: {
    flex: 1,
  },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  groupAvatarPlaceholder: {
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  memberCount: {
    marginLeft: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6D6D70',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
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
