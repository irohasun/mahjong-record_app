import {
  getKFactor,
  calculateExpectedScore,
  calculatePairwiseResult,
  calculateRatingChanges,
  DEFAULT_RATING_CONFIG,
  RatingPlayer,
  RatingConfig,
} from '@/utils/RatingCalculator'

describe('getKFactor', () => {
  it('新規プレイヤー（0局）はK=40を返す', () => {
    expect(getKFactor(0)).toBe(40)
  })

  it('新規プレイヤー（29局）はK=40を返す', () => {
    expect(getKFactor(29)).toBe(40)
  })

  it('通常プレイヤー（30局）はK=20を返す', () => {
    expect(getKFactor(30)).toBe(20)
  })

  it('通常プレイヤー（100局）はK=20を返す', () => {
    expect(getKFactor(100)).toBe(20)
  })

  it('カスタムconfigを使用する', () => {
    const config: RatingConfig = {
      kFactorNew: 50,
      kFactorNormal: 10,
      newPlayerThreshold: 20,
    }
    expect(getKFactor(19, config)).toBe(50)
    expect(getKFactor(20, config)).toBe(10)
  })
})

describe('calculateExpectedScore', () => {
  it('同レートでは0.5を返す', () => {
    expect(calculateExpectedScore(1500, 1500)).toBe(0.5)
  })

  it('Aが400高い場合、約0.909を返す', () => {
    const result = calculateExpectedScore(1900, 1500)
    expect(result).toBeCloseTo(0.909, 2)
  })

  it('Aが400低い場合、約0.091を返す', () => {
    const result = calculateExpectedScore(1100, 1500)
    expect(result).toBeCloseTo(0.091, 2)
  })

  it('対称性: E(A,B) + E(B,A) = 1', () => {
    const eAB = calculateExpectedScore(1600, 1400)
    const eBA = calculateExpectedScore(1400, 1600)
    expect(eAB + eBA).toBeCloseTo(1.0, 10)
  })

  it('大きなレート差でも0〜1の範囲内', () => {
    const result = calculateExpectedScore(2500, 1000)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })
})

describe('calculatePairwiseResult', () => {
  it('Aが上位（rank小さい）なら1.0を返す', () => {
    expect(calculatePairwiseResult(1, 3)).toBe(1.0)
  })

  it('Aが下位（rank大きい）なら0.0を返す', () => {
    expect(calculatePairwiseResult(4, 2)).toBe(0.0)
  })

  it('同順位なら0.5を返す', () => {
    expect(calculatePairwiseResult(2, 2)).toBe(0.5)
  })
})

