// 麻雀対局記録アプリの型定義

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
  memo?: string;
  duration?: number; // ゲーム時間（分）
  gameEndCondition: 'normal' | 'bankruptcy' | 'timeout' | 'time_limit'; // 終了条件
  photoPath?: string; // ストレージ上の写真パス
}

export interface GameRules {
  startingPoints: number; // 開始持ち点
  uma: string; // ウマ（例："+15 +5 -5 -15"）
  oka: number; // オカ（返し点との差額）
  riichiStick: number; // 立直棒（通常1000点）
  honbaValue: number; // 本場の価値（通常300点）
  tobiBonusEnabled?: boolean; // 飛び賞の有効/無効
  tobiBonus?: number; // 飛び賞の点数
}

export interface PlayerStats {
  totalGames: number;
  averageRank: number;
  averageScore: number;
  firstPlaceRate: number;
  topTwoRate: number;
  avoidLastRate: number;
  highestScore: number;
  lowestScore: number;
  maxConsecutiveWins: number;
  rankDistribution: { [key: number]: number };
}