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
  chipValue: 1,             // チップ1枚あたり1ポイント
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
  chipValue: 1,
  playerCount: 3,
};

/**
 * 素点から順位を決定する（Standard Competition Ranking）
 * 順位 = 1 + 自分より素点が高いプレイヤーの人数
 * 同点の場合は上位の順位を共有し、下位のプレイヤーはその分だけ順位が下がる
 * 例: [1位/2位/2位/4位] — 2位タイが2人いると最下位は4位になる
 *
 * @param rawScores 各プレイヤーの素点
 * @returns 各プレイヤーの順位（1〜4）
 */
export function determineRanks(rawScores: (number | null)[]): (1 | 2 | 3 | 4 | null)[] {
  const validScores = rawScores.filter((s): s is number => s !== null);
  if (validScores.length === 0) {
    return rawScores.map(() => null);
  }

  return rawScores.map(score => {
    if (score === null) return null;
    const rank = 1 + validScores.filter(s => s > score).length;
    return rank as 1 | 2 | 3 | 4;
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
 * 同点プレイヤーの按分ウマを計算する
 * 同じ順位のプレイヤーが複数いる場合、該当順位が占めるポジションのウマを平均する
 * 例: ranks=[1,2,2,3], uma=[30,10,-10,-30] → [30, 0, 0, -30]
 */
function getAdjustedUmaValues(
  ranks: (1 | 2 | 3 | 4 | null)[],
  uma: number[]
): (number | null)[] {
  const rankCounts = new Map<number, number>();
  ranks.forEach(r => {
    if (r !== null) rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1);
  });

  const sortedRanks = Array.from(rankCounts.keys()).sort((a, b) => a - b);
  const adjustedUmaByRank = new Map<number, number>();
  let positionOffset = 0;

  sortedRanks.forEach(rank => {
    const count = rankCounts.get(rank)!;
    let umaSum = 0;
    for (let i = 0; i < count; i++) {
      umaSum += uma[positionOffset + i] ?? 0;
    }
    adjustedUmaByRank.set(rank, umaSum / count);
    positionOffset += count;
  });

  return ranks.map(rank => (rank === null ? null : adjustedUmaByRank.get(rank) ?? 0));
}

/**
 * 全プレイヤーの収支を一括計算
 * 同点の場合は該当ポジションのウマを按分して適用する
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
  const adjustedUma = getAdjustedUmaValues(ranks, config.uma);

  let scores = rawScores.map((rawScore, index) => {
    if (rawScore === null || ranks[index] === null || adjustedUma[index] === null) return null;
    const baseScore = (rawScore - config.returnPoints) / 1000;
    const umaValue = adjustedUma[index]!;
    const oka = ranks[index] === 1
      ? ((config.returnPoints - config.startingPoints) * config.playerCount) / 1000
      : 0;
    return baseScore + umaValue + oka;
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
 * 精算点（収支）から素点を逆算する（飛び賞なし）
 *
 * 逆算式:
 *   rawScore = (finalScore - uma[rank-1] - oka) * 1000 + returnPoints
 *
 * @param finalScores 各プレイヤーの精算点
 * @param config ルール設定
 * @returns 各プレイヤーの素点（100点単位に丸め）
 */
function reverseWithoutTobi(finalScores: number[], config: RuleConfig): number[] {
  const uniqueSorted = [...new Set(finalScores)].sort((a, b) => b - a);
  const ranks = finalScores.map(s => (uniqueSorted.indexOf(s) + 1) as 1 | 2 | 3 | 4);
  const adjustedUma = getAdjustedUmaValues(ranks, config.uma);

  return finalScores.map((fs, i) => {
    const rank = ranks[i];
    const oka = rank === 1
      ? ((config.returnPoints - config.startingPoints) * config.playerCount) / 1000
      : 0;
    const umaValue = adjustedUma[i] ?? 0;
    const rawScore = (fs - umaValue - oka) * 1000 + config.returnPoints;
    return Math.round(rawScore / 100) * 100;
  });
}

/**
 * 精算点（収支）+ ルール設定から素点を逆算する
 * 飛び賞が有効な場合は飛び賞の逆算も行う
 *
 * @param finalScores 各プレイヤーの精算点
 * @param config ルール設定
 * @param tobiWinners 飛ばしたプレイヤーのインデックス配列（オプション）
 * @returns 各プレイヤーの素点
 */
export function reverseCalculateRawScores(
  finalScores: number[],
  config: RuleConfig,
  tobiWinners?: number[]
): number[] {
  let scores = [...finalScores];

  if (config.tobiBonusEnabled && tobiWinners && tobiWinners.length > 0) {
    const tempRaw = reverseWithoutTobi(scores, config);
    const isTobi = tempRaw.map(r => r < 0);
    const tobiCount = isTobi.filter(t => t).length;

    if (tobiCount > 0) {
      const bonusPerWinner = (config.tobiBonus * tobiCount) / tobiWinners.length;
      scores = scores.map((s, i) => {
        if (isTobi[i]) return s + config.tobiBonus;
        if (tobiWinners.includes(i)) return s - bonusPerWinner;
        return s;
      });
    }
  }

  return reverseWithoutTobi(scores, config);
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
    // 3桁の場合: 100の倍数はキーボード入力済みの完成値（例: 800 → 800）
    // 100の倍数でない場合はショートフォーム（例: 311 → 31100）
    result = (absNum % 100 === 0) ? absNum : absNum * 100;
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
