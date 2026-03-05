import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Trophy, Calendar, Target, Flag } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { GameService } from '@/services/GameService';
import { LocalStorageService } from '@/services/LocalStorageService';
import { ensureAuthenticated } from '@/utils/authUtils';
import { onGamesChanged } from '@/utils/cacheInvalidation';
import { useDebounce } from '@/hooks/useDebounce';
import { SimpleChart } from '@/components/statistics/SimpleChart';
import { StatCard } from '@/components/statistics/StatCard';
import { PeriodSelector } from '@/components/statistics/PeriodSelector';
import { YearPickerModal } from '@/components/statistics/YearPickerModal';
import { MonthPickerModal } from '@/components/statistics/MonthPickerModal';

const screenWidth = Dimensions.get('window').width;

export function buildStatsCacheKey(period: string, date: Date, playerCount: 3 | 4): string {
  const base = period === 'all' ? 'all' :
               period === 'year' ? `year-${date.getFullYear()}` :
               `month-${date.getFullYear()}-${date.getMonth() + 1}`;
  return `${base}-${playerCount}p`;
}

export default function StatisticsScreen() {
  const [stats, setStats] = useState<any>({});
  const [chartData, setChartData] = useState<any>(null);
  const [tobiStats, setTobiStats] = useState<{ tobiCount: number; totalRounds: number; tobiRate: number }>({ tobiCount: 0, totalRounds: 0, tobiRate: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | 'all'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<3 | 4>(4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [yearRange, setYearRange] = useState<{ minYear: number; maxYear: number } | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState<number>(new Date().getMonth() + 1);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastLoadTimeRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Debounce period/date changes to prevent rapid-fire queries
  const debouncedPeriod = useDebounce(selectedPeriod, 300);
  const debouncedDate = useDebounce(selectedDate, 300);
  const debouncedPlayerCount = useDebounce(selectedPlayerCount, 300);

  const loadStats = useCallback(async () => {
    const cacheKey = buildStatsCacheKey(debouncedPeriod, debouncedDate, debouncedPlayerCount);

    // Show cached data immediately
    const cachedStats = await LocalStorageService.getStatsForPeriod(`stats-${cacheKey}`);
    const cachedChart = await LocalStorageService.getStatsForPeriod(`chart-${cacheKey}`);
    if (cachedStats) {
      setStats(cachedStats);
    }
    if (cachedChart) {
      setChartData(cachedChart);
    }
    if (cachedStats && cachedChart) {
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const user = await ensureAuthenticated();

      const range = await GameService.getYearRange(user.id);
      setYearRange(range);

      const statsData = await GameService.getHanchanStats(user.id, debouncedPeriod, debouncedDate, debouncedPlayerCount);
      const newChartData = await GameService.getChartData(user.id, debouncedPeriod, debouncedDate, debouncedPlayerCount);
      const newTobiStats = await GameService.getTobiRate(user.id, debouncedPeriod, debouncedDate, debouncedPlayerCount);

      setStats(statsData);
      setChartData(newChartData);
      setTobiStats(newTobiStats);
      lastLoadTimeRef.current = Date.now();

      // Cache fresh data in background
      await LocalStorageService.saveStatsForPeriod(`stats-${cacheKey}`, statsData);
      await LocalStorageService.saveStatsForPeriod(`chart-${cacheKey}`, newChartData);
    } catch (error) {
      // If we have cached data, keep showing it
    } finally {
      setLoading(false);
    }
  }, [debouncedPeriod, debouncedDate, debouncedPlayerCount]);

  // Load stats when debounced period/date changes (but not on initial mount)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    loadStats();
  }, [loadStats]);

  // Load stats on screen focus (with stale check)
  useFocusEffect(
    useCallback(() => {
      const STALE_THRESHOLD = 5 * 60 * 1000;
      const now = Date.now();
      const isStale = lastLoadTimeRef.current === 0 || (now - lastLoadTimeRef.current) > STALE_THRESHOLD;

      if (isStale) {
        loadStats();
      }
    }, [loadStats])
  );

  // ゲームデータが変更されたら（追加・更新・削除）、staleチェックをリセットして次のfocusで強制リロード
  useEffect(() => {
    const unsubscribe = onGamesChanged(() => {
      lastLoadTimeRef.current = 0;
    });
    return unsubscribe;
  }, []);

  const totalGames = stats?.totalGames || 0;

  // ランク分布を動的に生成（3人麻雀/4人麻雀で切り替え）
  const rankDistribution = useMemo(() => {
    const maxRank = selectedPlayerCount;
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

    const distribution = [];
    for (let rank = 1; rank <= maxRank; rank++) {
      distribution.push({
        name: `${rank}位`,
        population: stats?.rankDistribution?.[rank] || 0,
        percentage: totalGames > 0
          ? ((stats?.rankDistribution?.[rank] || 0) / totalGames * 100).toFixed(1)
          : '0.0',
        color: colors[rank - 1],
      });
    }

    return distribution;
  }, [stats, selectedPlayerCount, totalGames]);

  const rankChartDimensions = useMemo(() => {
    const maxVisiblePoints = 10;
    const yAxisWidth = 35;
    const containerWidth = screenWidth - 40;
    const scrollableWidth = containerWidth - yAxisWidth;
    const pointWidth = scrollableWidth / maxVisiblePoints;
    const dataLength = chartData?.ranks?.length ?? 0;
    const chartWidth = Math.max(scrollableWidth, dataLength * pointWidth);
    return { scrollableWidth, chartWidth };
  }, [chartData?.ranks?.length]);

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>統計を読み込み中...</Text>
      </View>
    );
  }

  // 最高収支・平均収支（最終得点=収支）
  const highestRevenue: number | null =
    typeof stats?.highestScore === 'number' ? stats.highestScore : null;

  // 合計収支（平均収支 × 総対局数）
  const totalRevenue: number | null =
    typeof stats?.averageScore === 'number' && typeof stats?.totalGames === 'number'
      ? stats.averageScore * stats.totalGames
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <View style={styles.header}>
        {/* プレイヤー人数セレクター */}
        <View style={styles.playerCountSelector}>
          <TouchableOpacity
            style={[
              styles.playerCountButton,
              selectedPlayerCount === 4 && styles.playerCountButtonActive,
            ]}
            onPress={() => setSelectedPlayerCount(4)}
          >
            <Text style={[
              styles.playerCountButtonText,
              selectedPlayerCount === 4 && styles.playerCountButtonTextActive,
            ]}>4人麻雀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.playerCountButton,
              selectedPlayerCount === 3 && styles.playerCountButtonActive,
            ]}
            onPress={() => setSelectedPlayerCount(3)}
          >
            <Text style={[
              styles.playerCountButtonText,
              selectedPlayerCount === 3 && styles.playerCountButtonTextActive,
            ]}>3人麻雀</Text>
          </TouchableOpacity>
        </View>

        {/* 既存のPeriodSelector */}
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          selectedDate={selectedDate}
          yearRange={yearRange}
          scrollViewRef={scrollViewRef as React.RefObject<ScrollView>}
          onPeriodChange={setSelectedPeriod}
          onOpenMonthPicker={() => {
            setTempYear(selectedDate.getFullYear());
            setTempMonth(selectedDate.getMonth() + 1);
            setShowMonthPicker(true);
          }}
          onOpenYearPicker={() => setShowYearPicker(true)}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const { contentOffset } = event.nativeEvent;
          const pageWidth = screenWidth;
          const pageIndex = Math.round(contentOffset.x / pageWidth);
          const periods: ('month' | 'year' | 'all')[] = ['month', 'year', 'all'];
          setSelectedPeriod(periods[pageIndex]);
        }}
      >
        {(['month', 'year', 'all'] as const).map((period) => (
          <View key={period} style={styles.pageContainer}>
            <ScrollView
              style={styles.container}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={styles.statsGrid}>
                <StatCard
                  title="総対局数"
                  value={stats.totalGames || 0}
                  icon={Calendar}
                  color="#FF6B35"
                />
                <StatCard
                  title="平均順位"
                  value={stats.averageRank?.toFixed(2) || '-'}
                  icon={Flag}
                  color="#3B82F6"
                />
                <StatCard
                  title="1位率"
                  value={stats.firstPlaceRate ? `${(stats.firstPlaceRate * 100).toFixed(1)}%` : '-'}
                  icon={Trophy}
                  color="#10B981"
                />
                <StatCard
                  title="合計収支"
                  value={
                    totalRevenue !== null
                      ? `${totalRevenue > 0 ? '+' : ''}${Math.round(totalRevenue)}`
                      : '-'
                  }
                  icon={Target}
                  color="#F59E0B"
                />
              </View>

              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>順位分布</Text>
                <SimpleChart data={rankDistribution} title="" />
              </View>

              {chartData && chartData.ranks && chartData.ranks.length > 0 && (
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>順位推移</Text>
                  <View style={styles.chartContainer}>
                    <View style={styles.rankChartRow}>
                      {/* 固定Y軸ラベル */}
                      <View style={styles.fixedYAxis}>
                        {[1, 2, 3, 4].map((rank) => (
                          <Text key={rank} style={styles.fixedYAxisLabel}>{rank}位</Text>
                        ))}
                      </View>
                      {/* 横スクロール可能なチャート */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        contentOffset={{ x: Math.max(0, rankChartDimensions.chartWidth - rankChartDimensions.scrollableWidth), y: 0 }}
                        style={styles.rankChartScroll}
                      >
                        <LineChart
                          data={{
                            labels: chartData.ranks.map((_: any, index: number) => `${index + 1}`),
                            datasets: [
                              {
                                data: chartData.ranks.map((rank: number) => 5 - rank),
                                color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                                strokeWidth: 3,
                                withDots: true,
                              },
                              {
                                data: [1, 4],
                                color: () => 'rgba(0,0,0,0)',
                                strokeWidth: 0,
                                withDots: false,
                              },
                            ],
                          }}
                          width={rankChartDimensions.chartWidth}
                          height={220}
                          chartConfig={{
                            backgroundColor: '#FFFFFF',
                            backgroundGradientFrom: '#FFFFFF',
                            backgroundGradientTo: '#FFFFFF',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(108, 108, 112, ${opacity})`,
                            style: {
                              borderRadius: 16,
                            },
                            propsForDots: {
                              r: '4',
                              strokeWidth: '0',
                              stroke: 'transparent',
                            },
                            propsForBackgroundLines: {
                              strokeDasharray: '',
                              stroke: '#F2F2F7',
                              strokeWidth: 1,
                            },
                          }}
                          bezier
                          style={styles.chart}
                          withDots={true}
                          withShadow={false}
                          withInnerLines={true}
                          withOuterLines={false}
                          withVerticalLines={false}
                          withHorizontalLines={true}
                          withHorizontalLabels={false}
                          fromZero={false}
                          segments={3}
                          withVerticalLabels={true}
                        />
                      </ScrollView>
                    </View>
                    <Text style={styles.chartSubtext}>
                      {chartData?.ranks?.length ?? 0}回の対局
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>詳細成績</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>最高収支</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        (highestRevenue ?? 0) >= 0 ? styles.firstPlaceValue : styles.fourthPlaceValue,
                      ]}
                    >
                      {highestRevenue !== null
                        ? `${highestRevenue > 0 ? '+' : ''}${highestRevenue.toLocaleString()}`
                        : '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>最大連荘</Text>
                    <Text style={[styles.detailValue, styles.secondPlaceValue]}>
                      {stats.maxConsecutiveWins || '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>連対率</Text>
                    <Text style={[styles.detailValue, styles.thirdPlaceValue]}>
                      {stats.topTwoRate ? `${(stats.topTwoRate * 100).toFixed(1)}%` : '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ラス回避率</Text>
                    <Text style={[styles.detailValue, styles.fourthPlaceValue]}>
                      {stats.avoidLastRate ? `${(stats.avoidLastRate * 100).toFixed(1)}%` : '-'}
                    </Text>
                  </View>
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>飛び率</Text>
                    <Text style={[styles.detailValue, styles.tobiRateValue]}>
                      {tobiStats.totalRounds > 0
                        ? `${(tobiStats.tobiRate * 100).toFixed(1)}%`
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {showDatePicker && selectedPeriod === 'month' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="spinner"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
              setSelectedDate(normalized);
            }
          }}
        />
      )}

      <YearPickerModal
        visible={showYearPicker && selectedPeriod === 'year'}
        selectedDate={selectedDate}
        yearRange={yearRange}
        onSelectYear={(year) => {
          const newDate = new Date(selectedDate);
          newDate.setFullYear(year);
          setSelectedDate(newDate);
          setShowYearPicker(false);
        }}
        onClose={() => setShowYearPicker(false)}
      />

      <MonthPickerModal
        visible={showMonthPicker && selectedPeriod === 'month'}
        selectedDate={selectedDate}
        yearRange={yearRange}
        tempYear={tempYear}
        tempMonth={tempMonth}
        onTempYearChange={setTempYear}
        onTempMonthChange={setTempMonth}
        onConfirm={() => {
          const normalized = new Date(tempYear, tempMonth - 1, 1);
          setSelectedDate(normalized);
          setShowMonthPicker(false);
        }}
        onClose={() => setShowMonthPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#6D6D70',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  playerCountSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  playerCountButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  playerCountButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playerCountButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6D6D70',
  },
  playerCountButtonTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  pageContainer: {
    width: screenWidth,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  chartSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  rankChartRow: {
    flexDirection: 'row',
  },
  fixedYAxis: {
    width: 35,
    height: 220,
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingBottom: 34,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  fixedYAxisLabel: {
    fontSize: 10,
    color: '#6D6D70',
  },
  rankChartScroll: {
    flex: 1,
  },
  chartSubtext: {
    fontSize: 14,
    color: '#6D6D70',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  detailLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  firstPlaceValue: {
    color: '#10B981',
  },
  secondPlaceValue: {
    color: '#3B82F6',
  },
  thirdPlaceValue: {
    color: '#F59E0B',
  },
  fourthPlaceValue: {
    color: '#EF4444',
  },
  tobiRateValue: {
    color: '#8B5CF6',
  },
});
