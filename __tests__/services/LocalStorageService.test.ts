import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalStorageService } from '@/services/LocalStorageService';

// Reset mock store before each test
beforeEach(() => {
  (AsyncStorage as any)._resetStore();
  jest.clearAllMocks();
});

describe('LocalStorageService - Account Cache', () => {
  const mockAccount = {
    id: 'test-user-id',
    username: 'TestUser',
    email: 'test@example.com',
    is_premium: false,
    monthly_game_count: 5,
    last_reset_date: '2025-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('saveAccount', () => {
    it('stores data and updates timestamp', async () => {
      await LocalStorageService.saveAccount(mockAccount);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'mahjong_account',
        JSON.stringify(mockAccount)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'mahjong_account_cache_timestamp',
        expect.any(String)
      );
    });
  });

  describe('getAccount', () => {
    it('returns saved data', async () => {
      await LocalStorageService.saveAccount(mockAccount);
      const result = await LocalStorageService.getAccount();
      expect(result).toEqual(mockAccount);
    });

    it('returns null when empty', async () => {
      const result = await LocalStorageService.getAccount();
      expect(result).toBeNull();
    });
  });

  describe('isAccountCacheValid', () => {
    it('returns true within expiry window', async () => {
      await LocalStorageService.saveAccount(mockAccount);
      const isValid = await LocalStorageService.isAccountCacheValid();
      expect(isValid).toBe(true);
    });

    it('returns false when expired', async () => {
      await LocalStorageService.saveAccount(mockAccount);

      // Override the timestamp to 31 minutes ago
      const expiredTime = Date.now() - 31 * 60 * 1000;
      await AsyncStorage.setItem(
        'mahjong_account_cache_timestamp',
        expiredTime.toString()
      );

      const isValid = await LocalStorageService.isAccountCacheValid();
      expect(isValid).toBe(false);
    });

    it('returns false when no timestamp exists', async () => {
      const isValid = await LocalStorageService.isAccountCacheValid();
      expect(isValid).toBe(false);
    });
  });

  describe('clearAccountCache', () => {
    it('removes both account and timestamp keys', async () => {
      await LocalStorageService.saveAccount(mockAccount);
      await LocalStorageService.clearAccountCache();

      const account = await LocalStorageService.getAccount();
      expect(account).toBeNull();

      const isValid = await LocalStorageService.isAccountCacheValid();
      expect(isValid).toBe(false);
    });
  });
});

describe('LocalStorageService - saveGame immutability (H-3)', () => {
  const makeGame = (id: string, location: string) => ({
    id,
    accountId: 'user-1',
    date: '2025-01-01',
    location,
    gameType: '東南戦' as const,
    rules: {
      startingPoints: 25000,
      uma: '+15 +5 -5 -15',
      oka: 0,
      riichiStick: 1000,
      honbaValue: 300,
    },
    memo: '',
    duration: undefined,
    gameEndCondition: 'normal' as const,
    finalRiichiSticks: 0,
    finalHonba: 0,
    players: [],
    rounds: [],
  });

  it('adds a new game without mutating the existing array', async () => {
    const game1 = makeGame('g1', 'Location A');
    const game2 = makeGame('g2', 'Location B');

    await LocalStorageService.saveGame(game1);

    // Capture snapshot before second save
    const beforeSecondSave = await LocalStorageService.getGames();
    expect(beforeSecondSave).toHaveLength(1);

    await LocalStorageService.saveGame(game2);

    const afterSecondSave = await LocalStorageService.getGames();
    expect(afterSecondSave).toHaveLength(2);
    expect(afterSecondSave[0].id).toBe('g1');
    expect(afterSecondSave[1].id).toBe('g2');
  });

  it('updates an existing game without mutating the array', async () => {
    const game = makeGame('g1', 'Location A');
    await LocalStorageService.saveGame(game);

    const updated = { ...game, location: 'Location B' };
    await LocalStorageService.saveGame(updated);

    const games = await LocalStorageService.getGames();
    expect(games).toHaveLength(1);
    expect(games[0].location).toBe('Location B');
  });
});

describe('LocalStorageService - Stats Cache', () => {
  const mockStats = {
    totalGames: 10,
    averageRank: 2.5,
    firstPlaceRate: 0.3,
    rankDistribution: { 1: 3, 2: 3, 3: 2, 4: 2 },
  };

  describe('saveStatsForPeriod / getStatsForPeriod', () => {
    it('stores and retrieves stats for a period key', async () => {
      await LocalStorageService.saveStatsForPeriod('2025-01', mockStats);
      const result = await LocalStorageService.getStatsForPeriod('2025-01');
      expect(result).toEqual(mockStats);
    });

    it('returns null for non-existent key', async () => {
      const result = await LocalStorageService.getStatsForPeriod('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when stats cache is expired', async () => {
      await LocalStorageService.saveStatsForPeriod('2025-01', mockStats);

      // Override timestamp to 6 minutes ago (expiry is 5 min)
      const expiredTime = Date.now() - 6 * 60 * 1000;
      await AsyncStorage.setItem(
        'mahjong_stats_cache_ts_2025-01',
        expiredTime.toString()
      );

      const result = await LocalStorageService.getStatsForPeriod('2025-01');
      expect(result).toBeNull();
    });
  });
});
