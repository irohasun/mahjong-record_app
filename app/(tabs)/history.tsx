import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SectionList, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameService } from '@/services/GameService';
import { GameRecord } from '@/types/GameRecord';
import { GameCard } from '@/components/GameCard';
import { ensureAuthenticated } from '@/utils/authUtils';
import { onGamesChanged, notifyGamesChanged } from '@/utils/cacheInvalidation';

interface GameSection {
  title: string;
  data: GameRecord[];
}

const PAGE_SIZE = 20;
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export default function HistoryScreen() {
  const router = useRouter();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);
  const lastLoadTimeRef = useRef(0);
  const isDirtyRef = useRef(false);

  // ゲームデータ変更の監視
  useEffect(() => {
    const unsubscribe = onGamesChanged(() => {
      isDirtyRef.current = true;
    });
    return unsubscribe;
  }, []);

  const loadGames = useCallback(async (reset: boolean = true) => {
    try {
      const user = await ensureAuthenticated();

      if (reset) {
        pageRef.current = 0;
      }

      const { games: fetchedGames, hasMore: more } = await GameService.getGameSummaries(
        user.id,
        { page: pageRef.current, pageSize: PAGE_SIZE }
      );

      if (reset) {
        setGames(fetchedGames);
      } else {
        setGames((prev) => [...prev, ...fetchedGames]);
      }

      setHasMore(more);
      lastLoadTimeRef.current = Date.now();
      isDirtyRef.current = false;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('匿名ログインに失敗しました')) {
        // Unexpected error
      }
      if (pageRef.current === 0) {
        setGames([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = (now - lastLoadTimeRef.current) > STALE_THRESHOLD;

      if (isDirtyRef.current || (lastLoadTimeRef.current > 0 && isStale)) {
        loadGames();
      }
    }, [loadGames])
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    pageRef.current += 1;
    await loadGames(false);
    setLoadingMore(false);
  }, [hasMore, loadingMore, loadGames]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGames(true);
    setRefreshing(false);
  }, [loadGames]);

  const handleEditGame = useCallback(
    (game: GameRecord) => {
      router.push({
        pathname: '/(tabs)/edit-game',
        params: { gameId: game.id },
      });
    },
    [router]
  );

  const handleDeleteGame = useCallback(
    async (gameId: string, swipeableRef?: React.RefObject<Swipeable | null>) => {
      Alert.alert('', 'この対局履歴を削除しますか？', [
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: () => {
            swipeableRef?.current?.close();
          },
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await ensureAuthenticated();
              await GameService.deleteGame(user.id, gameId);
              notifyGamesChanged();
              await loadGames(true);
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]);
    },
    [loadGames]
  );

  const sections: GameSection[] = React.useMemo(() => {
    const groups: Record<number, GameRecord[]> = {};

    games.forEach((game) => {
      const year = new Date(game.date).getFullYear();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(game);
    });

    return Object.keys(groups)
      .map((y) => parseInt(y, 10))
      .sort((a, b) => b - a)
      .map((year) => ({
        title: `${year}年`,
        data: groups[year].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }));
  }, [games]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>対局履歴を読み込み中...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
        <View style={styles.header}>
          <Text style={styles.title}>履歴</Text>
        </View>

        {games.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>対局記録がありません</Text>
            <Text style={styles.emptySubtitle}>
              対局記録タブから{'\n'}最初の対局を記録しましょう
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GameCard game={item} onEdit={handleEditGame} onDelete={handleDeleteGame} />
            )}
            renderSectionHeader={({ section }) => (
              <Text style={styles.yearTitle}>{section.title}</Text>
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.scrollContent}
            style={styles.gamesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF6B35']}
                tintColor="#FF6B35"
              />
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <Text style={styles.loadingText}>読み込み中...</Text>
                </View>
              ) : (
                <View style={styles.bottomPadding} />
              )
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6D6D70',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  gamesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  yearTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  bottomPadding: {
    height: 20,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
