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

  /**
   * ローカルストレージのデータをSupabaseに同期
   * 匿名ユーザーがアップグレードされた後に呼び出される
   * @returns 同期されたゲーム数
   */
  static async syncLocalDataToSupabase(): Promise<number> {
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase not configured, skipping sync');
      return 0;
    }

    try {
      console.log('🔄 Syncing local data to Supabase');

      // 現在のユーザーを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('認証されていません');
      }

      // ダミーユーザーや匿名ユーザーの場合はスキップ
      if (user.id === 'dummy-user-id' || user.is_anonymous) {
        console.log('⚠️ User is still anonymous, skipping sync');
        return 0;
      }

      // ローカルストレージからすべてのゲームを取得
      const localGames = await LocalStorageService.getAllGames();
      
      if (localGames.length === 0) {
        console.log('ℹ️ No local games to sync');
        return 0;
      }

      console.log(`📦 Found ${localGames.length} local games to sync`);

      // 各ゲームをSupabaseにアップロード
      let syncedCount = 0;
      for (const game of localGames) {
        try {
          // ゲームデータを準備
          const gameData = {
            id: game.id,
            account_id: user.id,
            date: game.date,
            photo_path: game.photoPath || null,
            created_at: game.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // ゲームを挿入（既に存在する場合は更新）
          const { error: gameError } = await supabase
            .from('games')
            .upsert(gameData, { onConflict: 'id' });

          if (gameError) {
            console.error('❌ Failed to sync game:', game.id, gameError);
            continue;
          }

          // プレイヤーレコードを挿入
          if (game.players && game.players.length > 0) {
            const playerRecords = game.players.map((player) => ({
              game_id: game.id,
              player_name: player.name,
              rank: player.rank,
              score: player.score,
              final_score: player.finalScore,
              is_main_account: player.isMainAccount,
            }));

            const { error: playerError } = await supabase
              .from('player_records')
              .upsert(playerRecords);

            if (playerError) {
              console.error('❌ Failed to sync player records for game:', game.id, playerError);
            }
          }

          // ラウンドレコードを挿入
          if (game.rounds && game.rounds.length > 0) {
            const roundRecords = game.rounds.map((round, index) => ({
              game_id: game.id,
              round_number: index + 1,
              points: round.points,
            }));

            const { error: roundError } = await supabase
              .from('round_records')
              .upsert(roundRecords);

            if (roundError) {
              console.error('❌ Failed to sync round records for game:', game.id, roundError);
            }
          }

          syncedCount++;
          console.log(`✅ Synced game ${syncedCount}/${localGames.length}`);
        } catch (error) {
          console.error('❌ Error syncing game:', game.id, error);
        }
      }

      console.log(`✅ Sync completed: ${syncedCount}/${localGames.length} games synced`);

      // 同期後、最終同期時刻を更新
      await LocalStorageService.saveLastSync(Date.now());

      return syncedCount;
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      throw error;
    }
  }

  /**
   * 匿名ユーザーのローカルデータを新しいアカウントに移行
   * @deprecated upgradeAnonymousUserを使用してください
   * @param newUserId 新しいユーザーID
   * @returns 移行されたゲーム数
   */
  static async migrateAnonymousDataToAccount(newUserId: string): Promise<number> {
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase not configured, skipping data migration');
      return 0;
    }

    try {
      console.log('🔄 Starting anonymous data migration to account:', newUserId);

      // ローカルストレージからすべてのゲームを取得
      const localGames = await LocalStorageService.getAllGames();
      
      if (localGames.length === 0) {
        console.log('ℹ️ No local games to migrate');
        return 0;
      }

      console.log(`📦 Found ${localGames.length} local games to migrate`);

      // 各ゲームをSupabaseにアップロード
      let migratedCount = 0;
      for (const game of localGames) {
        try {
          // ゲームのaccount_idを新しいユーザーIDに更新
          const gameData = {
            id: game.id,
            account_id: newUserId,
            date: game.date,
            photo_path: game.photoPath || null,
            created_at: game.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // ゲームを挿入
          const { error: gameError } = await supabase
            .from('games')
            .upsert(gameData, { onConflict: 'id' });

          if (gameError) {
            console.error('❌ Failed to migrate game:', game.id, gameError);
            continue;
          }

          // プレイヤーレコードを挿入
          if (game.players && game.players.length > 0) {
            const playerRecords = game.players.map((player) => ({
              game_id: game.id,
              player_name: player.name,
              rank: player.rank,
              score: player.score,
              final_score: player.finalScore,
              is_main_account: player.isMainAccount,
            }));

            const { error: playerError } = await supabase
              .from('player_records')
              .upsert(playerRecords);

            if (playerError) {
              console.error('❌ Failed to migrate player records for game:', game.id, playerError);
            }
          }

          // ラウンドレコードを挿入
          if (game.rounds && game.rounds.length > 0) {
            const roundRecords = game.rounds.map((round, index) => ({
              game_id: game.id,
              round_number: index + 1,
              points: round.points,
            }));

            const { error: roundError } = await supabase
              .from('round_records')
              .upsert(roundRecords);

            if (roundError) {
              console.error('❌ Failed to migrate round records for game:', game.id, roundError);
            }
          }

          migratedCount++;
          console.log(`✅ Migrated game ${migratedCount}/${localGames.length}`);
        } catch (error) {
          console.error('❌ Error migrating game:', game.id, error);
        }
      }

      console.log(`✅ Migration completed: ${migratedCount}/${localGames.length} games migrated`);

      // 移行後、最終同期時刻を更新
      await LocalStorageService.saveLastSync(Date.now());

      return migratedCount;
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }
}
