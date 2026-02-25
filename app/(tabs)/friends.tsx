import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Friend } from '@/types/Friends';
import { FriendRequest } from '@/types/Friends';
import { Group } from '@/types/Groups';
import { FriendService } from '@/services/FriendService';
import { GroupService } from '@/services/GroupService';
import { LocalStorageService } from '@/services/LocalStorageService';
import { onFriendsChanged, onGroupsChanged } from '@/utils/cacheInvalidation';
import { AccordionSection } from '@/components/friends/AccordionSection';
import { FriendsList } from '@/components/friends/FriendsList';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { FriendSearchModal } from '@/components/friends/FriendSearchModal';
import { GroupsList } from '@/components/groups/GroupsList';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const loadFriends = useCallback(async () => {
    try {
      const [friendsList, requests] = await Promise.all([
        FriendService.getFriends(),
        FriendService.getPendingRequests(),
      ]);
      setFriends(friendsList);
      setPendingRequests(requests);
    } catch (error) {
      // silent
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const groupsList = await GroupService.getGroups();
      setGroups(groupsList);
    } catch (error) {
      // silent
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadFriends(), loadGroups()]);
  }, [loadFriends, loadGroups]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // キャッシュ無効化リスナー
  useEffect(() => {
    const unsubFriends = onFriendsChanged(() => {
      LocalStorageService.clearFriendsCache().then(() => loadFriends());
    });
    const unsubGroups = onGroupsChanged(() => {
      LocalStorageService.clearGroupsCache().then(() => loadGroups());
    });
    return () => {
      unsubFriends();
      unsubGroups();
    };
  }, [loadFriends, loadGroups]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      LocalStorageService.clearFriendsCache(),
      LocalStorageService.clearGroupsCache(),
    ]);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleAcceptRequest = useCallback(
    async (request: FriendRequest) => {
      try {
        await FriendService.acceptFriendRequest(request.id);
        await loadFriends();
      } catch (error) {
        Alert.alert('エラー', 'リクエストの承認に失敗しました');
      }
    },
    [loadFriends]
  );

  const handleRejectRequest = useCallback(
    async (request: FriendRequest) => {
      try {
        await FriendService.rejectFriendRequest(request.id);
        await loadFriends();
      } catch (error) {
        Alert.alert('エラー', 'リクエストの拒否に失敗しました');
      }
    },
    [loadFriends]
  );

  const handleRemoveFriend = useCallback(
    async (friend: Friend) => {
      Alert.alert(
        'フレンド削除',
        `${friend.username}をフレンドから削除しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              try {
                await FriendService.removeFriend(friend.id);
                await loadFriends();
              } catch (error) {
                Alert.alert('エラー', '削除に失敗しました');
              }
            },
          },
        ]
      );
    },
    [loadFriends]
  );

  const handleGroupPress = useCallback(
    (group: Group) => {
      router.push({
        pathname: '/(tabs)/group-details',
        params: { groupId: group.id, groupName: group.name },
      });
    },
    [router]
  );

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>フレンド</Text>
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
        {/* フレンドリクエスト */}
        {pendingRequests.length > 0 && (
          <AccordionSection
            title="フレンドリクエスト"
            count={pendingRequests.length}
            defaultExpanded={true}
          >
            {pendingRequests.map((request) => (
              <FriendRequestCard
                key={request.id}
                request={request}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
              />
            ))}
          </AccordionSection>
        )}

        {/* フレンドセクション */}
        <AccordionSection
          title="友達"
          count={acceptedFriends.length}
          onAdd={() => setShowFriendSearch(true)}
          defaultExpanded={true}
        >
          <FriendsList
            friends={acceptedFriends}
            onRemove={handleRemoveFriend}
          />
        </AccordionSection>

        {/* グループセクション */}
        <AccordionSection
          title="参加中のシリーズ"
          count={groups.length}
          onAdd={() => setShowCreateGroup(true)}
          defaultExpanded={true}
        >
          <GroupsList groups={groups} onPress={handleGroupPress} />
        </AccordionSection>
      </ScrollView>

      {/* モーダル */}
      <FriendSearchModal
        visible={showFriendSearch}
        onClose={() => setShowFriendSearch(false)}
        onRequestSent={loadFriends}
      />
      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={loadGroups}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
