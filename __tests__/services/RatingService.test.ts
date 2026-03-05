/**
 * RatingService のユニットテスト
 * Supabase はモックで置き換え、ロジックのみを検証
 */

// supabase モック
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockNot = jest.fn()
const mockSingle = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockOrder = jest.fn()
const mockRpc = jest.fn()

const mockFrom: jest.Mock<any, any> = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  },
  isSupabaseConfigured: true,
}))

// FriendService モック
jest.mock('@/services/FriendService', () => ({
  FriendService: {
    getFriends: jest.fn().mockResolvedValue([]),
  },
}))

// AccountService モック
jest.mock('@/services/AccountService', () => ({
  AccountService: {
    invalidateCache: jest.fn().mockResolvedValue(undefined),
  },
}))

// LocalStorageService モック
jest.mock('@/services/LocalStorageService', () => ({
  LocalStorageService: {
    getFriends: jest.fn().mockResolvedValue(null),
    saveFriends: jest.fn().mockResolvedValue(undefined),
  },
}))

import { RatingService } from '@/services/RatingService'
import { FriendService } from '@/services/FriendService'
import { AccountService } from '@/services/AccountService'
import type { RatingChange } from '@/utils/RatingCalculator'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RatingService.resolveAccountIdByPlayerName', () => {
  it('フレンドリストから一致するユーザー名を検索してaccountIdを返す', async () => {
    ;(FriendService.getFriends as jest.Mock).mockResolvedValue([
      {
        id: 'friendship-1',
        userId: 'test-user',
        friendId: 'friend-abc',
        username: '太郎',
        status: 'accepted',
        createdAt: '',
        updatedAt: '',
      },
    ])

    const result = await RatingService.resolveAccountIdByPlayerName('太郎', 'test-user')
    expect(result).toBe('friend-abc')
  })

  it('一致しない場合はnullを返す', async () => {
    ;(FriendService.getFriends as jest.Mock).mockResolvedValue([
      {
        id: 'friendship-1',
        userId: 'test-user',
        friendId: 'friend-abc',
        username: '太郎',
        status: 'accepted',
        createdAt: '',
        updatedAt: '',
      },
    ])

    const result = await RatingService.resolveAccountIdByPlayerName('花子', 'test-user')
    expect(result).toBeNull()
  })

  it('自分がfriend_id側の場合、userIdを返す', async () => {
    ;(FriendService.getFriends as jest.Mock).mockResolvedValue([
      {
        id: 'friendship-2',
        userId: 'other-user',
        friendId: 'test-user',
        username: '次郎',
        status: 'accepted',
        createdAt: '',
        updatedAt: '',
      },
    ])

    const result = await RatingService.resolveAccountIdByPlayerName('次郎', 'test-user')
    expect(result).toBe('other-user')
  })

  it('FriendServiceがエラーの場合はnullを返す', async () => {
    ;(FriendService.getFriends as jest.Mock).mockRejectedValue(new Error('Network error'))

    const result = await RatingService.resolveAccountIdByPlayerName('太郎', 'test-user')
    expect(result).toBeNull()
  })
})

describe('RatingService.getGameCountForRating', () => {
  it('rating_historyのレコード数を返す', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 15, error: null }),
      }),
    })

    const count = await RatingService.getGameCountForRating('test-user', 4)
    expect(count).toBe(15)
  })

  it('エラーの場合は0を返す', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: null, error: { message: 'error' } }),
      }),
    })

    const count = await RatingService.getGameCountForRating('test-user', 4)
    expect(count).toBe(0)
  })
})

describe('RatingService.getRatingHistory', () => {
  it('指定アカウントの履歴を昇順で返す', async () => {
    const mockHistory = [
      { id: '1', account_id: 'test', rating_before: 1500, rating_after: 1520, rating_change: 20 },
      { id: '2', account_id: 'test', rating_before: 1520, rating_after: 1510, rating_change: -10 },
    ]

    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockHistory, error: null }),
        }),
      }),
    })

    const result = await RatingService.getRatingHistory('test', 4)
    expect(result).toHaveLength(2)
    expect(result[0].rating_change).toBe(20)
  })

  it('エラーの場合は空配列を返す', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
        }),
      }),
    })

    const result = await RatingService.getRatingHistory('test', 4)
    expect(result).toEqual([])
  })
})

describe('RatingService.applyRatingChanges', () => {
  const sampleChanges: RatingChange[] = [
    { accountId: 'player-1', ratingBefore: 1500, ratingAfter: 1520, ratingChange: 20, rank: 1 },
    { accountId: 'player-2', ratingBefore: 1500, ratingAfter: 1480, ratingChange: -20, rank: 2 },
  ]

  it('update_ratings_for_game RPC を正しいパラメータで呼ぶ（4人戦）', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await RatingService.applyRatingChanges(sampleChanges, 'game-abc', 4)

    expect(mockRpc).toHaveBeenCalledWith('update_ratings_for_game', {
      p_game_id: 'game-abc',
      p_changes: [
        { accountId: 'player-1', ratingBefore: 1500, ratingAfter: 1520, ratingChange: 20, rank: 1 },
        { accountId: 'player-2', ratingBefore: 1500, ratingAfter: 1480, ratingChange: -20, rank: 2 },
      ],
      p_player_count: 4,
      p_rating_field: 'rating_4p',
    })
  })

  it('update_ratings_for_game RPC を正しいパラメータで呼ぶ（3人戦）', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await RatingService.applyRatingChanges(sampleChanges, 'game-xyz', 3)

    expect(mockRpc).toHaveBeenCalledWith('update_ratings_for_game', expect.objectContaining({
      p_rating_field: 'rating_3p',
      p_player_count: 3,
      p_game_id: 'game-xyz',
    }))
  })

  it('RPC がエラーを返した場合は例外を投げる', async () => {
    const rpcError = { message: 'RPC failed', code: '42501' }
    mockRpc.mockResolvedValue({ error: rpcError })

    await expect(
      RatingService.applyRatingChanges(sampleChanges, 'game-abc', 4)
    ).rejects.toEqual(rpcError)
  })
})

