import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Database } from '@/types/database';
import { LocalStorageService } from './LocalStorageService';
import { SyncService } from './SyncService';
import { MockDataService } from './MockDataService';
import { GameRecord, Player, PlayerStats, RoundRecord as GameRoundRecord } from '@/types/GameRecord';
import { RatingService } from './RatingService';

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
   * "半荘N" のような文字列から N を抽出して数値順ソートする。
   * 辞書順ソート（"半荘10" < "半荘2"）によるバグを防ぐ。
   */
  private static sortRoundsByNumber(rounds: any[]): any[] {
    return [...rounds].sort((a, b) => {
      const numA = parseInt(String(a.round).replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(String(b.round).replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });
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
      chipCounts: game.chip_counts || undefined,
      players: (game.player_records || []).map((p: any) => this.mapPlayerRecordFromDb(p)),
      rounds: this.sortRoundsByNumber(game.round_records || []).map((r: any) => this.mapRoundRecordFromDb(r)),
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
      chip_counts: gameData.chipCounts ?? null,
    };
  }

  /**
   * プレイヤーデータをデータベース形式に変換
   */
  private static mapPlayerToDb(player: Player, gameId: string, accountId?: string | null): PlayerRecordInsert {
    return {
      game_id: gameId,
      player_name: player.name,
      is_main_account: player.isMainAccount,
      final_score: player.finalScore,
      rank: player.rank,
      starting_position: player.startingPosition,
      account_id: accountId ?? null,
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
    const { error: deletePlayersError } = await supabase
      .from('player_records')
      .delete()
      .eq('game_id', gameId);

    if (deletePlayersError) {
      throw deletePlayersError;
    }

    const playerInserts = gameData.players.map(player =>
      this.mapPlayerToDb(player, gameId)
    );

    const { error: playersError } = await supabase
      .from('player_records')
      .insert(playerInserts as any);

    if (playersError) {
      throw playersError;
    }

    const { error: deleteRoundsError } = await supabase
      .from('round_records')
      .delete()
      .eq('game_id', gameId);

    if (deleteRoundsError) {
      throw deleteRoundsError;
    }

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
   * 有効な局記録かどうかを判定（N人分の点数が揃っている）
   */
  private static isValidRoundRecord(points: any[], playerCount: number = 3): boolean {
    if (!points || points.length < playerCount) return false;
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

      // バリデーション追加
      const playerCount = (gameData.rules as any)?.playerCount || 4;

      // 1. players配列の長さチェック
      if (gameData.players.length !== playerCount) {
        console.error('GameService.addGame: players配列の長さがplayerCountと不一致:', {
          playerCount,
          playersLength: gameData.players.length
        });
        throw new Error(`プレイヤー数が不正です。期待: ${playerCount}, 実際: ${gameData.players.length}`);
      }

      // 2. rounds内のpoints配列の長さチェック
      gameData.rounds.forEach((round, index) => {
        if (round.points && round.points.length !== playerCount) {
          console.error(`GameService.addGame: 半荘${index + 1}のpoints配列の長さがplayerCountと不一致:`, {
            playerCount,
            pointsLength: round.points.length,
            round: round.round
          });
          throw new Error(`半荘${index + 1}のデータが不正です。期待: ${playerCount}人分, 実際: ${round.points.length}人分`);
        }
      });

      // 3. chipCountsの長さチェック（存在する場合のみ）
      const chipCounts = gameData.chipCounts;
      if (chipCounts && chipCounts.length !== playerCount) {
        console.error('GameService.addGame: chipCounts配列の長さがplayerCountと不一致:', {
          playerCount,
          chipCountsLength: chipCounts.length
        });
        throw new Error(`チップデータが不正です。期待: ${playerCount}人分, 実際: ${chipCounts.length}人分`);
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
        console.error('GameService.addGame: ゲーム挿入エラー:', gameError);
        throw gameError || new Error('ゲームの挿入に失敗しました');
      }

      const gameId = insertedGame.id;

      // プレイヤーの account_id を解決
      const playerAccountIds = await Promise.all(
        gameData.players.map(async (player) => {
          if (player.isMainAccount) {
            return user.id;
          }
          return RatingService.resolveAccountIdByPlayerName(player.name, user.id);
        })
      );

      // プレイヤー記録を挿入
      const playerInserts = gameData.players.map((player, idx) =>
        this.mapPlayerToDb(player, gameId, playerAccountIds[idx])
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
      SyncService.backgroundSync().catch(() => {});

      // バックグラウンドでレーティング更新
      RatingService.updateRatingsForGame(gameId, playerCount as 3 | 4).catch(() => {});

      return savedGame;
    } catch (error) {
      // エラーの詳細をログに記録（元のエラーを保持）
      console.error('GameService.addGame: 保存失敗の詳細:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // 元のエラーをそのまま投げる
      throw error;
    }
  }

  static async getGames(): Promise<GameRecord[]> {
    try {
      // ローカル・ファースト: まずローカルデータを取得（瞬間表示）
      const localGames = await LocalStorageService.getGames();
      
      // キャッシュが有効な場合はローカルデータを返す
      const isCacheValid = await LocalStorageService.isCacheValid();
      if (isCacheValid && localGames.length > 0) {
        return localGames;
      }

      // Supabaseが設定されていない場合は空のリストを返す
      if (!isSupabaseConfigured) {
        return [];
      }

      const user = await this.getCurrentUser();

      // バックグラウンドで同期を実行
      SyncService.backgroundSync().catch(() => {});

      // ローカルデータがあれば返す（同期中でも表示可能）
      if (localGames.length > 0) {
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
      
      return remoteGames;
    } catch (error) {
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

      // 局記録を取得（ソートはクライアント側の sortRoundsByNumber で行う）
      const roundsSelRes = await supabase
        .from('round_records')
        .select('*')
        .eq('game_id', gameId);

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
      return null;
    }
  }

  static async deleteGame(accountId: string, gameId: string): Promise<void> {
    try {
      // Supabaseが設定されていない場合はローカル削除として扱う
      if (!isSupabaseConfigured) {
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
      throw error;
    }
  }

  static async updateGame(accountId: string, gameId: string, gameData: GameRecord): Promise<void> {
    try {
      if (!isSupabaseConfigured) {
        return;
      }

      const updatePayload = this.mapGameToDb(gameData);

      const { error: gameError } = await (supabase as any)
        .from('games')
        .update(updatePayload)
        .eq('id', gameId)
        .eq('account_id', accountId);

      if (gameError) {
        throw gameError;
      }

      await this.updateGameRelatedRecords(gameId, gameData);
      await LocalStorageService.saveGame(gameData);
      await LocalStorageService.clearCacheTimestamp();
      await LocalStorageService.clearStatsCacheAll();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 履歴一覧用の軽量ゲームサマリーを取得（round_recordsなし、ページネーション対応）
   */
  static async getGameSummaries(
    accountId: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<{ games: GameRecord[]; hasMore: boolean }> {
    try {
      if (this.isDummyUser(accountId)) {
        return { games: [], hasMore: false };
      }

      const page = options.page ?? 0;
      const pageSize = options.pageSize ?? 20;
      const from = page * pageSize;
      // N+1 fetch pattern: request one extra row (from..from+pageSize inclusive)
      // to determine if more pages exist without a separate count query.
      const to = from + pageSize;

      const { data: games, error } = await supabase
        .from('games')
        .select(`
          id,
          account_id,
          date,
          location,
          game_type,
          rules,
          memo,
          duration_minutes,
          game_end_condition,
          final_riichi_sticks,
          final_honba,
          photo_path,
          chip_counts,
          player_records (*),
          round_records (round, points)
        `)
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to) as any;

      if (error) {
        throw error;
      }

      const fetched = games || [];
      const hasMore = fetched.length > pageSize;
      const sliced = hasMore ? fetched.slice(0, pageSize) : fetched;

      const mapped = sliced.map((game: any) => this.mapGameFromDb(game));

      return { games: mapped, hasMore };
    } catch (error) {
      return { games: [], hasMore: false };
    }
  }

  static async getAllGames(accountId: string): Promise<GameRecord[]> {
    try {
      // ダミーユーザーの場合は空のリストを返す
      if (this.isDummyUser(accountId)) {
        return [];
      }

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

      return mappedGames;
    } catch (error) {
      return [];
    }
  }

  static async getRecentGames(accountId: string, limit: number = 5): Promise<GameRecord[]> {
    try {
      // ダミーユーザーの場合は空のリストを返す
      if (this.isDummyUser(accountId)) {
        return [];
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
      return [];
    }
  }

  static async getPlayerStats(accountId: string): Promise<PlayerStats> {
    try {
      if (this.isDummyUser(accountId)) {
        return MockDataService.generateMockPlayerStats();
      }

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
        throw error;
      }

      const sortedRecords = (playerRecords || []).sort(
        (a: any, b: any) => new Date(b.games.date).getTime() - new Date(a.games.date).getTime()
      );

      const statsRecords = sortedRecords.map((p: any) => ({
        rank: p.rank,
        score: p.final_score,
      }));

      return this.calculateStats(statsRecords);
    } catch (error) {
      throw new Error('統計データの取得に失敗しました');
    }
  }

  /**
   * 期間の開始日・終了日を計算するヘルパー
   */
  private static calculatePeriodBounds(
    period: 'month' | 'year' | 'all',
    selectedDate: Date
  ): { periodStart: string | undefined; periodEnd: string | undefined } {
    if (period === 'all') {
      return { periodStart: undefined, periodEnd: undefined };
    }

    if (period === 'year') {
      const year = selectedDate.getFullYear();
      return {
        periodStart: `${year}-01-01`,
        periodEnd: `${year}-12-31`,
      };
    }

    // month
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    return {
      periodStart: `${year}-${String(month).padStart(2, '0')}-01`,
      periodEnd: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  /**
   * 指定期間の飛び率を計算
   * 全半荘中、メインプレイヤーが飛んだ回数の割合を返す
   */
  static async getTobiRate(
    accountId: string,
    period: 'month' | 'year' | 'all',
    selectedDate: Date,
    playerCount?: 3 | 4
  ): Promise<{ tobiCount: number; totalRounds: number; tobiRate: number }> {
    try {
      const games = await LocalStorageService.getGames();
      const { periodStart, periodEnd } = this.calculatePeriodBounds(period, selectedDate);

      const filteredGames = games.filter(game => {
        if (game.accountId !== accountId) return false;
        if (!periodStart || !periodEnd) return true;
        const gameDate = game.date.substring(0, 10);
        if (gameDate < periodStart || gameDate > periodEnd) return false;

        // プレイヤー人数でフィルタ
        if (playerCount !== undefined) {
          const gamePlayerCount = game.rules?.playerCount ?? 4;
          if (gamePlayerCount !== playerCount) return false;
        }

        return true;
      });

      let totalRounds = 0;
      let tobiCount = 0;

      for (const game of filteredGames) {
        if (!game.rounds) continue;
        for (const round of game.rounds) {
          totalRounds++;
          const points = round.points as number[];
          const pc = game.rules?.playerCount || points.length;
          if (!points || points.length < pc) continue;

          // memoからtobiWinners情報を取得
          let tobiWinners: number[] = [];
          if (round.memo) {
            try {
              const memoData = JSON.parse(round.memo);
              if (memoData.tobiWinners) {
                tobiWinners = memoData.tobiWinners;
              }
            } catch {
              // memoがJSON形式でない場合はスキップ
            }
          }

          // tobiWinnersがある = 誰かが飛んだ
          // メインプレイヤー(index 0)がtobiWinnerでなく、最低スコアなら飛びと判定
          if (tobiWinners.length > 0 && !tobiWinners.includes(0)) {
            const mainScore = points[0];
            const minScore = Math.min(...points);
            if (mainScore === minScore) {
              tobiCount++;
            }
          }
        }
      }

      const tobiRate = totalRounds > 0 ? tobiCount / totalRounds : 0;
      return { tobiCount, totalRounds, tobiRate };
    } catch {
      return { tobiCount: 0, totalRounds: 0, tobiRate: 0 };
    }
  }

  static async getHanchanStats(
    accountId: string,
    period: 'month' | 'year' | 'all',
    selectedDate: Date,
    playerCount?: 3 | 4
  ): Promise<PlayerStats> {
    try {
      if (this.isDummyUser(accountId)) {
        return MockDataService.generateMockPlayerStats();
      }

      const { periodStart, periodEnd } = this.calculatePeriodBounds(period, selectedDate);

      const { data, error } = await supabase.rpc('get_player_stats', {
        user_id: accountId,
        period_start: periodStart,
        period_end: periodEnd,
        player_count: playerCount ?? null,
      } as any);

      if (error) {
        throw error;
      }

      if (!data || data.totalGames === 0) {
        return this.getDefaultPlayerStats();
      }

      const result: PlayerStats = {
        totalGames: data.totalGames ?? 0,
        averageRank: data.averageRank ?? 0,
        averageScore: data.averageScore ?? 0,
        firstPlaceRate: data.firstPlaceRate ?? 0,
        topTwoRate: data.topTwoRate ?? 0,
        avoidLastRate: data.avoidLastRate ?? 0,
        highestScore: data.highestScore ?? 0,
        lowestScore: data.lowestScore ?? 0,
        maxConsecutiveWins: 0,
        totalChipScore: data.totalChipScore ?? 0,
        rankDistribution: {
          1: data.rankDistribution?.['1'] ?? 0,
          2: data.rankDistribution?.['2'] ?? 0,
          3: data.rankDistribution?.['3'] ?? 0,
          4: data.rankDistribution?.['4'] ?? 0,
        },
      };

      if (!isFinite(result.highestScore)) {
        result.highestScore = 0;
      }
      if (!isFinite(result.lowestScore)) {
        result.lowestScore = 0;
      }

      return result;
    } catch (error) {
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getChartData(accountId: string, period: 'month' | 'year' | 'all', selectedDate: Date, playerCount?: 3 | 4) {
    try {
      if (this.isDummyUser(accountId)) {
        return MockDataService.generateChartData(period);
      }

      const { periodStart, periodEnd } = this.calculatePeriodBounds(period, selectedDate);

      const { data, error } = await supabase.rpc('get_chart_data', {
        user_id: accountId,
        period_start: periodStart,
        period_end: periodEnd,
        player_count: playerCount ?? null,
      } as any);

      if (error) {
        throw error;
      }

      if (!data || !data.rankHistory || data.rankHistory.length === 0) {
        return { labels: [], scores: [], ranks: [] };
      }

      // RPC returns rankHistory sorted DESC, reverse for chronological display
      const rankHistory = [...data.rankHistory].reverse();
      const ranks = rankHistory.map((item: any) => item.rank);
      const labels = ranks.map((_: any, idx: number) => `${idx + 1}`);

      return { labels, scores: [], ranks };
    } catch (error) {
      return { labels: [], scores: [], ranks: [] };
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
      throw new Error('データのリセットに失敗しました');
    }
  }
}