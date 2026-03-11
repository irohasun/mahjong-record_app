import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { User, Trophy } from 'lucide-react-native';
import { MemberRanking as MemberRankingType } from '@/types/Groups';

interface MemberRankingProps {
  rankings: MemberRankingType[];
}

export function MemberRankingList({ rankings }: MemberRankingProps) {
  if (rankings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>データがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>メンバーランキング</Text>
      <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.rankCell]}>順位</Text>
        <Text style={[styles.headerCell, styles.nameCell]}>メンバー</Text>
        <Text style={[styles.headerCell, styles.avgRankCell]}>平均順位</Text>
        <Text style={[styles.headerCell, styles.gamesCell]}>対局数</Text>
        <Text style={[styles.headerCell, styles.scoreCell, { textAlign: 'right' }]}>ポイント</Text>
      </View>

      {rankings.map((member) => (
        <View key={member.memberId} style={styles.row}>
          <View style={styles.rankCell}>
            {member.rank <= 3 ? (
              <View
                style={[
                  styles.trophyBadge,
                  member.rank === 1 && styles.goldBadge,
                  member.rank === 2 && styles.silverBadge,
                  member.rank === 3 && styles.bronzeBadge,
                ]}
              >
                <Trophy
                  size={12}
                  color={
                    member.rank === 1
                      ? '#D4A017'
                      : member.rank === 2
                        ? '#9CA3AF'
                        : '#CD7F32'
                  }
                />
              </View>
            ) : (
              <Text style={styles.rankText}>{member.rank}</Text>
            )}
          </View>

          <View style={styles.nameCell}>
            <View style={styles.memberInfo}>
              {member.avatarUrl ? (
                <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={14} color="#8E8E93" />
                </View>
              )}
              <Text style={styles.memberName} numberOfLines={1}>
                {member.username}
              </Text>
            </View>
          </View>

          <View style={styles.avgRankCell}>
            <Text style={styles.avgRankText}>{member.averageRank.toFixed(2)}位</Text>
          </View>

          <View style={styles.gamesCell}>
            <Text style={styles.gamesText}>{member.totalGames}</Text>
          </View>

          <View style={styles.scoreCell}>
            <Text
              style={[
                styles.scoreText,
                member.totalScore >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {member.totalScore > 0 ? '+' : ''}
              {member.totalScore.toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  rankCell: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  nameCell: {
    flex: 1,
    marginRight: 8,
  },
  avgRankCell: {
    width: 52,
    alignItems: 'center',
  },
  avgRankText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  gamesCell: {
    width: 44,
    alignItems: 'center',
  },
  scoreCell: {
    width: 80,
    alignItems: 'flex-end',
  },
  trophyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBadge: {
    backgroundColor: '#FEF9E7',
  },
  silverBadge: {
    backgroundColor: '#F2F2F7',
  },
  bronzeBadge: {
    backgroundColor: '#FFF5EE',
  },
  rankText: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  gamesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
});
