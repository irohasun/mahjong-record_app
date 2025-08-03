import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, SafeAreaView, Modal } from 'react-native';
import { TrendingUp, Trophy, Calendar, Target, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

  const loadStats = async () => {
    try {
      const user = await ensureAuthenticated();
      const statsData = await GameService.getPlayerStats(user.id);
      const chartData = await GameService.getChartData(user.id, selectedPeriod);
      
      setStats(statsData);
      setChartData(chartData);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const rankDistribution = [
    { name: '1位', population: stats?.rankDistribution?.[1] || 0, color: '#10B981', legendFontColor: '#1C1C1E' },
    { name: '2位', population: stats?.rankDistribution?.[2] || 0, color: '#3B82F6', legendFontColor: '#1C1C1E' },
    { name: '3位', population: stats?.rankDistribution?.[3] || 0, color: '#F59E0B', legendFontColor: '#1C1C1E' },
    { name: '4位', population: stats?.rankDistribution?.[4] || 0, color: '#EF4444', legendFontColor: '#1C1C1E' },
  ];

  const SimpleChart = ({ data, title }: { data: any[], title: string }) => (
    <View style={styles.simpleChart}>
      <Text style={styles.chartTitle}>{title}</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.chartItem}>
          <View style={styles.chartItemHeader}>
            <View style={[styles.chartColorBox, { backgroundColor: item.color }]} />
            <Text style={styles.chartItemName}>{item.name}</Text>
            <Text style={styles.chartItemValue}>{item.population}</Text>
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
                  title="平均得点"
                  value={stats.averageScore?.toFixed(0) || '-'}
                  icon={Target}
                  color="#F59E0B"
                />
              </View>

              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>順位分布</Text>
                <SimpleChart data={rankDistribution} title="" />
              </View>

              {chartData && chartData.scores && (
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>得点推移</Text>
                  <View style={styles.chartContainer}>
                    <Text style={styles.chartPlaceholder}>
                      得点推移グラフ
                    </Text>
                    <Text style={styles.chartSubtext}>
                      {chartData.scores.length}回の対局データ
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>詳細成績</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>最高得点</Text>
                    <Text style={styles.detailValue}>
                      {stats.highestScore ? `+${stats.highestScore}` : '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>最低得点</Text>
                    <Text style={styles.detailValue}>
                      {stats.lowestScore || '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>連対率</Text>
                    <Text style={styles.detailValue}>
                      {stats.topTwoRate ? `${(stats.topTwoRate * 100).toFixed(1)}%` : '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ラス回避率</Text>
                    <Text style={styles.detailValue}>
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
});