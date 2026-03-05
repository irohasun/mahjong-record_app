/**
 * マルチプレイヤーEloレーティング計算
 * 4人麻雀(6ペア) / 3人麻雀(3ペア) に分解し、各ペアでElo計算
 *
 * 期待勝率: E_ij = 1 / (1 + 10^((R_j - R_i) / 400))
 * 実際結果: S_ij = 1.0(i上位), 0.5(同順位), 0.0(i下位)
 * 変動量:   ΔR_i = Σ_j K * (S_ij - E_ij) / (N - 1)
 */

export interface RatingPlayer {
  readonly accountId: string
  readonly rating: number
  readonly rank: number
  readonly gameCount: number
}

export interface RatingChange {
  readonly accountId: string
  readonly ratingBefore: number
  readonly ratingAfter: number
  readonly ratingChange: number
  readonly rank: number
}

export interface RatingConfig {
  readonly kFactorNew: number
  readonly kFactorNormal: number
  readonly newPlayerThreshold: number
}

export const DEFAULT_RATING_CONFIG: RatingConfig = {
  kFactorNew: 40,
  kFactorNormal: 20,
  newPlayerThreshold: 30,
}

export function getKFactor(gameCount: number, config: RatingConfig = DEFAULT_RATING_CONFIG): number {
  return gameCount < config.newPlayerThreshold ? config.kFactorNew : config.kFactorNormal
}

export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function calculatePairwiseResult(rankA: number, rankB: number): number {
  if (rankA < rankB) return 1.0
  if (rankA > rankB) return 0.0
  return 0.5
}

export function calculateRatingChanges(
  players: readonly RatingPlayer[],
  config: RatingConfig = DEFAULT_RATING_CONFIG
): readonly RatingChange[] {
  const n = players.length
  if (n <= 1) {
    return players.map(p => ({
      accountId: p.accountId,
      ratingBefore: p.rating,
      ratingAfter: p.rating,
      ratingChange: 0,
      rank: p.rank,
    }))
  }

  const rawDeltas = players.map((player, i) => {
    const k = getKFactor(player.gameCount, config)
    let delta = 0
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const expected = calculateExpectedScore(player.rating, players[j].rating)
      const actual = calculatePairwiseResult(player.rank, players[j].rank)
      delta += (k * (actual - expected)) / (n - 1)
    }
    return delta
  })

  // 整数に丸める
  const roundedDeltas = rawDeltas.map(d => Math.round(d))

  // ゼロサム補正: 丸め誤差を1位に吸収
  const totalRounded = roundedDeltas.reduce((sum, d) => sum + d, 0)
  if (totalRounded !== 0) {
    const firstPlaceIndex = players.reduce(
      (minIdx, p, idx) => (p.rank < players[minIdx].rank ? idx : minIdx),
      0
    )
    roundedDeltas[firstPlaceIndex] -= totalRounded
  }

  return players.map((player, i) => ({
    accountId: player.accountId,
    ratingBefore: player.rating,
    ratingAfter: player.rating + roundedDeltas[i],
    ratingChange: roundedDeltas[i],
    rank: player.rank,
  }))
}
