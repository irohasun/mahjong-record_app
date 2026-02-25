import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ScoreHistoryEntry } from '@/types/Groups';

interface ScoreChartProps {
  scoreHistory: ScoreHistoryEntry[];
  memberColors?: Record<string, string>;
}

const CHART_COLORS = [
  '#FF6B35',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#EF4444',
];

const screenWidth = Dimensions.get('window').width;

export function ScoreChart({ scoreHistory, memberColors }: ScoreChartProps) {
  const chartData = useMemo(() => {
    if (scoreHistory.length === 0) return null;

    // メンバーIDの一覧を収集
    const memberIds = new Set<string>();
    const memberNames = new Map<string, string>();
    scoreHistory.forEach((entry) => {
      entry.scores.forEach((s) => {
        memberIds.add(s.memberId);
        memberNames.set(s.memberId, s.username);
      });
    });

    const memberList = Array.from(memberIds);
    if (memberList.length === 0) return null;

    // 各メンバーの累積スコア推移を計算
    const labels = scoreHistory.map((entry) => String(entry.gameIndex));
    const datasets = memberList.map((memberId, idx) => {
      let cumulative = 0;
      const data = scoreHistory.map((entry) => {
        const scoreEntry = entry.scores.find((s) => s.memberId === memberId);
        if (scoreEntry) {
          cumulative += scoreEntry.score;
        }
        return cumulative;
      });

      const color =
        memberColors?.[memberId] ?? CHART_COLORS[idx % CHART_COLORS.length];

      return {
        data,
        color: () => color,
        strokeWidth: 2,
      };
    });

    const legend = memberList.map(
      (id) => memberNames.get(id) ?? '不明'
    );

    return { labels, datasets, legend };
  }, [scoreHistory, memberColors]);

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>グラフデータがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>スコア推移</Text>

      <LineChart
        data={{
          labels: chartData.labels,
          datasets: chartData.datasets,
          legend: chartData.legend,
        }}
        width={screenWidth - 64}
        height={220}
        chartConfig={{
          backgroundColor: '#FFF',
          backgroundGradientFrom: '#FFF',
          backgroundGradientTo: '#FFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
          style: {
            borderRadius: 12,
          },
          propsForDots: {
            r: '3',
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={true}
        fromZero={false}
      />
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
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
});
