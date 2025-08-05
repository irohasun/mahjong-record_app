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
        duration_minutes: gameData.duration,
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

  static async updateGame(accountId: string, gameId: string, gameData: GameRecord): Promise<void> {
    try {
      if (!isSupabaseConfigured) {
        // モック環境では何もしない
        return;
      }

      // ゲームデータを更新
      const { error: gameError } = await supabase
        .from('games')
        .update({
          date: gameData.date,
          location: gameData.location,
          game_type: gameData.gameType,
          rules: gameData.rules as any,
          memo: gameData.memo,
          duration_minutes: gameData.duration,
          game_end_condition: gameData.gameEndCondition,
          final_riichi_sticks: gameData.finalRiichiSticks,
          final_honba: gameData.finalHonba,
        })
        .eq('id', gameId)
        .eq('account_id', accountId);

      if (gameError) {
        throw gameError;
      }

      // 既存のプレイヤー記録を削除
      const { error: deletePlayersError } = await supabase
        .from('player_records')
        .delete()
        .eq('game_id', gameId);

      if (deletePlayersError) {
        throw deletePlayersError;
      }

      // 新しいプレイヤー記録を挿入
      const playerInserts: PlayerRecordInsert[] = gameData.players.map(player => ({
        game_id: gameId,
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

      // 既存の局記録を削除
      const { error: deleteRoundsError } = await supabase
        .from('round_records')
        .delete()
        .eq('game_id', gameId);

      if (deleteRoundsError) {
        throw deleteRoundsError;
      }

      // 新しい局記録を挿入（もしあれば）
      if (gameData.rounds.length > 0) {
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

        const { error: roundsError } = await supabase
          .from('round_records')
          .insert(roundInserts);

        if (roundsError) {
          throw roundsError;
        }
      }
    } catch (error) {
      console.error('Failed to update game:', error);
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
        .order('date', { ascending: false });

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
    try {
      // ダミーユーザーの場合はデフォルト統計を返す
      if (accountId === 'dummy-user-id') {
        return MockDataService.generateMockPlayerStats();
      }

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
        throw error;
      }

      // games.dateで降順ソート
      const sortedRecords = (playerRecords as any[]).sort(
        (a: any, b: any) => new Date(b.games.date).getTime() - new Date(a.games.date).getTime()
      );

      if (sortedRecords.length === 0) {
              return {
        totalGames: 0,
        averageRank: 0,
        averageScore: 0,
        firstPlaceRate: 0,
        topTwoRate: 0,
        avoidLastRate: 0,
        highestScore: 0,
        lowestScore: 0,
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
      const rankDistribution = (sortedRecords as any[]).reduce((acc: any, p: any) => {
        acc[p.rank] = (acc[p.rank] || 0) + 1;
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
        rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
      };
    } catch (error) {
      console.error('Failed to get player stats:', error);
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getChartData(accountId: string, period: 'month' | 'year' | 'all') {
    try {
      // ダミーユーザーの場合は空のチャートデータを返す
      if (accountId === 'dummy-user-id') {
        return MockDataService.generateChartData(period);
      }

      const { data: playerRecords, error } = await supabase
        .from('player_records')
        .select(`
          final_score,
          games!inner (
            account_id,
            date,
            rules
          )
        `)
        .eq('games.account_id', accountId)
        .eq('is_main_account', true);

      if (error) {
        throw error;
      }

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
      const labels = filteredData.map((_: any, index: number) => `${index + 1}`);
      const scores2 = filteredData.map((record: any) => record.final_score - 25000);
      return { labels, scores: scores2 };
    } catch (error) {
      console.error('Failed to get chart data:', error);
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