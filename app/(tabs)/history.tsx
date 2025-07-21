import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Calendar, MapPin, Users, CreditCard as Edit2, Trash2, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/GameService';
import { AccountService } from '@/services/AccountService';
import { GameRecord } from '@/types/GameRecord';

export default function HistoryScreen() {
  const router = useRouter();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ダミーデータ（表示テスト用）
  const dummyGame: GameRecord = {
    id: 'dummy-game-001',
    accountId: 'dummy-account',
    date: new Date().toISOString(),
    location: '雀荘ドラゴン',
    gameType: '東南戦',
    rules: {
      startingPoints: 25000,
      uma: '+15 +5 -5 -15',
      oka: 5000,
      riichiStick: 1000,
      honbaValue: 300,
    },
    players: [
      {
        name: '自分',
        finalScore: 28400,
        rank: 2,
        isMainAccount: true,
        startingPosition: 'East'
      },
      {
        name: '田中',
        finalScore: 35900,
        rank: 1,
        isMainAccount: false,
        startingPosition: 'South'
      },
      {
        name: '佐藤',
        finalScore: 18200,
        rank: 4,
        isMainAccount: false,
        startingPosition: 'West'
      },
      {
        name: '鈴木',
        finalScore: 22500,
        rank: 3,
        isMainAccount: false,
        startingPosition: 'North'
      }
    ],
    rounds: [],
    hanchanResults: [
      { round: 1, rank: 3, scoreChange: -2100 },
      { round: 2, rank: 1, scoreChange: +8400 },
      { round: 3, rank: 2, scoreChange: +1200 },
      { round: 4, rank: 4, scoreChange: -4100 }
    ],
    finalRiichiSticks: 0,
    finalHonba: 0,
    memo: '4半荘実施。後半に調子を取り戻した。',
    gameEndCondition: 'normal'
  };

  // 2つ目のダミーデータ
  const dummyGame2: GameRecord = {
    id: 'dummy-game-002',
    accountId: 'dummy-account',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨日
    location: 'フリー対局',
    gameType: '東風戦',
    rules: {
      startingPoints: 25000,
      uma: '+10 +5 -5 -10',
      oka: 3000,
      riichiStick: 1000,
      honbaValue: 300,
    },
    players: [
      {
        name: '自分',
        finalScore: 31200,
        rank: 1,
        isMainAccount: true,
        startingPosition: 'East'
      },
      {
        name: '山田',
        finalScore: 24800,
        rank: 2,
        isMainAccount: false,
        startingPosition: 'South'
      },
      {
        name: '佐々木',
        finalScore: 23600,
        rank: 3,
        isMainAccount: false,
        startingPosition: 'West'
      },
      {
        name: '高橋',
        finalScore: 20400,
        rank: 4,
        isMainAccount: false,
        startingPosition: 'North'
      }
    ],
    rounds: [],
    hanchanResults: [
      { round: 1, rank: 2, scoreChange: +3400 },
      { round: 2, rank: 1, scoreChange: +2800 }
    ],
    finalRiichiSticks: 0,
    finalHonba: 0,
    memo: '東風戦2回。安定した戦績。',
    gameEndCondition: 'normal'
  };

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const account = await AccountService.getAccount();
      const allGames = await GameService.getAllGames(account.accountId);
      // ダミーデータを先頭に追加
      setGames([dummyGame, dummyGame2, ...allGames]);
    } catch (error) {
      console.error('Failed to load games:', error);
      // エラーが発生してもダミーデータは表示
      setGames([dummyGame, dummyGame2]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGame = (game: GameRecord) => {
    // 編集画面への遷移（今後実装）
    Alert.alert('編集機能', 'この機能は今後実装予定です');
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

  const GameCard = ({ game }: { game: GameRecord }) => {
    // 1日の半荘結果を計算
    const hanchanResults = game.hanchanResults || [];
    const totalHanchans = hanchanResults.length;
    const averageRank = totalHanchans > 0 
      ? hanchanResults.reduce((sum, h) => sum + h.rank, 0) / totalHanchans 
      : 0;
    const totalScoreChange = hanchanResults.reduce((sum, h) => sum + h.scoreChange, 0);
    const isPositive = totalScoreChange >= 0;
    
    // その日の着順分布
    const rankCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    hanchanResults.forEach(h => {
      rankCounts[h.rank as keyof typeof rankCounts]++;
    });

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
                {new Date(game.date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.locationInfo}>
              <MapPin size={14} color="#8E8E93" />
              <Text style={styles.locationText}>{game.location}</Text>
            </View>
            <Text style={styles.gameTypeText}>{game.gameType} × {totalHanchans}</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>対局履歴を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
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
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 120,
    transform: [{ scale: 1 }],
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
    backgroundColor: '#FF6B3510',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  gameDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6D6D70',
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
    color: '#3B82F6',
    textShadowColor: 'rgba(59, 130, 246, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
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
    backgroundColor: '#FFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
});