import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Database } from '@/types/database';
import { GameRecord, PlayerStats } from '@/types/GameRecord';

type Game = Database['public']['Tables']['games']['Row'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
type PlayerRecord = Database['public']['Tables']['player_records']['Row'];
type PlayerRecordInsert = Database['public']['Tables']['player_records']['Insert'];
type RoundRecord = Database['public']['Tables']['round_records']['Row'];
type RoundRecordInsert = Database['public']['Tables']['round_records']['Insert'];

import { MockDataService } from './MockDataService';

export class GameService {
  static async addGame(gameData: Omit<GameRecord, 'id'>): Promise<GameRecord> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // Supabaseが設定されていない場合やダミーユーザーの場合はローカル保存として扱う
      if (!isSupabaseConfigured || user.id === 'dummy-user-id') {
        const dummyId = `dummy-game-${Date.now()}`;
        return {
          ...gameData,
          id: dummyId,
        };
      }

      // ゲーム記録を挿入
      const gameInsert: GameInsert = {
        account_id: user.id,
        date: gameData.date,
        location: gameData.location,
        game_type: gameData.gameType,
        rules: gameData.rules as any, // as Json
        memo: gameData.memo,
        duration_minutes: gameData.duration && gameData.duration > 0 ? gameData.duration : null,
        game_end_condition: gameData.gameEndCondition,
        final_riichi_sticks: gameData.finalRiichiSticks,
        final_honba: gameData.finalHonba,
      };

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert(gameInsert)
        .select()
        .single();

      if (gameError) {
        throw gameError;
      }

      // プレイヤー記録を挿入
      const playerInserts: PlayerRecordInsert[] = gameData.players.map(player => ({
        game_id: game.id,
        player_name: player.name,
        is_main_account: player.isMainAccount,
        final_score: player.finalScore,
        rank: player.rank,
        starting_position: player.startingPosition,
      }));

      const { error: playersError } = await supabase
        .from('player_records')
        .insert(playerInserts);

      if (playersError) {
        throw playersError;
      }

      // 局記録を挿入（もしあれば）
      if (gameData.rounds.length > 0) {
        const roundInserts: RoundRecordInsert[] = gameData.rounds.map(round => ({
          game_id: game.id,
          round: round.round,
          honba: round.honba,
          riichi_sticks: round.riichiSticks,
          winner: round.winner,
          loser: round.loser,
          hand_type: round.handType,
          points: round.points,
          han: round.han,
          fu: round.fu,
          yakuman: round.yakuman,
          memo: round.memo,
        }));

        const { error: roundsError } = await supabase
          .from('round_records')
          .insert(roundInserts);

        if (roundsError) {
          throw roundsError;
        }
      }

      return {
        ...gameData,
        id: game.id,
      };
    } catch (error) {
      console.error('Failed to add game:', error);
      throw new Error('対局記録の保存に失敗しました');
    }
  }

  static async getGameById(accountId: string, gameId: string): Promise<GameRecord | null> {
    try {
      if (!isSupabaseConfigured) {
        // モックデータを返す
        return MockDataService.getMockGame(gameId);
      }

      // ゲームデータを取得
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .eq('account_id', accountId)
        .single();

      if (gameError || !game) {
        return null;
      }

      // プレイヤー記録を取得
      const { data: players, error: playersError } = await supabase
        .from('player_records')
        .select('*')
        .eq('game_id', gameId);

      if (playersError) {
        throw playersError;
      }

      // 局記録を取得
      const { data: rounds, error: roundsError } = await supabase
        .from('round_records')
        .select('*')
        .eq('game_id', gameId)
        .order('round');

      if (roundsError) {
        throw roundsError;
      }

      // GameRecord形式に変換
      const gameRecord: GameRecord = {
        id: game.id,
        accountId: accountId,
        date: game.date,
        location: game.location || '',
        gameType: game.game_type,
        rules: game.rules as any,
        memo: game.memo || '',
        duration: game.duration_minutes || 0,
        gameEndCondition: game.game_end_condition,
        finalRiichiSticks: game.final_riichi_sticks,
        finalHonba: game.final_honba,
        players: players.map(p => ({
          name: p.player_name,
          isMainAccount: p.is_main_account,
          finalScore: p.final_score,
          rank: p.rank,
          startingPosition: p.starting_position,
        })),
        rounds: rounds.map(r => ({
          round: r.round,
          honba: r.honba,
          riichiSticks: r.riichi_sticks,
          winner: r.winner,
          loser: r.loser,
          handType: r.hand_type,
          points: r.points as any,
          han: r.han,
          fu: r.fu,
          yakuman: r.yakuman,
          memo: r.memo || '',
        })),
      };

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
      const { error: gameError } = await supabase
        .from('games')
        .update({
          date: gameData.date,
          location: gameData.location,
          game_type: gameData.gameType,
          rules: gameData.rules as any,
          memo: gameData.memo,
          duration_minutes: gameData.duration && gameData.duration > 0 ? gameData.duration : null,
          game_end_condition: gameData.gameEndCondition,
          final_riichi_sticks: gameData.finalRiichiSticks,
          final_honba: gameData.finalHonba,
        })
        .eq('id', gameId)
        .eq('account_id', accountId);

      if (gameError) {
        console.error('❌ DEBUG: Failed to update game record:', gameError);
        throw gameError;
      }
      console.log('🔍 DEBUG: Game record updated successfully');

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
      const playerInserts: PlayerRecordInsert[] = gameData.players.map(player => ({
        game_id: gameId,
        player_name: player.name,
        is_main_account: player.isMainAccount,
        final_score: player.finalScore,
        rank: player.rank,
        starting_position: player.startingPosition,
      }));
      console.log('🔍 DEBUG: Player insert data created:', playerInserts);

      console.log('🔍 DEBUG: Inserting new player records...');
      const { error: playersError } = await supabase
        .from('player_records')
        .insert(playerInserts);

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
        const roundInserts: RoundRecordInsert[] = gameData.rounds.map(round => ({
          game_id: gameId,
          round: round.round,
          honba: round.honba,
          riichi_sticks: round.riichiSticks,
          winner: round.winner,
          loser: round.loser,
          hand_type: round.handType,
          points: round.points,
          han: round.han,
          fu: round.fu,
          yakuman: round.yakuman,
          memo: round.memo,
        }));
        console.log('🔍 DEBUG: Round insert data created:', roundInserts);

        console.log('🔍 DEBUG: Inserting new round records...');
        const { error: roundsError } = await supabase
          .from('round_records')
          .insert(roundInserts);

        if (roundsError) {
          console.error('❌ DEBUG: Failed to insert new round records:', roundsError);
          throw roundsError;
        }
        console.log('🔍 DEBUG: New round records inserted successfully');
      } else {
        console.log('🔍 DEBUG: No round records to insert');
      }
      
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
      // ダミーユーザーの場合は空配列を返す
      if (accountId === 'dummy-user-id') {
        return MockDataService.generateMockGameRecords();
      }

      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          player_records (*),
          round_records (*)
        `)
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (gamesError) {
        throw gamesError;
      }

      return games.map((game: any) => ({
        id: game.id,
        accountId: game.account_id,
        date: game.date,
        location: game.location || '',
        gameType: game.game_type as '東風戦' | '東南戦',
        rules: game.rules as any,
        players: game.player_records.map((p: any) => ({
          name: p.player_name,
          finalScore: p.final_score,
          rank: p.rank,
          isMainAccount: p.is_main_account,
          startingPosition: p.starting_position as 'East' | 'South' | 'West' | 'North',
        })),
        rounds: game.round_records.map((r: any) => ({
          round: r.round,
          honba: r.honba,
          riichiSticks: r.riichi_sticks,
          winner: r.winner,
          loser: r.loser,
          handType: r.hand_type as 'ron' | 'tsumo' | 'draw' | 'abort',
          points: r.points as number[],
          han: r.han,
          fu: r.fu,
          yakuman: r.yakuman,
          memo: r.memo,
        })),
        finalRiichiSticks: game.final_riichi_sticks,
        finalHonba: game.final_honba,
        memo: game.memo,
        duration: game.duration_minutes,
        gameEndCondition: game.game_end_condition as 'normal' | 'bankruptcy' | 'timeout' | 'time_limit',
      }));
    } catch (error) {
      console.error('Failed to get games:', error);
      return [];
    }
  }

  static async getRecentGames(accountId: string, limit: number = 5): Promise<GameRecord[]> {
    try {
      // ダミーユーザーの場合は空配列を返す
      if (accountId === 'dummy-user-id') {
        return MockDataService.generateMockGameRecords().slice(0, limit);
      }

      const { data: games, error } = await supabase
        .from('games')
        .select(`
          *,
          player_records (*),
          round_records (*)
        `)
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return games.map(game => ({
        id: game.id,
        accountId: game.account_id,
        date: game.date,
        location: game.location || '',
        gameType: game.game_type as '東風戦' | '東南戦',
        rules: game.rules as any,
        players: game.player_records.map((p: any) => ({
          name: p.player_name,
          finalScore: p.final_score,
          rank: p.rank,
          isMainAccount: p.is_main_account,
          startingPosition: p.starting_position as 'East' | 'South' | 'West' | 'North',
        })),
        rounds: game.round_records.map((r: any) => ({
          round: r.round,
          honba: r.honba,
          riichiSticks: r.riichi_sticks,
          winner: r.winner,
          loser: r.loser,
          handType: r.hand_type as 'ron' | 'tsumo' | 'draw' | 'abort',
          points: r.points as number[],
          han: r.han,
          fu: r.fu,
          yakuman: r.yakuman,
          memo: r.memo,
        })),
        finalRiichiSticks: game.final_riichi_sticks,
        finalHonba: game.final_honba,
        memo: game.memo,
        duration: game.duration_minutes,
        gameEndCondition: game.game_end_condition as 'normal' | 'bankruptcy' | 'timeout' | 'time_limit',
      }));
    } catch (error) {
      console.error('Failed to get recent games:', error);
      return [];
    }
  }

  static async getPlayerStats(accountId: string): Promise<PlayerStats> {
    console.log('🔍 DEBUG: GameService.getPlayerStats called with accountId:', accountId);
    
    try {
      // ダミーユーザーの場合はデフォルト統計を返す
      if (accountId === 'dummy-user-id') {
        console.log('🔍 DEBUG: Using mock player stats for dummy user');
        return MockDataService.generateMockPlayerStats();
      }

      console.log('🔍 DEBUG: Fetching player records from Supabase...');
      const { data: playerRecords, error } = await supabase
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

      if (error) {
        console.error('❌ DEBUG: Failed to fetch player records:', error);
        throw error;
      }
      console.log('🔍 DEBUG: Player records fetched successfully, count:', playerRecords?.length || 0);

      // games.dateで降順ソート
      const sortedRecords = (playerRecords as any[]).sort(
        (a: any, b: any) => new Date(b.games.date).getTime() - new Date(a.games.date).getTime()
      );

      if (sortedRecords.length === 0) {
        console.log('🔍 DEBUG: No player records found, returning default stats');
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

      const totalGames = sortedRecords.length;
      const totalRank = (sortedRecords as any[]).reduce((sum, p: any) => sum + p.rank, 0);
      const totalScore = (sortedRecords as any[]).reduce((sum, p: any) => sum + p.final_score, 0);
      const firstPlaceCount = (sortedRecords as any[]).filter((p: any) => p.rank === 1).length;
      const topTwoCount = (sortedRecords as any[]).filter((p: any) => p.rank <= 2).length;
      const avoidLastCount = (sortedRecords as any[]).filter((p: any) => p.rank < 4).length;
      const scores = (sortedRecords as any[]).map((p: any) => p.final_score);
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      
      // 最大連荘を計算
      let maxConsecutiveWins = 0;
      let currentConsecutiveWins = 0;
      for (const record of sortedRecords) {
        if (record.rank === 1) {
          currentConsecutiveWins++;
          maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
        } else {
          currentConsecutiveWins = 0;
        }
      }
      
      const rankDistribution = (sortedRecords as any[]).reduce((acc: any, p: any) => {
        acc[p.rank] = (acc[p.rank] || 0) + 1;
        return acc;
      }, {} as { [key: number]: number });

      const averageScore = totalScore / totalGames;
      const result = {
        totalGames,
        averageRank: totalRank / totalGames,
        averageScore,
        firstPlaceRate: firstPlaceCount / totalGames,
        topTwoRate: topTwoCount / totalGames,
        avoidLastRate: avoidLastCount / totalGames,
        highestScore,
        lowestScore,
        maxConsecutiveWins,
        rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
      };
      
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
      if (accountId === 'dummy-user-id') {
        return MockDataService.generateMockPlayerStats();
      }

      const { data: rounds, error } = await supabase
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

      if (error) {
        throw error;
      }

      // フィルタ: 期間
      const filtered = (rounds as any[]).filter((r: any) => {
        const d = new Date(r.games.date);
        if (period === 'all') return true;
        if (period === 'year') return d.getFullYear() === selectedDate.getFullYear();
        // month
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth()
        );
      });

      // 有効半荘のみ（4人分そろっており、null/空でない）
      const valid = filtered.filter((r: any) => {
        const pts = (r.points as any[]) || [];
        if (pts.length < 4) return false;
        return !pts.some((v) => v === null || v === undefined || v === '');
      });

      if (valid.length === 0) {
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

      // 日付・作成時刻順でソート（連荘計算用）
      const sorted = [...valid].sort(
        (a: any, b: any) => new Date(a.games.date).getTime() - new Date(b.games.date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let totalRounds = 0;
      let totalRank = 0;
      let totalScore = 0;
      let firstPlaceCount = 0;
      let topTwoCount = 0;
      let avoidLastCount = 0;
      let highestScore = -Infinity;
      let lowestScore = Infinity;
      const rankDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };

      // 連荘（連続1位）
      let maxConsecutiveWins = 0;
      let currentConsecutiveWins = 0;

      for (const r of sorted) {
        const pts = (r.points as any[]).map((v) => Number(v) || 0);
        const my = pts[0];
        const uniqueSorted = Array.from(new Set(pts)).sort((a, b) => b - a);
        const myRank = (uniqueSorted.indexOf(my) + 1) || 4;

        totalRounds += 1;
        totalRank += myRank;
        totalScore += my;
        highestScore = Math.max(highestScore, my);
        lowestScore = Math.min(lowestScore, my);
        rankDistribution[myRank] = (rankDistribution[myRank] || 0) + 1;
        if (myRank === 1) firstPlaceCount += 1;
        if (myRank <= 2) topTwoCount += 1;
        if (myRank < 4) avoidLastCount += 1;

        if (myRank === 1) {
          currentConsecutiveWins += 1;
          if (currentConsecutiveWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecutiveWins;
        } else {
          currentConsecutiveWins = 0;
        }
      }

      const averageRank = totalRounds > 0 ? totalRank / totalRounds : 0;
      const averageScore = totalRounds > 0 ? totalScore / totalRounds : 0;

      return {
        totalGames: totalRounds,
        averageRank,
        averageScore,
        firstPlaceRate: totalRounds > 0 ? firstPlaceCount / totalRounds : 0,
        topTwoRate: totalRounds > 0 ? topTwoCount / totalRounds : 0,
        avoidLastRate: totalRounds > 0 ? avoidLastCount / totalRounds : 0,
        highestScore: isFinite(highestScore) ? highestScore : 0,
        lowestScore: isFinite(lowestScore) ? lowestScore : 0,
        maxConsecutiveWins,
        rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
      };
    } catch (error) {
      console.error('Failed to get hanchan stats:', error);
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getChartData(accountId: string, period: 'month' | 'year' | 'all') {
    console.log('🔍 DEBUG: GameService.getChartData called with:', { accountId, period });
    
    try {
      // ダミーユーザーの場合は空のチャートデータを返す
      if (accountId === 'dummy-user-id') {
        console.log('🔍 DEBUG: Using mock chart data for dummy user');
        return MockDataService.generateChartData(period);
      }

      console.log('🔍 DEBUG: Fetching player records for chart data...');
      const { data: playerRecords, error } = await supabase
        .from('player_records')
        .select(`
          final_score,
          rank,
          games!inner (
            account_id,
            date,
            rules
          )
        `)
        .eq('games.account_id', accountId)
        .eq('is_main_account', true);

      if (error) {
        console.error('❌ DEBUG: Failed to fetch player records for chart:', error);
        throw error;
      }
      console.log('🔍 DEBUG: Player records fetched for chart, count:', playerRecords?.length || 0);

      // games.dateで昇順ソート
      const sortedRecords = (playerRecords as any[]).sort(
        (a: any, b: any) => new Date(a.games.date).getTime() - new Date(b.games.date).getTime()
      );

      // 期間でフィルタリング
      const now = new Date();
      const filteredData = (sortedRecords as any[]).filter((record: any) => {
        const gameDate = new Date(record.games.date);
        switch (period) {
          case 'month':
            return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear();
          case 'year':
            return gameDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });

      // 選択された期間のすべての対局データを取得
      const labels = filteredData.map((_: any, index: number) => `${index + 1}`);
      const scores2 = filteredData.map((record: any) => record.final_score - 25000);
      const ranks = filteredData.map((record: any) => record.rank);
      
      const result = { labels, scores: scores2, ranks };
      console.log('🔍 DEBUG: Chart data calculated successfully:', {
        period,
        dataPoints: result.labels.length,
        scoreRange: result.scores.length > 0 ? `${Math.min(...result.scores)} to ${Math.max(...result.scores)}` : 'No data'
      });
      
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
      if (accountId === 'dummy-user-id') {
        return JSON.stringify([], null, 2);
      }

      const games = await this.getAllGames(accountId);
      return JSON.stringify(games, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  static async resetData(accountId: string): Promise<void> {
    try {
      // ダミーユーザーの場合は何もしない
      if (accountId === 'dummy-user-id') {
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