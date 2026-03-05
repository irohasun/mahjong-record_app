import { GameRecord } from '@/types/GameRecord';

export interface RankCounts {
  1: number;
  2: number;
  3: number;
  4: number;
}

/**
 * 各半荘での自分の着順をカウント
 */
export function calculateRankCounts(game: GameRecord): RankCounts {
  const rankCounts: RankCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const mainIndex = game.players.findIndex((p) => p.isMainAccount);
  const playerCount = game.players.length || 4;

  if (mainIndex !== -1 && game.rounds && game.rounds.length > 0) {
    for (const r of game.rounds) {
      const rawPoints = (r.points as any[]) || [];
      if (rawPoints.length < playerCount) continue;

      const hasBlank = rawPoints.some(
        (v) => v === null || v === undefined || v === ''
      );
      if (hasBlank) continue;

      const points = rawPoints.map((v) => Number(v) || 0);
      const uniqueSorted = Array.from(new Set(points)).sort((a, b) => b - a);
      const ranksByScore = new Map<number, number>();
      uniqueSorted.forEach((score, idx) => ranksByScore.set(score, idx + 1));

      const myScore = points[mainIndex] ?? 0;
      const myRank = ranksByScore.get(myScore) ?? 4;
      if (myRank >= 1 && myRank <= 4) {
        rankCounts[myRank as keyof RankCounts]++;
      }
    }
  } else {
    const main = game.players.find((p) => p.isMainAccount);
    if (main && main.rank >= 1 && main.rank <= 4) {
      rankCounts[main.rank as keyof RankCounts]++;
    }
  }

  return rankCounts;
}

/**
 * 平均着順を計算
 */
export function calculateAverageRank(
  rankCounts: RankCounts,
  mainPlayerRank: number
): number {
  const roundsPlayed =
    rankCounts[1] + rankCounts[2] + rankCounts[3] + rankCounts[4];

  if (roundsPlayed === 0) return mainPlayerRank;

  return (
    (1 * rankCounts[1] +
      2 * rankCounts[2] +
      3 * rankCounts[3] +
      4 * rankCounts[4]) /
    roundsPlayed
  );
}
