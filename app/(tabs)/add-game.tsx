import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Save, Calendar, Plus, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GameService } from '@/services/GameService';
import { AuthService } from '@/services/AuthService';
import { ensureAuthenticated } from '@/utils/authUtils';


export default function AddGameScreen() {
  const router = useRouter();
  const keyboardAnimation = useRef(new Animated.Value(0)).current;
  
  const [gameDate, setGameDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hanchanCount, setHanchanCount] = useState(3);
  const [premiumHanchanCount, setPremiumHanchanCount] = useState(3);
  const [players, setPlayers] = useState(['自分', '', '', '']);
  const [scores, setScores] = useState(Array(hanchanCount).fill(null).map(() => Array(4).fill('')));
  const [loading, setLoading] = useState(false);
  const [editingPlayerName, setEditingPlayerName] = useState<number | null>(null);
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);
  const [customKeyboardValue, setCustomKeyboardValue] = useState('');
  const [customKeyboardTarget, setCustomKeyboardTarget] = useState<{hanchan: number, player: number} | null>(null);



  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handlePlayerNameEdit = (index: number) => {
    setEditingPlayerName(index);
  };

  const handlePlayerNameSave = (index: number) => {
    setEditingPlayerName(null);
  };

  const handleCustomKeyboardPress = (hanchanIndex: number, playerIndex: number, value: string) => {
    setCustomKeyboardValue(value);
    setCustomKeyboardTarget({ hanchan: hanchanIndex, player: playerIndex });
    setShowCustomKeyboard(true);
    
    // アニメーション開始
    Animated.timing(keyboardAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };



  const handleCustomKeyboardInput = (input: string) => {
    if (input === 'backspace') {
      const newValue = customKeyboardValue.slice(0, -1);
      setCustomKeyboardValue(newValue);
      
      // リアルタイムでスコアに反映（自動計算なし）
      if (customKeyboardTarget) {
        const newScores = [...scores];
        newScores[customKeyboardTarget.hanchan][customKeyboardTarget.player] = newValue;
        setScores(newScores);
      }
    } else if (input === 'ok') {
      // OKボタンでスコアを確定し、3つ目の入力なら自動計算を実行
      if (customKeyboardTarget) {
        const newScores = [...scores];
        newScores[customKeyboardTarget.hanchan][customKeyboardTarget.player] = customKeyboardValue;
        
        // 3つ目のスコアが入力された場合のみ自動計算
        const currentScores = newScores[customKeyboardTarget.hanchan];
        const filledScores = currentScores.filter((score, index) => score !== '');
        
        if (filledScores.length === 3) {
          // 3人分の合計を計算
          const sum = filledScores.reduce((total, score) => total + (parseInt(score) || 0), 0);
          // 残り1人の値を計算（合計が0になるように）
          const remainingValue = -sum;
          
          // 空いているプレイヤーのインデックスを見つける
          const emptyPlayerIndex = currentScores.findIndex((score) => score === '');
          if (emptyPlayerIndex !== -1) {
            newScores[customKeyboardTarget.hanchan][emptyPlayerIndex] = remainingValue.toString();
          }
        }
        
        setScores(newScores);
      }
      
      // アニメーション終了
      Animated.timing(keyboardAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowCustomKeyboard(false);
        setCustomKeyboardValue('');
        setCustomKeyboardTarget(null);
      });
    } else {
      // マイナス記号は最初の文字のみ許可
      if (input === '-' && customKeyboardValue.length > 0) return;
      // 小数点は1つまで許可
      if (input === '.' && customKeyboardValue.includes('.')) return;
      // 数字、マイナス、小数点のみ許可
      if (/^[0-9\-\.]$/.test(input)) {
        const newValue = customKeyboardValue + input;
        setCustomKeyboardValue(newValue);
        
        // リアルタイムでスコアに反映（自動計算なし）
        if (customKeyboardTarget) {
          const newScores = [...scores];
          newScores[customKeyboardTarget.hanchan][customKeyboardTarget.player] = newValue;
          setScores(newScores);
        }
      }
    }
  };





  const addHanchan = () => {
    const newHanchanCount = hanchanCount + 1;
    setHanchanCount(newHanchanCount);
    setPremiumHanchanCount(newHanchanCount);
    const newScores = [...scores];
    newScores.push(Array(4).fill(''));
    setScores(newScores);
  };

  const removeHanchan = (hanchanIndex: number) => {
    if (hanchanCount <= 1) {
      Alert.alert('エラー', '最低1つの半荘は必要です');
      return;
    }
    
    Alert.alert(
      '半荘を削除',
      `半荘${hanchanIndex + 1}を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            const newHanchanCount = hanchanCount - 1;
            setHanchanCount(newHanchanCount);
            if (newHanchanCount < premiumHanchanCount) {
              setPremiumHanchanCount(newHanchanCount);
            }
            const newScores = [...scores];
            newScores.splice(hanchanIndex, 1);
            setScores(newScores);
          }
        }
      ]
    );
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
      const user = await ensureAuthenticated();
      if (!user) {
        Alert.alert('エラー', '認証に失敗しました');
        return;
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



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>対局記録</Text>
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
              <Text style={styles.headerText}>半荘</Text>
            </View>
            {[0, 1, 2, 3].map((playerIndex) => (
              <View key={playerIndex} style={styles.playerColumn}>
                <View style={styles.playerHeader}>
                  {editingPlayerName === playerIndex ? (
                    <TextInput
                      style={styles.playerNameInput}
                      value={players[playerIndex]}
                      onChangeText={(text) => handlePlayerNameChange(playerIndex, text)}
                      onBlur={() => handlePlayerNameSave(playerIndex)}
                      onEndEditing={() => handlePlayerNameSave(playerIndex)}
                      placeholder={playerIndex === 0 ? '自分' : `P${playerIndex + 1}`}
                      autoFocus={true}
                      selectTextOnFocus={true}
                      maxLength={10}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => handlePlayerNameEdit(playerIndex)}
                      style={styles.playerNameButton}
                    >
                      <Text style={styles.headerText}>
                        {players[playerIndex] || (playerIndex === 0 ? '自分' : `P${playerIndex + 1}`)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.playerColorIndicator, { backgroundColor: getPlayerColor(playerIndex) }]} />
                </View>
              </View>
            ))}
          </View>
          {[...Array(hanchanCount)].map((_, hanchanIndex) => (
            <View key={hanchanIndex} style={styles.scoreRow}>
              <View style={styles.roundNumber}>
                <View style={styles.roundNumberContainer}>
                  <Text style={[
                    styles.roundText,
                    hanchanIndex >= 3 ? styles.premiumRoundText : styles.normalRoundText
                  ]}>
                    {hanchanIndex + 1}
                  </Text>
                  {hanchanCount > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeHanchan(hanchanIndex)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={12} color="#FF6B35" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {[0, 1, 2, 3].map((playerIndex) => (
                <View key={playerIndex} style={styles.playerScoreContainer}>
                  <TouchableOpacity
                    style={[
                      styles.scoreCell,
                      customKeyboardTarget && customKeyboardTarget.hanchan === hanchanIndex && customKeyboardTarget.player === playerIndex && styles.scoreCellSelected
                    ]}
                    onPress={() => handleCustomKeyboardPress(hanchanIndex, playerIndex, scores[hanchanIndex][playerIndex])}
                  >
                    <Text style={[
                      styles.scoreCellText,
                      (() => {
                        const scoreValue = customKeyboardTarget && customKeyboardTarget.hanchan === hanchanIndex && customKeyboardTarget.player === playerIndex 
                          ? customKeyboardValue 
                          : scores[hanchanIndex][playerIndex];
                        const numValue = parseInt(scoreValue) || 0;
                        return numValue < 0 ? styles.negativeScore : numValue > 0 ? styles.positiveScore : styles.neutralScore;
                      })()
                    ]}>
                      {customKeyboardTarget && customKeyboardTarget.hanchan === hanchanIndex && customKeyboardTarget.player === playerIndex 
                        ? (customKeyboardValue || '±0')
                        : (scores[hanchanIndex][playerIndex] || '±0')
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
          <TouchableOpacity style={styles.addHanchanButton} onPress={addHanchan}>
            <Plus size={16} color="#FF6B35" />
            <Text style={styles.addHanchanText}>半荘を追加</Text>
          </TouchableOpacity>
          <View style={[styles.scoreRow, styles.subtotalRow]}>
            <View style={styles.roundNumber}>
              <Text style={styles.subtotalText}>合計</Text>
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


      </ScrollView>
      
      {/* 保存ボタン */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* カスタムキーボード */}
      {showCustomKeyboard && (
        <Animated.View 
          style={[
            styles.customKeyboardOverlay,
            {
              transform: [{
                translateY: keyboardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0], // 300px下から上にスライド
                })
              }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.overlayBackground}
            activeOpacity={1}
            onPress={() => {
              Animated.timing(keyboardAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setShowCustomKeyboard(false);
                setCustomKeyboardValue('');
                setCustomKeyboardTarget(null);
              });
            }}
          />
          <Animated.View style={styles.customKeyboard}>
            <View style={styles.customKeyboardButtons}>
              <View style={styles.customKeyboardRow}>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('7')}>
                  <Text style={styles.customKeyboardButtonText}>7</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('8')}>
                  <Text style={styles.customKeyboardButtonText}>8</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('9')}>
                  <Text style={styles.customKeyboardButtonText}>9</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('backspace')}>
                  <Text style={styles.customKeyboardButtonText}>←</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customKeyboardRow}>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('4')}>
                  <Text style={styles.customKeyboardButtonText}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('5')}>
                  <Text style={styles.customKeyboardButtonText}>5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('6')}>
                  <Text style={styles.customKeyboardButtonText}>6</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('-')}>
                  <Text style={styles.customKeyboardButtonText}>-</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customKeyboardRow}>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('1')}>
                  <Text style={styles.customKeyboardButtonText}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('2')}>
                  <Text style={styles.customKeyboardButtonText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('3')}>
                  <Text style={styles.customKeyboardButtonText}>3</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('.')}>
                  <Text style={styles.customKeyboardButtonText}>.</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customKeyboardRow}>
                <TouchableOpacity style={styles.customKeyboardButton} onPress={() => handleCustomKeyboardInput('0')}>
                  <Text style={styles.customKeyboardButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.customKeyboardButton, styles.customKeyboardButtonOK]} onPress={() => handleCustomKeyboardInput('ok')}>
                  <Text style={styles.customKeyboardButtonTextOK}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
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
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
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
    color: '#000',
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
  playerNameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 40,
  },
  playerNameButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
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
    color: '#000',
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
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 4,
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
    color: '#000',
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
    minHeight: 56,
    backgroundColor: '#FFF',
    paddingVertical: 2,
  },
  roundNumber: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FF6B35',
    backgroundColor: '#F9F9F9',
  },
  roundNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  removeButton: {
    padding: 2,
    borderRadius: 8,
    backgroundColor: '#FFF3ED',
  },
  roundText: {
    fontSize: 14,
    fontWeight: '700',
  },
  normalRoundText: {
    color: '#000',
  },
  premiumRoundText: {
    color: '#FF6B35',
  },
  playerScoreContainer: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
    padding: 4,
    justifyContent: 'center',
  },

  scoreCell: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    backgroundColor: '#FFF',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    minHeight: 44,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCellText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
  },
  customKeyboardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  customKeyboard: {
    backgroundColor: '#F2F2F7',
    paddingTop: 10,
    paddingBottom: 20,
  },
  customKeyboardButtons: {
    paddingHorizontal: 20,
  },
  customKeyboardRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  customKeyboardButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  customKeyboardButtonOK: {
    backgroundColor: '#FF6B35',
  },
  customKeyboardButtonTextOK: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },

  scoreCellFocused: {
    backgroundColor: '#FFF3ED',
    borderColor: '#FF6B35',
    color: '#FF6B35', // フォーカス時のみオレンジ
    fontWeight: '700',
  },
  scoreCellSelected: {
    backgroundColor: '#FF6B3510',
    borderColor: '#FF6B35',
    borderWidth: 2,
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
    marginHorizontal: 0,
  },
  addHanchanText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  subtotalRow: {
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 4,
  },
  totalRow: {
    backgroundColor: '#FFF7F2',
  },
  subtotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
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
    color: '#000',
  },
});