import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Database } from '@/types/database';
import { LocalStorageService } from './LocalStorageService';
import { SyncService } from './SyncService';
import { MockDataService } from './MockDataService';
import { GameRecord, Player, PlayerStats, RoundRecord as GameRoundRecord } from '@/types/GameRecord';

// データベースの型定義
type Game = Database['public']['Tables']['games']['Row'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
type PlayerRecord = Database['public']['Tables']['player_records']['Row'];
type PlayerRecordInsert = Database['public']['Tables']['player_records']['Insert'];
type RoundRecord = Database['public']['Tables']['round_records']['Row'];
type RoundRecordInsert = Database['public']['Tables']['round_records']['Insert'];

export class GameService {
  // ============================================
  // プライベートヘルパーメソッド
  // ============================================

  /**
   * ダミーユーザーIDかどうかを判定
   */
  private static isDummyUser(accountId: string): boolean {
    return accountId === 'dummy-user-id';
  }

  /**
   * データベースから取得したプレイヤー記録をPlayer型に変換
   */
  private static mapPlayerRecordFromDb(playerRecord: any): Player {
    return {
      name: playerRecord.player_name,
      isMainAccount: playerRecord.is_main_account,
      finalScore: playerRecord.final_score,
      rank: playerRecord.rank,
      startingPosition: playerRecord.starting_position as 'East' | 'South' | 'West' | 'North',
    };
  }

  /**
   * データベースから取得した局記録をGameRoundRecord型に変換
   */
  private static mapRoundRecordFromDb(roundRecord: any): GameRoundRecord {
    return {
      round: roundRecord.round,
      honba: roundRecord.honba,
      riichiSticks: roundRecord.riichi_sticks,
      winner: roundRecord.winner,
      loser: roundRecord.loser,
      handType: roundRecord.hand_type as 'ron' | 'tsumo' | 'draw' | 'abort',
      points: roundRecord.points as number[],
      han: roundRecord.han,
      fu: roundRecord.fu,
      yakuman: roundRecord.yakuman,
      memo: roundRecord.memo || '',
    };
  }

  /**
   * データベースから取得したゲームデータをGameRecord型に変換
   */
  private static mapGameFromDb(game: any): GameRecord {
    return {
      id: game.id,
      accountId: game.account_id,
      date: game.date,
      location: game.location || '',
      gameType: game.game_type as '東風戦' | '東南戦',
      rules: game.rules as any,
      memo: game.memo || '',
      duration: game.duration_minutes || undefined,
      gameEndCondition: game.game_end_condition as 'normal' | 'bankruptcy' | 'timeout' | 'time_limit',
      finalRiichiSticks: game.final_riichi_sticks,
      finalHonba: game.final_honba,
      photoPath: game.photo_path || undefined,
      players: (game.player_records || []).map((p: any) => this.mapPlayerRecordFromDb(p)),
      rounds: (game.round_records || []).map((r: any) => this.mapRoundRecordFromDb(r)),
    };
  }

  /**
   * ゲームデータをデータベース形式に変換
   */
  private static mapGameToDb(gameData: GameRecord): GameInsert {
    return {
      account_id: gameData.accountId,
      date: gameData.date,
      location: gameData.location,
      game_type: gameData.gameType,
      rules: gameData.rules as any,
      memo: gameData.memo,
      duration_minutes: gameData.duration && gameData.duration > 0 ? gameData.duration : null,
      game_end_condition: gameData.gameEndCondition,
      final_riichi_sticks: gameData.finalRiichiSticks,
      final_honba: gameData.finalHonba,
      photo_path: gameData.photoPath || null,
    };
  }

  /**
   * プレイヤーデータをデータベース形式に変換
   */
  private static mapPlayerToDb(player: Player, gameId: string): PlayerRecordInsert {
    return {
      game_id: gameId,
      player_name: player.name,
      is_main_account: player.isMainAccount,
      final_score: player.finalScore,
      rank: player.rank,
      starting_position: player.startingPosition,
    };
  }

  /**
   * 局データをデータベース形式に変換
   */
  private static mapRoundToDb(round: GameRoundRecord, gameId: string): RoundRecordInsert {
    return {
      game_id: gameId,
      round: round.round,
      honba: round.honba,
      riichi_sticks: round.riichiSticks,
      winner: round.winner,
      loser: round.loser,
      hand_type: round.handType,
      points: round.points as any,
      han: round.han,
      fu: round.fu,
      yakuman: round.yakuman,
      memo: round.memo,
    };
  }

  /**
   * デフォルトのPlayerStatsを返す
   */
  private static getDefaultPlayerStats(): PlayerStats {
    return {
      totalGames: 0,
      averageRank: 0,
      averageScore: 0,
      firstPlaceRate: 0,
      topTwoRate: 0,
      avoidLastRate: 0,
      highestScore: 0,
      lowestScore: 0,
      maxConsecutiveWins: 0,
      rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
    };
  }

  /**
   * Supabaseのゲーム取得クエリを構築（共通処理）
   */
  private static buildGamesQuery(accountId: string) {
    return supabase
      .from('games')
      .select(`
        *,
        player_records (*),
        round_records (*)
      `)
      .eq('account_id', accountId);
  }

  /**
   * ゲームの関連レコード（プレイヤー記録と局記録）を更新
   */
  private static async updateGameRelatedRecords(gameId: string, gameData: GameRecord): Promise<void> {
    // 既存のプレイヤー記録を削除
    console.log('🔍 DEBUG: Deleting existing player records...');
    const { error: deletePlayersError } = await supabase
      .from('player_records')
      .delete()
      .eq('game_id', gameId);

    if (deletePlayersError) {
      console.error('❌ DEBUG: Failed to delete existing player records:', deletePlayersError);
      throw deletePlayersError;
    }
    console.log('🔍 DEBUG: Existing player records deleted successfully');

    // 新しいプレイヤー記録を挿入
    console.log('🔍 DEBUG: Creating new player insert data...');
    const playerInserts = gameData.players.map(player => 
      this.mapPlayerToDb(player, gameId)
    );
    console.log('🔍 DEBUG: Player insert data created:', playerInserts);

    console.log('🔍 DEBUG: Inserting new player records...');
    const { error: playersError } = await supabase
      .from('player_records')
      .insert(playerInserts as any);

    if (playersError) {
      console.error('❌ DEBUG: Failed to insert new player records:', playersError);
      throw playersError;
    }
    console.log('🔍 DEBUG: New player records inserted successfully');

    // 既存の局記録を削除
    console.log('🔍 DEBUG: Deleting existing round records...');
    const { error: deleteRoundsError } = await supabase
      .from('round_records')
      .delete()
      .eq('game_id', gameId);

    if (deleteRoundsError) {
      console.error('❌ DEBUG: Failed to delete existing round records:', deleteRoundsError);
      throw deleteRoundsError;
    }
    console.log('🔍 DEBUG: Existing round records deleted successfully');

    // 新しい局記録を挿入（もしあれば）
    if (gameData.rounds.length > 0) {
      console.log('🔍 DEBUG: Creating new round insert data...');
      const roundInserts = gameData.rounds.map(round => 
        this.mapRoundToDb(round, gameId)
      );
      console.log('🔍 DEBUG: Round insert data created:', roundInserts);

      console.log('🔍 DEBUG: Inserting new round records...');
      const { error: roundsError } = await supabase
        .from('round_records')
        .insert(roundInserts as any);

      if (roundsError) {
        console.error('❌ DEBUG: Failed to insert new round records:', roundsError);
        throw roundsError;
      }
      console.log('🔍 DEBUG: New round records inserted successfully');
    } else {
      console.log('🔍 DEBUG: No round records to insert');
    }
  }

  /**
   * 期間でフィルタリングする関数
   */
  private static filterByPeriod(date: Date, period: 'month' | 'year' | 'all', selectedDate: Date): boolean {
    if (period === 'all') return true;
    if (period === 'year') return date.getFullYear() === selectedDate.getFullYear();
    // month
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth()
    );
  }

  /**
   * 有効な局記録かどうかを判定（4人分の点数が揃っている）
   */
  private static isValidRoundRecord(points: any[]): boolean {
    if (!points || points.length < 4) return false;
    return !points.some((v) => v === null || v === undefined || v === '');
  }

  /**
   * 点数配列から順位を計算（0番目のプレイヤーの順位）
   */
  private static calculateRankFromPoints(points: number[]): number {
    const my = points[0] ?? 0;
    const uniqueSorted = Array.from(new Set(points)).sort((a, b) => b - a);
    return (uniqueSorted.indexOf(my) + 1) || 4;
  }

  /**
   * 統計データを計算する共通関数
   */
  private static calculateStats(
    records: Array<{ rank: number; score: number }>
  ): PlayerStats {
    if (records.length === 0) {
      return this.getDefaultPlayerStats();
    }

    const totalGames = records.length;
    const totalRank = records.reduce((sum, r) => sum + r.rank, 0);
    const totalScore = records.reduce((sum, r) => sum + r.score, 0);
    const scores = records.map(r => r.score);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    const firstPlaceCount = records.filter(r => r.rank === 1).length;
    const topTwoCount = records.filter(r => r.rank <= 2).length;
    const avoidLastCount = records.filter(r => r.rank < 4).length;
    
    // 最大連荘を計算
    let maxConsecutiveWins = 0;
    let currentConsecutiveWins = 0;
    for (const record of records) {
      if (record.rank === 1) {
        currentConsecutiveWins++;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
      } else {
        currentConsecutiveWins = 0;
      }
    }
    
    const rankDistribution = records.reduce((acc, r) => {
      acc[r.rank] = (acc[r.rank] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    return {
      totalGames,
      averageRank: totalRank / totalGames,
      averageScore: totalScore / totalGames,
      firstPlaceRate: firstPlaceCount / totalGames,
      topTwoRate: topTwoCount / totalGames,
      avoidLastRate: avoidLastCount / totalGames,
      highestScore,
      lowestScore,
      maxConsecutiveWins,
      rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
    };
  }

  /**
   * 現在のユーザーを取得（認証チェック付き）
   */
  private static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('認証されていません');
    }
    return user;
  }

  // ============================================
  // パブリックメソッド
  // ============================================
  static async addGame(gameData: Omit<GameRecord, 'id'>): Promise<GameRecord> {
    try {
      const user = await this.getCurrentUser();

      // Supabaseが設定されていない場合やダミーユーザーの場合はローカル保存として扱う
      if (!isSupabaseConfigured || this.isDummyUser(user.id)) {
        const dummyId = `dummy-game-${Date.now()}`;
        return {
          ...gameData,
          id: dummyId,
        };
      }

      // ゲーム記録を挿入
      const gameInsert = this.mapGameToDb({
        ...gameData,
        id: '', // 一時的な値、DBで生成される
        accountId: user.id,
      });

      const gameInsertResult = await supabase
        .from('games')
        .insert(gameInsert as any)
        .select()
        .single();
      
      const { data: insertedGame, error: gameError } = gameInsertResult as any;

      if (gameError || !insertedGame) {
        throw gameError || new Error('ゲームの挿入に失敗しました');
      }

      const gameId = insertedGame.id;

      // プレイヤー記録を挿入
      const playerInserts = gameData.players.map(player => 
        this.mapPlayerToDb(player, gameId)
      );

      const { error: playersError } = await supabase
        .from('player_records')
        .insert(playerInserts as any);

      if (playersError) {
        throw playersError;
      }

      // 局記録を挿入（もしあれば）
      if (gameData.rounds.length > 0) {
        const roundInserts = gameData.rounds.map(round => 
          this.mapRoundToDb(round, gameId)
        );

        const { error: roundsError } = await supabase
          .from('round_records')
          .insert(roundInserts as any);

        if (roundsError) {
          throw roundsError;
        }
      }

      const savedGame: GameRecord = {
        ...gameData,
        id: gameId,
        accountId: user.id,
      };

      // ローカルに保存（即座に表示可能）
      await LocalStorageService.saveGame(savedGame);

      // バックグラウンドで同期
      SyncService.backgroundSync().catch(error => {
        console.error('❌ DEBUG: Background sync after add failed:', error);
      });

      return savedGame;
    } catch (error) {
      console.error('Failed to add game:', error);
      throw new Error('対局記録の保存に失敗しました');
    }
  }

  static async getGames(): Promise<GameRecord[]> {
    try {
      // ローカル・ファースト: まずローカルデータを取得（瞬間表示）
      const localGames = await LocalStorageService.getGames();
      
      // キャッシュが有効な場合はローカルデータを返す
      const isCacheValid = await LocalStorageService.isCacheValid();
      if (isCacheValid && localGames.length > 0) {
        console.log('✅ DEBUG: Returning cached games:', localGames.length);
        return localGames;
      }

      // Supabaseが設定されていない場合はモックデータ
      if (!isSupabaseConfigured) {
        return MockDataService.generateMockGameRecords();
      }

      const user = await this.getCurrentUser();

      // バックグラウンドで同期を実行
      SyncService.backgroundSync().catch(error => {
        console.error('❌ DEBUG: Background sync failed:', error);
      });

      // ローカルデータがあれば返す（同期中でも表示可能）
      if (localGames.length > 0) {
        console.log('✅ DEBUG: Returning local games while syncing:', localGames.length);
        return localGames;
      }

      // ローカルデータがない場合はリモートから取得
      const selRes = await this.buildGamesQuery(user.id)
        .order('date', { ascending: false });

      const { data: games, error } = selRes as any;
      if (error) {
        throw error;
      }

      const remoteGames = (games || []).map((game: any) => 
        this.mapGameFromDb(game)
      );

      // ローカルに保存
      await LocalStorageService.saveGames(remoteGames);
      
      console.log('✅ DEBUG: Fetched and cached remote games:', remoteGames.length);
      return remoteGames;
    } catch (error) {
      console.error('Failed to get games:', error);
      // エラー時はローカルデータを返す
      const localGames = await LocalStorageService.getGames();
      return localGames;
    }
  }

  static async getGameById(accountId: string, gameId: string): Promise<GameRecord | null> {
    try {
      if (!isSupabaseConfigured) {
        // モックデータを返す
        return MockDataService.getMockGame(gameId);
      }

      // ゲームデータを取得
      const gameSelRes = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .eq('account_id', accountId)
        .single();

      const { data: game, error: gameError } = gameSelRes as any;
      if (gameError || !game) {
        return null;
      }

      // プレイヤー記録を取得
      const playersSelRes = await supabase
        .from('player_records')
        .select('*')
        .eq('game_id', gameId);

      const { data: players, error: playersError } = playersSelRes as any;
      if (playersError) {
        throw playersError;
      }

      // 局記録を取得
      const roundsSelRes = await supabase
        .from('round_records')
        .select('*')
        .eq('game_id', gameId)
        .order('round');

      const { data: rounds, error: roundsError } = roundsSelRes as any;
      if (roundsError) {
        throw roundsError;
      }

      // GameRecord形式に変換
      const gameRecord: GameRecord = this.mapGameFromDb({
        ...game,
        player_records: players || [],
        round_records: rounds || [],
      });

      return gameRecord;
    } catch (error) {
      console.error('Failed to get game by ID:', error);
      return null;
    }
  }

  static async deleteGame(accountId: string, gameId: string): Promise<void> {
    try {
      // Supabaseが設定されていない場合はローカル削除として扱う
      if (!isSupabaseConfigured) {
        console.log('Mock delete: Game deleted locally');
        return;
      }

      // 関連するレコードを削除（局記録、プレイヤー記録、ゲーム記録の順）
      const { error: roundsError } = await supabase
        .from('round_records')
        .delete()
        .eq('game_id', gameId);

      if (roundsError) {
        throw roundsError;
      }

      const { error: playersError } = await supabase
        .from('player_records')
        .delete()
        .eq('game_id', gameId);

      if (playersError) {
        throw playersError;
      }

      const { error: gameError } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)
        .eq('account_id', accountId);

      if (gameError) {
        throw gameError;
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw error;
    }
  }

  static async updateGame(accountId: string, gameId: string, gameData: GameRecord): Promise<void> {
    console.log('🔍 DEBUG: GameService.updateGame called with:', { accountId, gameId });
    console.log('🔍 DEBUG: Game data:', {
      date: gameData.date,
      gameType: gameData.gameType,
      playerCount: gameData.players.length
    });
    
    try {
      if (!isSupabaseConfigured) {
        console.log('🔍 DEBUG: Using LOCAL UPDATE mode (no-op)');
        return;
      }

      console.log('🔍 DEBUG: Using SUPABASE UPDATE mode');

      // ゲームデータを更新
      console.log('🔍 DEBUG: Updating game record in Supabase...');
      const updatePayload = this.mapGameToDb(gameData);

      // Supabaseの型定義の問題を回避するため、as anyを使用
      const { error: gameError } = await (supabase as any)
        .from('games')
        .update(updatePayload)
        .eq('id', gameId)
        .eq('account_id', accountId);

      if (gameError) {
        console.error('❌ DEBUG: Failed to update game record:', gameError);
        throw gameError;
      }
      console.log('🔍 DEBUG: Game record updated successfully');

      // 関連レコード（プレイヤー記録と局記録）を更新
      await this.updateGameRelatedRecords(gameId, gameData);
      
      // ローカルキャッシュを更新
      console.log('🔍 DEBUG: Updating local cache...');
      await LocalStorageService.saveGame(gameData);
      
      // キャッシュの有効期限をリセットして強制的に再取得させる
      await LocalStorageService.clearCacheTimestamp();
      
      console.log('🔍 DEBUG: Game update completed successfully');
    } catch (error) {
      console.error('❌ DEBUG: Failed to update game:', error);
      console.error('❌ DEBUG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async getAllGames(accountId: string): Promise<GameRecord[]> {
    try {
      // ダミーユーザーの場合はモックデータを返す
      if (this.isDummyUser(accountId)) {
        return MockDataService.generateMockGameRecords();
      }

      console.log('🔍 DEBUG: getAllGames called for accountId:', accountId);

      const allRes = await this.buildGamesQuery(accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: games, error: gamesError } = allRes as any;
      if (gamesError) {
        throw gamesError;
      }

      const mappedGames = (games || []).map((game: any) => 
        this.mapGameFromDb(game)
      );

      // ローカルキャッシュを更新
      await LocalStorageService.saveGames(mappedGames);
      console.log('🔍 DEBUG: getAllGames completed, games count:', mappedGames.length);

      return mappedGames;
    } catch (error) {
      console.error('Failed to get games:', error);
      return [];
    }
  }

  static async getRecentGames(accountId: string, limit: number = 5): Promise<GameRecord[]> {
    try {
      // ダミーユーザーの場合はモックデータを返す
      if (this.isDummyUser(accountId)) {
        return MockDataService.generateMockGameRecords().slice(0, limit);
      }

      const recentRes = await this.buildGamesQuery(accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: games, error } = recentRes as any;
      if (error) {
        throw error;
      }

      return (games || []).map((game: any) => 
        this.mapGameFromDb(game)
      );
    } catch (error) {
      console.error('Failed to get recent games:', error);
      return [];
    }
  }

  static async getPlayerStats(accountId: string): Promise<PlayerStats> {
    console.log('🔍 DEBUG: GameService.getPlayerStats called with accountId:', accountId);
    
    try {
      // ダミーユーザーの場合はモック統計を返す
      if (this.isDummyUser(accountId)) {
        console.log('🔍 DEBUG: Using mock player stats for dummy user');
        return MockDataService.generateMockPlayerStats();
      }

      console.log('🔍 DEBUG: Fetching player records from Supabase...');
      const playerRes = await supabase
        .from('player_records')
        .select(`
          *,
          games!inner (
            account_id,
            rules,
            date
          )
        `)
        .eq('games.account_id', accountId)
        .eq('is_main_account', true);
      const { data: playerRecords, error } = playerRes as any;
      if (error) {
        console.error('❌ DEBUG: Failed to fetch player records:', error);
        throw error;
      }
      console.log('🔍 DEBUG: Player records fetched successfully, count:', playerRecords?.length || 0);

      // games.dateで降順ソート
      const sortedRecords = (playerRecords || []).sort(
        (a: any, b: any) => new Date(b.games.date).getTime() - new Date(a.games.date).getTime()
      );

      // 統計計算用のレコードに変換
      const statsRecords = sortedRecords.map((p: any) => ({
        rank: p.rank,
        score: p.final_score,
      }));

      const result = this.calculateStats(statsRecords);
      
      console.log('🔍 DEBUG: Player stats calculated successfully:', {
        totalGames: result.totalGames,
        averageRank: result.averageRank,
        firstPlaceRate: result.firstPlaceRate,
        rankDistribution: result.rankDistribution
      });
      
      return result;
    } catch (error) {
      console.error('❌ DEBUG: Failed to get player stats:', error);
      console.error('❌ DEBUG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getHanchanStats(
    accountId: string,
    period: 'month' | 'year' | 'all',
    selectedDate: Date
  ): Promise<PlayerStats> {
    try {
      if (this.isDummyUser(accountId)) {
        return MockDataService.generateMockPlayerStats();
      }

      const hanRes = await supabase
        .from('round_records')
        .select(`
          points,
          created_at,
          games!inner (
            account_id,
            date
          )
        `)
        .eq('games.account_id', accountId);
      const { data: rounds, error } = hanRes as any;
      if (error) {
        throw error;
      }

      // フィルタ: 期間
      const filtered = (rounds || []).filter((r: any) => {
        const d = new Date(r.games.date);
        return this.filterByPeriod(d, period, selectedDate);
      });

      // 有効半荘のみ（4人分そろっており、null/空でない）
      const valid = filtered.filter((r: any) => {
        const pts = r.points || [];
        return this.isValidRoundRecord(pts);
      });

      if (valid.length === 0) {
        return this.getDefaultPlayerStats();
      }

      // 日付・作成時刻順でソート（連荘計算用）
      const sorted = [...valid].sort(
        (a: any, b: any) => new Date(a.games.date).getTime() - new Date(b.games.date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // 統計計算用のレコードに変換
      const statsRecords = sorted.map((r: any) => {
        const pts = (r.points || []).map((v: any) => Number(v) || 0);
        const myRank = this.calculateRankFromPoints(pts);
        return {
          rank: myRank,
          score: pts[0] ?? 0,
        };
      });

      const result = this.calculateStats(statsRecords);
      
      // Infinityチェック
      if (!isFinite(result.highestScore)) {
        result.highestScore = 0;
      }
      if (!isFinite(result.lowestScore)) {
        result.lowestScore = 0;
      }

      return result;
    } catch (error) {
      console.error('Failed to get hanchan stats:', error);
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getChartData(accountId: string, period: 'month' | 'year' | 'all', selectedDate: Date) {
    console.log('🔍 DEBUG: GameService.getChartData called with:', { accountId, period, selectedDate });
    
    try {
      // ダミーユーザーの場合はモックチャートデータを返す
      if (this.isDummyUser(accountId)) {
        console.log('🔍 DEBUG: Using mock chart data for dummy user');
        return MockDataService.generateChartData(period);
      }

      console.log('🔍 DEBUG: Fetching games with rounds for rank progression...');
      const chartRes = await supabase
        .from('games')
        .select(`
          id,
          date,
          player_records (is_main_account, starting_position),
          round_records (points, created_at)
        `)
        .eq('account_id', accountId);
      const { data: gamesData, error } = chartRes as any;
      if (error) {
        console.error('❌ DEBUG: Failed to fetch games for chart:', error);
        throw error;
      }
      console.log('🔍 DEBUG: Games fetched for chart, count:', gamesData?.length || 0);

      const posOrder: Record<string, number> = { East: 0, South: 1, West: 2, North: 3 } as const;

      // 期間でフィルタリング（選択された日付に基づく）
      const filteredGames = (gamesData || []).filter((g: any) => {
        const d = new Date(g.date);
        return this.filterByPeriod(d, period, selectedDate);
      });

      // 昇順にしてから各局の順位を抽出
      const sortedGames = filteredGames.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const ranks: number[] = [];

      for (const g of sortedGames) {
        const players = (g.player_records || []).slice().sort((a: any, b: any) => (posOrder[a.starting_position] ?? 0) - (posOrder[b.starting_position] ?? 0));
        const mainIdx = Math.max(0, players.findIndex((p: any) => p.is_main_account));

        const rounds = (g.round_records || []).slice().sort((a: any, b: any) => new Date(a.created_at || g.date).getTime() - new Date(b.created_at || g.date).getTime());
        for (const r of rounds) {
          const raw = r.points || [];
          if (!this.isValidRoundRecord(raw)) continue;
          const pts = raw.map((v: any) => Number(v) || 0);
          // メインアカウントの点数を先頭に移動してから順位計算
          const mainPoints = pts[mainIdx] ?? 0;
          const reorderedPoints = [mainPoints, ...pts.filter((_: number, idx: number) => idx !== mainIdx)];
          const myRank = this.calculateRankFromPoints(reorderedPoints);
          ranks.push(myRank);
        }
      }

      const labels = ranks.map((_, idx) => `${idx + 1}`);
      const result = { labels, scores: [], ranks };
      console.log('🔍 DEBUG: Hanchan rank progression calculated:', { points: ranks.length });
      return result;
    } catch (error) {
      console.error('❌ DEBUG: Failed to get chart data:', error);
      console.error('❌ DEBUG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return { labels: [], scores: [] };
    }
  }

  static async exportData(accountId: string): Promise<string> {
    try {
      // ダミーユーザーの場合は空のJSONを返す
      if (this.isDummyUser(accountId)) {
        return JSON.stringify([], null, 2);
      }

      const games = await this.getAllGames(accountId);
      return JSON.stringify(games, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  static async getYearRange(accountId: string): Promise<{ minYear: number; maxYear: number } | null> {
    try {
      if (!isSupabaseConfigured || this.isDummyUser(accountId)) {
        const mock = MockDataService.generateMockGameRecords();
        if (mock.length === 0) return null;
        const years = mock.map(g => new Date(g.date).getFullYear());
        return { minYear: Math.min(...years), maxYear: Math.max(...years) };
      }

      // 最古の年
      const oldestRes = await supabase
        .from('games')
        .select('date')
        .eq('account_id', accountId)
        .order('date', { ascending: true })
        .limit(1);
      const { data: oldest, error: errOldest } = oldestRes as any;
      if (errOldest) throw errOldest;

      // 最新の年
      const newestRes = await supabase
        .from('games')
        .select('date')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .limit(1);
      const { data: newest, error: errNewest } = newestRes as any;
      if (errNewest) throw errNewest;

      if (!oldest || oldest.length === 0 || !newest || newest.length === 0) return null;

      const minYear = new Date(oldest[0].date as string).getFullYear();
      const maxYear = new Date(newest[0].date as string).getFullYear();
      return { minYear, maxYear };
    } catch (error) {
      console.error('Failed to get year range:', error);
      return null;
    }
  }

  static async resetData(accountId: string): Promise<void> {
    try {
      // ダミーユーザーの場合は何もしない
      if (this.isDummyUser(accountId)) {
        return;
      }

      const { error } = await supabase
        .from('games')
        .delete()
        .eq('account_id', accountId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw new Error('データのリセットに失敗しました');
    }
  }
}