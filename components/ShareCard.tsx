import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatScore } from '@/utils/ScoreCalculator';

const CARD_WIDTH = 390;
const LABEL_WIDTH = 40;
const RANK_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

interface ShareCardProps {
  cardRef: React.RefObject<View | null>;
  date: Date;
  groupName?: string;
  players: string[];
  playerCount: number;
  hanchanCount: number;
  rawScores: string[][];
  chips: string[];
  chipEnabled: boolean;
  chipValue: number;
  getCalculatedResults: (i: number) => { scores: (number | null)[]; ranks: (number | null)[] };
  getHanchanOnlyTotals: () => number[];
  getTotalScores: () => (number | null)[];
}

export default function ShareCard({
  cardRef,
  date,
  groupName,
  players,
  playerCount,
  hanchanCount,
  rawScores,
  chips,
  chipEnabled,
  chipValue,
  getCalculatedResults,
  getHanchanOnlyTotals,
  getTotalScores,
}: ShareCardProps) {
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const colWidth = Math.floor((CARD_WIDTH - LABEL_WIDTH) / playerCount);

  return (
    <View ref={cardRef} collapsable={false} style={styles.card}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerDate}>{dateStr}の対局（{hanchanCount}半荘）</Text>
        {groupName ? <Text style={styles.headerGroup}>{groupName}</Text> : null}
      </View>

      {/* プレイヤー名行 */}
      <View style={[styles.tableRow, styles.playerHeaderRow]}>
        <View style={[styles.rowLabel, { width: LABEL_WIDTH }]} />
        {players.slice(0, playerCount).map((name, i) => (
          <View key={i} style={[styles.playerCell, { width: colWidth }]}>
            <Text style={styles.playerName} numberOfLines={1}>{name || `P${i + 1}`}</Text>
          </View>
        ))}
      </View>

      {/* 各半荘行 */}
      {Array.from({ length: hanchanCount }).map((_, h) => {
        const { scores, ranks } = getCalculatedResults(h);
        const allEntered = (rawScores[h] ?? []).every(s => s !== '');
        return (
          <View key={h} style={styles.tableRow}>
            <View style={[styles.rowLabel, { width: LABEL_WIDTH }]}>
              <Text style={styles.hanchanNum}>{h + 1}</Text>
            </View>
            {Array.from({ length: playerCount }).map((_, i) => {
              const raw = rawScores[h]?.[i] ?? '';
              const score = scores[i];
              const rank = ranks[i];
              return (
                <View key={i} style={[styles.scoreCell, { width: colWidth }]}>
                  {raw !== '' ? (
                    <>
                      <Text style={styles.rawScoreText}>{raw}</Text>
                      {allEntered && score !== null && rank !== null && (
                        <View style={styles.calculatedRow}>
                          <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[(rank as number) - 1] ?? '#9CA3AF' }]}>
                            <Text style={styles.rankText}>{rank}</Text>
                          </View>
                          <Text style={[
                            styles.calcScore,
                            score > 0 && styles.positive,
                            score < 0 && styles.negative,
                          ]}>
                            {formatScore(score)}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={styles.placeholder}>-</Text>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* 半荘計行（チップ有効時のみ） */}
      {chipEnabled && (
        <View style={[styles.tableRow, styles.subtotalRow]}>
          <View style={[styles.rowLabel, { width: LABEL_WIDTH }]}>
            <Text style={styles.subtotalLabel}>半荘計</Text>
          </View>
          {getHanchanOnlyTotals().slice(0, playerCount).map((total, i) => (
            <View key={i} style={[styles.subtotalCell, { width: colWidth }]}>
              <Text style={[
                styles.subtotalScore,
                total > 0 && styles.positive,
                total < 0 && styles.negative,
              ]}>
                {total > 0 ? `+${total.toFixed(1)}` : total.toFixed(1)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* チップ行（チップ有効時のみ） */}
      {chipEnabled && (
        <View style={[styles.tableRow, styles.subtotalRow]}>
          <View style={[styles.rowLabel, { width: LABEL_WIDTH }]}>
            <Text style={styles.chipLabel}>チップ</Text>
          </View>
          {chips.slice(0, playerCount).map((chipVal, i) => {
            const chipNum = parseInt(chipVal, 10);
            const chipScore = isNaN(chipNum) ? 0 : chipNum * chipValue;
            return (
              <View key={i} style={[styles.subtotalCell, { width: colWidth }]}>
                {chipVal !== '' ? (
                  <>
                    <Text style={styles.chipCountText}>
                      {chipNum > 0 ? `+${chipNum}枚` : `${chipNum}枚`}
                    </Text>
                    <Text style={[
                      styles.subtotalScore,
                      chipScore > 0 && styles.positive,
                      chipScore < 0 && styles.negative,
                    ]}>
                      {chipScore > 0 ? `+${chipScore}` : `${chipScore}`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.placeholder}>-</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* 計行 */}
      <View style={[styles.tableRow, styles.totalRow]}>
        <View style={[styles.rowLabel, { width: LABEL_WIDTH }]}>
          <Text style={styles.totalLabel}>計</Text>
        </View>
        {getTotalScores().slice(0, playerCount).map((total, i) => (
          <View key={i} style={[styles.totalCell, { width: colWidth }]}>
            <Text style={[
              styles.totalScore,
              total !== null && total > 0 && styles.positive,
              total !== null && total < 0 && styles.negative,
            ]}>
              {formatScore(total)}
            </Text>
          </View>
        ))}
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>麻雀記録アプリ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: -9999,
    left: 0,
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerGroup: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '500',
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  playerHeaderRow: {
    backgroundColor: '#FFF',
  },
  rowLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 8,
  },
  hanchanNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  playerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  scoreCell: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  rawScoreText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  calculatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  rankBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: '700',
  },
  calcScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  placeholder: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  subtotalRow: {
    backgroundColor: '#F3F4F6',
  },
  subtotalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  subtotalCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  subtotalScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  totalRow: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  totalCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  totalScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
  footer: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
