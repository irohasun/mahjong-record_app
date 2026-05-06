import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated, Modal, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Check, X, Camera } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ShareCard from '@/components/ShareCard';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { GameService } from '@/services/GameService';
import { GroupService } from '@/services/GroupService';
import { ensureAuthenticated } from '@/utils/authUtils';
import { AccountService } from '@/services/AccountService';
import { LocalStorageService } from '@/services/LocalStorageService';
import { notifyGamesChanged } from '@/utils/cacheInvalidation';
import { StorageService } from '@/services/StorageService';
import PlayerAvatar from '@/components/PlayerAvatar';
import { GameDraft } from '@/types/GameRecord';
import {
  RuleConfig,
  DEFAULT_RULE_CONFIG,
  DEFAULT_SANMA_CONFIG,
  calculateAllScores,
  autoCompleteRawScore,
  formatScore,
  validateTotalScore,
  calculateFourthPlayerScore,
  detectAutoCompleteTarget,
} from '@/utils/ScoreCalculator';

const MAX_HANCHAN_COUNT = 20;

export default function AddGameScreen() {
  const router = useRouter();
  const keyboardAnimation = useRef(new Animated.Value(0)).current;
  const ruleSheetAnimation = useRef(new Animated.Value(0)).current;
  const shareCardRef = useRef<View>(null);

  // 基本状態
  const [gameDate, setGameDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [players, setPlayers] = useState(['', 'P2', 'P3', 'P4']);
  const [loading, setLoading] = useState(false);

  // 写真関連
  const [gamePhoto, setGamePhoto] = useState<string | null>(null);
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);

  // ルール設定
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);
  const [showRuleSettings, setShowRuleSettings] = useState(false);
  const [tempRuleConfig, setTempRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);
  // 入力中の生テキスト（parseInt || 0 で途中クリアができなくなるため別管理）
  const [tobiBonusText, setTobiBonusText] = useState(String(DEFAULT_RULE_CONFIG.tobiBonus));
  const [chipValueText, setChipValueText] = useState(String(DEFAULT_RULE_CONFIG.chipValue));
  const [showTieUma, setShowTieUma] = useState(false);

  // モーダルが開いたときにテキスト状態を同期
  useEffect(() => {
    if (showRuleSettings) {
      setTobiBonusText(String(tempRuleConfig.tobiBonus));
      setChipValueText(String(tempRuleConfig.chipValue));
    }
  }, [showRuleSettings]);

  // playerCount のショートカット
  const playerCount = ruleConfig.playerCount;

  // 半荘データ
  // rawScores[hanchanIndex][playerIndex] = 素点（文字列）
  const [hanchanCount, setHanchanCount] = useState(5);
  const [rawScores, setRawScores] = useState<string[][]>(
    Array(MAX_HANCHAN_COUNT).fill(null).map(() => Array(4).fill(''))
  );

  // 飛ばしたプレイヤーのデータ
  const [tobiWinners, setTobiWinners] = useState<number[][]>(
    Array(MAX_HANCHAN_COUNT).fill(null).map(() => [])
  );

  // チップ枚数（プレイヤーごと）
  const [chips, setChips] = useState<string[]>(['', '', '', '']);

  // チップ入力用のアクティブセル
  const [activeChipCell, setActiveChipCell] = useState<number | null>(null);

  // 入力中のセル
  const [activeCell, setActiveCell] = useState<{ hanchan: number; player: number } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);

  // プレイヤー名編集
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);

  // アバターURL
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [playerAvatarUrls, setPlayerAvatarUrls] = useState<(string | null)[]>([null, null, null, null]);

  // グループ対戦パラメータ
  const { groupMatchPlayers, groupMatchPlayerCount, groupMatchGroupId, groupMatchGroupName } =
    useLocalSearchParams<{
      groupMatchPlayers?: string;
      groupMatchPlayerCount?: string;
      groupMatchGroupId?: string;
      groupMatchGroupName?: string;
    }>();

  // 画面フォーカス時のドラフト復元 or グループ対戦初期化
  useFocusEffect(
    useCallback(() => {
      if (groupMatchPlayers) {
        initGroupMatch(groupMatchPlayers, groupMatchPlayerCount);
      } else {
        setPlayerAvatarUrls([null, null, null, null]);
        loadDraft();
      }
    }, [groupMatchPlayers, groupMatchPlayerCount])
  );

  // グループ対戦初期化
  const initGroupMatch = async (playersParam: string, countParam?: string) => {
    try {
      const parsed: { name: string; avatarUrl: string | null }[] = JSON.parse(playersParam);
      const pc = (parseInt(countParam ?? '4') as 3 | 4) === 3 ? 3 : 4;
      const config = pc === 3 ? DEFAULT_SANMA_CONFIG : DEFAULT_RULE_CONFIG;
      resetForm(config);
      setPlayers(parsed.map((p) => p.name));
      const urls = parsed.map((p) => p.avatarUrl);
      setPlayerAvatarUrls(urls);
      setMyAvatarUrl(urls[0] ?? null);
    } catch {
      loadDraft();
    }
  };

  // ドラフト復元
  const loadDraft = async () => {
    try {
      const draft = await LocalStorageService.getGameDraft();
      if (draft) {
        const pc = draft.ruleConfig.playerCount ?? 4; // playerCountが未定義の場合は4人麻雀として扱う

        // rawScoresの配列長をplayerCountに合わせて調整
        const adjustedRawScores = draft.rawScores.map(row => {
          if (!row) {
            // rowがnullまたはundefinedの場合は空配列を作成
            return Array(pc).fill('');
          }
          if (row.length === pc) {
            // 長さが一致している場合はそのまま使用
            return row;
          } else if (row.length < pc) {
            // 足りない場合は空文字列で埋める（3人→4人の場合）
            return [...row, ...Array(pc - row.length).fill('')];
          } else {
            // 多い場合は切り詰める（4人→3人の場合）
            // 注意: データ損失の可能性があるが、プレイヤー人数切り替え時は
            // resetFormが呼ばれて全データがリセットされるため、通常は発生しない
            return row.slice(0, pc);
          }
        });

        // chipsの配列長をplayerCountに合わせて調整
        const adjustedChips = !draft.chips
          ? Array(pc).fill('')
          : draft.chips.length === pc
            ? draft.chips
            : draft.chips.length < pc
              ? [...draft.chips, ...Array(pc - draft.chips.length).fill('')]
              : draft.chips.slice(0, pc);

        // tobiWinnersのインデックスをplayerCount範囲内に調整
        const adjustedTobiWinners = draft.tobiWinners.map(winners =>
          winners ? winners.filter(idx => idx < pc) : []
        );

        // playersの長さも調整
        const adjustedPlayers = !draft.players
          ? (pc === 3 ? ['', 'P2', 'P3'] : ['', 'P2', 'P3', 'P4'])
          : draft.players.length === pc
            ? draft.players
            : draft.players.length < pc
              ? [...draft.players, ...Array(pc - draft.players.length).fill('').map((_, i) => `P${draft.players.length + i + 1}`)]
              : draft.players.slice(0, pc);

        // P1は常にアカウント名と同期する
        let finalPlayers = adjustedPlayers;
        try {
          const { account } = await AccountService.getAccount();
          if (account.username) {
            finalPlayers = [account.username, ...adjustedPlayers.slice(1)];
          }
          if (account.avatar_url) {
            const url = await StorageService.getPublicUrl(account.avatar_url);
            setMyAvatarUrl(url);
          }
        } catch { }

        setGameDate(new Date());
        setPlayers(finalPlayers);
        setRuleConfig({ ...draft.ruleConfig, playerCount: pc });
        setHanchanCount(draft.hanchanCount);
        setRawScores(adjustedRawScores);
        setTobiWinners(adjustedTobiWinners);
        setChips(adjustedChips);
      } else {
        // ドラフトがない場合は初期化
        resetForm();
        try {
          const { account } = await AccountService.getAccount();
          const defaultNames = playerCount === 3
            ? [account.username || '', 'P2', 'P3']
            : [account.username || '', 'P2', 'P3', 'P4'];
          setPlayers(defaultNames);
          if (account.avatar_url) {
            const url = await StorageService.getPublicUrl(account.avatar_url);
            setMyAvatarUrl(url);
          }
        } catch { }
      }
    } catch (error) {
      // エラー時は初期化
      resetForm();
    }
  };

  // フォームリセット
  const resetForm = (config?: RuleConfig) => {
    // デフォルトは4人麻雀（config未指定時）
    const resetConfig = config ?? DEFAULT_RULE_CONFIG;
    const pc = resetConfig.playerCount;
    const defaultNames = pc === 3 ? ['', 'P2', 'P3'] : ['', 'P2', 'P3', 'P4'];
    setGameDate(new Date());
    setHanchanCount(5);
    setRawScores(Array(MAX_HANCHAN_COUNT).fill(null).map(() => Array(pc).fill('')));
    setTobiWinners(Array(MAX_HANCHAN_COUNT).fill(null).map(() => []));
    setPlayers(defaultNames);
    setRuleConfig(resetConfig);
    setChips(Array(pc).fill(''));
    setActiveChipCell(null);
    setActiveCell(null);
    setShowCustomKeyboard(false);
    setEditingPlayerIndex(null);

    // ドラフトをクリア
    LocalStorageService.clearGameDraft().catch(() => {});
  };


  // 写真選択
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', '写真ライブラリへのアクセス許可が必要です');
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
    } catch (error) {
      console.error('写真選択エラー:', error);
      Alert.alert('エラー', '写真の選択に失敗しました');
    }
  };

  // 写真削除
  const handleRemovePhoto = () => {
    setGamePhoto(null);
    setUploadedPhotoPath(null);
  };

  // ドラフトの自動保存（デバウンス付き）
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // タイマーをクリア
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    // 500ms後に保存
    draftTimerRef.current = setTimeout(async () => {
      try {
        const draft: GameDraft = {
          gameDate: gameDate.toISOString(),
          players,
          ruleConfig,
          hanchanCount,
          rawScores,
          tobiWinners,
          chips,
          savedAt: new Date().toISOString(),
        };
        await LocalStorageService.saveGameDraft(draft);
      } catch (error) {
        // silent failure
      }
    }, 500);

    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [gameDate, players, ruleConfig, hanchanCount, rawScores, tobiWinners, chips]);

  // 各半荘の計算結果を取得
  const getCalculatedResults = useCallback((hanchanIndex: number) => {
    const scores = rawScores[hanchanIndex].map(s => {
      const completed = autoCompleteRawScore(s);
      return completed;
    });

    // 飛ばしたプレイヤー情報を渡す
    const winners = tobiWinners[hanchanIndex];
    const result = calculateAllScores(scores, ruleConfig, winners);

    // 配列長がplayerCountと一致していることを確認
    // 一致していない場合は、playerCount分に調整
    if (result.scores.length !== playerCount) {
      const adjustedScores = Array(playerCount).fill(null).map((_, i) =>
        i < result.scores.length ? result.scores[i] : null
      );
      const adjustedRanks = Array(playerCount).fill(null).map((_, i) =>
        i < result.ranks.length ? result.ranks[i] : null
      );
      const adjustedIsTobi = Array(playerCount).fill(false).map((_, i) =>
        i < result.isTobi.length ? result.isTobi[i] : false
      );
      return { scores: adjustedScores, ranks: adjustedRanks, isTobi: adjustedIsTobi };
    }

    return result;
  }, [rawScores, ruleConfig, tobiWinners, playerCount]);

  // 各半荘の検証結果を計算
  const validationResults = useMemo(() => {
    return Array(MAX_HANCHAN_COUNT).fill(null).map((_, index) => {
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

  // チップ精算点を計算
  const getChipScores = useCallback((): number[] => {
    if (!ruleConfig.chipEnabled) return Array(playerCount).fill(0);
    return chips.map(c => {
      const n = parseInt(c, 10);
      return isNaN(n) ? 0 : n * ruleConfig.chipValue;
    });
  }, [chips, ruleConfig.chipEnabled, ruleConfig.chipValue, playerCount]);

  // 半荘のみの合計収支を計算（チップ除く）
  const getHanchanOnlyTotals = useCallback((): number[] => {
    const totals = Array(playerCount).fill(0);
    for (let h = 0; h < hanchanCount; h++) {
      const { scores } = getCalculatedResults(h);
      scores.forEach((s, i) => {
        if (s !== null) totals[i] += s;
      });
    }
    return totals;
  }, [hanchanCount, getCalculatedResults, playerCount]);

  // 合計収支を計算
  const getTotalScores = useCallback((): (number | null)[] => {
    const totals = getHanchanOnlyTotals() as (number | null)[];
    // チップ精算点を加算
    const chipScores = getChipScores();
    return totals.map((t, i) => (t !== null ? t + chipScores[i] : null));
  }, [getHanchanOnlyTotals, getChipScores]);

  // 共有テキストを生成
  const buildShareText = useCallback(() => {
    const dateStr = `${gameDate.getFullYear()}年${gameDate.getMonth() + 1}月${gameDate.getDate()}日`;
    const totals = getTotalScores();
    const ranked = players.slice(0, playerCount)
      .map((name, i) => ({ name: name || `P${i + 1}`, total: totals[i] ?? 0 }))
      .sort((a, b) => b.total - a.total);
    const rankLabels = ['1位', '2位', '3位', '4位'];
    const lines = ranked.map((p, i) => {
      const sign = p.total > 0 ? '+' : '';
      return `${rankLabels[i]} ${p.name}: ${sign}${p.total.toFixed(1)}`;
    });
    return [`🀄 ${dateStr}の対局（${hanchanCount}半荘）`, '', ...lines].join('\n');
  }, [gameDate, players, playerCount, hanchanCount, getTotalScores]);

  const handleShare = useCallback(async () => {
    if (showCustomKeyboard) {
      setShowCustomKeyboard(false);
      Animated.timing(keyboardAnimation, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      const text = buildShareText();
      if (Platform.OS === 'ios') {
        await Share.share({ message: text, url: uri });
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('エラー', '共有に失敗しました');
    }
  }, [showCustomKeyboard, keyboardAnimation, buildShareText]);

  const handleOpenRuleSettings = useCallback(() => {
    setTempRuleConfig(ruleConfig);
    ruleSheetAnimation.setValue(0);
    setShowRuleSettings(true);
    Animated.spring(ruleSheetAnimation, {
      toValue: 1,
      damping: 20,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [ruleConfig, ruleSheetAnimation]);

  const handleCloseRuleSettings = useCallback((discard = false) => {
    if (discard) setTempRuleConfig(ruleConfig);
    Animated.timing(ruleSheetAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setShowRuleSettings(false));
  }, [ruleSheetAnimation, ruleConfig]);

  // 保存可能かチェック（エラーがある半荘がないか）
  const hasValidationError = useMemo(() => {
    return validationResults.some((result, index) => {
      // 使用中の半荘でエラーがある場合
      return index < hanchanCount && result === false;
    });
  }, [validationResults, hanchanCount]);

  // チップセルタップ時
  const handleChipCellPress = (playerIndex: number) => {
    setActiveCell(null);
    setActiveChipCell(playerIndex);
    const currentValue = chips[playerIndex];
    setInputValue(currentValue);
    setShowCustomKeyboard(true);
    Animated.timing(keyboardAnimation, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // セルタップ時
  const handleCellPress = (hanchanIndex: number, playerIndex: number) => {
    setActiveChipCell(null);
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
    // チップ入力モード
    if (activeChipCell !== null) {
      if (key === 'backspace') {
        const newValue = inputValue.slice(0, -1);
        setInputValue(newValue);
        setChips(prev => {
          const newChips = [...prev];
          newChips[activeChipCell] = newValue;
          return newChips;
        });
      } else if (key === 'ok') {
        Animated.timing(keyboardAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setShowCustomKeyboard(false);
          setActiveChipCell(null);
          setInputValue('');
        });
      } else if (key === 'clear') {
        setInputValue('');
        setChips(prev => {
          const newChips = [...prev];
          newChips[activeChipCell] = '';
          return newChips;
        });
      } else if (key === '-') {
        if (inputValue.startsWith('-')) {
          const newValue = inputValue.slice(1);
          setInputValue(newValue);
          setChips(prev => {
            const newChips = [...prev];
            newChips[activeChipCell] = newValue;
            return newChips;
          });
        } else {
          const newValue = '-' + inputValue;
          setInputValue(newValue);
          setChips(prev => {
            const newChips = [...prev];
            newChips[activeChipCell] = newValue;
            return newChips;
          });
        }
      } else {
        // 数字入力（最大3桁、マイナス時4文字）
        const maxLength = inputValue.startsWith('-') ? 4 : 3;
        if (inputValue.length < maxLength) {
          const newValue = inputValue + key;
          setInputValue(newValue);
          setChips(prev => {
            const newChips = [...prev];
            newChips[activeChipCell] = newValue;
            return newChips;
          });
        }
      }
      return;
    }

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
    const target = detectAutoCompleteTarget(rawScoreRow, playerCount);

    if (target !== null && target.targetIndex === playerIndex) {
      const totalPoints = ruleConfig.startingPoints * playerCount;
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
  }, [rawScores, ruleConfig.startingPoints, playerCount]);

  // 半荘追加
  const addHanchan = () => {
    if (hanchanCount < MAX_HANCHAN_COUNT) {
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

      // 保存前のバリデーション
      // 1. rawScores配列の長さチェック
      const invalidRawScores = rawScores.some(row => row.length !== playerCount);
      if (invalidRawScores) {
        console.error('rawScores配列の長さがplayerCountと不一致:', {
          playerCount,
          rawScoresLengths: rawScores.map(row => row.length)
        });
        Alert.alert('エラー', 'データの整合性に問題があります。画面を再読み込みしてください。');
        return;
      }

      // 2. chips配列の長さチェック
      if (chips.length !== playerCount) {
        console.error('chips配列の長さがplayerCountと不一致:', {
          playerCount,
          chipsLength: chips.length
        });
        Alert.alert('エラー', 'データの整合性に問題があります。画面を再読み込みしてください。');
        return;
      }

      // 3. players配列の長さチェック
      if (players.length !== playerCount) {
        console.error('players配列の長さがplayerCountと不一致:', {
          playerCount,
          playersLength: players.length
        });
        Alert.alert('エラー', 'データの整合性に問題があります。画面を再読み込みしてください。');
        return;
      }

      // 各半荘のデータを構築
      const rounds: any[] = [];
      for (let h = 0; h < hanchanCount; h++) {
        const { scores } = getCalculatedResults(h);

        // scoresの長さがplayerCountと一致していることを再確認
        if (scores.length !== playerCount) {
          console.error(`半荘${h + 1}のscores配列の長さがplayerCountと不一致:`, {
            playerCount,
            scoresLength: scores.length,
            scores
          });
          Alert.alert('エラー', `半荘${h + 1}のデータに問題があります。`);
          return;
        }

        // 有効なスコアがある半荘のみ保存
        const hasValidScore = scores.some(s => s !== null);
        if (hasValidScore) {
          const rawScoreValues = rawScores[h].map(s => autoCompleteRawScore(s) ?? 0);
          const memoData: Record<string, unknown> = {};
          if (tobiWinners[h].length > 0) {
            memoData.tobiWinners = tobiWinners[h];
          }
          memoData.rawScores = rawScoreValues;

          rounds.push({
            round: `半荘${h + 1}`,
            honba: 0,
            riichiSticks: 0,
            handType: 'draw' as const,
            points: scores.map(s => s ?? 0),
            memo: Object.keys(memoData).length > 0 ? JSON.stringify(memoData) : undefined,
          });
        }
      }

      // プレイヤーデータ構築
      const totalScores = getTotalScores();

      // totalScoresの長さもplayerCountと一致していることを確認
      if (totalScores.length !== playerCount) {
        console.error('totalScores配列の長さがplayerCountと不一致:', {
          playerCount,
          totalScoresLength: totalScores.length
        });
        Alert.alert('エラー', '合計スコアの計算に問題があります。');
        return;
      }

      const positions = ['East', 'South', 'West', 'North'].slice(0, playerCount);
      const playersData = players.map((name, index) => ({
        name: name || `P${index + 1}`,
        finalScore: totalScores[index] ?? 0,
        rank: 1,
        isMainAccount: index === 0,
        startingPosition: positions[index] as 'East' | 'South' | 'West' | 'North',
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

      // チップ枚数を数値配列に変換
      const chipCounts = ruleConfig.chipEnabled
        ? chips.map(c => { const n = parseInt(c, 10); return isNaN(n) ? 0 : n; })
        : undefined;

      // chipCountsの長さもplayerCountと一致していることを確認
      if (chipCounts && chipCounts.length !== playerCount) {
        console.error('chipCounts配列の長さがplayerCountと不一致:', {
          playerCount,
          chipCountsLength: chipCounts.length
        });
        Alert.alert('エラー', 'チップデータに問題があります。');
        return;
      }

      // 写真アップロード処理（新規の場合のみ）
      let finalPhotoPath = uploadedPhotoPath; // 既存写真を保持
      if (gamePhoto && gamePhoto.startsWith('file://')) {
        // 新規アップロード
        try {
          const tempGameId = `game-${Date.now()}`;
          const uploadedPath = await StorageService.uploadGamePhoto(user.id, tempGameId, gamePhoto);
          finalPhotoPath = uploadedPath;
        } catch (photoError) {
          console.error('写真アップロードエラー:', photoError);
          // 写真アップロード失敗時は確認ダイアログを表示
          const shouldContinue = await new Promise<boolean>(resolve => {
            Alert.alert(
              '写真アップロード失敗',
              '写真のアップロードに失敗しました。写真なしで保存しますか？',
              [
                { text: 'キャンセル', onPress: () => resolve(false), style: 'cancel' },
                { text: '保存', onPress: () => resolve(true) },
              ]
            );
          });
          if (!shouldContinue) {
            setLoading(false);
            return;
          }
          finalPhotoPath = null;
        }
      }

      const gameRecord = {
        accountId: user.id,
        date: gameDate.toISOString(),
        location: '',
        gameType: '東南戦' as const,
        rules: {
          startingPoints: ruleConfig.startingPoints,
          uma: ruleConfig.uma.join('/'),
          oka: (ruleConfig.returnPoints - ruleConfig.startingPoints) * playerCount,
          riichiStick: 1000,
          honbaValue: 300,
          tobiBonusEnabled: ruleConfig.tobiBonusEnabled,
          tobiBonus: ruleConfig.tobiBonus,
          chipEnabled: ruleConfig.chipEnabled,
          chipValue: ruleConfig.chipValue,
          playerCount: playerCount,
        },
        players: playersData,
        rounds,
        finalRiichiSticks: 0,
        finalHonba: 0,
        memo: '',
        gameEndCondition: 'normal' as const,
        photoPath: finalPhotoPath || undefined,
        chipCounts,
      };

      // 新規作成モード
      const savedGame = await GameService.addGame(gameRecord);
      // グループ対戦の場合、game_groups に紐付け
      if (groupMatchGroupId) {
        await GroupService.linkGameToGroup(savedGame.id, groupMatchGroupId).catch((err) => {
          console.error('グループ紐付けエラー:', err);
        });
      }
      // ドラフトを削除
      await LocalStorageService.clearGameDraft().catch(() => {});
      // キャッシュ無効化（履歴画面の再取得をトリガー）
      notifyGamesChanged();
      Alert.alert('保存完了', undefined, [{
        text: 'OK',
        onPress: () => {
          resetForm();
          router.push('/(tabs)/history');
        },
      }]);
    } catch (error) {
      // エラーの詳細をログに記録
      console.error('保存エラーの詳細:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // より具体的なエラーメッセージを表示
      const errorMessage = error instanceof Error
        ? error.message
        : '保存に失敗しました';
      Alert.alert('エラー', errorMessage);
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
      <Animated.View
        style={[
          { flex: 1 },
          {
            transform: [{
              scale: ruleSheetAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.92],
              }),
            }],
          },
        ]}
      >
      {/* ヘッダー（グリーンバー） */}
      <View style={styles.headerBar}>
        {/* 左側: 日付 */}
        <TouchableOpacity style={styles.headerCenter} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>
            {gameDate.getFullYear()}年{gameDate.getMonth() + 1}月{gameDate.getDate()}日の対局
          </Text>
          {groupMatchGroupName && (
            <Text style={styles.groupMatchTag}>{groupMatchGroupName}</Text>
          )}
        </TouchableOpacity>

        {/* 右側: シェア＋カメラ＋ルールアイコン */}
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M3 19 C3 10 9 7 15 7 L15 3 L22 11 L15 19 L15 15 C9 15 5 17 3 19 Z"
                stroke="#FF6B35"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePickPhoto}
          >
            {(gamePhoto || uploadedPhotoPath) ? (
              <Image
                source={{ uri: gamePhoto || uploadedPhotoPath || '' }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <Camera size={20} color="#FF6B35" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleOpenRuleSettings}>
            <Book size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} stickyHeaderIndices={[0]}>
          {/* スティッキープレイヤーヘッダー (index 0) */}
          <View style={styles.playerHeaderContainer}>
            <View style={styles.tableRow}>
              <View style={styles.rowLabel} />
              {players.map((name, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.playerCell}
                  onPress={() => setEditingPlayerIndex(idx)}
                >
                  <PlayerAvatar
                    name={name || `P${idx + 1}`}
                    avatarUrl={playerAvatarUrls[idx] ?? (idx === 0 ? myAvatarUrl : null)}
                    size={32}
                  />
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
          </View>

          {/* スコアテーブル本体 */}
          <View style={styles.scoreTableBody}>
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
            {hanchanCount < MAX_HANCHAN_COUNT && (
              <TouchableOpacity style={styles.addHanchanBtn} onPress={addHanchan}>
                <Text style={styles.addHanchanText}>+ 半荘を追加</Text>
              </TouchableOpacity>
            )}

            {/* 半荘計行（チップ有効時のみ） */}
            {ruleConfig.chipEnabled && (
              <View style={[styles.tableRow, styles.subtotalRow]}>
                <View style={styles.rowLabel}>
                  <Text style={styles.subtotalLabel}>半荘計</Text>
                </View>
                {getHanchanOnlyTotals().map((total, idx) => (
                  <View key={idx} style={styles.subtotalCell}>
                    <Text style={[
                      styles.subtotalScore,
                      total > 0 && styles.positiveScore,
                      total < 0 && styles.negativeScore,
                    ]}>
                      {total > 0 ? `+${total.toFixed(1)}` : total.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* チップ行（チップ有効時のみ） */}
            {ruleConfig.chipEnabled && (
              <>
                <View style={[styles.tableRow, styles.subtotalRow]}>
                  <View style={styles.rowLabel}>
                    <Text style={styles.chipLabel}>チップ</Text>
                  </View>
                  {chips.map((chipValue, pIndex) => {
                    const isActive = activeChipCell === pIndex;
                    const chipNum = parseInt(chipValue, 10);
                    const chipScore = isNaN(chipNum) ? 0 : chipNum * ruleConfig.chipValue;
                    return (
                      <TouchableOpacity
                        key={pIndex}
                        style={[
                          styles.chipCell,
                          isActive && styles.scoreCellActive,
                        ]}
                        onPress={() => handleChipCellPress(pIndex)}
                      >
                        {chipValue !== '' ? (
                          <>
                            <Text style={styles.chipCountText}>
                              {chipNum > 0 ? `+${chipNum}枚` : `${chipNum}枚`}
                            </Text>
                            <Text style={[
                              styles.subtotalScore,
                              chipScore > 0 && styles.positiveScore,
                              chipScore < 0 && styles.negativeScore,
                            ]}>
                              {chipScore > 0 ? `+${chipScore}` : `${chipScore}`}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.placeholderText}>-</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
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
                <Text style={styles.keyboardTitle}>{activeChipCell !== null ? 'チップ枚数入力' : '素点入力'}</Text>
                {(() => {
                  // チップ自動入力ボタンの表示判定
                  if (activeChipCell !== null) {
                    const chipTarget = detectAutoCompleteTarget(chips, playerCount);
                    const canAutoCompleteChip = chipTarget !== null && chipTarget.targetIndex === activeChipCell;

                    if (canAutoCompleteChip && chipTarget) {
                      const fourthChip = calculateFourthPlayerScore(chipTarget.filledScores, 0);
                      return (
                        <TouchableOpacity
                          style={fourthChip !== null && fourthChip >= 0 ? styles.autoCompleteButtonContainerPositive : styles.autoCompleteButtonContainerNegative}
                          onPress={() => {
                            if (fourthChip !== null) {
                              setChips(prev => {
                                const newChips = [...prev];
                                newChips[activeChipCell] = String(fourthChip);
                                return newChips;
                              });
                              handleKeyboardInput('ok');
                            }
                          }}
                        >
                          <Text style={fourthChip !== null && fourthChip >= 0 ? styles.autoCompleteButtonTextPositive : styles.autoCompleteButtonTextNegative}>
                            自動入力 {fourthChip !== null ? (fourthChip >= 0 ? `+${fourthChip}` : fourthChip) : ''}枚
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    // 全員入力済みだが合計が0でない場合
                    const allChipsEntered = chips.every(c => c !== '');
                    if (allChipsEntered && chips[activeChipCell] !== '') {
                      const otherChips = chips
                        .map((c, idx) => idx === activeChipCell ? null : parseInt(c, 10))
                        .filter((c): c is number => c !== null && !isNaN(c));
                      if (otherChips.length === playerCount - 1) {
                        const chipSum = otherChips.reduce((a, b) => a + b, 0);
                        const correctChip = -chipSum;
                        const currentChip = parseInt(chips[activeChipCell], 10);
                        if (isNaN(currentChip) || currentChip !== correctChip) {
                          return (
                            <TouchableOpacity
                              style={correctChip >= 0 ? styles.autoCompleteButtonContainerPositive : styles.autoCompleteButtonContainerNegative}
                              onPress={() => {
                                setChips(prev => {
                                  const newChips = [...prev];
                                  newChips[activeChipCell] = String(correctChip);
                                  return newChips;
                                });
                                handleKeyboardInput('ok');
                              }}
                            >
                              <Text style={correctChip >= 0 ? styles.autoCompleteButtonTextPositive : styles.autoCompleteButtonTextNegative}>
                                自動入力 {correctChip >= 0 ? `+${correctChip}` : correctChip}枚
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      }
                    }

                    return null;
                  }

                  // 素点の自動入力ボタンの表示判定
                  if (!activeCell) return null;
                  const rawScoreRow = rawScores[activeCell.hanchan];

                  // ケース1: N-1人入力済み、1人未入力
                  const target = detectAutoCompleteTarget(rawScoreRow, playerCount);
                  const canAutoComplete = target !== null && target.targetIndex === activeCell.player;

                  if (canAutoComplete && target) {
                    const fourthScore = calculateFourthPlayerScore(
                      target.filledScores,
                      ruleConfig.startingPoints * playerCount
                    );

                    return (
                      <TouchableOpacity
                        style={fourthScore !== null && fourthScore >= 0 ? styles.autoCompleteButtonContainerPositive : styles.autoCompleteButtonContainerNegative}
                        onPress={() => {
                          handleAutoComplete(activeCell.hanchan, activeCell.player);
                          handleKeyboardInput('ok');
                        }}
                      >
                        <Text style={fourthScore !== null && fourthScore >= 0 ? styles.autoCompleteButtonTextPositive : styles.autoCompleteButtonTextNegative}>
                          自動入力 {fourthScore !== null ? (fourthScore >= 0 ? `+${fourthScore}` : fourthScore) : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  // ケース2: 全員入力済みだが、検証エラーがある場合
                  const allEntered = rawScoreRow.every(s => s !== '');
                  const hasValidationError = validationResults[activeCell.hanchan] === false;
                  const activeCellHasValue = rawScoreRow[activeCell.player] !== '';

                  if (allEntered && hasValidationError && activeCellHasValue) {
                    // アクティブセル以外のプレイヤーの素点を取得
                    const otherScores = rawScoreRow
                      .map((s, idx) => idx === activeCell.player ? null : autoCompleteRawScore(s))
                      .filter((s): s is number => s !== null);

                    if (otherScores.length === playerCount - 1) {
                      const correctScore = calculateFourthPlayerScore(
                        otherScores,
                        ruleConfig.startingPoints * playerCount
                      );

                      return (
                        <TouchableOpacity
                          style={correctScore !== null && correctScore >= 0 ? styles.autoCompleteButtonContainerPositive : styles.autoCompleteButtonContainerNegative}
                          onPress={() => {
                            if (correctScore !== null) {
                              const newRawScores = [...rawScores];
                              newRawScores[activeCell.hanchan][activeCell.player] = String(correctScore);
                              setRawScores(newRawScores);
                              handleKeyboardInput('ok');
                            }
                          }}
                        >
                          <Text style={correctScore !== null && correctScore >= 0 ? styles.autoCompleteButtonTextPositive : styles.autoCompleteButtonTextNegative}>
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
                  {activeChipCell !== null
                    ? (inputValue || '0') + '枚'
                    : (inputValue ? inputValue + '00' : '00')
                  }
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
      </Animated.View>

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

      {/* ルール設定シート（アニメーション付き） */}
      {showRuleSettings && (
        <>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: '#000',
                opacity: ruleSheetAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.45],
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => handleCloseRuleSettings(true)}
            />
          </Animated.View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.ruleSettingsModal,
                {
                  transform: [{
                    translateY: ruleSheetAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.ruleSettingsTitle}>ルール設定</Text>

              {/* 4人麻雀 / 3人麻雀 切り替え */}
              <View style={styles.playerCountSegment}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    playerCount === 4 && styles.segmentButtonActive,
                  ]}
                  onPress={() => {
                    if (playerCount === 4) return;
                    Alert.alert(
                      '4人麻雀に切り替え',
                      '入力データがリセットされます。よろしいですか？',
                      [
                        {
                          text: '切り替え',
                          onPress: () => {
                            resetForm(DEFAULT_RULE_CONFIG);
                            handleCloseRuleSettings();
                          },
                        },
                        { text: 'キャンセル', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Text style={[
                    styles.segmentText,
                    playerCount === 4 && styles.segmentTextActive,
                  ]}>4人麻雀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    playerCount === 3 && styles.segmentButtonActive,
                  ]}
                  onPress={() => {
                    if (playerCount === 3) return;
                    Alert.alert(
                      '3人麻雀に切り替え',
                      '入力データがリセットされます。よろしいですか？',
                      [
                        {
                          text: '切り替え',
                          onPress: () => {
                            resetForm(DEFAULT_SANMA_CONFIG);
                            handleCloseRuleSettings();
                          },
                        },
                        { text: 'キャンセル', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Text style={[
                    styles.segmentText,
                    playerCount === 3 && styles.segmentTextActive,
                  ]}>3人麻雀</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ruleSettingsRow}>
                <Text style={styles.ruleSettingsLabel}>開始持ち点</Text>
                <TextInput
                  style={styles.ruleSettingsInput}
                  value={String(tempRuleConfig.startingPoints)}
                  onChangeText={(t) => setTempRuleConfig({ ...tempRuleConfig, startingPoints: parseInt(t) || 25000 })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.ruleSettingsRow}>
                <Text style={styles.ruleSettingsLabel}>返し点</Text>
                <TextInput
                  style={styles.ruleSettingsInput}
                  value={String(tempRuleConfig.returnPoints)}
                  onChangeText={(t) => setTempRuleConfig({ ...tempRuleConfig, returnPoints: parseInt(t) || 30000 })}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.ruleSettingsRow}
                onPress={() => playerCount === 4 && setShowTieUma(prev => !prev)}
                disabled={playerCount !== 4}
              >
                <Text style={styles.ruleSettingsLabel}>
                  ウマ ({playerCount === 3 ? '1位/2位/3位' : '1位/2位/3位/4位'})
                </Text>
                {playerCount === 4 && (
                  <Text style={styles.tieUmaChevron}>{showTieUma ? '▲' : '▼'}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.umaRow}>
                {tempRuleConfig.uma.map((val, idx) => (
                  <View key={idx} style={styles.umaInputWrapper}>
                    {idx >= 2 && <Text style={styles.umaMinusLabel}>−</Text>}
                    <TextInput
                      style={styles.umaInput}
                      value={String(Math.abs(val))}
                      onChangeText={(t) => {
                        const parsed = parseInt(t) || 0;
                        const newUma = [...tempRuleConfig.uma];
                        newUma[idx] = idx >= 2 ? -Math.abs(parsed) : parsed;
                        setTempRuleConfig({ ...tempRuleConfig, uma: newUma });
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                ))}
              </View>

              {/* 同点時ウマ（自動計算・読み取り専用） - 4人麻雀のみ */}
              {playerCount === 4 && (() => {
                const [u1, u2, u3, u4] = tempRuleConfig.uma;
                const mid23 = (u2 + u3) / 2;
                const mid34 = (u3 + u4) / 2;
                const tie23 = [u1, mid23, mid23, u4];
                const tie34 = [u1, u2, mid34, mid34];
                const fmtVal = (v: number) =>
                  Number.isInteger(v) ? Math.abs(v) : Math.abs(v).toFixed(1);
                return showTieUma && (
                      <>
                        <View style={styles.ruleSettingsRow}>
                          <Text style={styles.ruleSettingsSublabel}>同点時 (1位/2位/2位/3位)</Text>
                        </View>
                        <View style={styles.umaRow}>
                          {tie23.map((val, idx) => (
                            <View key={idx} style={[styles.umaInputWrapper, styles.umaReadOnly]}>
                              {val < 0 && <Text style={styles.umaMinusLabel}>−</Text>}
                              <Text style={styles.umaReadOnlyText}>{fmtVal(val)}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.ruleSettingsRow}>
                          <Text style={styles.ruleSettingsSublabel}>同点時 (1位/2位/3位/3位)</Text>
                        </View>
                        <View style={styles.umaRow}>
                          {tie34.map((val, idx) => (
                            <View key={idx} style={[styles.umaInputWrapper, styles.umaReadOnly]}>
                              {val < 0 && <Text style={styles.umaMinusLabel}>−</Text>}
                              <Text style={styles.umaReadOnlyText}>{fmtVal(val)}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                );
              })()}

              {/* 飛び賞の点数（ラベルタップで有効/無効切替） */}
              <View style={styles.ruleSettingsRow}>
                <TouchableOpacity
                  onPress={() => setTempRuleConfig({
                    ...tempRuleConfig,
                    tobiBonusEnabled: !tempRuleConfig.tobiBonusEnabled
                  })}
                >
                  <Text style={[
                    styles.ruleSettingsLabel,
                    !tempRuleConfig.tobiBonusEnabled && styles.toggleLabelDisabled,
                  ]}>
                    飛び賞の点数
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.ruleSettingsInput,
                    !tempRuleConfig.tobiBonusEnabled && styles.disabledInput
                  ]}
                  value={tobiBonusText}
                  onChangeText={(t) => {
                    setTobiBonusText(t);
                    setTempRuleConfig({ ...tempRuleConfig, tobiBonus: parseInt(t) || 0 });
                  }}
                  keyboardType="number-pad"
                  editable={tempRuleConfig.tobiBonusEnabled}
                />
              </View>

              {/* チップ1枚の点数（ラベルタップで有効/無効切替） */}
              <View style={styles.ruleSettingsRow}>
                <TouchableOpacity
                  onPress={() => setTempRuleConfig({
                    ...tempRuleConfig,
                    chipEnabled: !tempRuleConfig.chipEnabled
                  })}
                >
                  <Text style={[
                    styles.ruleSettingsLabel,
                    !tempRuleConfig.chipEnabled && styles.toggleLabelDisabled,
                  ]}>
                    チップ1枚の点数
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.ruleSettingsInput,
                    !tempRuleConfig.chipEnabled && styles.disabledInput
                  ]}
                  value={chipValueText}
                  onChangeText={(t) => {
                    setChipValueText(t);
                    setTempRuleConfig({ ...tempRuleConfig, chipValue: parseInt(t) || 0 });
                  }}
                  keyboardType="number-pad"
                  editable={tempRuleConfig.chipEnabled}
                />
              </View>

              <TouchableOpacity
                style={styles.ruleSettingsCloseBtn}
                onPress={() => {
                  setRuleConfig(tempRuleConfig);
                  handleCloseRuleSettings();
                }}
              >
                <Text style={styles.ruleSettingsCloseText}>反映する</Text>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </>
      )}

      {/* オフスクリーン共有カード（captureRef用） */}
      <ShareCard
        cardRef={shareCardRef}
        date={gameDate}
        groupName={groupMatchGroupName}
        players={players}
        playerCount={playerCount}
        hanchanCount={hanchanCount}
        rawScores={rawScores}
        chips={chips}
        chipEnabled={ruleConfig.chipEnabled}
        chipValue={ruleConfig.chipValue}
        getCalculatedResults={getCalculatedResults}
        getHanchanOnlyTotals={getHanchanOnlyTotals}
        getTotalScores={getTotalScores}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
  },
  groupMatchTag: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '500',
    textAlign: 'left',
    marginTop: 2,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
  },
  photoButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 40,
    height: 40,
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
  playerHeaderContainer: {
    marginHorizontal: 8,
    marginTop: 8,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  scoreTableBody: {
    marginHorizontal: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
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
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minHeight: 64,
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
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  chipCell: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  chipCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
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
  subtotalRow: {
    backgroundColor: '#F3F4F6',
  },
  subtotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  subtotalCell: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  subtotalScore: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
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
  autoCompleteButtonContainerPositive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCompleteButtonContainerNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCompleteButtonTextPositive: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  autoCompleteButtonTextNegative: {
    fontSize: 14,
    color: '#EF4444',
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
  playerCountSegment: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  segmentButtonActive: {
    backgroundColor: '#FF6B35',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  segmentTextActive: {
    color: '#FFF',
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
  toggleLabelDisabled: {
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
  umaInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  umaMinusLabel: {
    fontSize: 14,
    color: '#374151',
    marginRight: 2,
  },
  ruleSettingsSublabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  tieUmaChevron: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  umaReadOnly: {
    backgroundColor: '#F3F4F6',
  },
  umaReadOnlyText: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
  },
  umaInput: {
    flex: 1,
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