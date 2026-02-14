import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Check, X } from 'lucide-react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GameService } from '@/services/GameService';
import { ensureAuthenticated } from '@/utils/authUtils';
import { AccountService } from '@/services/AccountService';
import {
  RuleConfig,
  DEFAULT_RULE_CONFIG,
  calculateAllScores,
  autoCompleteRawScore,
  formatScore,
  validateTotalScore,
  calculateFourthPlayerScore,
  detectAutoCompleteTarget,
} from '@/utils/ScoreCalculator';

/**
 * 対局記録追加画面
 * 素点入力 → 自動計算形式
 */
export default function AddGameScreen() {
  const router = useRouter();
  const { editMode, gameData: gameDataStr } = useLocalSearchParams<{ editMode?: string; gameData?: string }>();
  const keyboardAnimation = useRef(new Animated.Value(0)).current;

  // 編集モードの判定
  const isEditMode = editMode === 'true' && !!gameDataStr;
  const editGameData = useMemo(() => {
    if (!isEditMode || !gameDataStr) return null;
    try {
      return JSON.parse(gameDataStr as string);
    } catch {
      return null;
    }
  }, [isEditMode, gameDataStr]);

  // 基本状態
  const [gameDate, setGameDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [players, setPlayers] = useState(['自分', 'P2', 'P3', 'P4']);
  const [loading, setLoading] = useState(false);

  // ルール設定
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);
  const [showRuleSettings, setShowRuleSettings] = useState(false);

  // 半荘データ（最大8半荘）
  // rawScores[hanchanIndex][playerIndex] = 素点（文字列）
  const [hanchanCount, setHanchanCount] = useState(5);
  const [rawScores, setRawScores] = useState<string[][]>(
    Array(8).fill(null).map(() => Array(4).fill(''))
  );

  // 飛ばしたプレイヤーのデータ（8半荘 × 最大4プレイヤー）
  const [tobiWinners, setTobiWinners] = useState<number[][]>(
    Array(8).fill(null).map(() => [])
  );

  // 入力中のセル
  const [activeCell, setActiveCell] = useState<{ hanchan: number; player: number } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);

  // プレイヤー名編集
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);


  // 画面フォーカス時のリセット
  useFocusEffect(
    useCallback(() => {
      if (!isEditMode) {
        resetForm();
        (async () => {
          try {
            const { account } = await AccountService.getAccount();
            setPlayers([account.username || '自分', 'P2', 'P3', 'P4']);
          } catch { }
        })();
      } else {
        loadGameData();
      }
    }, [isEditMode, gameDataStr])
  );

  // フォームリセット
  const resetForm = () => {
    setGameDate(new Date());
    setHanchanCount(5);
    setRawScores(Array(8).fill(null).map(() => Array(4).fill('')));
    setTobiWinners(Array(8).fill(null).map(() => []));
    setPlayers(['自分', 'P2', 'P3', 'P4']);
    setRuleConfig(DEFAULT_RULE_CONFIG);
    setActiveCell(null);
    setShowCustomKeyboard(false);
    setEditingPlayerIndex(null);
  };

  // 編集モード用データ読み込み
  const loadGameData = () => {
    if (!editGameData) return;
    setGameDate(new Date(editGameData.date));
    const playerNames = editGameData.players?.map((p: any) => p.name) || ['自分', 'P2', 'P3', 'P4'];
    setPlayers(playerNames);
    // 既存データは収支形式なので、素点への逆変換は行わない（新規入力を促す）
  };

  // 各半荘の計算結果を取得
  const getCalculatedResults = useCallback((hanchanIndex: number) => {
    const scores = rawScores[hanchanIndex].map(s => {
      const completed = autoCompleteRawScore(s);
      return completed;
    });

    // 飛ばしたプレイヤー情報を渡す
    const winners = tobiWinners[hanchanIndex];
    return calculateAllScores(scores, ruleConfig, winners);
  }, [rawScores, ruleConfig, tobiWinners]);

  // 各半荘の検証結果を計算
  const validationResults = useMemo(() => {
    return Array(8).fill(null).map((_, index) => {
      if (index >= hanchanCount) return null;
      const rawScoreRow = rawScores[index];
      const allEntered = rawScoreRow.every(s => s !== '');
      if (!allEntered) return null;
      const scores = rawScoreRow.map(s => autoCompleteRawScore(s));

      // 基本的な合計点数検証
      const totalValid = validateTotalScore(scores, ruleConfig);
      if (!totalValid) return false;

      // 飛び賞が有効な場合の追加検証
      if (ruleConfig.tobiBonusEnabled) {
        const { isTobi } = getCalculatedResults(index);
        const hasTobiPlayers = isTobi.some(t => t);
        const tobiWinnerCount = tobiWinners[index].length;

        // 飛びがいるのに飛ばした人が選択されていない場合は検証失敗
        if (hasTobiPlayers && tobiWinnerCount === 0) {
          return false;
        }
      }

      return true;
    });
  }, [rawScores, hanchanCount, ruleConfig, getCalculatedResults, tobiWinners]);

  // 合計収支を計算
  const getTotalScores = useCallback((): (number | null)[] => {
    const totals = [0, 0, 0, 0];
    for (let h = 0; h < hanchanCount; h++) {
      const { scores } = getCalculatedResults(h);
      scores.forEach((s, i) => {
        if (s !== null) totals[i] += s;
      });
    }
    return totals;
  }, [hanchanCount, getCalculatedResults]);

  // 保存可能かチェック（エラーがある半荘がないか）
  const hasValidationError = useMemo(() => {
    return validationResults.some((result, index) => {
      // 使用中の半荘でエラーがある場合
      return index < hanchanCount && result === false;
    });
  }, [validationResults, hanchanCount]);

  // セルタップ時
  const handleCellPress = (hanchanIndex: number, playerIndex: number) => {
    setActiveCell({ hanchan: hanchanIndex, player: playerIndex });
    const currentValue = rawScores[hanchanIndex][playerIndex];
    // 既存の値から末尾の'00'を削除して表示用の値を設定
    // 例: "35000" → "350", "-35000" → "-350"
    let displayValue = '';
    if (currentValue !== '') {
      const isNegative = currentValue.startsWith('-');
      // マイナス記号がある場合は最低3文字（"-" + 1桁 + "00"）、ない場合は最低3文字（1桁 + "00"）
      const minLength = isNegative ? 4 : 3;
      // 末尾の'00'を削除
      if (currentValue.endsWith('00') && currentValue.length >= minLength) {
        displayValue = currentValue.slice(0, -2);
      } else {
        displayValue = currentValue;
      }
    }
    setInputValue(displayValue);
    setShowCustomKeyboard(true);
    Animated.timing(keyboardAnimation, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // カスタムキーボード入力
  const handleKeyboardInput = (key: string) => {
    if (!activeCell) return;

    if (key === 'backspace') {
      const newValue = inputValue.slice(0, -1);
      setInputValue(newValue);
      // 下二桁の'00'を自動追加
      const valueWithSuffix = newValue ? newValue + '00' : '';
      updateRawScore(activeCell.hanchan, activeCell.player, valueWithSuffix);
    } else if (key === 'ok') {
      // 入力確定
      Animated.timing(keyboardAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowCustomKeyboard(false);
        setActiveCell(null);
        setInputValue('');
      });
    } else if (key === 'clear') {
      setInputValue('');
      updateRawScore(activeCell.hanchan, activeCell.player, '');
    } else if (key === '-') {
      // マイナスボタン（トグル機能）
      if (inputValue.startsWith('-')) {
        // マイナス記号を削除
        const newValue = inputValue.slice(1);
        setInputValue(newValue);
        const valueWithSuffix = newValue ? newValue + '00' : '';
        updateRawScore(activeCell.hanchan, activeCell.player, valueWithSuffix);
      } else {
        // マイナス記号を追加
        const newValue = '-' + inputValue;
        setInputValue(newValue);
        const valueWithSuffix = newValue + '00';
        updateRawScore(activeCell.hanchan, activeCell.player, valueWithSuffix);
      }
    } else {
      // 数字入力（最大4桁まで、'00'が自動追加されるため）
      // マイナス記号がある場合は5文字まで（"-" + 4桁）
      const maxLength = inputValue.startsWith('-') ? 5 : 4;
      if (inputValue.length < maxLength) {
        const newValue = inputValue + key;
        setInputValue(newValue);
        // 下二桁の'00'を自動追加
        const valueWithSuffix = newValue + '00';
        updateRawScore(activeCell.hanchan, activeCell.player, valueWithSuffix);
      }
    }
  };

  // 素点更新（3人入力完了時に4人目を自動計算）
  // 素点更新
  const updateRawScore = (hanchan: number, player: number, value: string) => {
    setRawScores(prev => {
      const newScores = [...prev];
      newScores[hanchan] = [...newScores[hanchan]];
      newScores[hanchan][player] = value;
      return newScores;
    });
  };

  // 自動入力ボタンのハンドラ
  const handleAutoComplete = useCallback((hanchanIndex: number, playerIndex: number) => {
    const rawScoreRow = rawScores[hanchanIndex];
    const target = detectAutoCompleteTarget(rawScoreRow);

    if (target !== null && target.targetIndex === playerIndex) {
      const totalPoints = ruleConfig.startingPoints * 4;
      const fourthScore = calculateFourthPlayerScore(target.filledScores, totalPoints);

      if (fourthScore !== null) {
        setRawScores(prev => {
          const newScores = [...prev];
          newScores[hanchanIndex] = [...newScores[hanchanIndex]];
          newScores[hanchanIndex][playerIndex] = String(fourthScore);
          return newScores;
        });
      }
    }
  }, [rawScores, ruleConfig.startingPoints]);

  // 半荘追加
  const addHanchan = () => {
    if (hanchanCount < 8) {
      setHanchanCount(hanchanCount + 1);
    }
  };

  // 保存処理
  const handleSave = async () => {
    try {
      setLoading(true);
      const user = await ensureAuthenticated();
      if (!user) {
        Alert.alert('エラー', '認証に失敗しました');
        return;
      }

      // 各半荘のデータを構築
      const rounds: any[] = [];
      for (let h = 0; h < hanchanCount; h++) {
        const { scores } = getCalculatedResults(h);
        // 有効なスコアがある半荘のみ保存
        const hasValidScore = scores.some(s => s !== null);
        if (hasValidScore) {
          rounds.push({
            round: `半荘${h + 1}`,
            honba: 0,
            riichiSticks: 0,
            handType: 'draw' as const,
            points: scores.map(s => s ?? 0),
            // 飛ばしたプレイヤー情報を保存
            memo: tobiWinners[h].length > 0
              ? JSON.stringify({ tobiWinners: tobiWinners[h] })
              : undefined,
          });
        }
      }

      // プレイヤーデータ構築
      const totalScores = getTotalScores();
      const playersData = players.map((name, index) => ({
        name: name || `P${index + 1}`,
        finalScore: totalScores[index] ?? 0,
        rank: 1,
        isMainAccount: index === 0,
        startingPosition: ['East', 'South', 'West', 'North'][index] as 'East' | 'South' | 'West' | 'North',
      }));

      // 順位計算（合計収支ベース）
      const sortedPlayers = [...playersData].sort((a, b) => b.finalScore - a.finalScore);
      let currentRank = 0;
      let lastScore: number | null = null;
      sortedPlayers.forEach((p) => {
        if (lastScore === null || p.finalScore < lastScore) {
          currentRank += 1;
          lastScore = p.finalScore;
        }
        const originalIndex = playersData.findIndex(x => x.name === p.name && x.isMainAccount === p.isMainAccount);
        playersData[originalIndex].rank = currentRank;
      });

      const gameRecord = {
        accountId: user.id,
        date: gameDate.toISOString(),
        location: '',
        gameType: '東南戦' as const,
        rules: {
          startingPoints: ruleConfig.startingPoints,
          uma: ruleConfig.uma.join('/'),
          oka: (ruleConfig.returnPoints - ruleConfig.startingPoints) * 4,
          riichiStick: 1000,
          honbaValue: 300,
          tobiBonusEnabled: ruleConfig.tobiBonusEnabled,
          tobiBonus: ruleConfig.tobiBonus,
        },
        players: playersData,
        rounds,
        finalRiichiSticks: 0,
        finalHonba: 0,
        memo: '',
        gameEndCondition: 'normal' as const,
      };

      if (isEditMode && editGameData) {
        await GameService.updateGame(user.id, editGameData.id, { ...gameRecord, id: editGameData.id });
      } else {
        await GameService.addGame(gameRecord);
      }

      Alert.alert('保存完了', undefined, [{
        text: 'OK',
        onPress: () => {
          resetForm();
          router.push('/(tabs)/history');
        },
      }]);
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 順位バッジの色を取得
  const getRankColor = (rank: 1 | 2 | 3 | 4 | null): string => {
    if (rank === null) return '#E5E7EB';
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
    return colors[rank - 1];
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ヘッダー（グリーンバー） */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerCenter} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>
            {gameDate.getFullYear()}年{gameDate.getMonth() + 1}月{gameDate.getDate()}日の対局
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowRuleSettings(true)}>
          <Settings size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ルール表示 */}
      <View style={styles.ruleBar}>
        <TouchableOpacity style={styles.ruleChip} onPress={() => setShowRuleSettings(true)}>
          <Text style={styles.ruleChipText}>{ruleConfig.startingPoints}/{ruleConfig.returnPoints}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ruleChip} onPress={() => setShowRuleSettings(true)}>
          <Text style={styles.ruleChipText}>{ruleConfig.uma.join('/')}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* スコアテーブル */}
          <View style={styles.scoreTable}>
            {/* プレイヤーヘッダー */}
            <View style={styles.tableRow}>
              <View style={styles.rowLabel} />
              {players.map((name, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.playerCell}
                  onPress={() => setEditingPlayerIndex(idx)}
                >
                  {editingPlayerIndex === idx ? (
                    <TextInput
                      style={styles.playerNameInput}
                      value={name}
                      onChangeText={(text) => {
                        const newPlayers = [...players];
                        newPlayers[idx] = text;
                        setPlayers(newPlayers);
                      }}
                      onBlur={() => setEditingPlayerIndex(null)}
                      autoFocus
                      selectTextOnFocus
                    />
                  ) : (
                    <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 各半荘 */}
            {Array.from({ length: hanchanCount }).map((_, hIndex) => {
              const { scores, ranks, isTobi } = getCalculatedResults(hIndex);
              const rawScoreRow = rawScores[hIndex];

              return (
                <View key={hIndex}>
                  {/* 素点入力行 */}
                  <View style={styles.tableRow}>
                    <View style={styles.rowLabel}>
                      <Text style={styles.hanchanNumber}>{hIndex + 1}</Text>
                      {validationResults[hIndex] === true && (
                        <View style={styles.validationIcon}>
                          <Check size={14} color="#10B981" />
                        </View>
                      )}
                      {validationResults[hIndex] === false && (
                        <View style={styles.validationIconError}>
                          <X size={14} color="#EF4444" />
                        </View>
                      )}
                    </View>
                    {(() => {
                      // 4人全員入力済みかの判定（ループ外で1回だけ計算）
                      const allPlayersEntered = rawScoreRow.every(s => s !== '');

                      return rawScoreRow.map((rawScore, pIndex) => {
                        const isActive = activeCell?.hanchan === hIndex && activeCell?.player === pIndex;
                        const displayScore = scores[pIndex];
                        const rank = ranks[pIndex];
                        const playerIsTobi = ruleConfig.tobiBonusEnabled && isTobi[pIndex];
                        const isTobiWinner = ruleConfig.tobiBonusEnabled && tobiWinners[hIndex].includes(pIndex);

                        return (
                        <TouchableOpacity
                          key={pIndex}
                          style={[
                            styles.scoreCell,
                            isActive && styles.scoreCellActive,
                            playerIsTobi && styles.scoreCellTobi,
                            isTobiWinner && styles.scoreCellTobiWinner,
                          ]}
                          onPress={() => handleCellPress(hIndex, pIndex)}
                          onLongPress={() => {
                            // 飛び賞が無効、または飛んだ本人は選択不可
                            if (!ruleConfig.tobiBonusEnabled || playerIsTobi) return;

                            setTobiWinners(prev => {
                              const newWinners = [...prev];
                              const currentWinners = [...newWinners[hIndex]];

                              if (currentWinners.includes(pIndex)) {
                                // 選択解除
                                newWinners[hIndex] = currentWinners.filter(i => i !== pIndex);
                              } else {
                                // 選択追加
                                newWinners[hIndex] = [...currentWinners, pIndex];
                              }

                              return newWinners;
                            });
                          }}
                        >
                          {rawScore ? (
                            <>
                              {/* 素点表示 */}
                              <View style={styles.rawScoreRow}>
                                <Text style={styles.rawScoreText}>{rawScore}</Text>
                                {playerIsTobi && (
                                  <Text style={styles.tobiMark}>飛</Text>
                                )}
                                {isTobiWinner && (
                                  <Text style={styles.tobiWinnerMark}>飛</Text>
                                )}
                              </View>

                              {/* 順位と精算点（全員入力済みの場合のみ表示） */}
                              {allPlayersEntered && (
                                <View style={styles.calculatedRow}>
                                  {rank !== null && (
                                    <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
                                      <Text style={styles.rankText}>{rank}</Text>
                                    </View>
                                  )}
                                  <Text style={[
                                    styles.calculatedScore,
                                    displayScore !== null && displayScore > 0 && styles.positiveScore,
                                    displayScore !== null && displayScore < 0 && styles.negativeScore,
                                  ]}>
                                    {formatScore(displayScore)}
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            /* プレースホルダー */
                            <Text style={styles.placeholderText}>-</Text>
                          )}
                        </TouchableOpacity>
                      );
                    });
                    })()}
                  </View>
                </View>
              );
            })}

            {/* 半荘追加ボタン */}
            {hanchanCount < 8 && (
              <TouchableOpacity style={styles.addHanchanBtn} onPress={addHanchan}>
                <Text style={styles.addHanchanText}>+ 半荘を追加</Text>
              </TouchableOpacity>
            )}

            {/* 合計行 */}
            <View style={[styles.tableRow, styles.totalRow]}>
              <View style={styles.rowLabel}>
                <Text style={styles.totalLabel}>計</Text>
              </View>
              {getTotalScores().map((total, idx) => (
                <View key={idx} style={styles.totalCell}>
                  <Text style={[
                    styles.totalScore,
                    total !== null && total > 0 && styles.positiveScore,
                    total !== null && total < 0 && styles.negativeScore,
                  ]}>
                    {formatScore(total)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* 保存ボタン */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (loading || hasValidationError) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={loading || hasValidationError}
          >
            <Text style={styles.saveButtonText}>
              {hasValidationError ? '合計エラーがあります' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* カスタムキーボード */}
        {showCustomKeyboard && (
          <Animated.View
            style={[
              styles.keyboardContainer,
              {
                transform: [{
                  translateY: keyboardAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [280, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.keyboardOverlay}
              activeOpacity={1}
              onPress={() => handleKeyboardInput('ok')}
            />
            <View style={styles.keyboard}>
              <View style={styles.keyboardHeader}>
                <Text style={styles.keyboardTitle}>素点入力</Text>
                {(() => {
                  // 自動入力ボタンの表示判定
                  if (!activeCell) return null;
                  const rawScoreRow = rawScores[activeCell.hanchan];

                  // ケース1: 3人入力済み、1人未入力（既存のロジック）
                  const target = detectAutoCompleteTarget(rawScoreRow);
                  const canAutoComplete = target !== null && target.targetIndex === activeCell.player;

                  if (canAutoComplete && target) {
                    const fourthScore = calculateFourthPlayerScore(
                      target.filledScores,
                      ruleConfig.startingPoints * 4
                    );

                    return (
                      <TouchableOpacity
                        style={styles.autoCompleteButtonContainer}
                        onPress={() => {
                          handleAutoComplete(activeCell.hanchan, activeCell.player);
                          handleKeyboardInput('ok');
                        }}
                      >
                        <Text style={styles.autoCompleteButtonText}>
                          自動入力 {fourthScore !== null ? (fourthScore >= 0 ? `+${fourthScore}` : fourthScore) : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  // ケース2: 4人全員入力済みだが、検証エラーがある場合（新規ロジック）
                  const allEntered = rawScoreRow.every(s => s !== '');
                  const hasValidationError = validationResults[activeCell.hanchan] === false;
                  const activeCellHasValue = rawScoreRow[activeCell.player] !== '';

                  if (allEntered && hasValidationError && activeCellHasValue) {
                    // アクティブセル以外の3人の素点を取得
                    const otherScores = rawScoreRow
                      .map((s, idx) => idx === activeCell.player ? null : autoCompleteRawScore(s))
                      .filter((s): s is number => s !== null);

                    if (otherScores.length === 3) {
                      const correctScore = calculateFourthPlayerScore(
                        otherScores,
                        ruleConfig.startingPoints * 4
                      );

                      return (
                        <TouchableOpacity
                          style={styles.autoCompleteButtonContainer}
                          onPress={() => {
                            if (correctScore !== null) {
                              const newRawScores = [...rawScores];
                              newRawScores[activeCell.hanchan][activeCell.player] = String(correctScore);
                              setRawScores(newRawScores);
                              handleKeyboardInput('ok');
                            }
                          }}
                        >
                          <Text style={styles.autoCompleteButtonText}>
                            自動入力 {correctScore !== null ? (correctScore >= 0 ? `+${correctScore}` : correctScore) : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  }

                  return null;
                })()}
                <TouchableOpacity onPress={() => handleKeyboardInput('clear')}>
                  <Text style={styles.clearButton}>クリア</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.keyboardDisplay}>
                <Text style={styles.keyboardDisplayText}>
                  {inputValue ? inputValue + '00' : '00'}
                </Text>
              </View>
              <View style={styles.keyboardButtons}>
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'backspace'].map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={styles.keyboardButton}
                    onPress={() => handleKeyboardInput(key)}
                  >
                    <Text style={styles.keyboardButtonText}>
                      {key === 'backspace' ? '←' : key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.keyboardOkButton}
                onPress={() => handleKeyboardInput('ok')}
              >
                <Text style={styles.keyboardOkText}>OK</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>

      {/* 日付ピッカー */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>完了</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={gameDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setGameDate(date)}
                locale="ja-JP"
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={gameDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setGameDate(date);
            }}
          />
        )
      )}

      {/* ルール設定モーダル */}
      <Modal visible={showRuleSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.ruleSettingsModal}>
            <Text style={styles.ruleSettingsTitle}>ルール設定</Text>

            <View style={styles.ruleSettingsRow}>
              <Text style={styles.ruleSettingsLabel}>開始持ち点</Text>
              <TextInput
                style={styles.ruleSettingsInput}
                value={String(ruleConfig.startingPoints)}
                onChangeText={(t) => setRuleConfig({ ...ruleConfig, startingPoints: parseInt(t) || 25000 })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.ruleSettingsRow}>
              <Text style={styles.ruleSettingsLabel}>返し点</Text>
              <TextInput
                style={styles.ruleSettingsInput}
                value={String(ruleConfig.returnPoints)}
                onChangeText={(t) => setRuleConfig({ ...ruleConfig, returnPoints: parseInt(t) || 30000 })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.ruleSettingsRow}>
              <Text style={styles.ruleSettingsLabel}>ウマ (1位/2位/3位/4位)</Text>
            </View>
            <View style={styles.umaRow}>
              {ruleConfig.uma.map((val, idx) => (
                <TextInput
                  key={idx}
                  style={styles.umaInput}
                  value={String(val)}
                  onChangeText={(t) => {
                    const newUma = [...ruleConfig.uma] as [number, number, number, number];
                    newUma[idx] = parseInt(t) || 0;
                    setRuleConfig({ ...ruleConfig, uma: newUma });
                  }}
                  keyboardType="numbers-and-punctuation"
                />
              ))}
            </View>

            {/* 飛び賞ON/OFFチェックボックス */}
            <View style={styles.ruleSettingsRow}>
              <Text style={styles.ruleSettingsLabel}>飛び賞を使用</Text>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  ruleConfig.tobiBonusEnabled && styles.checkboxChecked
                ]}
                onPress={() => setRuleConfig({
                  ...ruleConfig,
                  tobiBonusEnabled: !ruleConfig.tobiBonusEnabled
                })}
              >
                {ruleConfig.tobiBonusEnabled && (
                  <Check size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* 飛び賞の点数入力（チェックボックスONの場合のみ有効） */}
            <View style={styles.ruleSettingsRow}>
              <Text style={[
                styles.ruleSettingsLabel,
                !ruleConfig.tobiBonusEnabled && styles.disabledText
              ]}>
                飛び賞の点数
              </Text>
              <TextInput
                style={[
                  styles.ruleSettingsInput,
                  !ruleConfig.tobiBonusEnabled && styles.disabledInput
                ]}
                value={String(ruleConfig.tobiBonus)}
                onChangeText={(t) => setRuleConfig({
                  ...ruleConfig,
                  tobiBonus: parseInt(t) || 0
                })}
                keyboardType="number-pad"
                editable={ruleConfig.tobiBonusEnabled}
              />
            </View>

            <TouchableOpacity
              style={styles.ruleSettingsCloseBtn}
              onPress={() => setShowRuleSettings(false)}
            >
              <Text style={styles.ruleSettingsCloseText}>反映する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
  },
  headerCenter: {
    flex: 1,
  },
  dateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  ruleBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    backgroundColor: '#FF6B35',
  },
  ruleChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ruleChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scoreTable: {
    margin: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowLabel: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 12,
  },
  hanchanNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  validationIcon: {
    marginTop: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    padding: 2,
  },
  validationIconError: {
    marginTop: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    padding: 2,
  },
  playerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minHeight: 48,
  },
  playerName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  playerNameInput: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B35',
    paddingVertical: 2,
    minWidth: 50,
  },
  scoreCell: {
    flex: 1,
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  scoreCellActive: {
    backgroundColor: '#ECFDF5',
  },
  scoreCellTobi: {
    backgroundColor: '#FEF2F2',
  },
  scoreCellTobiWinner: {
    backgroundColor: '#F0FDF4',
  },
  rawScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rawScoreText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tobiMark: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tobiWinnerMark: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  calculatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  calculatedScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  positiveScore: {
    color: '#10B981',
  },
  negativeScore: {
    color: '#EF4444',
  },
  placeholderText: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  addHanchanBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addHanchanText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  totalRow: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  totalCell: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  totalScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  keyboardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardOverlay: {
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  keyboard: {
    backgroundColor: '#F9FAFB',
    paddingBottom: 34,
  },
  keyboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  keyboardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  autoCompleteButtonContainer: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCompleteButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    color: '#EF4444',
  },
  keyboardDisplay: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  keyboardDisplayText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
    color: '#111827',
  },
  keyboardButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  keyboardButton: {
    width: '33.33%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  keyboardButtonText: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '500',
  },
  keyboardOkButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  keyboardOkText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerDone: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  ruleSettingsModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  ruleSettingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  ruleSettingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleSettingsLabel: {
    fontSize: 14,
    color: '#374151',
  },
  ruleSettingsInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'right',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  umaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  umaInput: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  ruleSettingsCloseBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ruleSettingsCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});