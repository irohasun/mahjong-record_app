import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameRecord, PlayerStats } from '@/types/GameRecord';

// ストレージキー
const STORAGE_KEYS = {
  GAMES: 'mahjong_games',
  STATS: 'mahjong_stats',
  LAST_SYNC: 'mahjong_last_sync',
  PENDING_CHANGES: 'mahjong_pending_changes',
  CACHE_TIMESTAMP: 'mahjong_cache_timestamp',
} as const;

// キャッシュ有効期限（24時間）
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

export class LocalStorageService {
  // ゲームデータの保存
  static async saveGames(games: GameRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
      await AsyncStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
      console.log('✅ DEBUG: Games saved to local storage:', games.length);
    } catch (error) {
      console.error('❌ DEBUG: Failed to save games to local storage:', error);
      throw error;
    }
  }

  // ゲームデータの取得
  static async getGames(): Promise<GameRecord[]> {
    try {
      const gamesJson = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
      if (!gamesJson) return [];
      
      const games = JSON.parse(gamesJson) as GameRecord[];
      console.log('✅ DEBUG: Games loaded from local storage:', games.length);
      return games;
    } catch (error) {
      console.error('❌ DEBUG: Failed to load games from local storage:', error);
      return [];
    }
  }

  // 単一ゲームの保存
  static async saveGame(game: GameRecord): Promise<void> {
    try {
      const games = await this.getGames();
      const existingIndex = games.findIndex(g => g.id === game.id);
      
      if (existingIndex >= 0) {
        games[existingIndex] = game;
      } else {
        games.push(game);
      }
      
      await this.saveGames(games);
      console.log('✅ DEBUG: Game saved to local storage:', game.id);
    } catch (error) {
      console.error('❌ DEBUG: Failed to save game to local storage:', error);
      throw error;
    }
  }

  // 単一ゲームの取得
  static async getGame(gameId: string): Promise<GameRecord | null> {
    try {
      const games = await this.getGames();
      const game = games.find(g => g.id === gameId);
      return game || null;
    } catch (error) {
      console.error('❌ DEBUG: Failed to get game from local storage:', error);
      return null;
    }
  }

  // 統計データの保存
  static async saveStats(stats: PlayerStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      console.log('✅ DEBUG: Stats saved to local storage');
    } catch (error) {
      console.error('❌ DEBUG: Failed to save stats to local storage:', error);
      throw error;
    }
  }

  // 統計データの取得
  static async getStats(): Promise<PlayerStats | null> {
    try {
      const statsJson = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      if (!statsJson) return null;
      
      const stats = JSON.parse(statsJson) as PlayerStats;
      console.log('✅ DEBUG: Stats loaded from local storage');
      return stats;
    } catch (error) {
      console.error('❌ DEBUG: Failed to load stats from local storage:', error);
      return null;
    }
  }

  // 最後の同期時刻を保存
  static async saveLastSync(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      console.error('❌ DEBUG: Failed to save last sync timestamp:', error);
    }
  }

  // 最後の同期時刻を取得
  static async getLastSync(): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch (error) {
      console.error('❌ DEBUG: Failed to get last sync timestamp:', error);
      return 0;
    }
  }

  // キャッシュが有効かチェック
  static async isCacheValid(): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
      if (!timestamp) return false;
      
      const cacheTime = parseInt(timestamp, 10);
      const now = Date.now();
      const isValid = (now - cacheTime) < CACHE_EXPIRY;
      
      console.log('🔍 DEBUG: Cache validity check:', { cacheTime, now, isValid });
      return isValid;
    } catch (error) {
      console.error('❌ DEBUG: Failed to check cache validity:', error);
      return false;
    }
  }

  // 保留中の変更を保存
  static async savePendingChanges(changes: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(changes));
      console.log('✅ DEBUG: Pending changes saved:', changes.length);
    } catch (error) {
      console.error('❌ DEBUG: Failed to save pending changes:', error);
    }
  }

  // 保留中の変更を取得
  static async getPendingChanges(): Promise<any[]> {
    try {
      const changesJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
      if (!changesJson) return [];
      
      const changes = JSON.parse(changesJson);
      console.log('✅ DEBUG: Pending changes loaded:', changes.length);
      return changes;
    } catch (error) {
      console.error('❌ DEBUG: Failed to load pending changes:', error);
      return [];
    }
  }

  // 保留中の変更をクリア
  static async clearPendingChanges(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES);
      console.log('✅ DEBUG: Pending changes cleared');
    } catch (error) {
      console.error('❌ DEBUG: Failed to clear pending changes:', error);
    }
  }

  // 全データをクリア
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      console.log('✅ DEBUG: All local data cleared');
    } catch (error) {
      console.error('❌ DEBUG: Failed to clear all data:', error);
    }
  }

  // キャッシュタイムスタンプをクリア
  static async clearCacheTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHE_TIMESTAMP);
      console.log('✅ DEBUG: Cache timestamp cleared');
    } catch (error) {
      console.error('❌ DEBUG: Failed to clear cache timestamp:', error);
    }
  }
}
