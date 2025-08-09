import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, SafeAreaView, Modal } from 'react-native';
import { TrendingUp, Trophy, Calendar, Target, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { GameService } from '@/services/GameService';
import { AuthService } from '@/services/AuthService';
import { ensureAuthenticated } from '@/utils/authUtils';

const screenWidth = Dimensions.get('window').width;

export default function StatisticsScreen() {
  const [stats, setStats] = useState<any>({});
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | 'all'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadStats();
  }, [selectedPeriod, selectedDate]);

  // 画面がフォーカスされた時にデータをリロード
  useFocusEffect(
    React.useCallback(() => {
      // console.log('🔍 DEBUG: Statistics screen focused, reloading stats...');
      loadStats();
    }, []) // 依存配列を空にして、画面フォーカス時のみリロード
  );

  const loadStats = async () => {
    // console.log('🔍 DEBUG: loadStats called with period:', selectedPeriod);
    
    setLoading(true);
    try {
      // console.log('🔍 DEBUG: Authenticating user...');
      const user = await ensureAuthenticated();
      // console.log('🔍 DEBUG: User authenticated:', user.id);
      
      // console.log('🔍 DEBUG: Loading player stats...');
      const statsData = await GameService.getPlayerStats(user.id);
      // console.log('🔍 DEBUG: Player stats loaded:', statsData);
      
      // console.log('🔍 DEBUG: Loading chart data...');
      const chartData = await GameService.getChartData(user.id, selectedPeriod);
      // console.log('🔍 DEBUG: Chart data loaded:', chartData);
      
      setStats(statsData);
      setChartData(chartData);
      // console.log('🔍 DEBUG: Statistics data updated successfully');
    } catch (error) {
      // console.error('❌ DEBUG: Failed to load statistics:', error);
      // console.error('❌ DEBUG: Error details:', {
      //   message: error instanceof Error ? error.message : 'Unknown error',
      //   stack: error instanceof Error ? error.stack : undefined
      // });
    } finally {
      setLoading(false);
    }
  };

  const totalGames = stats?.totalGames || 0;
  const rankDistribution = [
    { 
      name: '1位', 
      population: stats?.rankDistribution?.[1] || 0, 
      percentage: totalGames > 0 ? ((stats?.rankDistribution?.[1] || 0) / totalGames * 100).toFixed(1) : '0.0',
      color: '#10B981', 
      legendFontColor: '#1C1C1E' 
    },
    { 
      name: '2位', 
      population: stats?.rankDistribution?.[2] || 0, 
      percentage: totalGames > 0 ? ((stats?.rankDistribution?.[2] || 0) / totalGames * 100).toFixed(1) : '0.0',
      color: '#3B82F6', 
      legendFontColor: '#1C1C1E' 
    },
    { 
      name: '3位', 
      population: stats?.rankDistribution?.[3] || 0, 
      percentage: totalGames > 0 ? ((stats?.rankDistribution?.[3] || 0) / totalGames * 100).toFixed(1) : '0.0',
      color: '#F59E0B', 
      legendFontColor: '#1C1C1E' 
    },
    { 
      name: '4位', 
      population: stats?.rankDistribution?.[4] || 0, 
      percentage: totalGames > 0 ? ((stats?.rankDistribution?.[4] || 0) / totalGames * 100).toFixed(1) : '0.0',
      color: '#EF4444', 
      legendFontColor: '#1C1C1E' 
    },
  ];

  const SimpleChart = ({ data, title }: { data: any[], title: string }) => (
    <View style={styles.simpleChart}>
      <Text style={styles.chartTitle}>{title}</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.chartItem}>
          <View style={styles.chartItemHeader}>
            <View style={[styles.chartColorBox, { backgroundColor: item.color }]} />
            <Text style={styles.chartItemName}>{item.name}</Text>
            <View style={styles.chartItemValueContainer}>
              <Text style={styles.chartItemValue}>{item.population}</Text>
              {item.percentage && (
                <Text style={styles.chartItemPercentage}>({item.percentage}%)</Text>
              )}
            </View>
          </View>
          <View style={styles.chartBar}>
            <View 
              style={[
                styles.chartBarFill, 
                { 
                  backgroundColor: item.color,
                  width: `${Math.max(5, (item.population / Math.max(...data.map(d => d.population))) * 100)}%`
                }
              ]} 
            />
          </View>
        </View>
      ))}
    </View>
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, color = '#FF6B35' }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PeriodSelector = () => (
    <View style={styles.periodSelectorContainer}>
      <View style={styles.periodSelector}>
        {(['month', 'year', 'all'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => {
              setSelectedPeriod(period);
              const pageIndex = ['month', 'year', 'all'].indexOf(period);
              scrollViewRef.current?.scrollTo({
                x: screenWidth * pageIndex,
                animated: true
              });
            }}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period === 'month' ? '月間' : period === 'year' ? '年間' : '全期間'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.dateSelectorContainer}>
        {(selectedPeriod === 'month' || selectedPeriod === 'year') ? (
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateSelectorText}>
              {selectedPeriod === 'month' 
                ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月`
                : `${selectedDate.getFullYear()}年`
              }
            </Text>
            <ChevronDown size={16} color="#6D6D70" />
          </TouchableOpacity>
        ) : (
          <View style={styles.dateSelector}>
            <Text style={styles.dateSelectorText}>
              2020 ~ 2025
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>統計を読み込み中...</Text>
      </View>
    );
  }

  // 最高収支（最高得点から25000を差し引いた値）
  const highestRevenue: number | null =
    typeof stats?.highestScore === 'number' ? stats.highestScore : null;
  // 平均収支（平均最終得点から25000を差し引いた値）
  const averageRevenue: number | null =
    typeof stats?.averageScore === 'number' ? stats.averageScore : null;

  // 合計収支（平均収支 × 総対局数）
  const totalRevenue: number | null =
    typeof stats?.averageScore === 'number' && typeof stats?.totalGames === 'number'
      ? stats.averageScore * stats.totalGames
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <View style={styles.header}>
        <Text style={styles.title}>成績統計</Text>
        <PeriodSelector />
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
                  icon={Trophy}
                  color="#3B82F6"
                />
                <StatCard
                  title="1位率"
                  value={stats.firstPlaceRate ? `${(stats.firstPlaceRate * 100).toFixed(1)}%` : '-'}
                  icon={TrendingUp}
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
                    <LineChart
                      data={{
                        // 横軸は数字のみ表示（単位は下に表示）
                        labels: chartData.ranks.map((_: any, index: number) => `${index + 1}`),
                        datasets: [
                          {
                            // 実データ
                            data: chartData.ranks.map((rank: number) => 5 - rank),
                            color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                            strokeWidth: 3,
                            withDots: true,
                          },
                          {
                            // y軸を1..4に固定させるためのダミー不可視データ（線幅0、透明色、点は非表示にする）
                            data: [1, 4],
                            color: () => 'rgba(0,0,0,0)',
                            strokeWidth: 0,
                            withDots: false,
                          },
                        ],
                      }}
                      width={screenWidth - 40}
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
                          // 透過データセットの点が縁取りで見えないようにする
                          strokeWidth: '0',
                          stroke: 'transparent',
                        },
                        propsForBackgroundLines: {
                          strokeDasharray: '',
                          stroke: '#F2F2F7',
                          strokeWidth: 1,
                        },
                        // y軸は明示的に1〜4に固定（yAxisMin/yAxisMaxで制御）
                      }}
                      bezier
                      style={styles.chart}
                      withDots={true}
                      withShadow={false}
                      withInnerLines={true}
                      withOuterLines={false}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      fromZero={false}
                      segments={3}
                      // y軸範囲を1..4に固定した見た目にするため、ダミーデータで下限1・上限4を確保
                      // （react-native-chart-kitにyAxisMin/yAxisMaxがないため）
                      // データはdatasetsにのみ含まれ、labelsは実データ数に合わせています
                      yAxisSuffix="位"
                      yAxisInterval={1}
                      yLabelsOffset={10}
                      withVerticalLabels={true}
                      formatYLabel={(value) => {
                        const convertedValue = parseInt(value);
                        // 変換された値から元の順位を計算: 4→1位、3→2位、2→3位、1→4位
                        const originalRank = 5 - convertedValue;
                        if (originalRank === 1) return '1';
                        if (originalRank === 2) return '2';
                        if (originalRank === 3) return '3';
                        if (originalRank === 4) return '4';
                        return `${originalRank}`;
                      }}
                      />
                    <Text style={styles.chartSubtext}>
                      {chartData.ranks.length}回の対局
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
                </View>
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode={selectedPeriod === 'month' ? 'date' : 'date'}
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  periodSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodScrollContainer: {
    flexDirection: 'row',
  },
  periodPage: {
    width: screenWidth - 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageContainer: {
    width: screenWidth,
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    flex: 1,
  },
  dateSelectorContainer: {
    width: 120,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 4,
    width: '100%',
  },

  dateSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6D6D70',
  },
  periodButtonTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    width: (screenWidth - 52) / 2,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6D6D70',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
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
  simpleChart: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  chartItem: {
    marginBottom: 12,
  },
  chartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chartColorBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  chartItemName: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  chartItemValue: {
    fontSize: 14,
    color: '#6D6D70',
    fontWeight: '600',
  },
  chartItemValueContainer: {
    alignItems: 'flex-end',
  },
  chartItemPercentage: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },
  chartBar: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    marginLeft: 20,
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 40,
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
    color: '#10B981', // 1位の色（緑色）
  },
  secondPlaceValue: {
    color: '#3B82F6', // 2位の色（青色）
  },
  thirdPlaceValue: {
    color: '#F59E0B', // 3位の色（オレンジ色）
  },
  fourthPlaceValue: {
    color: '#EF4444', // 4位の色（赤色）
  },
});