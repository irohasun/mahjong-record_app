import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

interface PeriodSelectorProps {
  selectedPeriod: 'month' | 'year' | 'all';
  selectedDate: Date;
  yearRange: { minYear: number; maxYear: number } | null;
  scrollViewRef: React.RefObject<ScrollView>;
  onPeriodChange: (period: 'month' | 'year' | 'all') => void;
  onOpenMonthPicker: () => void;
  onOpenYearPicker: () => void;
}

export function PeriodSelector({
  selectedPeriod,
  selectedDate,
  yearRange,
  scrollViewRef,
  onPeriodChange,
  onOpenMonthPicker,
  onOpenYearPicker,
}: PeriodSelectorProps) {
  return (
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
              onPeriodChange(period);
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
        {selectedPeriod === 'month' ? (
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={onOpenMonthPicker}
          >
            <Text style={styles.dateSelectorText}>
              {`${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月`}
            </Text>
            <ChevronDown size={16} color="#6D6D70" />
          </TouchableOpacity>
        ) : selectedPeriod === 'year' ? (
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={onOpenYearPicker}
          >
            <Text style={styles.dateSelectorText}>
              {`${selectedDate.getFullYear()}年`}
            </Text>
            <ChevronDown size={16} color="#6D6D70" />
          </TouchableOpacity>
        ) : (
          <View style={styles.dateSelector}>
            <Text style={styles.dateSelectorText}>
              {yearRange ? `${yearRange.minYear} ~ ${yearRange.maxYear}` : '-'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  periodSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
});
