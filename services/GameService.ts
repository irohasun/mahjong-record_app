import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { GameRecord, PlayerStats, ChipCalculator } from '@/types/GameRecord';

type Game = Database['public']['Tables']['games']['Row'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
type PlayerRecord = Database['public']['Tables']['player_records']['Row'];
type PlayerRecordInsert = Database['public']['Tables']['player_records']['Insert'];
type RoundRecord = Database['public']['Tables']['round_records']['Row'];
type RoundRecordInsert = Database['public']['Tables']['round_records']['Insert'];

export class GameService {
  static async addGame(gameData: Omit<GameRecord, 'id'>): Promise<GameRecord> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('認証されていません');
      }

      // ゲーム記録を挿入
      const gameInsert: GameInsert = {
        account_id: user.id,
        date: gameData.date,
        location: gameData.location,
        game_type: gameData.gameType,
        rules: gameData.rules,
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

  static async getAllGames(accountId: string): Promise<GameRecord[]> {
    try {
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

      return games.map(game => ({
        id: game.id,
        accountId: game.account_id,
        date: game.date,
        location: game.location || '',
        gameType: game.game_type as '東風戦' | '東南戦',
        rules: game.rules as any,
        players: game.player_records.map(p => ({
          name: p.player_name,
          finalScore: p.final_score,
          rank: p.rank,
          isMainAccount: p.is_main_account,
          startingPosition: p.starting_position as 'East' | 'South' | 'West' | 'North',
        })),
        rounds: game.round_records.map(r => ({
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
        players: game.player_records.map(p => ({
          name: p.player_name,
          finalScore: p.final_score,
          rank: p.rank,
          isMainAccount: p.is_main_account,
          startingPosition: p.starting_position as 'East' | 'South' | 'West' | 'North',
        })),
        rounds: game.round_records.map(r => ({
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
        .eq('is_main_account', true)
        .order('games.date', { ascending: false });

      if (error) {
        throw error;
      }

      if (playerRecords.length === 0) {
        return {
          totalGames: 0,
          totalHanchans: 0,
          averageRank: 0,
          averageScore: 0,
          averageFinalPoints: 0,
          firstPlaceRate: 0,
          topTwoRate: 0,
          avoidLastRate: 0,
          highestScore: 0,
          lowestScore: 0,
          rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
          chipStats: {
            totalChipsWon: 0,
            averageChipsPerGame: 0,
            bestChipGame: 0,
          },
          pointStats: {
            averagePointChange: 0,
            totalPointChange: 0,
            positiveGameRate: 0,
          },
        };
      }

      const totalGames = playerRecords.length;
      const totalRank = playerRecords.reduce((sum, p) => sum + p.rank, 0);
      const totalScore = playerRecords.reduce((sum, p) => sum + p.final_score, 0);
      
      const firstPlaceCount = playerRecords.filter(p => p.rank === 1).length;
      const topTwoCount = playerRecords.filter(p => p.rank <= 2).length;
      const avoidLastCount = playerRecords.filter(p => p.rank < 4).length;
      
      const scores = playerRecords.map(p => p.final_score);
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      
      const rankDistribution = playerRecords.reduce((acc, p) => {
        acc[p.rank] = (acc[p.rank] || 0) + 1;
        return acc;
      }, {} as { [key: number]: number });

      return {
        totalGames,
        totalHanchans: totalGames, // 簡略化
        averageRank: totalRank / totalGames,
        averageScore: totalScore / totalGames,
        averageFinalPoints: totalScore / totalGames,
        firstPlaceRate: firstPlaceCount / totalGames,
        topTwoRate: topTwoCount / totalGames,
        avoidLastRate: avoidLastCount / totalGames,
        highestScore,
        lowestScore,
        rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, ...rankDistribution },
        chipStats: {
          totalChipsWon: 0,
          averageChipsPerGame: 0,
          bestChipGame: 0,
        },
        pointStats: {
          averagePointChange: (totalScore - (25000 * totalGames)) / totalGames,
          totalPointChange: totalScore - (25000 * totalGames),
          positiveGameRate: playerRecords.filter(p => p.final_score > 25000).length / totalGames,
        },
      };
    } catch (error) {
      console.error('Failed to get player stats:', error);
      throw new Error('統計データの取得に失敗しました');
    }
  }

  static async getChartData(accountId: string, period: 'month' | 'year' | 'all') {
    try {
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
        .eq('is_main_account', true)
        .order('games.date', { ascending: true });

      if (error) {
        throw error;
      }

      // 期間でフィルタリング
      const now = new Date();
      const filteredData = playerRecords.filter(record => {
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

      const labels = filteredData.map((_, index) => `${index + 1}`);
      const scores = filteredData.map(record => record.final_score - 25000);

      return { labels, scores };
    } catch (error) {
      console.error('Failed to get chart data:', error);
      return { labels: [], scores: [] };
    }
  }

  static async exportData(accountId: string): Promise<string> {
    try {
      const games = await this.getAllGames(accountId);
      return JSON.stringify(games, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  static async resetData(accountId: string): Promise<void> {
    try {
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