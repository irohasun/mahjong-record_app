import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { Calendar, Trash2, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/GameService';
import { AuthService } from '@/services/AuthService';
import { GameRecord } from '@/types/GameRecord';
import { ensureAuthenticated } from '@/utils/authUtils';

interface GameGroup {
  year: number;
  games: GameRecord[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const user = await ensureAuthenticated();
      const allGames = await GameService.getAllGames(user.id);
      setGames(allGames);
    } catch (error) {
      // 予期しないエラーの場合のみログ出力
      if (error instanceof Error && !error.message.includes('匿名ログインに失敗しました')) {
        console.error('Failed to load games:', error);
      }
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGames();
    setRefreshing(false);
  };

  const handleEditGame = (game: GameRecord) => {
    // 編集画面への遷移
    router.push({
      pathname: '/(tabs)/edit-game',
      params: { gameId: game.id }
    });
  };

  const handleDeleteGame = (gameId: string) => {
    Alert.alert(
      '対局記録を削除',
      'この対局記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 削除処理（今後実装）
              loadGames();
              Alert.alert('削除完了', '対局記録を削除しました');
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  // ゲームを年別にグループ化
  const groupGamesByYear = (games: GameRecord[]): GameGroup[] => {
    const groups: { [key: number]: GameRecord[] } = {};
    
    games.forEach(game => {
      const year = new Date(game.date).getFullYear();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(game);
    });

    // 年別にソート（新しい年順）
    return Object.keys(groups)
      .map(year => parseInt(year))
      .sort((a, b) => b - a)
      .map(year => ({
        year,
        games: groups[year].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
  };

  const GameCard = ({ game }: { game: GameRecord }) => {
    // プレイヤー情報から統計を計算
    const mainPlayer = game.players.find(p => p.isMainAccount);
    const averageRank = mainPlayer ? mainPlayer.rank : 0;
    const totalScoreChange = mainPlayer ? mainPlayer.finalScore - 25000 : 0;
    const isPositive = totalScoreChange >= 0;
    
    // その日の着順分布
    const rankCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    game.players.forEach(p => {
      rankCounts[p.rank as keyof typeof rankCounts]++;
    });

    // 日付をフォーマット
    const gameDate = new Date(game.date);
    const month = gameDate.getMonth() + 1;
    const day = gameDate.getDate();

    return (
      <TouchableOpacity 
        style={styles.gameCard}
        onPress={() => handleEditGame(game)}
      >
        <View style={styles.cardContent}>
          {/* 左側：日付と場所情報 */}
          <View style={styles.leftSection}>
            <View style={styles.dateContainer}>
              <Calendar size={18} color="#FF6B35" />
              <Text style={styles.gameDate}>
                {month}月{day}日
              </Text>
            </View>
            <Text style={styles.gameTypeText}>{game.gameType}</Text>
          </View>

          {/* 中央：成績サマリー */}
          <View style={styles.centerSection}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>平均着順</Text>
              <Text style={styles.averageRankText}>
                {averageRank.toFixed(1)}位
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>収支</Text>
              <Text style={[
                styles.scoreChangeText,
                isPositive ? styles.positiveScore : styles.negativeScore
              ]}>
                {totalScoreChange > 0 ? '+' : ''}{totalScoreChange.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* 右側：着順分布 */}
          <View style={styles.rightSection}>
            <Text style={styles.rankDistributionTitle}>着順</Text>
            <View style={styles.rankDistribution}>
              {[1, 2, 3, 4].map(rank => (
                <View key={rank} style={styles.rankBadge}>
                  <Text style={[
                    styles.rankNumber,
                    rank === 1 && styles.firstPlaceText,
                    rank === 2 && styles.secondPlaceText,
                    rank === 3 && styles.thirdPlaceText,
                    rank === 4 && styles.fourthPlaceText
                  ]}>
                    {rank}
                  </Text>
                  <Text style={styles.rankCount}>
                    {rankCounts[rank as keyof typeof rankCounts]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const GameGroup = ({ group }: { group: GameGroup }) => (
    <View style={styles.yearGroup}>
      <Text style={styles.yearTitle}>{group.year}年</Text>
      {group.games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>対局履歴を読み込み中...</Text>
      </View>
    );
  }

  const gameGroups = groupGamesByYear(games);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>対局履歴</Text>
          <Text style={styles.subtitle}>
            {games.length}回の対局記録
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/add-game')}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#FF6B35" />
          <Text style={styles.addButtonText}>対局記録</Text>
        </TouchableOpacity>
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
        <ScrollView
          style={styles.gamesList}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B35']}
              tintColor="#FF6B35"
            />
          }
        >
          {gameGroups.map((group) => (
            <GameGroup key={group.year} group={group} />
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D70',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B3515',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
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
  gameCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leftSection: {
    flex: 1,
    marginRight: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gameDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  gameTypeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    marginRight: 16,
  },
  statRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  averageRankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  scoreChangeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightSection: {
    alignItems: 'center',
  },
  rankDistributionTitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '500',
  },
  rankDistribution: {
    flexDirection: 'row',
    gap: 4,
  },
  rankBadge: {
    alignItems: 'center',
    minWidth: 24,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  firstPlaceText: {
    color: '#10B981',
  },
  secondPlaceText: {
    color: '#3B82F6',
  },
  thirdPlaceText: {
    color: '#F59E0B',
  },
  fourthPlaceText: {
    color: '#EF4444',
  },
  rankCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  gameInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6D6D70',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  firstPlace: {
    color: '#10B981',
  },
  secondPlace: {
    color: '#3B82F6',
  },
  thirdPlace: {
    color: '#F59E0B',
  },
  fourthPlace: {
    color: '#EF4444',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  positiveScore: {
    color: '#10B981',
  },
  negativeScore: {
    color: '#EF4444',
  },
  bottomPadding: {
    height: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  yearGroup: {
    marginBottom: 24,
  },
  yearTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});