describe('calculateRatingChanges', () => {
  describe('基本動作', () => {
    it('4人プレイヤーで正しい数のRatingChangeを返す', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result).toHaveLength(4)
    })

    it('3人プレイヤーで正しい数のRatingChangeを返す', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result).toHaveLength(3)
    })

    it('各RatingChangeにaccountIdが正しくセットされる', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result.map(r => r.accountId)).toEqual(['a', 'b', 'c', 'd'])
    })
  })

  describe('ゼロサム', () => {
    it('同レートのプレイヤーでゼロサムが保証される', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      const totalChange = result.reduce((sum, r) => sum + r.ratingChange, 0)
      expect(totalChange).toBe(0)
    })

    it('異なるレートのプレイヤーでもゼロサムが保証される', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1800, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1600, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1400, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1200, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      const totalChange = result.reduce((sum, r) => sum + r.ratingChange, 0)
      expect(totalChange).toBe(0)
    })

    it('3人麻雀でもゼロサムが保証される', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1700, rank: 1, gameCount: 10 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 40 },
        { accountId: 'c', rating: 1300, rank: 3, gameCount: 80 },
      ]
      const result = calculateRatingChanges(players)
      const totalChange = result.reduce((sum, r) => sum + r.ratingChange, 0)
      expect(totalChange).toBe(0)
    })

    it('K-factorが混在してもゼロサムが保証される', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 5 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 10 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 100 },
      ]
      const result = calculateRatingChanges(players)
      const totalChange = result.reduce((sum, r) => sum + r.ratingChange, 0)
      expect(totalChange).toBe(0)
    })
  })

  describe('順位依存', () => {
    it('1位はレーティングが上がる（同レート時）', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result[0].ratingChange).toBeGreaterThan(0)
    })

    it('4位はレーティングが下がる（同レート時）', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result[3].ratingChange).toBeLessThan(0)
    })

    it('1位の変動量 > 2位の変動量（同レート時）', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result[0].ratingChange).toBeGreaterThan(result[1].ratingChange)
    })

    it('3位の変動量 > 4位の変動量（4位の方が多く下がる）', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result[2].ratingChange).toBeGreaterThan(result[3].ratingChange)
    })
  })

  describe('レート差の影響', () => {
    it('高レートが1位になっても変動は小さい', () => {
      const expectedWin: RatingPlayer[] = [
        { accountId: 'a', rating: 1800, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1200, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1200, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1200, rank: 4, gameCount: 50 },
      ]
      const equalWin: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const resultExpected = calculateRatingChanges(expectedWin)
      const resultEqual = calculateRatingChanges(equalWin)
      expect(resultExpected[0].ratingChange).toBeLessThan(resultEqual[0].ratingChange)
    })

    it('低レートが1位になると変動は大きい', () => {
      const upsetWin: RatingPlayer[] = [
        { accountId: 'a', rating: 1200, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1800, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1800, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1800, rank: 4, gameCount: 50 },
      ]
      const equalWin: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 4, gameCount: 50 },
      ]
      const resultUpset = calculateRatingChanges(upsetWin)
      const resultEqual = calculateRatingChanges(equalWin)
      expect(resultUpset[0].ratingChange).toBeGreaterThan(resultEqual[0].ratingChange)
    })
  })

  describe('ratingBefore / ratingAfter', () => {
    it('ratingAfter = ratingBefore + ratingChange', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1600, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1400, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1300, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      for (const change of result) {
        expect(change.ratingAfter).toBe(change.ratingBefore + change.ratingChange)
      }
    })

    it('ratingBeforeは元のレーティングと一致', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1600, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
        { accountId: 'c', rating: 1400, rank: 3, gameCount: 50 },
        { accountId: 'd', rating: 1300, rank: 4, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result[0].ratingBefore).toBe(1600)
      expect(result[1].ratingBefore).toBe(1500)
      expect(result[2].ratingBefore).toBe(1400)
      expect(result[3].ratingBefore).toBe(1300)
    })
  })

  describe('ratingChangeは整数', () => {
    it('全てのratingChangeが整数値', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1523, rank: 1, gameCount: 15 },
        { accountId: 'b', rating: 1487, rank: 2, gameCount: 45 },
        { accountId: 'c', rating: 1501, rank: 3, gameCount: 33 },
        { accountId: 'd', rating: 1499, rank: 4, gameCount: 7 },
      ]
      const result = calculateRatingChanges(players)
      for (const change of result) {
        expect(Number.isInteger(change.ratingChange)).toBe(true)
        expect(Number.isInteger(change.ratingAfter)).toBe(true)
      }
    })
  })

  describe('エッジケース', () => {
    it('2人のプレイヤーでも動作する', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 2, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result).toHaveLength(2)
      const totalChange = result.reduce((sum, r) => sum + r.ratingChange, 0)
      expect(totalChange).toBe(0)
    })

    it('全員同順位なら変動なし（同レート時）', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'b', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'c', rating: 1500, rank: 1, gameCount: 50 },
        { accountId: 'd', rating: 1500, rank: 1, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      for (const change of result) {
        expect(change.ratingChange).toBe(0)
      }
    })

    it('空配列なら空配列を返す', () => {
      const result = calculateRatingChanges([])
      expect(result).toEqual([])
    })

    it('1人だけなら変動なし', () => {
      const players: RatingPlayer[] = [
        { accountId: 'a', rating: 1500, rank: 1, gameCount: 50 },
      ]
      const result = calculateRatingChanges(players)
      expect(result).toHaveLength(1)
      expect(result[0].ratingChange).toBe(0)
    })
  })
})
