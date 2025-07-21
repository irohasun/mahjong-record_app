import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Save, Calendar, ArrowLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GameService } from '@/services/GameService';
import { GameRecord } from '@/types/GameRecord';

export default function EditGameScreen() {
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  
  const [gameDate, setGameDate] = useState(new Date());
  const [gameNumber, setGameNumber] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [gameType, setGameType] = useState<'東風戦' | '東南戦'>('東南戦');
  const [memo, setMemo] = useState('');
  
  // プレイヤー名
  const [players, setPlayers] = useState(['自分', '', '', '']);
  
  // 半荘結果データ
  const [hanchanResults, setHanchanResults] = useState([
    { round: 1, rank: 2, scoreChange: +1200 },
    { round: 2, rank: 1, scoreChange: +8400 },
    { round: 3, rank: 3, scoreChange: -2100 },
    { round: 4, rank: 2, scoreChange: +3500 }
  ]);

  // 最終スコア
  const [finalScores, setFinalScores] = useState([31000, 35900, 18200, 22500]);

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  const loadGameData = () => {
    // ダミーデータで編集画面を初期化
    if (gameId === 'dummy-game-001') {
      setGameDate(new Date());
      setGameNumber('123');
      setLocation('雀荘ドラゴン');
      setGameType('東南戦');
      setMemo('4半荘実施。後半に調子を取り戻した。良いゲームだった。');
      setPlayers(['自分', '田中', '佐藤', '鈴木']);
      setHanchanResults([
        { round: 1, rank: 3, scoreChange: -2100 },
        { round: 2, rank: 1, scoreChange: +8400 },
        { round: 3, rank: 2, scoreChange: +1200 },
        { round: 4, rank: 4, scoreChange: -4100 }
      ]);
      setFinalScores([28400, 35900, 18200, 22500]);
    } else if (gameId === 'dummy-game-002') {
      setGameDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      setGameNumber('124');
      setLocation('フリー対局');
      setGameType('東風戦');
      setMemo('東風戦2回。安定した戦績。相手のレベルが高く良い勉強になった。');
      setPlayers(['自分', '山田', '佐々木', '高橋']);
      setHanchanResults([
        { round: 1, rank: 2, scoreChange: +3400 },
        { round: 2, rank: 1, scoreChange: +2800 }
      ]);
      setFinalScores([31200, 24800, 23600, 20400]);
    }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handleScoreChange = (hanchanIndex: number, value: string) => {
    const newResults = [...hanchanResults];
    newResults[hanchanIndex].scoreChange = parseInt(value) || 0;
    setHanchanResults(newResults);
  };

  const handleRankChange = (hanchanIndex: number, value: string) => {
    const newResults = [...hanchanResults];
    const rank = parseInt(value);
    if (rank >= 1 && rank <= 4) {
      newResults[hanchanIndex].rank = rank;
      setHanchanResults(newResults);
    }
  };

  const handleSave = async () => {
    try {
      Alert.alert('保存完了', '対局記録を更新しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const calculateTotalChange = (): number => {
    return hanchanResults.reduce((total, result) => total + result.scoreChange, 0);
  };

  const calculateAverageRank = (): number => {
    const totalRank = hanchanResults.reduce((total, result) => total + result.rank, 0);
    return totalRank / hanchanResults.length;
  };

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FF6B35" />
        </TouchableOpacity>
        <Text style={styles.title}>対局記録編集</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* 基本情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>日付</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={16} color="#6D6D70" />
            <Text style={styles.dateText}>
              {gameDate.getFullYear()}年{gameDate.getMonth() + 1}月{gameDate.getDate()}日
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>ゲーム番号</Text>
          <TextInput
            style={styles.input}
            value={gameNumber}
            onChangeText={setGameNumber}
            placeholder="123"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>場所</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="雀荘名"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>種類</Text>
          <View style={styles.gameTypeSelector}>
            <TouchableOpacity
              style={[styles.gameTypeButton, gameType === '東風戦' && styles.gameTypeButtonActive]}
              onPress={() => setGameType('東風戦')}
            >
              <Text style={[styles.gameTypeText, gameType === '東風戦' && styles.gameTypeTextActive]}>
                東風戦
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gameTypeButton, gameType === '東南戦' && styles.gameTypeButtonActive]}
              onPress={() => setGameType('東南戦')}
            >
              <Text style={[styles.gameTypeText, gameType === '東南戦' && styles.gameTypeTextActive]}>
                東南戦
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* プレイヤー情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プレイヤー</Text>
        {players.map((player, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{index === 0 ? '自分' : `P${index + 1}`}</Text>
            <TextInput
              style={[styles.input, index === 0 && styles.mainPlayerInput]}
              value={player}
              onChangeText={(text) => handlePlayerNameChange(index, text)}
              placeholder={index === 0 ? '自分' : `プレイヤー${index + 1}`}
            />
          </View>
        ))}
      </View>

      {/* 半荘結果 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>半荘結果</Text>
        {hanchanResults.map((result, index) => (
          <View key={index} style={styles.hanchanRow}>
            <View style={styles.hanchanInfo}>
              <Text style={styles.hanchanNumber}>第{result.round}半荘</Text>
            </View>
            <View style={styles.hanchanInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>順位</Text>
                <TextInput
                  style={styles.rankInput}
                  value={result.rank.toString()}
                  onChangeText={(text) => handleRankChange(index, text)}
                  keyboardType="numeric"
                  maxLength={1}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>収支</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={result.scoreChange > 0 ? `+${result.scoreChange}` : result.scoreChange.toString()}
                  onChangeText={(text) => handleScoreChange(index, text.replace('+', ''))}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
        ))}
        
        {/* 合計表示 */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>合計収支</Text>
          <Text style={[
            styles.summaryValue,
            calculateTotalChange() >= 0 ? styles.positiveValue : styles.negativeValue
          ]}>
            {calculateTotalChange() > 0 ? '+' : ''}{calculateTotalChange()}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>平均順位</Text>
          <Text style={styles.summaryValue}>
            {calculateAverageRank().toFixed(2)}位
          </Text>
        </View>
      </View>

      {/* メモ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メモ</Text>
        <TextInput
          style={styles.memoInput}
          value={memo}
          onChangeText={setMemo}
          placeholder="対局の感想や反省点など..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
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
  section: {
    backgroundColor: '#FFF',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    width: 100,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  mainPlayerInput: {
    backgroundColor: '#FF6B3515',
    borderColor: '#FF6B35',
    color: '#FF6B35',
    fontWeight: '600',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  gameTypeSelector: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  gameTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  gameTypeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  gameTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D70',
  },
  gameTypeTextActive: {
    color: '#FFF',
  },
  hanchanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  hanchanInfo: {
    width: 100,
  },
  hanchanNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  hanchanInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#6D6D70',
    marginBottom: 4,
  },
  rankInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'right',
    backgroundColor: '#FFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#FF6B35',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  positiveValue: {
    color: '#10B981',
  },
  negativeValue: {
    color: '#EF4444',
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    minHeight: 100,
  },
});