describe('RatingService.buildRatingPlayers', () => {
  it('会員プレイヤーのRatingPlayer配列を返す（4人戦）', async () => {
    const playerRecords = [
      { account_id: 'player-1', rank: 1 },
      { account_id: 'player-2', rank: 2 },
    ]

    // player_records クエリ
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({ data: playerRecords, error: null }),
        }),
      }),
    })

    // accounts クエリ for player-1
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'player-1', rating_4p: 1600 },
            error: null,
          }),
        }),
      }),
    })

    // rating_history count for player-1
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 10, error: null }),
        }),
      }),
    })

    // accounts クエリ for player-2
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'player-2', rating_4p: 1450 },
            error: null,
          }),
        }),
      }),
    })

    // rating_history count for player-2
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      }),
    })

    const result = await RatingService.buildRatingPlayers('game-123', 4)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ accountId: 'player-1', rating: 1600, rank: 1, gameCount: 10 })
    expect(result[1]).toMatchObject({ accountId: 'player-2', rating: 1450, rank: 2, gameCount: 5 })
  })

  it('account_idがないプレイヤーは除外される', async () => {
    const playerRecords: any[] = []

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({ data: playerRecords, error: null }),
        }),
      }),
    })

    const result = await RatingService.buildRatingPlayers('game-empty', 4)
    expect(result).toEqual([])
  })

  it('player_records クエリエラーの場合は空配列を返す', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })

    const result = await RatingService.buildRatingPlayers('game-error', 4)
    expect(result).toEqual([])
  })

  it('rating_4p が null の場合はデフォルト値 1500 を使用する', async () => {
    const playerRecords = [{ account_id: 'player-new', rank: 1 }]

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({ data: playerRecords, error: null }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'player-new', rating_4p: null },
            error: null,
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      }),
    })

    const result = await RatingService.buildRatingPlayers('game-new', 4)
    expect(result[0].rating).toBe(1500)
  })
})

describe('RatingService.updateRatingsForGame', () => {
  it('2人以上会員プレイヤーがいる場合はRPCを呼ぶ', async () => {
    jest.spyOn(RatingService, 'buildRatingPlayers').mockResolvedValue([
      { accountId: 'player-1', rating: 1500, rank: 1, gameCount: 5 },
      { accountId: 'player-2', rating: 1500, rank: 2, gameCount: 3 },
    ])
    const applyMock = jest.spyOn(RatingService, 'applyRatingChanges').mockResolvedValue(undefined)

    await RatingService.updateRatingsForGame('game-abc', 4)

    expect(applyMock).toHaveBeenCalled()
    expect(AccountService.invalidateCache).toHaveBeenCalled()
  })

  it('会員プレイヤーが1人以下の場合はRPCを呼ばない', async () => {
    jest.spyOn(RatingService, 'buildRatingPlayers').mockResolvedValue([
      { accountId: 'player-1', rating: 1500, rank: 1, gameCount: 5 },
    ])
    const applyMock = jest.spyOn(RatingService, 'applyRatingChanges').mockResolvedValue(undefined)

    await RatingService.updateRatingsForGame('game-abc', 4)

    expect(applyMock).not.toHaveBeenCalled()
  })

  it('会員プレイヤーが0人の場合はRPCを呼ばない', async () => {
    jest.spyOn(RatingService, 'buildRatingPlayers').mockResolvedValue([])
    const applyMock = jest.spyOn(RatingService, 'applyRatingChanges').mockResolvedValue(undefined)

    await RatingService.updateRatingsForGame('game-abc', 4)

    expect(applyMock).not.toHaveBeenCalled()
  })

  it('エラーが発生してもthrowしない', async () => {
    jest.spyOn(RatingService, 'buildRatingPlayers').mockRejectedValue(new Error('DB error'))

    await expect(RatingService.updateRatingsForGame('game-abc', 4)).resolves.toBeUndefined()
  })

  it('3人戦でもRPCを正しく呼ぶ', async () => {
    jest.spyOn(RatingService, 'buildRatingPlayers').mockResolvedValue([
      { accountId: 'player-1', rating: 1500, rank: 1, gameCount: 2 },
      { accountId: 'player-2', rating: 1500, rank: 2, gameCount: 1 },
      { accountId: 'player-3', rating: 1500, rank: 3, gameCount: 0 },
    ])
    const applyMock = jest.spyOn(RatingService, 'applyRatingChanges').mockResolvedValue(undefined)

    await RatingService.updateRatingsForGame('game-3p', 3)

    expect(applyMock).toHaveBeenCalledWith(
      expect.any(Array),
      'game-3p',
      3
    )
  })
})
