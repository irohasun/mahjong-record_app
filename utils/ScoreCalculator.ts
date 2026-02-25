/**
 * 麻雀スコア計算ユーティリティ
 * 素点から収支（ポイント）を計算するための関数群
 */

/**
 * ルール設定のインターフェース
 */
export interface RuleConfig {
  startingPoints: number;  // 開始持ち点（例: 25000）
  returnPoints: number;    // 返し点（例: 30000）
  uma: number[];           // ウマ（1位〜N位のポイント）
  tobiBonus: number;       // 飛び賞（例: 10）
  tobiBonusEnabled: boolean;  // 飛び賞の有効/無効
  chipEnabled: boolean;    // チップ有効/無効
  chipValue: number;       // チップ1枚あたりのポイント（例: 50）
  playerCount: 3 | 4;      // プレイヤー人数
}

/**
 * デフォルトのルール設定
 * 25000点持ち、30000点返し、ウマ 30/10/-10/-30、飛び賞 10
 */
export const DEFAULT_RULE_CONFIG: RuleConfig = {
  startingPoints: 25000,
  returnPoints: 30000,
  uma: [30, 10, -10, -30],  // 1位, 2位, 3位, 4位
  tobiBonus: 10,            // 飛び賞
  tobiBonusEnabled: false,  // デフォルトはOFF
  chipEnabled: false,       // チップデフォルトはOFF
  chipValue: 2,             // チップ1枚あたり2ポイント
  playerCount: 4,           // 4人麻雀
};

/**
 * 3人麻雀（三麻）のデフォルトルール設定
 * 35000点持ち、40000点返し、ウマ 20/0/-20
 */
export const DEFAULT_SANMA_CONFIG: RuleConfig = {
  startingPoints: 35000,
  returnPoints: 40000,
  uma: [20, 0, -20],        // 1位, 2位, 3位
  tobiBonus: 10,
  tobiBonusEnabled: false,
  chipEnabled: false,
  chipValue: 2,
  playerCount: 3,
};

/**
 * 素点から順位を決定する
 * 同点の場合は同順位（席順考慮なし）
 * 
 * @param rawScores 各プレイヤーの素点（4人分）
 * @returns 各プレイヤーの順位（1〜4）
 */
export function determineRanks(rawScores: (number | null)[]): (1 | 2 | 3 | 4 | null)[] {
  // null値がある場合はそのプレイヤーの順位もnull
  const validScores = rawScores.filter((s): s is number => s !== null);
  if (validScores.length === 0) {
    return rawScores.map(() => null);
  }

  // ユニークな点数を降順にソート
  const uniqueSorted = Array.from(new Set(validScores)).sort((a, b) => b - a);
  
  // 各点数に対応する順位を設定
  const scoreToRank = new Map<number, 1 | 2 | 3 | 4>();
  uniqueSorted.forEach((score, idx) => {
    scoreToRank.set(score, (idx + 1) as 1 | 2 | 3 | 4);
  });

  // 各プレイヤーの順位を返す
  return rawScores.map(score => {
    if (score === null) return null;
    return scoreToRank.get(score) ?? null;
  });
}

/**
 * 素点から収支（ポイント）を計算する
 *
 * 計算式:
 *   基本収支 = (素点 - 返し点) / 1000
 *   オカ = (返し点 - 開始点) × 4 / 1000  （1位のみ）
 *   最終収支 = 基本収支 + ウマ + オカ（1位のみ）
 *
 * @param rawScore プレイヤーの素点
 * @param rank プレイヤーの順位（1〜4）
 * @param config ルール設定
 * @returns 収支（ポイント）
 */
export function calculateFinalScore(
  rawScore: number,
  rank: 1 | 2 | 3 | 4,
  config: RuleConfig = DEFAULT_RULE_CONFIG
): number {
  // 基本計算: (素点 - 返し点) / 1000
  const baseScore = (rawScore - config.returnPoints) / 1000;

  // ウマを加算（1位は index 0）
  const umaValue = config.uma[rank - 1];

  // オカを計算（1位のみ）
  const oka = rank === 1 ? ((config.returnPoints - config.startingPoints) * config.playerCount) / 1000 : 0;

  return baseScore + umaValue + oka;
}

/**
 * 飛び賞を計算して各プレイヤーの収支に加算/減算
 *
 * @param scores 計算済みの収支配列（4人分）
 * @param isTobi 飛び判定配列（4人分）
 * @param tobiWinners 飛ばしたプレイヤーのインデックス配列
 * @param tobiBonus 飛び賞の点数
 * @returns 飛び賞を加算/減算した収支配列
 */
export function applyTobiBonus(
  scores: (number | null)[],
  isTobi: boolean[],
  tobiWinners: number[],
  tobiBonus: number
): (number | null)[] {
  // 飛び賞が無効、または飛ばしたプレイヤーがいない場合はそのまま返す
  if (tobiWinners.length === 0 || tobiBonus === 0) {
    return scores;
  }

  // 飛びプレイヤーの人数をカウント
  const tobiCount = isTobi.filter(t => t).length;

  // 飛びプレイヤーが0人の場合はそのまま返す
  if (tobiCount === 0) {
    return scores;
  }

  // 各飛ばした人が獲得する飛び賞を計算
  const bonusPerWinner = (tobiBonus * tobiCount) / tobiWinners.length;

  // 新しい収支配列を作成（immutability）
  return scores.map((score, index) => {
    if (score === null) return null;

    // 飛んだプレイヤーの場合は飛び賞を減算
    if (isTobi[index]) {
      return score - tobiBonus;
    }

    // 飛ばしたプレイヤーの場合は飛び賞を加算
    if (tobiWinners.includes(index)) {
      return score + bonusPerWinner;
    }

    return score;
  });
}

