import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Save, Calendar, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GameService } from '@/services/GameService';
import { AccountService } from '@/services/AccountService';
import { MonetizationService } from '@/services/MonetizationService';
import { AdModal } from '@/components/AdModal';

export default function AddGameScreen() {
  const router = useRouter();
  
  const [gameDate, setGameDate] = useState(new Date());
  const [gameNumber, setGameNumber] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [hanchanCount, setHanchanCount] = useState(3); // 初期は3半荘まで
  
  // プレイヤー名
  const [players, setPlayers] = useState(['自分', '', '', '']);
  
  // スコアデータ: [半荘数][プレイヤー]
  const [scores, setScores] = useState(
    Array(hanchanCount).fill(null).map(() => 
      Array(4).fill('')
    )
  );

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
      // プレミアムユーザーは無制限
      addHanchan();
    } else {
      // フリーユーザーは広告視聴が必要
      setShowAdModal(true);
    }
  };

  const addHanchan = () => {
    const newHanchanCount = hanchanCount + 1;
    setHanchanCount(newHanchanCount);
    
    // 新しい半荘の空のスコアを追加
    const newScores = [...scores];
    newScores.push(Array(4).fill(''));
    setScores(newScores);
  };

  // 小計計算（+/-記号を考慮）
  const calculateSubtotal = (playerIndex: number): number => {
    return scores.reduce((total, hanchan) => {
      const scoreText = hanchan[playerIndex];
      if (!scoreText) return total;
      
      // +/-記号を含む数値として解析
      const score = parseInt(scoreText) || 0;
      return total + score;
    }, 0);
  };

  const handleSave = async () => {
    if (players.some((name, index) => index !== 0 && !name.trim())) {
      Alert.alert('入力エラー', 'すべてのプレイヤー名を入力してください');
      return;
    }

    try {
      const account = await AccountService.getAccount();
      
      // スコアデータを変換
      const playersData = players.map((name, index) => ({
        name: name || `プレイヤー${index + 1}`,
        finalScore: 25000 + calculateSubtotal(index),
        rank: 1, // 後で計算
        isMainAccount: index === 0,
        startingPosition: ['East', 'South', 'West', 'North'][index] as 'East' | 'South' | 'West' | 'North'
      }));

      // 順位計算
      const sortedPlayers = [...playersData].sort((a, b) => b.finalScore - a.finalScore);
      sortedPlayers.forEach((player, idx) => {
        const originalIndex = playersData.findIndex(p => 
          p.name === player.name && p.isMainAccount === player.isMainAccount
        );
        playersData[originalIndex].rank = idx + 1;
      });

      const gameRecord = {
        accountId: account.accountId,
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
        rounds: [], // 簡略化のため空にしておく
        finalRiichiSticks: 0,
        finalHonba: 0,
        memo: `ゲーム番号: ${gameNumber}`,
        gameEndCondition: 'normal' as const,
      };

      await GameService.addGame(gameRecord);
      await MonetizationService.incrementGameCount();
      
      Alert.alert('保存完了', '対局記録を保存しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const ScoreCell = ({ 
    hanchanIndex, 
    playerIndex, 
    value, 
    onChangeText 
  }: {
    hanchanIndex: number;
    playerIndex: number;
    value: string;
    onChangeText: (text: string) => void;
  }) => (
    <TextInput
      style={styles.scoreCell}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numbers-and-punctuation"
      textAlign="center"
      placeholder="±0"
      returnKeyType="done"
      selectTextOnFocus={true}
      autoCorrect={false}
      autoCapitalize="none"
    />
  );

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>対局記録</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* 日付とゲーム番号 */}
      <View style={styles.infoSection}>
        <TouchableOpacity 
          style={styles.dateContainer}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={16} color="#6D6D70" />
          <Text style={styles.dateText}>
            {gameDate.getMonth() + 1}月{gameDate.getDate()}日
          </Text>
        </TouchableOpacity>
        
        <View style={styles.gameNumberContainer}>
          <Text style={styles.gameNumberLabel}>No</Text>
          <TextInput
            style={styles.gameNumberInput}
            value={gameNumber}
            onChangeText={setGameNumber}
            placeholder="1"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* スコア表 */}
      <View style={styles.scoreSheet}>
        {/* ヘッダー行 */}
        <View style={styles.scoreHeader}>
          <View style={styles.roundColumn}>
            <Text style={styles.headerText}>半荘</Text>
          </View>
          {[0, 1, 2, 3].map((playerIndex) => (
            <View key={playerIndex} style={styles.playerColumn}>
              <TextInput
                style={[
                  styles.playerHeaderInput,
                  playerIndex === 0 && styles.mainPlayerHeaderInput
                ]}
                value={players[playerIndex]}
                onChangeText={(text) => handlePlayerNameChange(playerIndex, text)}
                placeholder={playerIndex === 0 ? '自分' : `P${playerIndex + 1}`}
              />
            </View>
          ))}
        </View>

        {/* スコア行 */}
        {[...Array(hanchanCount)].map((_, hanchanIndex) => (
          <View key={hanchanIndex} style={styles.scoreRow}>
            <View style={styles.roundNumber}>
              <Text style={styles.roundText}>{hanchanIndex + 1}</Text>
            </View>
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

        {/* 半荘追加ボタン */}
        <TouchableOpacity style={styles.addHanchanButton} onPress={handleAddHanchan}>
          <Plus size={16} color="#FF6B35" />
          <Text style={styles.addHanchanText}>半荘を追加</Text>
        </TouchableOpacity>

        {/* 小計行 */}
        <View style={[styles.scoreRow, styles.subtotalRow]}>
          <View style={styles.roundNumber}>
            <Text style={styles.subtotalText}>小計</Text>
          </View>
          {[0, 1, 2, 3].map((playerIndex) => (
            <View key={playerIndex} style={styles.totalContainer}>
              <Text style={styles.totalText}>
                {calculateSubtotal(playerIndex) > 0 ? '+' : ''}{calculateSubtotal(playerIndex)}
              </Text>
            </View>
          ))}
        </View>

        {/* 合計行 */}
        <View style={[styles.scoreRow, styles.totalRow]}>
          <View style={styles.roundNumber}>
            <Text style={styles.subtotalText}>合計</Text>
          </View>
          {[0, 1, 2, 3].map((playerIndex) => (
            <View key={playerIndex} style={styles.totalContainer}>
              <Text style={styles.finalTotalText}>
                {25000 + calculateSubtotal(playerIndex)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  gameNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameNumberLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  gameNumberInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
  playersSection: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  playersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  playerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D70',
    marginBottom: 4,
  },
  playerInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  mainPlayerInput: {
    backgroundColor: '#FF6B3515',
    borderColor: '#FF6B35',
    color: '#FF6B35',
    fontWeight: '600',
  },
  scoreSheet: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  scoreHeader: {
    flexDirection: 'row',
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    backgroundColor: '#FF6B35',
  },
  roundColumn: {
    width: 60,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B3520',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerColumn: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
  },
  playerHeaderInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  mainPlayerHeaderInput: {
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 50,
  },
  roundNumber: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B3515',
    borderRadius: 8,
    margin: 2,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  playerScoreContainer: {
    flex: 1,
    margin: 2,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  scoreCell: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1C1E',
    backgroundColor: 'transparent',
    textAlign: 'center',
    minHeight: 48,
    width: '100%',
    borderWidth: 0,
  },
  addHanchanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    margin: 4,
    gap: 4,
  },
  addHanchanText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  subtotalRow: {
    backgroundColor: '#FFF2E5',
    borderRadius: 8,
    margin: 4,
  },
  totalRow: {
    backgroundColor: '#E5F7E5',
    borderRadius: 8,
    margin: 4,
  },
  subtotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  totalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  totalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
  },
  finalTotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
});