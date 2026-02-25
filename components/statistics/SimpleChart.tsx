import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChartDataItem {
  name: string;
  population: number;
  percentage?: string;
  color: string;
}

interface SimpleChartProps {
  data: ChartDataItem[];
  title: string;
}

export function SimpleChart({ data, title }: SimpleChartProps) {
  const maxPopulation = Math.max(...data.map(d => d.population));

  return (
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
                  width: `${Math.max(5, (item.population / maxPopulation) * 100)}%`
                }
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
