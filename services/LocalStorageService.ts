import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameRecord, PlayerStats } from '@/types/GameRecord';

// ストレージキー
const STORAGE_KEYS = {
  GAMES: 'mahjong_games',
  STATS: 'mahjong_stats',
  LAST_SYNC: 'mahjong_last_sync',
  PENDING_CHANGES: 'mahjong_pending_changes',
  CACHE_TIMESTAMP: 'mahjong_cache_timestamp',
  ACCOUNT: 'mahjong_account',
  ACCOUNT_CACHE_TIMESTAMP: 'mahjong_account_cache_timestamp',
  STATS_CACHE_PREFIX: 'mahjong_stats_cache_',
  STATS_CACHE_TIMESTAMP_PREFIX: 'mahjong_stats_cache_ts_',
} as const;

// キャッシュ有効期限（24時間）
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// アカウントキャッシュ有効期限（30分）
const ACCOUNT_CACHE_EXPIRY = 30 * 60 * 1000;

// 統計キャッシュ有効期限（5分）
const STATS_CACHE_EXPIRY = 5 * 60 * 1000;

export class LocalStorageService {
  // ゲームデータの保存
  static async saveGames(games: GameRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
      await AsyncStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      throw error;
    }
  }

  // ゲームデータの取得
  static async getGames(): Promise<GameRecord[]> {
    try {
      const gamesJson = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
      if (!gamesJson) return [];
      return JSON.parse(gamesJson) as GameRecord[];
    } catch (error) {
      return [];
    }
  }

  // 単一ゲームの保存
  static async saveGame(game: GameRecord): Promise<void> {
    try {
      const games = await this.getGames();
      const existingIndex = games.findIndex(g => g.id === game.id);

      const updatedGames = existingIndex >= 0
        ? games.map((g, i) => (i === existingIndex ? game : g))
        : [...games, game];

      await this.saveGames(updatedGames);
    } catch (error) {
      throw error;
    }
  }

  // 単一ゲームの取得
  static async getGame(gameId: string): Promise<GameRecord | null> {
    try {
      const games = await this.getGames();
      return games.find(g => g.id === gameId) || null;
    } catch (error) {
      return null;
    }
  }

  // 統計データの保存
  static async saveStats(stats: PlayerStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (error) {
      throw error;
    }
  }

  // 統計データの取得
  static async getStats(): Promise<PlayerStats | null> {
    try {
      const statsJson = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      if (!statsJson) return null;
      return JSON.parse(statsJson) as PlayerStats;
    } catch (error) {
      return null;
    }
  }

  // 最後の同期時刻を保存
  static async saveLastSync(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      // silent failure
    }
  }

  // 最後の同期時刻を取得
  static async getLastSync(): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  // キャッシュが有効かチェック
  static async isCacheValid(): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
      if (!timestamp) return false;

      const cacheTime = parseInt(timestamp, 10);
      return (Date.now() - cacheTime) < CACHE_EXPIRY;
    } catch (error) {
      return false;
    }
  }

  // 保留中の変更を保存
  static async savePendingChanges(changes: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(changes));
    } catch (error) {
      // silent failure
    }
  }

  // 保留中の変更を取得
  static async getPendingChanges(): Promise<any[]> {
    try {
      const changesJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
      if (!changesJson) return [];
      return JSON.parse(changesJson);
    } catch (error) {
      return [];
    }
  }

  // 保留中の変更をクリア
  static async clearPendingChanges(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES);
    } catch (error) {
      // silent failure
    }
  }

  // 全データをクリア
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      // silent failure
    }
  }

  // キャッシュタイムスタンプをクリア
  static async clearCacheTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHE_TIMESTAMP);
    } catch (error) {
      // silent failure
    }
  }

  // アカウントデータの保存
  static async saveAccount(account: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
      await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT_CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      throw new Error('Failed to save account to local storage');
    }
  }

  // アカウントデータの取得
  static async getAccount(): Promise<any | null> {
    try {
      const accountJson = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT);
      if (!accountJson) return null;
      return JSON.parse(accountJson);
    } catch (error) {
      return null;
    }
  }

  // アカウントキャッシュが有効かチェック
  static async isAccountCacheValid(): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_CACHE_TIMESTAMP);
      if (!timestamp) return false;

      const cacheTime = parseInt(timestamp, 10);
      return (Date.now() - cacheTime) < ACCOUNT_CACHE_EXPIRY;
    } catch (error) {
      return false;
    }
  }

  // アカウントキャッシュをクリア
  static async clearAccountCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCOUNT,
        STORAGE_KEYS.ACCOUNT_CACHE_TIMESTAMP,
      ]);
    } catch (error) {
      // silent failure
    }
  }

  // 統計データのキャッシュ保存（期間キー付き）
  static async saveStatsForPeriod(key: string, data: any): Promise<void> {
    try {
      const storageKey = STORAGE_KEYS.STATS_CACHE_PREFIX + key;
      const tsKey = STORAGE_KEYS.STATS_CACHE_TIMESTAMP_PREFIX + key;
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      await AsyncStorage.setItem(tsKey, Date.now().toString());
    } catch (error) {
      // silent failure
    }
  }

  // 統計データのキャッシュ取得（期間キー付き）
  static async getStatsForPeriod(key: string): Promise<any | null> {
    try {
      const storageKey = STORAGE_KEYS.STATS_CACHE_PREFIX + key;
      const tsKey = STORAGE_KEYS.STATS_CACHE_TIMESTAMP_PREFIX + key;

      const timestamp = await AsyncStorage.getItem(tsKey);
      if (!timestamp) return null;

      const cacheTime = parseInt(timestamp, 10);
      if ((Date.now() - cacheTime) >= STATS_CACHE_EXPIRY) return null;

      const dataJson = await AsyncStorage.getItem(storageKey);
      if (!dataJson) return null;

      return JSON.parse(dataJson);
    } catch (error) {
      return null;
    }
  }
}
