import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Calendar, Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { GameRecord } from '@/types/GameRecord';
import { usePhotoUrl } from '@/hooks/usePhotoUrl';
import { calculateRankCounts, calculateAverageRank } from '@/utils/rankCalculation';

interface GameCardProps {
  game: GameRecord;
  onEdit: (game: GameRecord) => void;
  onDelete: (gameId: string, swipeableRef?: React.RefObject<Swipeable | null>) => void;
}

function GameCardInner({ game, onEdit, onDelete }: GameCardProps) {
  const swipeableRef = React.useRef<Swipeable>(null);
  const imageUrl = usePhotoUrl(game.photoPath);

  const mainPlayer = game.players.find((p) => p.isMainAccount);
  const totalScoreChange = mainPlayer ? mainPlayer.finalScore : 0;
  const isPositive = totalScoreChange >= 0;

  const rankCounts = useMemo(() => calculateRankCounts(game), [game]);
  const averageRank = useMemo(
    () => calculateAverageRank(rankCounts, mainPlayer?.rank ?? 0),
    [rankCounts, mainPlayer?.rank]
  );

  const gameDate = new Date(game.date);
  const month = gameDate.getMonth() + 1;
  const day = gameDate.getDate();

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.swipeDeleteContainer, { height: '100%', borderRadius: 12 }]}>
        <Animated.View style={[styles.swipeDeleteButton, { transform: [{ scale }] }]}>
          <Trash2 size={24} color="#FFFFFF" />
          <Text style={styles.swipeDeleteText}>削除</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableRightOpen={() => onDelete(game.id, swipeableRef)}
      rightThreshold={40}
    >
      <TouchableOpacity style={styles.gameCard} onPress={() => onEdit(game)}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View style={styles.dateContainer}>
              <Calendar size={18} color="#FF6B35" />
              <Text style={styles.gameDate}>
                {month}月{day}日
              </Text>
            </View>
            {game.photoPath && imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.thumbnail}
              />
            )}
          </View>

          <View style={styles.centerSection}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>平均着順</Text>
              <Text style={styles.averageRankText}>{averageRank.toFixed(1)}位</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>収支</Text>
              <Text
                style={[
                  styles.scoreChangeText,
                  isPositive ? styles.positiveScore : styles.negativeScore,
                ]}
              >
                {totalScoreChange > 0 ? '+' : ''}
                {totalScoreChange.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={styles.rankDistributionTitle}>着順</Text>
            <View style={styles.rankDistribution}>
              {([1, 2, 3, 4] as const).map((rank) => (
                <View key={rank} style={styles.rankBadge}>
                  <Text
                    style={[
                      styles.rankNumber,
                      rank === 1 && styles.firstPlaceText,
                      rank === 2 && styles.secondPlaceText,
                      rank === 3 && styles.thirdPlaceText,
                      rank === 4 && styles.fourthPlaceText,
                    ]}
                  >
                    {rank}
                  </Text>
                  <Text style={styles.rankCount}>{rankCounts[rank]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export const GameCard = React.memo(GameCardInner);

const styles = StyleSheet.create({
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
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
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
  positiveScore: {
    color: '#10B981',
  },
  negativeScore: {
    color: '#EF4444',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  swipeDeleteContainer: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeDeleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingVertical: 10,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
