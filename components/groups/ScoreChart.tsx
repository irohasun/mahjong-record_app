import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { G, Defs, ClipPath, Circle as SvgCircle, Image as SvgImage } from 'react-native-svg';
import { ScoreHistoryEntry, MemberRanking as MemberRankingType } from '@/types/Groups';

interface ScoreChartProps {
  scoreHistory: ScoreHistoryEntry[];
  memberColors?: Record<string, string>;
  memberRankings?: MemberRankingType[];
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
const AVATAR_RADIUS = 12;

export function ScoreChart({ scoreHistory, memberColors, memberRankings }: ScoreChartProps) {
  const chartData = useMemo(() => {
    if (scoreHistory.length === 0) return null;

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

    const legend = memberList.map((id) => memberNames.get(id) ?? '不明');

    // 終点アバター用: finalValue -> { avatarUrl, color } マップ
    const finalValueMap = new Map<number, { avatarUrl?: string; color: string }>();
    memberList.forEach((memberId, idx) => {
      const finalValue = datasets[idx].data[datasets[idx].data.length - 1];
      const color = memberColors?.[memberId] ?? CHART_COLORS[idx % CHART_COLORS.length];
      const ranking = memberRankings?.find((r) => r.memberId === memberId);
      finalValueMap.set(finalValue, { avatarUrl: ranking?.avatarUrl, color });
    });

    return { labels, datasets, legend, finalValueMap, lastIndex: labels.length - 1 };
  }, [scoreHistory, memberColors, memberRankings]);

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>グラフデータがありません</Text>
      </View>
    );
  }

  const renderDotContent = ({
    x,
    y,
    index,
    indexData,
  }: {
    x: number;
    y: number;
    index: number;
    indexData: number;
  }) => {
    if (index !== chartData.lastIndex) return null;

    const member = chartData.finalValueMap.get(indexData);
    if (!member) return null;

    const clipId = `avatar-clip-${Math.round(x)}-${Math.round(y)}`;

    if (member.avatarUrl) {
      return (
        <G key={clipId}>
          <Defs>
            <ClipPath id={clipId}>
              <SvgCircle cx={x} cy={y} r={AVATAR_RADIUS} />
            </ClipPath>
          </Defs>
          <SvgCircle cx={x} cy={y} r={AVATAR_RADIUS + 2} fill="#FFFFFF" />
          <SvgImage
            x={x - AVATAR_RADIUS}
            y={y - AVATAR_RADIUS}
            width={AVATAR_RADIUS * 2}
            height={AVATAR_RADIUS * 2}
            href={member.avatarUrl}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </G>
      );
    }

    return (
      <G key={clipId}>
        <SvgCircle cx={x} cy={y} r={AVATAR_RADIUS + 2} fill="#FFFFFF" />
        <SvgCircle cx={x} cy={y} r={AVATAR_RADIUS} fill={member.color} />
      </G>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>スコア推移</Text>
      <View style={styles.container}>
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
            fillShadowGradientFrom: 'transparent',
            fillShadowGradientTo: 'transparent',
            fillShadowGradientFromOpacity: 0,
            fillShadowGradientToOpacity: 0,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
            yLabelsOffset: 4,
            paddingRight: 44,
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
          renderDotContent={renderDotContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 4,
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
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
});
