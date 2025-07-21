import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Camera, Calendar, MapPin, Users } from 'lucide-react-native';
import { GameService } from '@/services/GameService';
import { AccountService } from '@/services/AccountService';
import { GameRecord } from '@/types/GameRecord';

export default function GalleryScreen() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const account = await AccountService.getAccount();
      const allGames = await GameService.getAllGames(account.accountId);
      const gamesWithPhotos = allGames.filter(game => game.photos && game.photos.length > 0);
      setGames(gamesWithPhotos);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  const GameCard = ({ game }: { game: GameRecord }) => (
    <View style={styles.gameCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.gameDate}>
          {new Date(game.date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <View style={styles.photoCount}>
          <Camera size={16} color="#FF6B35" />
          <Text style={styles.photoCountText}>{game.photos?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.gameInfo}>
        <View style={styles.infoRow}>
          <MapPin size={16} color="#6D6D70" />
          <Text style={styles.infoText}>{game.location || '場所未設定'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Users size={16} color="#6D6D70" />
          <Text style={styles.infoText}>{game.gameType}</Text>
        </View>
      </View>

      <View style={styles.photoGrid}>
        {game.photos?.slice(0, 4).map((photo, index) => (
          <View key={photo.id} style={styles.photoThumbnail}>
            <View style={styles.photoPlaceholder}>
              <Camera size={24} color="#FFF" />
            </View>
            {index === 3 && (game.photos?.length || 0) > 4 && (
              <View style={styles.morePhotosOverlay}>
                <Text style={styles.morePhotosText}>+{(game.photos?.length || 0) - 4}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.gameResult}>
        <Text style={styles.resultTitle}>結果</Text>
        <View style={styles.playersResult}>
          {game.players.map((player, index) => (
            <View key={index} style={styles.playerResult}>
              <Text style={[
                styles.playerName,
                player.isMainAccount && styles.mainPlayerName
              ]}>
                {player.isMainAccount ? '自分' : player.name}
              </Text>
              <Text style={[
                styles.playerScore,
                player.rank === 1 && styles.firstPlaceScore
              ]}>
                {player.score > 0 ? '+' : ''}{player.score}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {game.memo && (
        <View style={styles.memoSection}>
          <Text style={styles.memoTitle}>メモ</Text>
          <Text style={styles.memoText}>{game.memo}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>写真を読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ギャラリー</Text>
        <Text style={styles.subtitle}>写真付きの対局記録</Text>
      </View>

      {games.length === 0 ? (
        <View style={styles.emptyState}>
          <Camera size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>写真がありません</Text>
          <Text style={styles.emptySubtitle}>
            対局記録で写真を撮影すると{'\n'}ここに表示されます
          </Text>
        </View>
      ) : (
        <View style={styles.gamesList}>
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </View>
      )}
    </ScrollView>
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  gameCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B3520',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  gameInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6D6D70',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  photoThumbnail: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  gameResult: {
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D70',
    marginBottom: 8,
  },
  playersResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerResult: {
    alignItems: 'center',
  },
  playerName: {
    fontSize: 12,
    color: '#6D6D70',
    marginBottom: 4,
  },
  mainPlayerName: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  playerScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  firstPlaceScore: {
    color: '#10B981',
  },
  memoSection: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  memoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D70',
    marginBottom: 4,
  },
  memoText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
});