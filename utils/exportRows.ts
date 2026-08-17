// 対局履歴エクスポート用の共通データ変換ヘルパー
import { GameRecord } from '@/types/GameRecord';

export function parseRawScores(memo: string | undefined, playerCount: number): (number | null)[] {
  if (!memo) {
    return Array(playerCount).fill(null);
  }
  try {
    const parsed = JSON.parse(memo);
    if (Array.isArray(parsed?.rawScores)) {
      return parsed.rawScores;
    }
    return Array(playerCount).fill(null);
  } catch {
    return Array(playerCount).fill(null);
  }
}

export interface SessionTotals {
  hanchanOnlyTotal: number[];
  chipCounts: number[];
  totalWithChips: number[];
}

export function computeSessionTotals(game: GameRecord): SessionTotals {
  const playerCount = game.players.length;
  const rounds = game.rounds ?? [];

  const hanchanOnlyTotal = Array(playerCount).fill(0);
  rounds.forEach((round) => {
    round.points.forEach((point, i) => {
      if (i < playerCount) {
        hanchanOnlyTotal[i] += point;
      }
    });
  });

  const chipValue = game.rules.chipValue ?? 0;
  const chipCounts = game.chipCounts ?? Array(playerCount).fill(0);
  const totalWithChips = hanchanOnlyTotal.map((total, i) => total + (chipCounts[i] ?? 0) * chipValue);

  return { hanchanOnlyTotal, chipCounts, totalWithChips };
}
