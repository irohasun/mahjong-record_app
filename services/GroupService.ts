import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Group,
  GroupMember,
  GroupDetails,
  GroupStatistics,
  GroupInvitation,
  MemberRanking,
  ScoreHistoryEntry,
} from '@/types/Groups';
import { LocalStorageService } from './LocalStorageService';
import { notifyGroupsChanged } from '@/utils/cacheInvalidation';
import { StorageService } from './StorageService';

export class GroupService {
  /**
   * 現在のユーザーを取得
   */
  private static async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('認証されていません');
    }
    return user;
  }

  /**
   * DBのグループ行をGroup型に変換
   */
  private static mapGroupFromDb(row: any, memberCount: number = 0): Group {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
      ownerId: row.owner_id,
      isPublic: row.is_public ?? false,
      memberCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * DBのメンバー行をGroupMember型に変換
   */
  private static mapMemberFromDb(row: any): GroupMember {
    return {
      id: row.id,
      groupId: row.group_id,
      memberId: row.member_id,
      username: row.accounts?.username ?? '不明',
      avatarUrl: row.accounts?.avatar_url ?? undefined,
      role: row.role,
      joinedAt: row.joined_at,
    };
  }

  /**
   * グループ一覧取得（参加中のグループ）
   */
  static async getGroups(): Promise<Group[]> {
    try {
      const cached = await LocalStorageService.getGroups();
      if (cached) return cached;

      if (!isSupabaseConfigured) return [];

      const user = await this.getCurrentUser();

      // 自分が参加しているグループのIDを取得
      const { data: memberData, error: memberError } = (await (supabase as any)
        .from('group_members')
        .select('group_id')
        .eq('member_id', user.id)) as any;

      if (memberError) throw memberError;

      const groupIds = (memberData || []).map((m: any) => m.group_id);
      if (groupIds.length === 0) return [];

      // グループ情報を取得
      const { data: groupsData, error: groupsError } = (await (supabase as any)
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('updated_at', { ascending: false })) as any;

      if (groupsError) throw groupsError;

      // 各グループのメンバー数を取得
      const groups: Group[] = await Promise.all(
        (groupsData || []).map(async (row: any) => {
          const { count } = (await (supabase as any)
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', row.id)) as any;
          return this.mapGroupFromDb(row, count ?? 0);
        })
      );

      await LocalStorageService.saveGroups(groups);
      return groups;
    } catch (error) {
      const cached = await LocalStorageService.getGroups();
      return cached ?? [];
    }
  }

  /**
   * グループ詳細取得
   */
  static async getGroupDetails(groupId: string): Promise<GroupDetails | null> {
    try {
      if (!isSupabaseConfigured) return null;

      // グループ情報
      const { data: groupData, error: groupError } = (await (supabase as any)
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()) as any;

      if (groupError || !groupData) return null;

      // メンバー情報
      const { data: membersData, error: membersError } = (await (supabase as any)
        .from('group_members')
        .select(
          `
          id, group_id, member_id, role, joined_at,
          accounts (id, username, avatar_url)
        `
        )
        .eq('group_id', groupId)) as any;

      if (membersError) throw membersError;

      const members = await Promise.all(
        (membersData || []).map(async (row: any) => {
          const member = this.mapMemberFromDb(row);
          if (member.avatarUrl) {
            const url = await StorageService.getPublicUrl(member.avatarUrl);
            return { ...member, avatarUrl: url ?? undefined };
          }
          return member;
        })
      );

      // 対局数
      const { count: gameCount } = (await (supabase as any)
        .from('game_groups')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)) as any;

      const group = this.mapGroupFromDb(groupData, members.length);
      const resolvedAvatarUrl = group.avatarUrl
        ? await StorageService.getPublicUrl(group.avatarUrl)
        : undefined;

      return {
        ...group,
        avatarUrl: resolvedAvatarUrl ?? undefined,
        members,
        gameCount: gameCount ?? 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * グループ作成
   */
  static async createGroup(
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<Group> {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabaseが設定されていません');
      }

      const user = await this.getCurrentUser();

      // グループを作成
      const { data: groupData, error: groupError } = (await (supabase as any)
        .from('groups')
        .insert({
          owner_id: user.id,
          name,
          description: description ?? null,
          is_public: isPublic,
        })
        .select()
        .single()) as any;

      if (groupError || !groupData) {
        throw groupError ?? new Error('グループの作成に失敗しました');
      }

      // オーナーをメンバーとして追加
      const { error: memberError } = await (supabase as any)
        .from('group_members')
        .insert({
          group_id: groupData.id,
          member_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      await LocalStorageService.clearGroupsCache();

      return this.mapGroupFromDb(groupData, 1);
    } catch (error) {
      throw error;
    }
  }

  /**
   * グループ更新
   */
  static async updateGroup(
    groupId: string,
    updates: { name?: string; description?: string; isPublic?: boolean; avatarUrl?: string }
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.description !== undefined)
        updatePayload.description = updates.description;
      if (updates.isPublic !== undefined)
        updatePayload.is_public = updates.isPublic;
      if (updates.avatarUrl !== undefined)
        updatePayload.avatar_url = updates.avatarUrl;

      const { error } = await (supabase as any)
        .from('groups')
        .update(updatePayload)
        .eq('id', groupId);

      if (error) throw error;

      await LocalStorageService.clearGroupsCache();
      notifyGroupsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * グループ削除
   */
  static async deleteGroup(groupId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await LocalStorageService.clearGroupsCache();
      notifyGroupsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * メンバー追加
   */
  static async addMember(
    groupId: string,
    memberId: string,
    role: 'member' | 'admin' = 'member'
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any).from('group_members').insert({
        group_id: groupId,
        member_id: memberId,
        role,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('既にメンバーです');
        }
        throw error;
      }

      await LocalStorageService.clearGroupsCache();
      notifyGroupsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * メンバー削除
   */
  static async removeMember(
    groupId: string,
    memberId: string
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('member_id', memberId);

      if (error) throw error;

      await LocalStorageService.clearGroupsCache();
      notifyGroupsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * グループメンバー一覧取得
   */
  static async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      if (!isSupabaseConfigured) return [];

      const { data, error } = (await (supabase as any)
        .from('group_members')
        .select(
          `
          id, group_id, member_id, role, joined_at,
          accounts (id, username, avatar_url)
        `
        )
        .eq('group_id', groupId)) as any;

      if (error) throw error;

      return await Promise.all(
        (data || []).map(async (row: any) => {
          const member = this.mapMemberFromDb(row);
          if (member.avatarUrl) {
            const url = await StorageService.getPublicUrl(member.avatarUrl);
            return { ...member, avatarUrl: url ?? undefined };
          }
          return member;
        })
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * 対局をグループに紐づけ
   */
  static async linkGameToGroup(
    gameId: string,
    groupId: string
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any).from('game_groups').insert({
        game_id: gameId,
        group_id: groupId,
      });

      if (error) {
        if (error.code === '23505') return; // 既に紐付いている
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * シリーズ招待を送信
   */
  static async inviteToGroup(groupId: string, userId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const user = await this.getCurrentUser();

      const { error } = await (supabase as any).from('group_invitations').insert({
        group_id: groupId,
        invited_by: user.id,
        invited_user_id: userId,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('既に招待済みです');
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 自分宛ての保留中シリーズ招待を取得
   */
  static async getPendingInvitations(): Promise<GroupInvitation[]> {
    try {
      if (!isSupabaseConfigured) return [];

      const user = await this.getCurrentUser();

      const { data, error } = (await (supabase as any)
        .from('group_invitations')
        .select(
          `
          id, group_id, invited_by, status, created_at,
          groups (id, name),
          accounts!group_invitations_invited_by_fkey (id, username, avatar_url)
        `
        )
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')) as any;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        groupId: row.group_id,
        groupName: row.groups?.name ?? '不明',
        invitedBy: {
          id: row.accounts?.id ?? row.invited_by,
          username: row.accounts?.username ?? '不明',
          avatarUrl: row.accounts?.avatar_url ?? undefined,
        },
        status: 'pending' as const,
        createdAt: row.created_at,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * シリーズ招待を承認（RPC経由でgroup_membersに追加）
   */
  static async acceptInvitation(invitationId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any).rpc('accept_group_invitation', {
        invitation_id: invitationId,
      });

      if (error) throw error;

      await LocalStorageService.clearGroupsCache();
      notifyGroupsChanged();
    } catch (error) {
      throw error;
    }
  }

  /**
   * シリーズ招待を拒否
   */
  static async rejectInvitation(invitationId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('group_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * グループから対局の紐づけを解除
   */
  static async unlinkGameFromGroup(
    gameId: string,
    groupId: string
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured) return;

      const { error } = await (supabase as any)
        .from('game_groups')
        .delete()
        .eq('game_id', gameId)
        .eq('group_id', groupId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * グループ内の対局一覧取得
   */
  static async getGroupGames(groupId: string): Promise<any[]> {
    try {
      if (!isSupabaseConfigured) return [];

      const { data, error } = (await (supabase as any)
        .from('game_groups')
        .select(
          `
          game_id,
          games (
            id, account_id, date, location, game_type, rules, memo,
            duration_minutes, game_end_condition, final_riichi_sticks,
            final_honba, photo_path, chip_counts,
            player_records (*)
          )
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })) as any;

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.games)
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  /**
   * グループ統計取得
   */
  static async getGroupStatistics(
    groupId: string
  ): Promise<GroupStatistics | null> {
    try {
      if (!isSupabaseConfigured) return null;

      // グループ内の対局を取得
      const games = await this.getGroupGames(groupId);
      if (games.length === 0) return null;

      // メンバー一覧取得
      const members = await this.getGroupMembers(groupId);
      const memberMap = new Map(members.map((m) => [m.memberId, m]));

      // メンバーごとの統計を集計
      const memberStats = new Map<
        string,
        { totalScore: number; totalGames: number; rankSum: number; ranks: number[] }
      >();

      for (const game of games) {
        const playerRecords = game.player_records || [];
        for (const pr of playerRecords) {
          const memberId = pr.player_name; // player_name にメンバー名を使用
          // メンバーIDで検索（player_records.player_name がメンバー名の場合）
          const member = Array.from(memberMap.values()).find(
            (m) => m.username === pr.player_name
          );
          if (!member) continue;

          const existing = memberStats.get(member.memberId) ?? {
            totalScore: 0,
            totalGames: 0,
            rankSum: 0,
            ranks: [],
          };

          memberStats.set(member.memberId, {
            totalScore: existing.totalScore + (pr.final_score ?? 0),
            totalGames: existing.totalGames + 1,
            rankSum: existing.rankSum + (pr.rank ?? 0),
            ranks: [...existing.ranks, pr.rank ?? 0],
          });
        }
      }

      // 全体統計
      let totalRankSum = 0;
      let totalGamesAll = 0;
      let totalScoreAll = 0;
      const rankCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

      memberStats.forEach((stats) => {
        totalRankSum += stats.rankSum;
        totalGamesAll += stats.totalGames;
        totalScoreAll += stats.totalScore;
        stats.ranks.forEach((r) => {
          if (r >= 1 && r <= 4) rankCounts[r]++;
        });
      });

      const averageRank = totalGamesAll > 0 ? totalRankSum / totalGamesAll : 0;
      const totalEntries = Object.values(rankCounts).reduce((a, b) => a + b, 0);

      const rankDistribution = [1, 2, 3, 4].map((rank) => ({
        rank,
        count: rankCounts[rank] ?? 0,
        percentage: totalEntries > 0 ? ((rankCounts[rank] ?? 0) / totalEntries) * 100 : 0,
      }));

      const rentaiCount = (rankCounts[1] ?? 0) + (rankCounts[2] ?? 0);
      const rentaiRate = totalEntries > 0 ? (rentaiCount / totalEntries) * 100 : 0;
      const tobiRate = totalEntries > 0 ? ((rankCounts[4] ?? 0) / totalEntries) * 100 : 0;

      // メンバーランキング
      const memberRankings: MemberRanking[] = Array.from(memberStats.entries())
        .map(([memberId, stats]) => {
          const member = memberMap.get(memberId);
          return {
            memberId,
            username: member?.username ?? '不明',
            avatarUrl: member?.avatarUrl,
            totalGames: stats.totalGames,
            totalScore: stats.totalScore,
            averageRank: stats.totalGames > 0 ? stats.rankSum / stats.totalGames : 0,
            rank: 0,
          };
        })
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((m, idx) => ({ ...m, rank: idx + 1 }));

      // スコア推移
      const scoreHistory: ScoreHistoryEntry[] = games
        .reverse()
        .map((game: any, idx: number) => {
          const playerRecords = game.player_records || [];
          const scores = playerRecords
            .map((pr: any) => {
              const member = Array.from(memberMap.values()).find(
                (m) => m.username === pr.player_name
              );
              if (!member) return null;
              return {
                memberId: member.memberId,
                username: member.username,
                score: pr.final_score ?? 0,
              };
            })
            .filter(Boolean);

          return { gameIndex: idx + 1, scores };
        });

      return {
        averageRank,
        rankDistribution,
        totalScore: totalScoreAll,
        rentaiRate,
        tobiRate,
        memberRankings,
        scoreHistory,
      };
    } catch (error) {
      return null;
    }
  }
}
