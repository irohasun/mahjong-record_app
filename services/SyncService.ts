import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { LocalStorageService } from './LocalStorageService';
import { GameRecord } from '@/types/GameRecord';

// 同期状態
export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number;
  pendingChanges: number;
  error?: string;
}

// 変更タイプ
export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

// 保留中の変更
export interface PendingChange {
  id: string;
  type: ChangeType;
  table: string;
  data: any;
  timestamp: number;
}

export class SyncService {
  private static syncInProgress = false;

  // 初期同期（初回起動時）
  static async initialSync(): Promise<void> {
    if (!isSupabaseConfigured || this.syncInProgress) {
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 DEBUG: Starting initial sync...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ DEBUG: No user authenticated, skipping sync');
        return;
      }

      // リモートから全データを取得
      const remoteGames = await this.fetchRemoteGames(user.id);
      
      // ローカルに保存
      await LocalStorageService.saveGames(remoteGames);
      await LocalStorageService.saveLastSync(Date.now());

      console.log('✅ DEBUG: Initial sync completed');
    } catch (error) {
      console.error('❌ DEBUG: Initial sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // バックグラウンド同期
  static async backgroundSync(): Promise<void> {
    if (!isSupabaseConfigured || this.syncInProgress) {
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 DEBUG: Starting background sync...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // 保留中の変更を処理
      await this.processPendingChanges();

      // 差分同期
      await this.differentialSync(user.id);

      console.log('✅ DEBUG: Background sync completed');
    } catch (error) {
      console.error('❌ DEBUG: Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // 差分同期
  private static async differentialSync(userId: string): Promise<void> {
    const lastSync = await LocalStorageService.getLastSync();
    const now = Date.now();

    // 最後の同期以降の変更を取得
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        player_records (*),
        round_records (*)
      `)
      .eq('account_id', userId)
      .gte('updated_at', new Date(lastSync).toISOString());

    if (error) {
      console.error('❌ DEBUG: Failed to fetch remote changes:', error);
      return;
    }

    if (games && games.length > 0) {
      console.log('🔄 DEBUG: Found remote changes:', games.length);
      
      // ローカルデータを更新
      const localGames = await LocalStorageService.getGames();
      const updatedGames = this.mergeGames(localGames, games);
      
      await LocalStorageService.saveGames(updatedGames);
    }

    await LocalStorageService.saveLastSync(now);
  }

  // 保留中の変更を処理
  private static async processPendingChanges(): Promise<void> {
    const pendingChanges = await LocalStorageService.getPendingChanges();
    
    if (pendingChanges.length === 0) {
      return;
    }

    console.log('🔄 DEBUG: Processing pending changes:', pendingChanges.length);

    for (const change of pendingChanges) {
      try {
        await this.applyChange(change);
      } catch (error) {
        console.error('❌ DEBUG: Failed to apply change:', change.id, error);
        // 失敗した変更は後で再試行
        continue;
      }
    }

    // 成功した変更をクリア
    await LocalStorageService.clearPendingChanges();
  }

  // 変更を適用
  private static async applyChange(change: PendingChange): Promise<void> {
    switch (change.type) {
      case 'CREATE':
        await this.createRemoteRecord(change.table, change.data);
        break;
      case 'UPDATE':
        await this.updateRemoteRecord(change.table, change.data);
        break;
      case 'DELETE':
        await this.deleteRemoteRecord(change.table, change.data.id);
        break;
    }
  }

  // リモートレコード作成
  private static async createRemoteRecord(table: string, data: any): Promise<void> {
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;
  }

  // リモートレコード更新
  private static async updateRemoteRecord(table: string, data: any): Promise<void> {
    const { error } = await supabase.from(table).update(data).eq('id', data.id);
    if (error) throw error;
  }

  // リモートレコード削除
  private static async deleteRemoteRecord(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // ゲームデータをマージ
  private static mergeGames(localGames: GameRecord[], remoteGames: any[]): GameRecord[] {
    const merged = [...localGames];
    
    for (const remoteGame of remoteGames) {
      const existingIndex = merged.findIndex(g => g.id === remoteGame.id);
      
      if (existingIndex >= 0) {
        // 更新
        merged[existingIndex] = this.convertRemoteToLocal(remoteGame);
      } else {
        // 新規追加
        merged.push(this.convertRemoteToLocal(remoteGame));
      }
    }

    return merged;
  }

  // リモートデータをローカル形式に変換
  private static convertRemoteToLocal(remoteGame: any): GameRecord {
    return {
      id: remoteGame.id,
      accountId: remoteGame.account_id,
      date: remoteGame.date,
      location: remoteGame.location || '',
      gameType: remoteGame.game_type,
      rules: remoteGame.rules,
      memo: remoteGame.memo || '',
      duration: remoteGame.duration_minutes,
      gameEndCondition: remoteGame.game_end_condition,
      finalRiichiSticks: remoteGame.final_riichi_sticks,
      finalHonba: remoteGame.final_honba,
      photoPath: remoteGame.photo_path,
      players: remoteGame.player_records?.map((pr: any) => ({
        name: pr.player_name,
        isMainAccount: pr.is_main_account,
        finalScore: pr.final_score,
        rank: pr.rank,
        startingPosition: pr.starting_position,
      })) || [],
      rounds: remoteGame.round_records?.map((rr: any) => ({
        round: rr.round,
        honba: rr.honba,
        riichiSticks: rr.riichi_sticks,
        winner: rr.winner,
        loser: rr.loser,
        handType: rr.hand_type,
        points: rr.points,
        han: rr.han,
        fu: rr.fu,
        yakuman: rr.yakuman,
        memo: rr.memo || '',
      })) || [],
    };
  }

  // リモートからゲームデータを取得
  private static async fetchRemoteGames(userId: string): Promise<GameRecord[]> {
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        player_records (*),
        round_records (*)
      `)
      .eq('account_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ DEBUG: Failed to fetch remote games:', error);
      return [];
    }

    return games?.map(game => this.convertRemoteToLocal(game)) || [];
  }

  // 変更を保留中に追加
  static async addPendingChange(change: Omit<PendingChange, 'timestamp'>): Promise<void> {
    const pendingChanges = await LocalStorageService.getPendingChanges();
    const newChange: PendingChange = {
      ...change,
      timestamp: Date.now(),
    };
    
    pendingChanges.push(newChange);
    await LocalStorageService.savePendingChanges(pendingChanges);
  }

  // 同期状態を取得
  static async getSyncStatus(): Promise<SyncStatus> {
    const lastSync = await LocalStorageService.getLastSync();
    const pendingChanges = await LocalStorageService.getPendingChanges();
    
    return {
      isSyncing: this.syncInProgress,
      lastSyncTime: lastSync,
      pendingChanges: pendingChanges.length,
    };
  }

  // 強制同期
  static async forceSync(): Promise<void> {
    await LocalStorageService.saveLastSync(0); // キャッシュを無効化
    await this.backgroundSync();
  }
}