/**
 * 全プレイヤーの収支を一括計算
 *
 * @param rawScores 各プレイヤーの素点（4人分）
 * @param config ルール設定
 * @param tobiWinners 飛ばしたプレイヤーのインデックス配列（オプション）
 * @returns 各プレイヤーの収支、順位、飛び判定
 */
export function calculateAllScores(
  rawScores: (number | null)[],
  config: RuleConfig = DEFAULT_RULE_CONFIG,
  tobiWinners?: number[]
): { scores: (number | null)[]; ranks: (1 | 2 | 3 | 4 | null)[]; isTobi: boolean[] } {
  const ranks = determineRanks(rawScores);

  let scores = rawScores.map((rawScore, index) => {
    if (rawScore === null || ranks[index] === null) return null;
    return calculateFinalScore(rawScore, ranks[index]!, config);
  });

  // 飛び判定: 素点が0未満（マイナス）の場合
  const isTobi = rawScores.map(rawScore => {
    if (rawScore === null) return false;
    return rawScore < 0;
  });

  // 飛び賞が有効で、飛ばしたプレイヤーがいる場合は飛び賞を加算
  if (config.tobiBonusEnabled && tobiWinners && tobiWinners.length > 0) {
    scores = applyTobiBonus(scores, isTobi, tobiWinners, config.tobiBonus);
  }

  return { scores, ranks, isTobi };
}

/**
 * 素点入力値の自動補完
 * 百点単位に補完する（例: 311 → 31100, 25 → 25000）
 * マイナス値にも対応
 *
 * @param input 入力値
 * @returns 補完後の素点
 */
export function autoCompleteRawScore(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const num = parseInt(trimmed, 10);
  if (isNaN(num)) return null;

  // マイナス値の場合、絶対値で桁数を判定
  const absNum = Math.abs(num);
  const isNegative = num < 0;

  let result: number;

  // 5桁以上ならそのまま返す
  if (absNum >= 10000) {
    result = absNum;
  } else if (absNum >= 1000) {
    // 4桁はそのまま（1000〜9999）
    result = absNum;
  } else if (absNum >= 100) {
    // 3桁は100倍（100〜999 → 10000〜99900）
    result = absNum * 100;
  } else if (absNum >= 10) {
    // 2桁は1000倍（10〜99 → 10000〜99000）
    result = absNum * 1000;
  } else {
    // 1桁は10000倍（1〜9 → 10000〜90000）
    result = absNum * 10000;
  }

  return isNegative ? -result : result;
}

/**
 * 収支を小数点第1位で表示用にフォーマット
 * 
 * @param score 収支
 * @returns フォーマットされた文字列（例: "+113.9", "-58.9"）
 */
export function formatScore(score: number | null): string {
  if (score === null) return '';
  const fixed = score.toFixed(1);
  return score > 0 ? `+${fixed}` : fixed;
}

/**
 * 自動補完ターゲットの検出結果
 */
interface AutoCompleteResult {
  targetIndex: number;       // 未入力プレイヤーのインデックス
  filledScores: number[];    // 入力済みプレイヤーの素点（順序は入力済みの順）
}

/**
 * 3人分の素点から4人目の素点を自動計算する
 * 合計が totalPoints になるように残りの1人分を算出
 *
 * @param threeScores 入力済み3人分の素点
 * @param totalPoints 4人の素点合計（デフォルト: 25000 * 4 = 100000）
 * @returns 4人目の素点、または入力が3人分でない場合はnull
 */
export function calculateFourthPlayerScore(
  otherScores: number[],
  totalPoints: number = DEFAULT_RULE_CONFIG.startingPoints * 4
): number | null {
  if (otherScores.length < 2) {
    return null;
  }

  const sum = otherScores.reduce((acc, score) => acc + score, 0);
  return totalPoints - sum;
}

/**
 * 素点入力配列から、自動補完対象のプレイヤーを検出する
 * ちょうど3人が入力済み（空文字でない有効な数値）で、1人が未入力の場合のみ結果を返す
 *
 * @param rawScores 各プレイヤーの素点文字列（4人分）
 * @returns 自動補完対象の情報、または補完不可の場合はnull
 */
export function detectAutoCompleteTarget(
  rawScores: string[],
  playerCount: number = 4
): AutoCompleteResult | null {
  if (rawScores.length !== playerCount) {
    return null;
  }

  const emptyIndices: number[] = [];
  const filledScores: number[] = [];

  for (let i = 0; i < rawScores.length; i++) {
    const trimmed = rawScores[i].trim();
    if (trimmed === '') {
      emptyIndices.push(i);
    } else {
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed)) {
        return null;
      }
      filledScores.push(parsed);
    }
  }

  // ちょうど1人だけ未入力の場合のみ自動補完対象
  if (emptyIndices.length !== 1) {
    return null;
  }

  return {
    targetIndex: emptyIndices[0],
    filledScores,
  };
}

/**
 * 4人の素点合計が正しいかチェック
 * 通常は (開始持ち点 × 4) = 合計 となるはず
 * 
 * @param rawScores 各プレイヤーの素点
 * @param config ルール設定
 * @returns 合計が正しければtrue
 */
export function validateTotalScore(
  rawScores: (number | null)[],
  config: RuleConfig = DEFAULT_RULE_CONFIG
): boolean {
  const validScores = rawScores.filter((s): s is number => s !== null);
  if (validScores.length !== config.playerCount) return false;

  const total = validScores.reduce((sum, s) => sum + s, 0);
  const expectedTotal = config.startingPoints * config.playerCount;

  // 完全一致のみ許容（誤差0）
  return total === expectedTotal;
}
