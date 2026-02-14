import { calculateRankCounts, calculateAverageRank, RankCounts } from '@/utils/rankCalculation';
import { GameRecord } from '@/types/GameRecord';

const baseGame: GameRecord = {
  id: 'game-1',
  accountId: 'test-user',
  date: '2025-01-01',
  location: '',
  gameType: '東南戦',
  rules: { startingPoints: 25000, uma: '+15 +5 -5 -15', oka: 0, riichiStick: 1000, honbaValue: 300 },
  players: [
    { name: 'Player1', finalScore: 30000, rank: 1, isMainAccount: true, startingPosition: 'East' },
    { name: 'Player2', finalScore: 28000, rank: 2, isMainAccount: false, startingPosition: 'South' },
    { name: 'Player3', finalScore: 22000, rank: 3, isMainAccount: false, startingPosition: 'West' },
    { name: 'Player4', finalScore: 20000, rank: 4, isMainAccount: false, startingPosition: 'North' },
  ],
  rounds: [],
  finalRiichiSticks: 0,
  finalHonba: 0,
  gameEndCondition: 'normal',
};

describe('calculateRankCounts', () => {
  it('uses player.rank when no rounds exist', () => {
    const result = calculateRankCounts(baseGame);
    expect(result).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0 });
  });

  it('calculates rank from round points when rounds exist', () => {
    const gameWithRounds: GameRecord = {
      ...baseGame,
      rounds: [
        { round: '東1局', honba: 0, riichiSticks: 0, handType: 'tsumo', points: [35000, 25000, 22000, 18000], memo: '' },
        { round: '東2局', honba: 0, riichiSticks: 0, handType: 'ron', points: [18000, 30000, 27000, 25000], memo: '' },
      ],
    };

    const result = calculateRankCounts(gameWithRounds);
    // Round 1: Player1 has 35000 -> rank 1
    // Round 2: Player1 has 18000 -> rank 4
    expect(result).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1 });
  });

  it('skips rounds with incomplete points', () => {
    const gameWithIncomplete: GameRecord = {
      ...baseGame,
      rounds: [
        { round: '東1局', honba: 0, riichiSticks: 0, handType: 'tsumo', points: [35000, 25000, 22000, 18000], memo: '' },
        { round: '東2局', honba: 0, riichiSticks: 0, handType: 'ron', points: [18000, null as any, 27000], memo: '' },
      ],
    };

    const result = calculateRankCounts(gameWithIncomplete);
    expect(result).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0 });
  });

  it('handles tied scores correctly', () => {
    const gameWithTie: GameRecord = {
      ...baseGame,
      rounds: [
        { round: '東1局', honba: 0, riichiSticks: 0, handType: 'draw', points: [25000, 25000, 25000, 25000], memo: '' },
      ],
    };

    const result = calculateRankCounts(gameWithTie);
    // All same score -> all rank 1
    expect(result).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0 });
  });
});

describe('calculateAverageRank', () => {
  it('calculates weighted average from rank counts', () => {
    const counts: RankCounts = { 1: 2, 2: 1, 3: 1, 4: 0 };
    // (1*2 + 2*1 + 3*1 + 4*0) / 4 = 7/4 = 1.75
    expect(calculateAverageRank(counts, 0)).toBeCloseTo(1.75);
  });

  it('returns mainPlayerRank when no rounds played', () => {
    const counts: RankCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    expect(calculateAverageRank(counts, 3)).toBe(3);
  });

  it('handles all fourth place', () => {
    const counts: RankCounts = { 1: 0, 2: 0, 3: 0, 4: 5 };
    expect(calculateAverageRank(counts, 0)).toBe(4);
  });
});
