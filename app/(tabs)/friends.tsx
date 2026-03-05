import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';
import { Friend, FriendRequest } from '@/types/Friends';
import { Group, GroupInvitation } from '@/types/Groups';
import { FriendService } from '@/services/FriendService';
import { GroupService } from '@/services/GroupService';
import { LocalStorageService } from '@/services/LocalStorageService';
import { onFriendsChanged, onGroupsChanged } from '@/utils/cacheInvalidation';
import { AccordionSection } from '@/components/friends/AccordionSection';
import { FriendsList } from '@/components/friends/FriendsList';
import { FriendSearchModal } from '@/components/friends/FriendSearchModal';
import { RequestsContainer } from '@/components/friends/RequestsContainer';
import { RatingContainer } from '@/components/friends/RatingContainer';
import { GroupsList } from '@/components/groups/GroupsList';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { AccountService } from '@/services/AccountService';

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [groupInvitations, setGroupInvitations] = useState<GroupInvitation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [myRating, setMyRating] = useState({ rating4p: 1500, rating3p: 1500 });
  const [refreshing, setRefreshing] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [isAnonymousUser, setIsAnonymousUser] = useState<boolean | null>(null);

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
      const [groupsList, invitations] = await Promise.all([
        GroupService.getGroups(),
        GroupService.getPendingInvitations(),
      ]);
      setGroups(groupsList);
      setGroupInvitations(invitations);
    } catch (error) {
      // silent
    }
  }, []);

  const loadMyRating = useCallback(async () => {
    try {
      const rating = await AccountService.getMyRating();
      setMyRating(rating);
    } catch (error) {
      // silent
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadFriends(), loadGroups(), loadMyRating()]);
  }, [loadFriends, loadGroups, loadMyRating]);

  useFocusEffect(
    useCallback(() => {
      AuthService.getCurrentUser().then((user) => {
        const isAnon = !user || user.is_anonymous === true || user.id === 'dummy-user-id';
        setIsAnonymousUser(isAnon);
      });
    }, [])
  );

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
        await LocalStorageService.clearFriendsCache();
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

  const handleAcceptInvitation = useCallback(
    async (invitation: GroupInvitation) => {
      try {
        await GroupService.acceptInvitation(invitation.id);
        await loadGroups();
      } catch (error) {
        Alert.alert('エラー', '招待の承認に失敗しました');
      }
    },
    [loadGroups]
  );

  const handleRejectInvitation = useCallback(
    async (invitation: GroupInvitation) => {
      try {
        await GroupService.rejectInvitation(invitation.id);
        setGroupInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
      } catch (error) {
        Alert.alert('エラー', '招待の拒否に失敗しました');
      }
    },
    []
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

  if (isAnonymousUser === null) {
    return null;
  }

  if (isAnonymousUser) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.gateContainer}>
          <Users size={64} color="#FF6B35" />
          <Text style={styles.gateTitle}>フレンド・シリーズ機能</Text>
          <Text style={styles.gateDescription}>
            フレンドを追加したり、シリーズで友達と対局を管理するには会員登録が必要です
          </Text>
          <TouchableOpacity
            style={styles.gateButton}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text style={styles.gateButtonText}>会員登録をする</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gateLinkButton}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.gateLinkText}>ログインはこちら</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
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
        {/* レーティングコンテナ */}
        <RatingContainer
          rating4p={myRating.rating4p}
          rating3p={myRating.rating3p}
          onPressRanking={() => router.push('/ranking')}
        />

        {/* リクエストコンテナ（フレンド＆シリーズ招待） */}
        <RequestsContainer
          friendRequests={pendingRequests}
          groupInvitations={groupInvitations}
          onAcceptFriend={handleAcceptRequest}
          onRejectFriend={handleRejectRequest}
          onAcceptInvitation={handleAcceptInvitation}
          onRejectInvitation={handleRejectInvitation}
        />

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
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  gateDescription: {
    fontSize: 15,
    color: '#6C6C70',
    textAlign: 'center',
    lineHeight: 22,
  },
  gateButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  gateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  gateLinkButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  gateLinkText: {
    color: '#FF6B35',
    fontSize: 15,
  },
});
