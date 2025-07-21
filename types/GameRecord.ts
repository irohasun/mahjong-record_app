// 雀荘風の局ごと点数記録システム

export interface Player {
  name: string;
  finalScore: number; // 最終得点
  rank: number; // 最終順位
  isMainAccount: boolean;
  startingPosition: 'East' | 'South' | 'West' | 'North'; // 起家
}

export interface RoundRecord {
  round: string; // 東1局、東2局など
  honba: number; // 本場数
  riichiSticks: number; // 立直棒の数
  winner?: number; // 和了者のプレイヤーインデックス
  loser?: number; // 放銃者のプレイヤーインデックス（ロンの場合）
  handType: 'ron' | 'tsumo' | 'draw' | 'abort'; // 終了タイプ
  points: number[]; // 各プレイヤーの点数変化 [+8000, -2000, -3000, -3000]
  han?: number; // 翻数
  fu?: number; // 符数
  yakuman?: boolean; // 役満フラグ
  memo?: string; // 局メモ
}

export interface GameRecord {
  id: string;
  accountId: string;
  date: string;
  location: string;
  gameType: '東風戦' | '東南戦';
  rules: GameRules;
  players: Player[];
  rounds: RoundRecord[]; // 局ごとの記録
  finalRiichiSticks: number; // 最終立直棒数
  finalHonba: number; // 最終本場数
  photos?: Photo[];
  memo?: string;
  duration?: number; // ゲーム時間（分）
  gameEndCondition: 'normal' | 'bankruptcy' | 'timeout' | 'time_limit'; // 終了条件
}

export interface GameRules {
  startingPoints: number; // 開始持ち点
  uma: string; // ウマ（例："+15 +5 -5 -15"）
  oka: number; // オカ（返し点との差額）
  riichiStick: number; // 立直棒（通常1000点）
  honbaValue: number; // 本場の価値（通常300点）
}

export interface Photo {
  id: string;
  uri: string;
  timestamp: string;
  description?: string;
}

export interface Account {
  accountId: string;
  username: string;
  createdDate: string;
  isPremium: boolean;
  purchaseDate?: string;
  monthlyGameCount: number;
  lastResetDate: string;
}

export interface PlayerStats {
  totalGames: number;
  totalHanchans: number; // 半荘数
  averageRank: number;
  averageScore: number;
  averageFinalPoints: number; // 平均最終得点
  firstPlaceRate: number;
  topTwoRate: number;
  avoidLastRate: number;
  highestScore: number;
  lowestScore: number;
  rankDistribution: { [key: number]: number };
  chipStats: {
    totalChipsWon: number;
    averageChipsPerGame: number;
    bestChipGame: number;
  };
  pointStats: {
    averagePointChange: number; // 平均得失点
    totalPointChange: number;
    positiveGameRate: number; // プラス収支率
  };
}

// データベース設計案（SQLite/Supabase用）

/*
-- 半荘記録テーブル設計

-- ゲーム記録メインテーブル
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  game_type TEXT NOT NULL CHECK (game_type IN ('東風戦', '東南戦')),
  rules JSONB NOT NULL, -- ルール設定をJSON形式で保存
  memo TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- プレイヤー記録テーブル
CREATE TABLE player_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  is_main_account BOOLEAN NOT NULL DEFAULT false,
  final_score INTEGER NOT NULL, -- 最終得点
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 4),
  starting_points INTEGER NOT NULL DEFAULT 25000,
  ending_points INTEGER NOT NULL,
  chips_won INTEGER NOT NULL DEFAULT 0,
  chip_breakdown JSONB, -- チップ詳細をJSON形式で保存
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 写真記録テーブル
CREATE TABLE game_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  photo_uri TEXT NOT NULL,
  description TEXT,
  taken_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_games_account_date ON games(account_id, date DESC);
CREATE INDEX idx_player_records_game ON player_records(game_id);
CREATE INDEX idx_player_records_main ON player_records(is_main_account, game_id);
*/

