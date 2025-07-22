import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, SafeAreaView } from 'react-native';
import { Save, Calendar, Plus, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GameService } from '@/services/GameService';
import { AccountService } from '@/services/AccountService';
import { MonetizationService } from '@/services/MonetizationService';
import { AuthService } from '@/services/AuthService';
import { AdModal } from '@/components/AdModal';

export default function AddGameScreen() {
  const router = useRouter();
  
  const [gameDate, setGameDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [hanchanCount, setHanchanCount] = useState(3);
  const [players, setPlayers] = useState(['自分', '', '', '']);
  const [scores, setScores] = useState(Array(hanchanCount).fill(null).map(() => Array(4).fill('')));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{hanchan: number, player: number} | null>(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setGameDate(new Date());
    setHanchanCount(3); // ← ここを3に修正
    setPlayers(['', '', '', '']);
    setScores([
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
    ]);
    setRefreshing(false);
  }, []);

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handleScoreChange = (hanchanIndex: number, playerIndex: number, value: string) => {
    const newScores = [...scores];
    newScores[hanchanIndex][playerIndex] = value;
    setScores(newScores);
  };

  const handleAddHanchan = async () => {
    const isPremium = await MonetizationService.isPremium();
    if (isPremium) {
      addHanchan();
    } else {
      setShowAdModal(true);
    }
  };

  const addHanchan = () => {
    const newHanchanCount = hanchanCount + 1;
    setHanchanCount(newHanchanCount);
    const newScores = [...scores];
    newScores.push(Array(4).fill(''));
    setScores(newScores);
  };

  const calculateSubtotal = (playerIndex: number): number => {
    return scores.reduce((total, hanchan) => {
      const scoreText = hanchan[playerIndex];
      if (!scoreText) return total;
      const score = parseInt(scoreText) || 0;
      return total + score;
    }, 0);
  };

  const handleSave = async () => {
    try {
      let user = await AuthService.getCurrentUser();
      if (!user) {
        await AuthService.signInAnonymously();
        user = await AuthService.getCurrentUser();
        if (!user) {
          Alert.alert('エラー', '認証に失敗しました');
          return;
        }
      }
      const playersData = players.map((name, index) => ({
        name: index === 0 ? '自分' : `プレイヤー${index + 1}`,
        finalScore: 25000 + calculateSubtotal(index),
        rank: 1,
        isMainAccount: index === 0,
        startingPosition: ['East', 'South', 'West', 'North'][index] as 'East' | 'South' | 'West' | 'North'
      }));
      const sortedPlayers = [...playersData].sort((a, b) => b.finalScore - a.finalScore);
      sortedPlayers.forEach((player, idx) => {
        const originalIndex = playersData.findIndex(p => p.name === player.name && p.isMainAccount === player.isMainAccount);
        playersData[originalIndex].rank = idx + 1;
      });
      const gameRecord = {
        accountId: user.id,
        date: gameDate.toISOString(),
        location: '',
        gameType: '東南戦' as const,
        rules: {
          startingPoints: 25000,
          uma: '+15 +5 -5 -15',
          oka: 5000,
          riichiStick: 1000,
          honbaValue: 300,
        },
        players: playersData,
        rounds: [],
        finalRiichiSticks: 0,
        finalHonba: 0,
        memo: '',
        gameEndCondition: 'normal' as const,
      };
      await GameService.addGame(gameRecord);
      await MonetizationService.incrementGameCount();
      Alert.alert('保存完了', '対局記録を保存しました。履歴画面で確認できます。', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Save game error:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  // プレイヤーカラーを取得する関数
  const getPlayerColor = (playerIndex: number) => {
    const colors = ['#FF6B35', '#3B82F6', '#10B981', '#F59E0B'];
    return colors[playerIndex];
  };

  const ScoreCell = ({ hanchanIndex, playerIndex, value, onChangeText }: { hanchanIndex: number; playerIndex: number; value: string; onChangeText: (text: string) => void; }) => (
    <TextInput
      style={[
        styles.scoreCell,
        focusedCell && focusedCell.hanchan === hanchanIndex && focusedCell.player === playerIndex && styles.scoreCellFocused
      ]}
      value={value}
      onChangeText={(text: string) => onChangeText(text)}
      keyboardType="numbers-and-punctuation"
      textAlign="center"
      placeholder="±0"
      returnKeyType="done"
      selectTextOnFocus={true}
      autoCorrect={false}
      autoCapitalize="none"
      onFocus={() => setFocusedCell({ hanchan: hanchanIndex, player: playerIndex })}
      onBlur={() => setFocusedCell(null)}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      >
        {/* ヘッダー */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>対局記録</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Save size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>

        {/* 日付とゲーム番号 */}
        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.dateContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={18} color="#FF6B35" />
            <Text style={styles.dateText}>
              {gameDate.getFullYear()}年{gameDate.getMonth() + 1}月{gameDate.getDate()}日
            </Text>
          </TouchableOpacity>
        </View>

        {/* プレイヤー名入力欄 */}

        {/* スコア表 */}
        <View style={styles.scoreSheetCard}>
          <View style={styles.scoreHeaderRow}>
            <View style={styles.roundColumn}>
              <Text style={styles.headerText}>局</Text>
            </View>
            {[0, 1, 2, 3].map((playerIndex) => (
              <View key={playerIndex} style={styles.playerColumn}>
                <View style={styles.playerHeader}>
                  <Text style={styles.headerText}>
                    {playerIndex === 0 ? '自分' : `P${playerIndex + 1}`}
                  </Text>
                  <View style={[styles.playerColorIndicator, { backgroundColor: getPlayerColor(playerIndex) }]} />
                </View>
              </View>
            ))}
          </View>
          {[...Array(hanchanCount)].map((_, hanchanIndex) => (
            <View key={hanchanIndex} style={styles.scoreRow}>
              <View style={styles.roundNumber}><Text style={styles.roundText}>{hanchanIndex + 1}</Text></View>
              {[0, 1, 2, 3].map((playerIndex) => (
                <View key={playerIndex} style={styles.playerScoreContainer}>
                  <ScoreCell
                    hanchanIndex={hanchanIndex}
                    playerIndex={playerIndex}
                    value={scores[hanchanIndex][playerIndex]}
                    onChangeText={(text) => handleScoreChange(hanchanIndex, playerIndex, text)}
                  />
                </View>
              ))}
            </View>
          ))}
          <TouchableOpacity style={styles.addHanchanButton} onPress={handleAddHanchan}>
            <Plus size={16} color="#FF6B35" />
            <Text style={styles.addHanchanText}>半荘を追加</Text>
          </TouchableOpacity>
          <View style={[styles.scoreRow, styles.subtotalRow]}>
            <View style={styles.roundNumber}>
              <Text style={styles.subtotalText}>収支</Text>
            </View>
            {[0, 1, 2, 3].map((playerIndex) => (
              <View key={playerIndex} style={styles.totalContainer}>
                <Text style={[
                  styles.totalText,
                  calculateSubtotal(playerIndex) > 0 ? styles.positiveScore : calculateSubtotal(playerIndex) < 0 ? styles.negativeScore : styles.neutralScore
                ]}>
                  {calculateSubtotal(playerIndex) > 0 ? '+' : ''}{calculateSubtotal(playerIndex).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={gameDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setGameDate(selectedDate);
              }
            }}
          />
        )}

        <AdModal
          visible={showAdModal}
          onClose={() => setShowAdModal(false)}
          onComplete={() => {
            setShowAdModal(false);
            addHanchan();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    borderRadius: 16,
    margin: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E', // 黒文字に変更
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 12,
    marginTop: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E', // 黒文字に変更
  },
  playersCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 12,
    marginTop: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  playerHeader: {
    alignItems: 'center',
    gap: 4,
  },
  playerColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  positiveScore: {
    color: '#10B981',
  },
  negativeScore: {
    color: '#EF4444',
  },
  neutralScore: {
    color: '#6D6D70',
  },
  playersRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  playerInputContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  playerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  playerInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#FFF',
    width: '100%',
    color: '#1C1C1E',
  },
  playerLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  scoreSheetCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 12,
    marginTop: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  roundColumn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FF6B35',
    paddingVertical: 14,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E', // 黒文字に変更
  },
  playerColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
    paddingVertical: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    minHeight: 50,
    backgroundColor: '#FFF',
  },
  roundNumber: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FF6B35',
    backgroundColor: '#F9F9F9',
  },
  roundText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  playerScoreContainer: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
    paddingHorizontal: 1,
  },
  scoreCell: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E', // 通常は黒文字
    backgroundColor: '#FFF',
    textAlign: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    marginVertical: 2,
  },
  scoreCellFocused: {
    backgroundColor: '#FFF3ED',
    borderColor: '#FF6B35',
    color: '#FF6B35', // フォーカス時のみオレンジ
    fontWeight: '700',
  },
  addHanchanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B35',
    gap: 4,
  },
  addHanchanText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  subtotalRow: {
    backgroundColor: '#FFF3ED',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  totalRow: {
    backgroundColor: '#FFF7F2',
  },
  subtotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E', // 黒文字
  },
  totalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E', // 黒文字
  },
});