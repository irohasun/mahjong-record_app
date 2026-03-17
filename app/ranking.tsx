import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy, Users } from 'lucide-react-native';
import { AccountService } from '@/services/AccountService';
import { FriendService } from '@/services/FriendService';
import { StorageService } from '@/services/StorageService';

type GameMode = '4p' | '3p';

interface PlayerEntry {
  id: string;
  username: string;
  avatarUrl?: string;
  resolvedAvatarUrl?: string;
  rating4p: number;
  rating3p: number;
}

interface RankedPlayer {
  id: string;
  username: string;
  resolvedAvatarUrl?: string;
  rating: number;
  rank: number;
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#8E8E93';
}

function getInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

function AvatarBadge({ username, rank, avatarUrl }: { username: string; rank: number; avatarUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!avatarUrl && !imgError;

  return (
    <View style={styles.avatar}>
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatarImage}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={styles.avatarText}>{getInitial(username)}</Text>
      )}
    </View>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const color = getRankColor(rank);
  if (rank <= 3) {
    return (
      <View style={[styles.rankBadge, { backgroundColor: color + '25' }]}>
        <Trophy size={16} color={color} />
      </View>
    );
  }
  return (
    <View style={[styles.rankBadge, { backgroundColor: '#F2F2F7' }]}>
      <Text style={[styles.rankBadgeText, { color: '#8E8E93' }]}>{rank}</Text>
    </View>
  );
}

export default function RankingScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>('4p');
  const [allPlayers, setAllPlayers] = useState<PlayerEntry[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [myRating, setMyRating] = useState({ rating4p: 1500, rating3p: 1500 });
  const [myUsername, setMyUsername] = useState('自分');
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const [allRatingsResult, ratingResult, accountResult, friendsResult] = await Promise.allSettled([
      AccountService.getAllRatings(),
      AccountService.getMyRating(),
      AccountService.getAccount(),
      FriendService.getFriends(),
    ]);

    if (allRatingsResult.status === 'fulfilled') {
      const players = allRatingsResult.value;
      // アバターURLを並列で解決（ネットワークラウンドトリップを最小化）
      const resolved = await Promise.all(
        players.map(async (p) => {
          if (!p.avatarUrl) return p;
          const url = await StorageService.getPublicUrl(p.avatarUrl);
          return { ...p, resolvedAvatarUrl: url ?? undefined };
        })
      );
      setAllPlayers(resolved);
    }
    if (ratingResult.status === 'fulfilled') {
      setMyRating(ratingResult.value);
    }
    if (accountResult.status === 'fulfilled') {
      const currentId = accountResult.value.account.id;
      setMyUsername(accountResult.value.account.username);
      setMyId(currentId);

      if (friendsResult.status === 'fulfilled') {
        const ids = new Set(
          friendsResult.value.map((f) =>
            f.friendId === currentId ? f.userId : f.friendId
          )
        );
        setFriendIds(ids);
      }
    }

    const anyFailed =
      allRatingsResult.status === 'rejected' ||
      ratingResult.status === 'rejected' ||
      accountResult.status === 'rejected';
    if (anyFailed) {
      setLoadError(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentRating = mode === '4p' ? myRating.rating4p : myRating.rating3p;

  const denseRank = <T extends { rating: number }>(items: T[]): (T & { rank: number })[] => {
    const sorted = [...items].sort((a, b) => b.rating - a.rating);
    let currentRank = 1;
    return sorted.map((item, i) => {
      if (i > 0 && item.rating < sorted[i - 1].rating) {
        currentRank = i + 1;
      }
      return { ...item, rank: currentRank };
    });
  };

  const playerEntries = allPlayers.map((p) => ({
    id: p.id,
    username: p.username,
    resolvedAvatarUrl: p.resolvedAvatarUrl,
    rating: mode === '4p' ? p.rating4p : p.rating3p,
  }));

  // 自分がallPlayersに含まれていない場合は追加
  const meInList = playerEntries.some((p) => p.id === myId);
  const fullEntries = meInList
    ? playerEntries
    : [{ id: myId, username: myUsername, resolvedAvatarUrl: undefined as string | undefined, rating: currentRating }, ...playerEntries];

  const rankedPlayers: RankedPlayer[] = denseRank(fullEntries);
  const myRank = rankedPlayers.find((e) => e.id === myId)?.rank ?? 1;
  const totalCount = rankedPlayers.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>レーティングランキング</Text>
        <View style={styles.backButton} />
      </View>

      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, mode === '4p' && styles.tabActive]}
          onPress={() => setMode('4p')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, mode === '4p' && styles.tabTextActive]}>4人麻雀</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === '3p' && styles.tabActive]}
          onPress={() => setMode('3p')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, mode === '3p' && styles.tabTextActive]}>3人麻雀</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : loadError ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>データの取得に失敗しました</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 自分の位置カード */}
          <View style={styles.myPositionCard}>
            <Text style={styles.myPositionLabel}>あなたの順位</Text>
            <View style={styles.myPositionRow}>
              <Text style={styles.myPositionRank}>
                {myRank}位 <Text style={styles.myPositionTotal}>/ {totalCount}人</Text>
              </Text>
              <Text style={styles.myPositionRating}>{currentRating}</Text>
            </View>
          </View>

          {/* 全体ランキングリスト */}
          <Text style={styles.sectionLabel}>全体ランキング</Text>
          {rankedPlayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>プレイヤーのレーティングデータがありません</Text>
            </View>
          ) : (
            rankedPlayers.map((player) => {
              const isMe = player.id === myId;
              return (
                <View key={player.id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                  <RankBadge rank={player.rank} />
                  <AvatarBadge username={player.username} rank={player.rank} avatarUrl={player.resolvedAvatarUrl} />
                  <View style={styles.nameContainer}>
                    <Text style={styles.rankUsername} numberOfLines={1}>
                      {player.username}
                    </Text>
                    {!isMe && friendIds.has(player.id) && (
                      <Users size={16} color="#007AFF" />
                    )}
                  </View>
                  <Text style={styles.rankRating}>{player.rating}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  myPositionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myPositionLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  myPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myPositionRank: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  myPositionTotal: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8E8E93',
  },
  myPositionRating: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rankRowMe: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF8F5',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    flexShrink: 1,
  },
  rankUsernameMe: {
    color: '#FF6B35',
  },
  meBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  rankRating: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  rankRatingMe: {
    color: '#FF6B35',
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
