import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import {
  calculateRatingChanges,
  RatingPlayer,
  RatingChange,
  DEFAULT_RATING_CONFIG,
} from '@/utils/RatingCalculator'
import { FriendService } from './FriendService'
import { AccountService } from './AccountService'

type RatingHistoryRow = Database['public']['Tables']['rating_history']['Row']

export class RatingService {
  /**
   * 対局結果に基づいてレーティングを更新するメインエントリポイント
   * 会員プレイヤーが2人以上いる場合のみ更新を実行
   */
  static async updateRatingsForGame(gameId: string, playerCount: 3 | 4): Promise<void> {
    try {
      const ratingPlayers = await this.buildRatingPlayers(gameId, playerCount)

      if (ratingPlayers.length < 2) {
        return
      }

      const changes = calculateRatingChanges(ratingPlayers)
      await this.applyRatingChanges(changes, gameId, playerCount)

      // キャッシュ無効化
      AccountService.invalidateCache().catch(() => {})
    } catch (error) {
      console.error('RatingService.updateRatingsForGame: レーティング更新失敗:', error)
    }
  }

  /**
   * 対局のプレイヤーレコードから会員プレイヤーを抽出し、RatingPlayer配列を構築
   */
  static async buildRatingPlayers(gameId: string, playerCount: 3 | 4): Promise<RatingPlayer[]> {
    const { data: playerRecords, error } = await supabase
      .from('player_records')
      .select('account_id, rank')
      .eq('game_id', gameId)
      .not('account_id', 'is', null) as any

    if (error || !playerRecords) {
      return []
    }

    const ratingField = playerCount === 3 ? 'rating_3p' : 'rating_4p'
    const players: RatingPlayer[] = []

    for (const record of playerRecords) {
      const accountId = record.account_id as string

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select(`id, ${ratingField}`)
        .eq('id', accountId)
        .single()

      if (accountError || !account) continue

      const gameCount = await this.getGameCountForRating(accountId, playerCount)

      players.push({
        accountId,
        rating: (account as any)[ratingField] ?? 1500,
        rank: record.rank,
        gameCount,
      })
    }

    return players
  }

  /**
   * 計算したレーティング変動をDBに反映
   * SECURITY DEFINER RPC を使用して、他プレイヤーの accounts/rating_history を更新
   */
  static async applyRatingChanges(
    changes: readonly RatingChange[],
    gameId: string,
    playerCount: 3 | 4
  ): Promise<void> {
    const ratingField = playerCount === 3 ? 'rating_3p' : 'rating_4p'

    const changesJson = changes.map(c => ({
      accountId: c.accountId,
      ratingBefore: c.ratingBefore,
      ratingAfter: c.ratingAfter,
      ratingChange: c.ratingChange,
      rank: c.rank,
    }))

    const { error } = await supabase.rpc('update_ratings_for_game', {
      p_game_id: gameId,
      p_changes: changesJson,
      p_player_count: playerCount,
      p_rating_field: ratingField,
    })

    if (error) {
      throw error
    }
  }

  /**
   * アカウントのレーティング履歴を取得
   */
  static async getRatingHistory(
    accountId: string,
    playerCount: 3 | 4
  ): Promise<RatingHistoryRow[]> {
    const { data, error } = await (supabase as any)
      .from('rating_history')
      .select('*')
      .eq('account_id', accountId)
      .eq('player_count', playerCount)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('RatingService: 履歴取得エラー:', error)
      return []
    }

    return data || []
  }

  /**
   * アカウントの対局数を取得（K-factor決定用）
   */
  static async getGameCountForRating(accountId: string, playerCount: 3 | 4): Promise<number> {
    const { count, error } = await (supabase as any)
      .from('rating_history')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('player_count', playerCount)

    if (error) {
      return 0
    }

    return count ?? 0
  }

  /**
   * フレンドの username リストからプレイヤー名に対応する account_id を検索
   * 完全一致のみ
   */
  static async resolveAccountIdByPlayerName(
    playerName: string,
    currentUserId: string
  ): Promise<string | null> {
    try {
      const friends = await FriendService.getFriends()
      const matched = friends.find(f => f.username === playerName)
      if (matched) {
        // friendId か userId のうち、currentUserId でない方がフレンドのアカウントID
        return matched.userId === currentUserId ? matched.friendId : matched.userId
      }
      return null
    } catch {
      return null
    }
  }
}
