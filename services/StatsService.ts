import { GameRecord, PlayerStats } from '@/types/GameRecord';
import { LocalStorageService } from './LocalStorageService';

export class StatsService {
  // 統計データを計算してキャッシュ
  static async calculateAndCacheStats(): Promise<PlayerStats> {
    try {
      const games = await LocalStorageService.getGames();
      const stats = this.calculateStats(games);
      
      // ローカルに保存
      await LocalStorageService.saveStats(stats);
      
      console.log('✅ DEBUG: Stats calculated and cached');
      return stats;
    } catch (error) {
      console.error('❌ DEBUG: Failed to calculate stats:', error);
      throw error;
    }
  }

  // 統計データを取得（キャッシュ優先）
  static async getStats(): Promise<PlayerStats> {
    try {
      // まずキャッシュから取得
      const cachedStats = await LocalStorageService.getStats();
      if (cachedStats) {
        console.log('✅ DEBUG: Returning cached stats');
        return cachedStats;
      }

      // キャッシュがない場合は計算
      console.log('🔄 DEBUG: No cached stats, calculating...');
      return await this.calculateAndCacheStats();
    } catch (error) {
      console.error('❌ DEBUG: Failed to get stats:', error);
      // エラー時は空の統計を返す
      return this.getEmptyStats();
    }
  }

  // 統計データを強制再計算
  static async refreshStats(): Promise<PlayerStats> {
    try {
      console.log('🔄 DEBUG: Forcing stats refresh...');
      return await this.calculateAndCacheStats();
    } catch (error) {
      console.error('❌ DEBUG: Failed to refresh stats:', error);
      throw error;
    }
  }

  // 統計データを計算
  private static calculateStats(games: GameRecord[]): PlayerStats {
    if (games.length === 0) {
      return this.getEmptyStats();
    }

    const stats: PlayerStats = {
      totalGames: games.length,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 0,
      averageScore: 0,
      totalScore: 0,
      highestScore: -Infinity,
      lowestScore: Infinity,
      totalRiichiSticks: 0,
      totalHonba: 0,
      gameTypes: {
        '東風戦': 0,
        '東南戦': 0,
      },
      monthlyStats: {},
      recentGames: games.slice(0, 10).map(game => ({
        id: game.id,
        date: game.date,
        gameType: game.gameType,
        finalScore: game.players.find(p => p.isMainAccount)?.finalScore || 0,
        rank: game.players.find(p => p.isMainAccount)?.rank || 0,
      })),
    };

    let totalScore = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;

    for (const game of games) {
      const mainPlayer = game.players.find(p => p.isMainAccount);
      if (!mainPlayer) continue;

      const score = mainPlayer.finalScore;
      const rank = mainPlayer.rank;

      // スコア統計
      totalScore += score;
      stats.highestScore = Math.max(stats.highestScore, score);
      stats.lowestScore = Math.min(stats.lowestScore, score);

      // 順位統計
      if (rank === 1) totalWins++;
      else if (rank === 4) totalLosses++;
      else totalDraws++;

      // ゲームタイプ統計
      stats.gameTypes[game.gameType]++;

      // リーチ棒・本場統計
      stats.totalRiichiSticks += game.finalRiichiSticks;
      stats.totalHonba += game.finalHonba;

      // 月別統計
      const month = new Date(game.date).toISOString().slice(0, 7); // YYYY-MM
      if (!stats.monthlyStats[month]) {
        stats.monthlyStats[month] = {
          games: 0,
          wins: 0,
          totalScore: 0,
          averageScore: 0,
        };
      }
      
      stats.monthlyStats[month].games++;
      stats.monthlyStats[month].totalScore += score;
      if (rank === 1) stats.monthlyStats[month].wins++;
    }

    // 月別統計の平均スコアを計算
    for (const month in stats.monthlyStats) {
      const monthStats = stats.monthlyStats[month];
      monthStats.averageScore = monthStats.totalScore / monthStats.games;
    }

    // 全体統計を計算
    stats.totalWins = totalWins;
    stats.totalLosses = totalLosses;
    stats.totalDraws = totalDraws;
    stats.totalScore = totalScore;
    stats.averageScore = totalScore / games.length;
    stats.winRate = (totalWins / games.length) * 100;

    console.log('✅ DEBUG: Stats calculated:', {
      totalGames: stats.totalGames,
      winRate: stats.winRate.toFixed(1) + '%',
      averageScore: stats.averageScore.toFixed(0),
    });

    return stats;
  }

  // 空の統計データを取得
  private static getEmptyStats(): PlayerStats {
    return {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 0,
      averageScore: 0,
      totalScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalRiichiSticks: 0,
      totalHonba: 0,
      gameTypes: {
        '東風戦': 0,
        '東南戦': 0,
      },
      monthlyStats: {},
      recentGames: [],
    };
  }

  // 特定の月の統計を取得
  static async getMonthlyStats(year: number, month: number): Promise<PlayerStats['monthlyStats'][string] | null> {
    try {
      const stats = await this.getStats();
      const monthKey = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
      return stats.monthlyStats[monthKey] || null;
    } catch (error) {
      console.error('❌ DEBUG: Failed to get monthly stats:', error);
      return null;
    }
  }

  // 統計データの有効性をチェック
  static async isStatsValid(): Promise<boolean> {
    try {
      const stats = await LocalStorageService.getStats();
      return stats !== null;
    } catch (error) {
      return false;
    }
  }
}
