import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { GameRecord, PlayerStats, ChipCalculator } from '@/types/GameRecord';

const GAMES_KEY = 'mahjong_games';

export class GameService {
  static async addGame(gameData: Omit<GameRecord, 'id'>): Promise<GameRecord> {
    try {
      const game: GameRecord = {
        ...gameData,
        id: uuidv4(),
      };
      
      const existingGames = await this.getAllGames(gameData.accountId);
      const updatedGames = [game, ...existingGames];
      
      await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(updatedGames));
      return game;
    } catch (error) {
      console.error('Failed to add game:', error);
      throw new Error('対局記録の保存に失敗しました');
    }
  }

  static async getAllGames(accountId: string): Promise<GameRecord[]> {
    try {
      const gamesData = await AsyncStorage.getItem(GAMES_KEY);
      if (!gamesData) return [];
      
      const allGames: GameRecord[] = JSON.parse(gamesData);
      return allGames.filter(game => game.accountId === accountId);
    } catch (error) {
      console.error('Failed to get games:', error);
      return [];
    }
  }

  static async getRecentGames(accountId: string, limit: number = 5): Promise<GameRecord[]> {
    try {
      const games = await this.getAllGames(accountId);
      return games.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent games:', error);
      return [];
    }
  }

  static async getPlayerStats(accountId: string): Promise<PlayerStats> {
    try {
      const games = await this.getAllGames(accountId);
      
      if (games.length === 0) {
        return {
          totalGames: 0,
          totalHanchans: 0,
          averageRank: 0,
          averageScore: 0,
          averageFinalPoints: 0,
          firstPlaceRate: 0,
          topTwoRate: 0,
          avoidLastRate: 0,
          highestScore: 0,
          lowestScore: 0,
          rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
          chipStats: {
            totalChipsWon: 0,
            averageChipsPerGame: 0,
            bestChipGame: 0,
          },
          pointStats: {
            averagePointChange: 0,
            totalPointChange: 0,
            positiveGameRate: 0,
          },
        };
      }

      const mainPlayerData = games.map(game => 
        game.players.find(p => p.isMainAccount)
      ).filter(Boolean);

      const totalGames = mainPlayerData.length;
      const totalHanchans = games.reduce((sum, game) => sum + (game.hanchanResults?.length || 1), 0);
      const totalRank = mainPlayerData.reduce((sum, p) => sum + p!.rank, 0);
      const totalScore = mainPlayerData.reduce((sum, p) => sum + p!.finalScore, 0);
      const chips = mainPlayerData.map(p => p!.chips?.total || 0);
      
      const firstPlaceCount = mainPlayerData.filter(p => p!.rank === 1).length;
      const topTwoCount = mainPlayerData.filter(p => p!.rank <= 2).length;
      const avoidLastCount = mainPlayerData.filter(p => p!.rank < 4).length;
      
      const scores = mainPlayerData.map(p => p!.finalScore);
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      
      const rankDistribution = mainPlayerData.reduce((acc, p) => {
        acc[p!.rank] = (acc[p!.rank] || 0) + 1;
        return acc;
      }, {} as { [key: number]: number });

      // 得失点の計算
      const pointChanges = games.map(game => {
        const mainPlayer = game.players.find(p => p.isMainAccount)!;
        const result = ChipCalculator.calculateFinalResult(mainPlayer, game.rules);
        return result.finalResult;
      });

      return {
        totalGames,
        totalHanchans,
        averageRank: totalRank / totalGames,
        averageScore: totalScore / totalGames,
        averageFinalPoints: totalScore / totalGames,
        firstPlaceRate: firstPlaceCount / totalGames,
        topTwoRate: topTwoCount / totalGames,
        avoidLastRate: avoidLastCount / totalGames,
        highestScore,
        lowestScore,
        rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
        chipStats: {
          totalChipsWon: chips.reduce((a, b) => a + b, 0),
          averageChipsPerGame: chips.reduce((a, b) => a + b, 0) / totalGames,
          bestChipGame: Math.max(...chips, 0),
        },
        pointStats: {
          averagePointChange: pointChanges.reduce((a, b) => a + b, 0) / totalGames,
          totalPointChange: pointChanges.reduce((a, b) => a + b, 0),
          positiveGameRate: pointChanges.filter(change => change > 0).length / totalGames,
        },
      };
    } catch (error) {
      console.error('Failed to get player stats:', error);
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getChartData(accountId: string, period: 'month' | 'year' | 'all') {
    try {
      const games = await this.getAllGames(accountId);
      const mainPlayerData = games.map(game => ({
        ...game.players.find(p => p.isMainAccount)!,
        date: game.date,
        rules: game.rules
      })).filter(Boolean);

      // 期間でフィルタリング
      const now = new Date();
      const filteredData = mainPlayerData.filter(game => {
        const gameDate = new Date(game.date);
        switch (period) {
          case 'month':
            return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear();
          case 'year':
            return gameDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });

      const labels = filteredData.map((_, index) => `${index + 1}`);
      const scores = filteredData.map(game => {
        const result = ChipCalculator.calculateFinalResult(game, game.rules);
        return result.finalResult;
      });

      return { labels, scores };
    } catch (error) {
      console.error('Failed to get chart data:', error);
      return { labels: [], scores: [] };
    }
  }

  static async exportData(accountId: string): Promise<string> {
    try {
      const games = await this.getAllGames(accountId);
      return JSON.stringify(games, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  static async resetData(accountId: string): Promise<void> {
    try {
      const allGames = await AsyncStorage.getItem(GAMES_KEY);
      if (!allGames) return;
      
      const games: GameRecord[] = JSON.parse(allGames);
      const otherAccountGames = games.filter(game => game.accountId !== accountId);
      
      await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(otherAccountGames));
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw new Error('データのリセットに失敗しました');
    }
  }
}