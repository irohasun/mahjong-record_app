import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Plus, TrendingUp, Trophy, Calendar, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AccountService } from '@/services/AccountService';
import { GameService } from '@/services/GameService';
import { MonetizationService } from '@/services/MonetizationService';
import { GameRecord } from '@/types/GameRecord';
import { AdModal } from '@/components/AdModal';
import { PremiumModal } from '@/components/PremiumModal';

export default function HomeScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [monthlyGameCount, setMonthlyGameCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountData = await AccountService.getAccount();
      const gamesData = await GameService.getRecentGames(5);
      const statsData = await GameService.getPlayerStats(accountData.accountId);
      const gameCount = await MonetizationService.getMonthlyGameCount();

      setAccount(accountData);
      setRecentGames(gamesData);
      setStats(statsData);
      setMonthlyGameCount(gameCount);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddGame = async () => {
    const canAddGame = await MonetizationService.canAddGame();
    
    if (canAddGame) {
      router.push('/add-game');
    } else {
      const isPremium = await MonetizationService.isPremium();
      if (isPremium) {
        router.push('/add-game');
      } else {
        Alert.alert(
          '月間対局数の上限',
          '無料プランでは月間3対局まで記録できます。4対局目以降は広告視聴またはプレミアムプランが必要です。',
          [
            { text: '広告を見る', onPress: () => setShowAdModal(true) },
            { text: 'プレミアムプラン', onPress: () => setShowPremiumModal(true) },
            { text: 'キャンセル', style: 'cancel' }
          ]
        );
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = '#FF6B35' }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const GameCard = ({ game }: { game: GameRecord }) => (
    <TouchableOpacity style={styles.gameCard}>
      <View style={styles.gameHeader}>
        <Text style={styles.gameDate}>{new Date(game.date).toLocaleDateString('ja-JP')}</Text>
        <Text style={styles.gameType}>{game.gameType}</Text>
      </View>
      <View style={styles.gameScores}>
        {game.players.map((player, index) => (
          <View key={index} style={styles.playerScore}>
            <Text style={[styles.playerName, player.isMainAccount && styles.mainPlayer]}>
              {player.isMainAccount ? '自分' : player.name}
            </Text>
            <Text style={[styles.score, player.rank === 1 && styles.firstPlace]}>
              {player.score > 0 ? '+' : ''}{player.score}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>麻雀成績ノート</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard 
          title="総対局数" 
          value={stats?.totalGames || 0} 
          icon={Calendar}
          color="#FF6B35"
        />
        <StatCard 
          title="平均順位" 
          value={stats?.averageRank?.toFixed(2) || '-'} 
          icon={Trophy}
          color="#3B82F6"
        />
        <StatCard 
          title="1位率" 
          value={stats?.firstPlaceRate ? `${(stats.firstPlaceRate * 100).toFixed(1)}%` : '-'} 
          icon={TrendingUp}
          color="#10B981"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近の対局</Text>
          <TouchableOpacity onPress={handleAddGame} style={styles.addButton}>
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {recentGames.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>まだ対局記録がありません</Text>
            <Text style={styles.emptySubText}>右上の+ボタンから対局を記録しましょう</Text>
          </View>
        ) : (
          recentGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        )}
      </View>

      <AdModal
        visible={showAdModal}
        onClose={() => setShowAdModal(false)}
        onComplete={() => {
          setShowAdModal(false);
          router.push('/add-game');
        }}
      />

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onPurchase={() => {
          setShowPremiumModal(false);
          loadData();
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
  header: {
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6D6D70',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gameCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  gameType: {
    fontSize: 14,
    color: '#6D6D70',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gameScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerScore: {
    alignItems: 'center',
  },
  playerName: {
    fontSize: 12,
    color: '#6D6D70',
    marginBottom: 4,
  },
  mainPlayer: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  firstPlace: {
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6D6D70',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});