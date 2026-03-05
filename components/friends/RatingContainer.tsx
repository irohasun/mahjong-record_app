import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy, ChevronRight } from 'lucide-react-native';

interface RatingContainerProps {
  rating4p: number;
  rating3p: number;
  onPressRanking: () => void;
}

export function RatingContainer({ rating4p, rating3p, onPressRanking }: RatingContainerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Trophy size={18} color="#FF6B35" />
          <Text style={styles.title}>レーティング</Text>
        </View>
      </View>

      <View style={styles.ratingsRow}>
        <View style={styles.ratingItem}>
          <Text style={styles.ratingLabel}>4人麻雀</Text>
          <Text style={styles.ratingValue}>{rating4p}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.ratingItem}>
          <Text style={styles.ratingLabel}>3人麻雀</Text>
          <Text style={styles.ratingValue}>{rating3p}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.rankingButton} onPress={onPressRanking} activeOpacity={0.7}>
        <Text style={styles.rankingButtonText}>ランキングを見る</Text>
        <ChevronRight size={16} color="#FF9B73" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingItem: {
    flex: 1,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  rankingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  rankingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9B73',
  },
});
