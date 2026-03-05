export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  isPublic: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  memberId: string;
  username: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface GroupDetails extends Group {
  members: GroupMember[];
  gameCount: number;
}

export interface GroupStatistics {
  averageRank: number;
  rankDistribution: { rank: number; count: number; percentage: number }[];
  totalScore: number;
  rentaiRate: number;
  tobiRate: number;
  memberRankings: MemberRanking[];
  scoreHistory: ScoreHistoryEntry[];
}

export interface MemberRanking {
  memberId: string;
  username: string;
  avatarUrl?: string;
  totalGames: number;
  totalScore: number;
  averageRank: number;
  rank: number;
}

export interface ScoreHistoryEntry {
  gameIndex: number;
  scores: { memberId: string; username: string; score: number }[];
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  status: 'pending';
  createdAt: string;
}
