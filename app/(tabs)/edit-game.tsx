import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Animated, Image, Keyboard, LayoutAnimation, UIManager } from 'react-native';
import { Save, Calendar, Plus, X, Camera, Check } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GameService } from '@/services/GameService';
import { AuthService } from '@/services/AuthService';
import { ensureAuthenticated } from '@/utils/authUtils';
import { GameRecord } from '@/types/GameRecord';
import * as ImagePicker from 'expo-image-picker';
import { AccountService } from '@/services/AccountService';

export default function EditGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const gameId = params.gameId as string;
  const keyboardAnimation = useRef(new Animated.Value(0)).current;
  
  const [gameData, setGameData] = useState<GameRecord | null>(null);
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
  // 追加画面と同一のUIに合わせる（ゲームタイプ選択は表示しない）
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ゲームデータを読み込む
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const showSub = Keyboard.addListener(showEvt, (e: any) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });
    loadGameData();
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [gameId]);
  const [gamePhoto, setGamePhoto] = useState<string | null>(null);


  const loadGameData = async () => {
    try {
      const user = await ensureAuthenticated();
      const game = await GameService.getGameById(user.id, gameId);
      if (game) {
        setGameData(game);
        setGameDate(new Date(game.date));
        // UI統一のためゲームタイプ選択は表示しない
        
        // プレイヤー名を設定（自分=アカウント名、他= P2/P3/P4）
        try {
          const account = await AccountService.getAccount();
          setPlayers([account.username || '自分', 'P2', 'P3', 'P4']);
        } catch {
          setPlayers(['自分', 'P2', 'P3', 'P4']);
        }
        
        // スコアデータを設定（各半荘をそのままの行として表示）
        if (game.rounds && game.rounds.length > 0) {
          const roundCount = game.rounds.length;
          setHanchanCount(roundCount);
          const newScores = Array(roundCount).fill(null).map(() => Array(4).fill(''));
          game.rounds.forEach((r, idx) => {
            const row = (r.points as any[]).map((n) => (n === null || n === undefined ? '' : String(n)));
            for (let i = 0; i < 4; i++) newScores[idx][i] = row[i] ?? '';
          });
          setScores(newScores);
        }
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
      Alert.alert('エラー', 'ゲームデータの読み込みに失敗しました');
      router.back();
    }
  };

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
      // 数字入力
      const newValue = customKeyboardValue + input;
      setCustomKeyboardValue(newValue);
      
      // リアルタイムでスコアに反映
      if (customKeyboardTarget) {
        const newScores = [...scores];
        newScores[customKeyboardTarget.hanchan][customKeyboardTarget.player] = newValue;
        setScores(newScores);
      }
    }
  };

  const addHanchan = () => {
    if (hanchanCount < 8) {
      setHanchanCount(hanchanCount + 1);
      setScores([...scores, Array(4).fill('')]);
    }
  };

  const removeHanchan = (hanchanIndex: number) => {
    if (hanchanCount > 1) {
      setHanchanCount(hanchanCount - 1);
      const newScores = scores.filter((_, index) => index !== hanchanIndex);
      setScores(newScores);
    }
  };

  const calculateSubtotal = (playerIndex: number): number => {
    return scores.reduce((total, hanchanScores) => {
      const raw = String(hanchanScores[playerIndex] ?? '').trim();
      if (raw === '') return total; // 空欄は集計対象外
      const n = parseInt(raw);
      return total + (isNaN(n) ? 0 : n);
    }, 0);
  };

  const handleSave = async () => {
    
    
    if (!gameData) {
      
      return;
    }

    setLoading(true);
    try {
      const user = await ensureAuthenticated();
      
      // プレイヤーデータを構築
      const playerData = players.map((playerName, index) => ({
        name: playerName,
        isMainAccount: index === 0,
        finalScore: calculateSubtotal(index),
        rank: 1, // 簡略化のため固定
        startingPosition: ['East', 'South', 'West', 'North'][index] as any
      }));
      // 追加画面と同一の構成でデータを更新（ゲームタイプは既存値を維持）
      const updatedGame = {
        ...gameData,
        date: gameDate.toISOString(),
        gameType: gameData.gameType,
        players: playerData,
        // 他のフィールドは既存のデータを使用
      };
      await GameService.updateGame(user.id, gameId, updatedGame);
      
      Alert.alert('修正完了', undefined, [
        { 
          text: 'OK', 
          onPress: () => {
            router.push('/(tabs)/history');
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to update game');
      Alert.alert('エラー', '対局記録の修正に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerColor = (playerIndex: number) => {
    const colors = ['#FF6B35', '#3B82F6', '#10B981', '#F59E0B'];
    return colors[playerIndex];
  };

  if (!gameData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>データを読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 + keyboardHeight }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>記録修正</Text>
        </View>

        {/* 日付 */}
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

        {/* 写真選択（追加画面と同一UI） */}
        <View style={styles.photoCard}>
          <Text style={styles.photoLabel}>対局写真</Text>
          {gamePhoto ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: gamePhoto }} style={styles.gamePhoto} />
              <TouchableOpacity style={styles.removePhotoButton} onPress={() => setGamePhoto(null)}>
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={async () => {
                try {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('権限が必要', '写真を選択するにはカメラロールへのアクセス権限が必要です');
                    return;
                  }
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setGamePhoto(result.assets[0].uri);
                  }
                } catch (e) {
                  console.error('写真選択エラー:', e);
                  Alert.alert('エラー', '写真の選択に失敗しました');
                }
              }}
            >
              <Camera size={24} color="#FF6B35" />
              <Text style={styles.addPhotoText}>写真を追加</Text>
            </TouchableOpacity>
          )}
        </View>

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
                      value={
                        playerIndex === 0 ? players[0] : `P${playerIndex + 1}`
                      }
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
                        {playerIndex === 0
                          ? players[0] || '自分'
                          : `P${playerIndex + 1}`}
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
                        ? (customKeyboardValue || '')
                        : String(scores[hanchanIndex][playerIndex] ?? '')
                      }
                    </Text>
                  </TouchableOpacity>
                  {playerIndex === 3 && (() => {
                    const row = scores[hanchanIndex] || [];
                    const hasAny = row.some(v => String(v ?? '').trim() !== '' && !isNaN(parseInt(String(v))));
                    if (!hasAny) return null;
                    const sum = row.reduce((acc, v) => acc + (parseInt(String(v)) || 0), 0);
                    const ok = sum === 0;
                    return (
                      <View style={[styles.statusBadge, styles.statusBadgeRight, ok ? styles.okBadge : styles.ngBadge]}>
                        {ok ? <Check size={10} color="#FFF" /> : <X size={10} color="#FFF" />}
                      </View>
                    );
                  })()}
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
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Save size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>修正</Text>
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
  saveButtonDisabled: {
    opacity: 0.5,
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
  scoreSheetCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 12,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  roundColumn: {
    width: 60,
    alignItems: 'center',
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
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
    borderColor: '#FF6B35',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  playerNameButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundNumber: {
    width: 60,
    alignItems: 'center',
  },
  roundNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  normalRoundText: {
    color: '#000',
  },
  premiumRoundText: {
    color: '#FF6B35',
  },
  removeButton: {
    padding: 2,
  },
  playerScoreContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  scoreCell: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  scoreCellSelected: {
    backgroundColor: '#FF6B3515',
    borderColor: '#FF6B35',
  },
  scoreCellText: {
    fontSize: 16,
    fontWeight: '600',
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
  addHanchanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B3515',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  addHanchanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 8,
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalContainer: {
    flex: 1,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    marginTop: 4,
    alignSelf: 'center',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okBadge: {
    backgroundColor: '#10B981',
  },
  ngBadge: {
    backgroundColor: '#EF4444',
  },
  statusBadgeRight: {
    position: 'absolute',
    right: -14,
    top: '50%',
    transform: [{ translateY: -7 }],
  },
  customKeyboardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayBackground: {
    flex: 1,
  },
  customKeyboard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  customKeyboardButtons: {
    gap: 8,
  },
  customKeyboardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customKeyboardButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  customKeyboardButtonOK: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  customKeyboardButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  customKeyboardButtonTextOK: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  photoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  gamePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 16,
    gap: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  gameTypeContainer: {
    marginTop: 16,
  },
  gameTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D70',
    marginBottom: 8,
  },
  gameTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  gameTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  gameTypeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  gameTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D70',
  },
  gameTypeButtonTextActive: {
    color: '#FFFFFF',
  },
}); 