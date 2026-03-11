import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GroupStatistics as GroupStatisticsType } from '@/types/Groups';

interface GroupStatisticsProps {
  statistics: GroupStatisticsType;
}

export function GroupStatisticsView({ statistics }: GroupStatisticsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>統計サマリー</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>平均着順</Text>
          <Text style={styles.statValue}>
            {statistics.averageRank.toFixed(2)}位
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>合計スコア</Text>
          <Text
            style={[
              styles.statValue,
              statistics.totalScore >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {statistics.totalScore > 0 ? '+' : ''}
            {statistics.totalScore.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>連対率</Text>
          <Text style={styles.statValue}>
            {statistics.rentaiRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ラス率</Text>
          <Text style={styles.statValue}>
            {statistics.tobiRate.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* 着順分布 */}
      <View style={styles.rankRow}>
        {statistics.rankDistribution.map((item) => (
          <View key={item.rank} style={styles.rankItem}>
            <Text
              style={[
                styles.rankNumber,
                item.rank === 1 && styles.rank1,
                item.rank === 2 && styles.rank2,
                item.rank === 3 && styles.rank3,
                item.rank === 4 && styles.rank4,
              ]}
            >
              {item.rank}位
            </Text>
            <Text style={styles.rankCount}>{item.count}回</Text>
            <Text style={styles.rankPercentage}>{item.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  rankItem: {
    alignItems: 'center',
    gap: 2,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  rank1: {
    color: '#10B981',
  },
  rank2: {
    color: '#3B82F6',
  },
  rank3: {
    color: '#F59E0B',
  },
  rank4: {
    color: '#EF4444',
  },
  rankCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  rankPercentage: {
    fontSize: 11,
    color: '#8E8E93',
  },
});
