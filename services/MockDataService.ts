/**
 * モックデータサービス
 * 統計ページとアカウントページ用のダミーデータを提供
 */

import { PlayerStats, GameRecord } from '@/types/GameRecord';

export class MockDataService {
  /**
   * 統計ページ用のダミーデータを生成
   */
  static generateMockPlayerStats(): PlayerStats {
    return {
      totalGames: 0,
      averageRank: 0,
      averageScore: 0,
      firstPlaceRate: 0,
      topTwoRate: 0,
      avoidLastRate: 0,
      highestScore: 0,
      lowestScore: 0,
      maxConsecutiveWins: 0,
      rankDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0
      }
    };
  }

  /**
   * 過去12ヶ月の月別統計データ
   */
  static generateMonthlyStats() {
    return [];
  }

  /**
   * チャート用の得点推移データ
   */
  static generateChartData(period: 'month' | 'year' | 'all') {
    return { labels: [], scores: [], ranks: [] };
  }

  /**
   * 対局履歴用のゲーム記録データ
   */
  static getMockGame(gameId: string): GameRecord | null {
    const games = this.generateMockGameRecords();
    return games.find(game => game.id === gameId) || null;
  }

  static generateMockGameRecords(): GameRecord[] {
    return [];
  }


  /**
   * アカウント用ダミーデータ
   */
  static generateMockAccount() {
    return {
      accountId: 'test-user-001',
      username: '麻雀太郎',
      createdDate: '2024-01-15T10:00:00+09:00',
      isPremium: true,
      purchaseDate: '2024-02-01T12:00:00+09:00',
      monthlyGameCount: 45,
      lastResetDate: '2024-12-01T00:00:00+09:00'
    };
  }
}