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
      totalGames: 25,
      averageRank: 2.32,
      averageScore: 28156,
      firstPlaceRate: 0.32, // 32% (8/25)
      topTwoRate: 0.56, // 56% (14/25)
      avoidLastRate: 0.76, // 76% (19/25)
      highestScore: 42300,
      lowestScore: 16500,
      maxConsecutiveWins: 3, // 最大3連荘
      rankDistribution: {
        1: 8,  // 1位: 8回
        2: 6,  // 2位: 6回
        3: 5,  // 3位: 5回
        4: 6   // 4位: 6回
      }
    };
  }

  /**
   * 過去12ヶ月の月別統計データ
   */
  static generateMonthlyStats() {
    const months = [
      { month: '2024-01', games: 2, avgRank: 2.5, totalScore: 56000 },
      { month: '2024-02', games: 3, avgRank: 2.0, totalScore: 84300 },
      { month: '2024-03', games: 2, avgRank: 2.0, totalScore: 61000 },
      { month: '2024-04', games: 2, avgRank: 2.5, totalScore: 59300 },
      { month: '2024-05', games: 2, avgRank: 1.5, totalScore: 70400 },
      { month: '2024-06', games: 2, avgRank: 1.5, totalScore: 66600 },
      { month: '2024-07', games: 2, avgRank: 2.5, totalScore: 56800 },
      { month: '2024-08', games: 2, avgRank: 1.5, totalScore: 71700 },
      { month: '2024-09', games: 2, avgRank: 2.0, totalScore: 62400 },
      { month: '2024-10', games: 2, avgRank: 3.0, totalScore: 48300 },
      { month: '2024-11', games: 2, avgRank: 2.0, totalScore: 66000 },
      { month: '2024-12', games: 2, avgRank: 1.5, totalScore: 66200 }
    ];
    
    return months;
  }

  /**
   * チャート用の得点推移データ
   */
  static generateChartData(period: 'month' | 'year' | 'all') {
    const allScores = [
      6200,   // game-001: 31200 - 25000
      -200,   // game-002: 24800 - 25000
      17300,  // game-003: 42300 - 25000
      -5500,  // game-004: 19500 - 25000
      4800,   // game-005: 29800 - 25000
      -2600,  // game-006: 22400 - 25000
      13600,  // game-007: 38600 - 25000
      -7200,  // game-008: 17800 - 25000
      16500,  // game-009: 41500 - 25000
      3900,   // game-010: 28900 - 25000
      -1200,  // game-011: 23800 - 25000
      5600,   // game-012: 30600 - 25000
      12200,  // game-013: 37200 - 25000
      -6800,  // game-014: 18200 - 25000
      9700,   // game-015: 34700 - 25000
      4400,   // game-016: 29400 - 25000
      -800,   // game-017: 24200 - 25000
      14800,  // game-018: 39800 - 25000
      -1400,  // game-019: 23600 - 25000
      6800,   // game-020: 31800 - 25000
      -8500,  // game-021: 16500 - 25000
      15200,  // game-022: 40200 - 25000
      600,    // game-023: 25600 - 25000
      7400,   // game-024: 32400 - 25000
      8800    // game-025: 33800 - 25000
    ];

    const allRanks = [
      2,  // game-001
      3,  // game-002
      1,  // game-003
      4,  // game-004
      2,  // game-005
      3,  // game-006
      1,  // game-007
      4,  // game-008
      1,  // game-009
      2,  // game-010
      3,  // game-011
      2,  // game-012
      1,  // game-013
      4,  // game-014
      1,  // game-015
      2,  // game-016
      3,  // game-017
      1,  // game-018
      3,  // game-019
      2,  // game-020
      4,  // game-021
      1,  // game-022
      2,  // game-023
      2,  // game-024
      1   // game-025
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let filteredScores = allScores;
    let filteredRanks = allRanks;
    let labels = allScores.map((_, index) => `${index + 1}`);

    switch (period) {
      case 'month':
        // 今月のデータのみ（最後の2〜3局）
        filteredScores = allScores.slice(-3);
        filteredRanks = allRanks.slice(-3);
        labels = filteredScores.map((_, index) => `${index + 1}`);
        break;
      case 'year':
        // 今年のデータのみ（全て）
        filteredScores = allScores;
        filteredRanks = allRanks;
        labels = allScores.map((_, index) => `${index + 1}`);
        break;
      case 'all':
        // 全データ
        filteredScores = allScores;
        filteredRanks = allRanks;
        labels = allScores.map((_, index) => `${index + 1}`);
        break;
    }

    return { labels, scores: filteredScores, ranks: filteredRanks };
  }

  /**
   * 対局履歴用のゲーム記録データ
   */
  static getMockGame(gameId: string): GameRecord | null {
    const games = this.generateMockGameRecords();
    return games.find(game => game.id === gameId) || null;
  }

  static generateMockGameRecords(): GameRecord[] {
    const gameTypes = ['東南戦', '東風戦'] as const;
    const locations = ['雀荘ドラゴン', '雀荘フェニックス', '雀荘タイガー'];
    const playerNames = [
      '田中哲夫', '佐藤美香', '山田次郎', '鈴木一郎', '高橋花子', 
      '渡辺三郎', '中村良太', '木村さくら', '石田健一', '松本雅美'
    ];

    const games: GameRecord[] = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    for (let i = 0; i < 25; i++) {
      const gameDate = new Date(startDate.getTime() + 
        Math.random() * (endDate.getTime() - startDate.getTime()));
      
      const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      // プレイヤー名をランダムに選択（重複なし）
      const shuffledNames = [...playerNames].sort(() => Math.random() - 0.5);
      const selectedPlayers = ['麻雀太郎', ...shuffledNames.slice(0, 3)];
      
      // 現実的な得点分布を生成
      const scores = this.generateRealisticScores();
      const ranks = this.calculateRanks(scores);
      
      const players = selectedPlayers.map((name, index) => ({
        name,
        finalScore: scores[index],
        rank: ranks[index],
        isMainAccount: index === 0,
        startingPosition: ['East', 'South', 'West', 'North'][index] as any
      }));

      games.push({
        id: `game-${String(i + 1).padStart(3, '0')}`,
        accountId: 'test-user-001',
        date: gameDate.toISOString(),
        location,
        gameType,
        rules: {
          startingPoints: 25000,
          uma: gameType === '東南戦' ? '+15 +5 -5 -15' : '+10 +5 -5 -10',
          oka: 5000,
          riichiStick: 1000,
          honbaValue: 300,
        },
        players,
        rounds: [],
        finalRiichiSticks: Math.floor(Math.random() * 4),
        finalHonba: Math.floor(Math.random() * 4),
        memo: this.generateRandomMemo(),
        duration: gameType === '東南戦' ? 
          Math.floor(Math.random() * 60) + 150 : 
          Math.floor(Math.random() * 30) + 80,
        gameEndCondition: 'normal'
      });
    }

    return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * 現実的な麻雀の得点分布を生成
   */
  private static generateRealisticScores(): number[] {
    const baseScore = 25000;
    const totalDiff = Math.floor(Math.random() * 20000) - 10000; // -10000 to +10000

    // 現実的な得点分布（標準偏差を考慮）
    const diffs = [];
    for (let i = 0; i < 3; i++) {
      diffs.push(Math.floor(Math.random() * 30000) - 15000);
    }
    
    // 最後の一人は合計がtotalDiffになるよう調整
    const lastDiff = totalDiff - diffs.reduce((sum, diff) => sum + diff, 0);
    diffs.push(lastDiff);

    // 得点に変換（最低点は0点以上に調整）
    return diffs.map(diff => Math.max(0, baseScore + diff));
  }

  /**
   * 得点から順位を計算
   */
  private static calculateRanks(scores: number[]): number[] {
    const indexed = scores.map((score, index) => ({ score, index }));
    indexed.sort((a, b) => b.score - a.score);
    
    const ranks = new Array(4);
    indexed.forEach((item, rank) => {
      ranks[item.index] = rank + 1;
    });
    
    return ranks;
  }

  /**
   * ランダムなメモを生成
   */
  private static generateRandomMemo(): string {
    const memos = [
      '調子良し。リーチ判断が的確だった',
      'ドラが悪く、守備重視で凌いだ',
      '大三元をツモって逆転勝利！',
      '流れが悪く、ツキに見放された感じ',
      'チートイドイツで安定した打ち回し',
      '終盤の見極めが甘かった',
      'リーチ一発ツモで気持ちよく勝利',
      '守備力不足を痛感した一局',
      'ドラを活かした攻撃的な麻雀',
      '冷静な判断で着実にポイントを稼いだ',
      '相手の手を読み切れず失点',
      '運も味方して会心の勝利',
      '基本に忠実な打ち方で安定',
      '攻守のバランスが課題',
      '集中力を保って好成績'
    ];
    
    return memos[Math.floor(Math.random() * memos.length)];
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