// 記録フォーマット例
export const sampleGameRecord: GameRecord = {
  id: "game_001",
  accountId: "user_123",
  date: "2024-01-15T14:30:00Z",
  location: "雀荘ドラゴン",
  gameType: "東南戦",
  rules: {
    startingPoints: 25000,
    returnPoints: 30000,
    oka: 20000,
    uma: "15-5",
    redDora: true,
    kuitan: true,
    chipRules: {
      enabled: true,
      doraChip: 100,
      uraChip: 300,
      kanChip: 100,
      riichiSupply: 1000
    }
  },
  players: [
    {
      name: "自分",
      finalScore: 32400,
      rank: 2,
      isMainAccount: true,
      chips: {
        dora: 3,
        ura: 1,
        kan: 2,
        riichi: 2,
        total: 8
      }
    },
    {
      name: "田中",
      finalScore: 38900,
      rank: 1,
      isMainAccount: false,
      chips: {
        dora: 5,
        ura: 3,
        kan: 1,
        riichi: 0,
        total: 9
      }
    },
    {
      name: "佐藤",
      finalScore: 15200,
      rank: 4,
      isMainAccount: false,
      chips: {
        dora: 1,
        ura: 0,
        kan: 0,
        riichi: 1,
        total: 2
      }
    },
    {
      name: "鈴木",
      finalScore: 23500,
      rank: 3,
      isMainAccount: false,
      chips: {
        dora: 2,
        ura: 1,
        kan: 3,
        riichi: 0,
        total: 6
      }
    }
  ],
  hanchanResults: [
    {
      startingPoints: 25000,
      endingPoints: 32400,
      gameEndCondition: 'normal',
      totalChips: 8
    }
  ],
  memo: "ドラが良く乗り、チップでプラス収支。リーチ判断が良かった。",
  duration: 180
};

// チップ計算の仕組み
export class ChipCalculator {
  // チップ価値を点数に換算
  static calculateChipValue(chips: ChipRecord, rules: ChipRules): number {
    if (!rules.enabled) return 0;
    
    return (
      chips.dora * rules.doraChip +
      chips.ura * rules.uraChip +
      chips.kan * rules.kanChip +
      chips.riichi * rules.riichiSupply
    );
  }

  // 得失点計算（オカ・ウマ・チップ込み）
  static calculateFinalResult(
    player: Player, 
    rules: GameRules
  ): {
    rawScore: number;
    okaUma: number;
    chipValue: number;
    finalResult: number;
  } {
    const rawScore = player.finalScore - rules.returnPoints;
    const chipValue = this.calculateChipValue(player.chips, rules.chipRules);
    const okaUma = this.calculateOkaUma(player.rank, rules);
    
    return {
      rawScore,
      okaUma,
      chipValue,
      finalResult: rawScore + okaUma + chipValue
    };
  }

  // オカ・ウマ計算
  private static calculateOkaUma(rank: number, rules: GameRules): number {
    const [uma1, uma2] = rules.uma.split('-').map(Number);
    const oka = rules.oka / 4; // 4人で分割
    
    switch (rank) {
      case 1: return oka + uma1;
      case 2: return oka + uma2;
      case 3: return oka - uma2;
      case 4: return oka - uma1;
      default: return 0;
    }
  }

  // 統計用データ抽出
  static extractStatsData(games: GameRecord[], accountId: string): PlayerStats {
    const mainPlayerGames = games.map(game => ({
      ...game.players.find(p => p.isMainAccount)!,
      gameDate: game.date,
      rules: game.rules
    }));

    const totalGames = games.length;
    const totalHanchans = games.reduce((sum, game) => sum + game.hanchanResults.length, 0);
    
    const ranks = mainPlayerGames.map(p => p.rank);
    const scores = mainPlayerGames.map(p => p.finalScore);
    const chips = mainPlayerGames.map(p => p.chips.total);
    
    const rankDistribution = ranks.reduce((acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    return {
      totalGames,
      totalHanchans,
      averageRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      averageFinalPoints: scores.reduce((a, b) => a + b, 0) / scores.length,
      firstPlaceRate: ranks.filter(r => r === 1).length / totalGames,
      topTwoRate: ranks.filter(r => r <= 2).length / totalGames,
      avoidLastRate: ranks.filter(r => r < 4).length / totalGames,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
      chipStats: {
        totalChipsWon: chips.reduce((a, b) => a + b, 0),
        averageChipsPerGame: chips.reduce((a, b) => a + b, 0) / totalGames,
        bestChipGame: Math.max(...chips)
      },
      pointStats: {
        averagePointChange: mainPlayerGames.reduce((sum, game) => {
          const result = this.calculateFinalResult(game, game.rules);
          return sum + result.finalResult;
        }, 0) / totalGames,
        totalPointChange: mainPlayerGames.reduce((sum, game) => {
          const result = this.calculateFinalResult(game, game.rules);
          return sum + result.finalResult;
        }, 0),
        positiveGameRate: mainPlayerGames.filter(game => {
          const result = this.calculateFinalResult(game, game.rules);
          return result.finalResult > 0;
        }).length / totalGames
      }
    };
  }
}