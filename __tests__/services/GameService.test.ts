import { supabase } from '@/lib/supabase';
import { GameService } from '@/services/GameService';

// Mock dependent services
jest.mock('@/services/LocalStorageService', () => ({
  LocalStorageService: {
    saveGames: jest.fn().mockResolvedValue(undefined),
    getGames: jest.fn().mockResolvedValue([]),
    isCacheValid: jest.fn().mockResolvedValue(false),
    saveGame: jest.fn().mockResolvedValue(undefined),
    clearCacheTimestamp: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/SyncService', () => ({
  SyncService: {
    backgroundSync: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/MockDataService', () => ({
  MockDataService: {
    generateMockGameRecords: jest.fn().mockReturnValue([]),
    generateMockPlayerStats: jest.fn().mockReturnValue({
      totalGames: 0,
      averageRank: 0,
      averageScore: 0,
      firstPlaceRate: 0,
      topTwoRate: 0,
      avoidLastRate: 0,
      highestScore: 0,
      lowestScore: 0,
      rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
    }),
    generateChartData: jest.fn().mockReturnValue({ labels: [], scores: [], ranks: [] }),
  },
}));

describe('GameService.getGameSummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated results with hasMore flag', async () => {
    const mockGames = Array.from({ length: 21 }, (_, i) => ({
      id: `game-${i}`,
      account_id: 'test-user',
      date: '2025-01-01',
      location: '',
      game_type: '東南戦',
      rules: {},
      memo: '',
      duration_minutes: null,
      game_end_condition: 'normal',
      final_riichi_sticks: 0,
      final_honba: 0,
      photo_path: null,
      player_records: [],
    }));

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockGames, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await GameService.getGameSummaries('test-user', { page: 0, pageSize: 20 });

    expect(result.hasMore).toBe(true);
    expect(result.games.length).toBe(20);
  });

  it('returns hasMore: false on last page', async () => {
    const mockGames = Array.from({ length: 5 }, (_, i) => ({
      id: `game-${i}`,
      account_id: 'test-user',
      date: '2025-01-01',
      location: '',
      game_type: '東南戦',
      rules: {},
      memo: '',
      duration_minutes: null,
      game_end_condition: 'normal',
      final_riichi_sticks: 0,
      final_honba: 0,
      photo_path: null,
      player_records: [],
    }));

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockGames, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await GameService.getGameSummaries('test-user', { page: 2, pageSize: 20 });

    expect(result.hasMore).toBe(false);
    expect(result.games.length).toBe(5);
  });

  it('does not include round_records in the query', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    await GameService.getGameSummaries('test-user');

    const selectCall = mockChain.select.mock.calls[0][0];
    expect(selectCall).not.toContain('round_records');
    expect(selectCall).toContain('player_records');
  });
});

describe('GameService.getHanchanStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls RPC with correct period bounds for month', async () => {
    const mockResult = {
      totalGames: 10,
      averageRank: 2.3,
      averageScore: 25000,
      firstPlaceRate: 0.3,
      topTwoRate: 0.6,
      avoidLastRate: 0.8,
      highestScore: 45000,
      lowestScore: 5000,
      rankDistribution: { '1': 3, '2': 3, '3': 2, '4': 2 },
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockResult, error: null });

    const selectedDate = new Date(2025, 5, 15); // June 2025
    const result = await GameService.getHanchanStats('test-user', 'month', selectedDate);

    expect(supabase.rpc).toHaveBeenCalledWith('get_player_stats', {
      user_id: 'test-user',
      period_start: '2025-06-01',
      period_end: '2025-06-30',
    });

    expect(result.totalGames).toBe(10);
    expect(result.averageRank).toBe(2.3);
    expect(result.rankDistribution[1]).toBe(3);
  });

  it('calls RPC with null bounds for all period', async () => {
    const mockResult = {
      totalGames: 5,
      averageRank: 2.0,
      averageScore: 30000,
      firstPlaceRate: 0.4,
      topTwoRate: 0.6,
      avoidLastRate: 0.8,
      highestScore: 50000,
      lowestScore: 10000,
      rankDistribution: { '1': 2, '2': 1, '3': 1, '4': 1 },
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockResult, error: null });

    await GameService.getHanchanStats('test-user', 'all', new Date());

    expect(supabase.rpc).toHaveBeenCalledWith('get_player_stats', {
      user_id: 'test-user',
      period_start: null,
      period_end: null,
    });
  });

  it('returns default stats when no data', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: { totalGames: 0 }, error: null });

    const result = await GameService.getHanchanStats('test-user', 'month', new Date());

    expect(result.totalGames).toBe(0);
    expect(result.averageRank).toBe(0);
  });
});

describe('GameService.getChartData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls RPC with correct period bounds', async () => {
    const mockResult = {
      scores: [],
      rankHistory: [
        { date: '2025-01-01', rank: 1 },
        { date: '2025-01-02', rank: 3 },
      ],
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockResult, error: null });

    const selectedDate = new Date(2025, 0, 15); // January 2025
    const result = await GameService.getChartData('test-user', 'month', selectedDate);

    expect(supabase.rpc).toHaveBeenCalledWith('get_chart_data', {
      user_id: 'test-user',
      period_start: '2025-01-01',
      period_end: '2025-01-31',
    });

    // Ranks should be reversed from DESC to ASC
    expect(result.ranks).toEqual([3, 1]);
    expect(result.labels).toEqual(['1', '2']);
  });

  it('returns empty data when no chart data exists', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

    const result = await GameService.getChartData('test-user', 'month', new Date());

    expect(result.labels).toEqual([]);
    expect(result.scores).toEqual([]);
    expect(result.ranks).toEqual([]);
  });

  it('returns ranks: [] in error fallback (H-7)', async () => {
    (supabase.rpc as jest.Mock).mockRejectedValue(new Error('RPC failure'));

    const result = await GameService.getChartData('test-user', 'month', new Date());

    expect(result).toEqual({ labels: [], scores: [], ranks: [] });
  });
});

describe('GameService.getGameSummaries - N+1 fetch pattern (H-2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches pageSize+1 rows via range(from, from+pageSize)', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    await GameService.getGameSummaries('test-user', { page: 0, pageSize: 20 });

    // N+1 pattern: range(0, 20) fetches indices 0..20 = 21 rows
    expect(mockChain.range).toHaveBeenCalledWith(0, 20);
  });

  it('slices to pageSize and sets hasMore=true when N+1 rows returned', async () => {
    const mockGames = Array.from({ length: 21 }, (_, i) => ({
      id: `game-${i}`,
      account_id: 'test-user',
      date: '2025-01-01',
      location: '',
      game_type: '東南戦',
      rules: {},
      memo: '',
      duration_minutes: null,
      game_end_condition: 'normal',
      final_riichi_sticks: 0,
      final_honba: 0,
      photo_path: null,
      player_records: [],
    }));

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockGames, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await GameService.getGameSummaries('test-user', { page: 0, pageSize: 20 });

    expect(result.games.length).toBe(20);
    expect(result.hasMore).toBe(true);
  });
});
