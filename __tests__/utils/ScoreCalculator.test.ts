/**
 * ScoreCalculator.ts の全関数に対するユニットテスト
 */

import {
  determineRanks,
  calculateFinalScore,
  calculateAllScores,
  autoCompleteRawScore,
  formatScore,
  validateTotalScore,
  calculateFourthPlayerScore,
  detectAutoCompleteTarget,
  applyTobiBonus,
  reverseCalculateRawScores,
  DEFAULT_RULE_CONFIG,
  DEFAULT_SANMA_CONFIG,
  RuleConfig,
} from '@/utils/ScoreCalculator';

describe('determineRanks', () => {
  it('降順で正しく順位を付ける', () => {
    const result = determineRanks([40000, 30000, 20000, 10000]);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('同点は同順位になる', () => {
    const result = determineRanks([30000, 30000, 20000, 20000]);
    expect(result).toEqual([1, 1, 2, 2]);
  });

  it('全員同点の場合は全員1位', () => {
    const result = determineRanks([25000, 25000, 25000, 25000]);
    expect(result).toEqual([1, 1, 1, 1]);
  });

  it('null値がある場合はそのプレイヤーの順位もnull', () => {
    const result = determineRanks([40000, null, 20000, 10000]);
    expect(result).toEqual([1, null, 2, 3]);
  });

  it('全員nullの場合は全員null', () => {
    const result = determineRanks([null, null, null, null]);
    expect(result).toEqual([null, null, null, null]);
  });

  it('空配列の場合は空配列', () => {
    const result = determineRanks([]);
    expect(result).toEqual([]);
  });

  it('マイナス点を含む場合', () => {
    const result = determineRanks([50000, 30000, 25000, -5000]);
    expect(result).toEqual([1, 2, 3, 4]);
  });
});

describe('calculateFinalScore', () => {
  it('25000点で1位の場合、ウマ + オカ込みで45.0', () => {
    // (25000 - 30000) / 1000 + 30 + オカ20 = -5 + 30 + 20 = 45
    // オカ = (30000 - 25000) × 4 / 1000 = 20
    const result = calculateFinalScore(25000, 1);
    expect(result).toBe(45);
  });

  it('30000点で2位の場合、ウマ込みで10.0（オカなし）', () => {
    // (30000 - 30000) / 1000 + 10 = 0 + 10 = 10
    const result = calculateFinalScore(30000, 2);
    expect(result).toBe(10);
  });

  it('10000点で4位の場合、ウマ込みで-50.0（オカなし）', () => {
    // (10000 - 30000) / 1000 + (-30) = -20 + (-30) = -50
    const result = calculateFinalScore(10000, 4);
    expect(result).toBe(-50);
  });

  it('カスタムルール設定で計算できる（オカは0）', () => {
    const config: RuleConfig = {
      startingPoints: 30000,
      returnPoints: 30000,
      uma: [20, 10, -10, -20],
      tobiBonus: 10,
      tobiBonusEnabled: false,
      chipEnabled: false,
      chipValue: 2,
      playerCount: 4,
    };
    // (40000 - 30000) / 1000 + 20 + オカ0 = 10 + 20 + 0 = 30
    // オカ = (30000 - 30000) × 4 / 1000 = 0
    const result = calculateFinalScore(40000, 1, config);
    expect(result).toBe(30);
  });

  it('1位のみオカが追加される', () => {
    // デフォルト設定（25000点スタート、30000点返し）
    // オカ = (30000 - 25000) × 4 / 1000 = 20
    const rank1 = calculateFinalScore(35000, 1);
    const rank2 = calculateFinalScore(35000, 2);

    // 1位: (35000 - 30000) / 1000 + 30 + 20 = 5 + 30 + 20 = 55
    expect(rank1).toBe(55);

    // 2位: (35000 - 30000) / 1000 + 10 = 5 + 10 = 15（オカなし）
    expect(rank2).toBe(15);
  });

  it('オカの計算：20000点スタート、25000点返しの場合', () => {
    const config: RuleConfig = {
      startingPoints: 20000,
      returnPoints: 25000,
      uma: [15, 5, -5, -15],
      tobiBonus: 10,
      tobiBonusEnabled: false,
      chipEnabled: false,
      chipValue: 2,
      playerCount: 4,
    };
    // オカ = (25000 - 20000) × 4 / 1000 = 20
    // (30000 - 25000) / 1000 + 15 + 20 = 5 + 15 + 20 = 40
    const result = calculateFinalScore(30000, 1, config);
    expect(result).toBe(40);
  });
});

describe('calculateAllScores', () => {
  it('全員入力済みの場合、収支・順位・飛び判定を返す', () => {
    const rawScores = [40000, 30000, 20000, 10000];
    const result = calculateAllScores(rawScores);

    expect(result.ranks).toEqual([1, 2, 3, 4]);
    // 1位: (40000 - 30000) / 1000 + 30 + 20 = 60
    // 2位: (30000 - 30000) / 1000 + 10 = 10
    // 3位: (20000 - 30000) / 1000 + (-10) = -20
    // 4位: (10000 - 30000) / 1000 + (-30) = -50
    expect(result.scores).toEqual([60, 10, -20, -50]);
    expect(result.isTobi).toEqual([false, false, false, false]);
  });

  it('飛びプレイヤーがいる場合', () => {
    const rawScores = [60000, 30000, 15000, -5000];
    const result = calculateAllScores(rawScores);

    expect(result.isTobi).toEqual([false, false, false, true]);
  });

  it('null値がある場合はそのプレイヤーの収支もnull', () => {
    const rawScores: (number | null)[] = [40000, null, 20000, 10000];
    const result = calculateAllScores(rawScores);

    expect(result.scores[1]).toBeNull();
    expect(result.ranks[1]).toBeNull();
  });

  it('4人の収支合計が0になる（ゼロサム検証）', () => {
    const rawScores = [40000, 30000, 20000, 10000];
    const result = calculateAllScores(rawScores);
    const total = result.scores.reduce((sum, s) => (sum ?? 0) + (s ?? 0), 0);
    expect(total).toBe(0);
  });
});

describe('calculateFourthPlayerScore', () => {
  it('3人分の素点から4人目を計算する', () => {
    expect(calculateFourthPlayerScore([30000, 25000, 20000])).toBe(25000);
  });

  it('1人分のみの場合はnullを返す', () => {
    expect(calculateFourthPlayerScore([30000])).toBeNull();
  });

  it('2人分の素点から3人目を計算する（三麻）', () => {
    // 合計105000から2人分を引く
    expect(calculateFourthPlayerScore([40000, 35000], 105000)).toBe(30000);
  });

  it('カスタム合計点で計算する', () => {
    expect(calculateFourthPlayerScore([30000, 25000, 20000], 120000)).toBe(45000);
  });

  it('マイナス点になる場合も正しく計算する', () => {
    // 3人が高得点の場合、4人目はマイナスになる
    expect(calculateFourthPlayerScore([40000, 35000, 30000])).toBe(-5000);
  });
});

describe('detectAutoCompleteTarget', () => {
  it('3人入力済み、1人未入力の場合に対象を返す', () => {
    const result = detectAutoCompleteTarget(['30000', '25000', '', '20000']);
    expect(result).toEqual({ targetIndex: 2, filledScores: [30000, 25000, 20000] });
  });

  it('4人分でない場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['30000', '25000'])).toBeNull();
  });

  it('全員入力済みの場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['30000', '25000', '20000', '25000'])).toBeNull();
  });

  it('数値でない文字列がある場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['30000', 'abc', '', '20000'])).toBeNull();
  });

  it('2人以上未入力の場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['30000', '', '', '20000'])).toBeNull();
  });

  it('未入力がない（全員入力済み）場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['30000', '25000', '20000', '25000'])).toBeNull();
  });
});

describe('autoCompleteRawScore', () => {
  it('空文字はnullを返す', () => {
    expect(autoCompleteRawScore('')).toBeNull();
  });

  it('スペースのみはnullを返す', () => {
    expect(autoCompleteRawScore('   ')).toBeNull();
  });

  it('数値でない文字列はnullを返す', () => {
    expect(autoCompleteRawScore('abc')).toBeNull();
  });

  it('5桁以上はそのまま返す', () => {
    expect(autoCompleteRawScore('25000')).toBe(25000);
    expect(autoCompleteRawScore('100000')).toBe(100000);
  });

  it('4桁はそのまま返す', () => {
    expect(autoCompleteRawScore('2500')).toBe(2500);
  });

  it('3桁は100倍', () => {
    expect(autoCompleteRawScore('311')).toBe(31100);
    expect(autoCompleteRawScore('250')).toBe(25000);
  });

  it('2桁は1000倍', () => {
    expect(autoCompleteRawScore('25')).toBe(25000);
    expect(autoCompleteRawScore('10')).toBe(10000);
  });

  it('1桁は10000倍', () => {
    expect(autoCompleteRawScore('3')).toBe(30000);
    expect(autoCompleteRawScore('1')).toBe(10000);
  });

  it('マイナス値はスケーリングせずそのまま返す（飛びスコアは実際の値）', () => {
    expect(autoCompleteRawScore('-25000')).toBe(-25000);
    expect(autoCompleteRawScore('-100000')).toBe(-100000);
    expect(autoCompleteRawScore('-2500')).toBe(-2500);
    expect(autoCompleteRawScore('-1000')).toBe(-1000);
    expect(autoCompleteRawScore('-800')).toBe(-800);
    expect(autoCompleteRawScore('-311')).toBe(-311);
    expect(autoCompleteRawScore('-100')).toBe(-100);
    expect(autoCompleteRawScore('-25')).toBe(-25);
    expect(autoCompleteRawScore('-10')).toBe(-10);
    expect(autoCompleteRawScore('-3')).toBe(-3);
    expect(autoCompleteRawScore('-1')).toBe(-1);
  });
});

describe('formatScore', () => {
  it('nullは空文字を返す', () => {
    expect(formatScore(null)).toBe('');
  });

  it('正の値はプラス記号付き', () => {
    expect(formatScore(25)).toBe('+25.0');
  });

  it('負の値はマイナス記号付き', () => {
    expect(formatScore(-10)).toBe('-10.0');
  });

  it('0は符号なし', () => {
    expect(formatScore(0)).toBe('0.0');
  });

  it('小数点第1位まで表示', () => {
    expect(formatScore(25.5)).toBe('+25.5');
    expect(formatScore(-10.3)).toBe('-10.3');
  });
});

describe('validateTotalScore', () => {
  it('合計100000の場合はtrue', () => {
    expect(validateTotalScore([30000, 25000, 25000, 20000])).toBe(true);
  });

  it('合計が完全一致でない場合はfalse（100点誤差でも不許容）', () => {
    expect(validateTotalScore([30000, 25000, 25000, 20100])).toBe(false);
  });

  it('合計が誤差ある場合はfalse', () => {
    expect(validateTotalScore([30000, 25000, 25000, 20200])).toBe(false);
  });

  it('4人揃っていない場合はfalse', () => {
    expect(validateTotalScore([30000, 25000, null, 20000])).toBe(false);
  });

  it('カスタムルール設定で検証', () => {
    const config: RuleConfig = {
      startingPoints: 30000,
      returnPoints: 30000,
      uma: [20, 10, -10, -20],
      tobiBonus: 10,
      tobiBonusEnabled: false,
      chipEnabled: false,
      chipValue: 2,
      playerCount: 4,
    };
    expect(validateTotalScore([40000, 30000, 30000, 20000], config)).toBe(true);
  });
});

describe('applyTobiBonus', () => {
  it('飛びプレイヤー1人、飛ばしたプレイヤー1人の場合', () => {
    const scores = [60, 10, -20, -50];
    const isTobi = [false, false, false, true];
    const tobiWinners = [0];
    const tobiBonus = 10;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    // P1 (index 0) が飛ばしたプレイヤーなので +10
    // P4 (index 3) が飛んだので -10
    expect(result).toEqual([70, 10, -20, -60]);
  });

  it('飛びプレイヤー2人、飛ばしたプレイヤー1人の場合', () => {
    const scores = [80, 10, -40, -50];
    const isTobi = [false, false, true, true];
    const tobiWinners = [0];
    const tobiBonus = 10;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    // P1 (index 0) が飛ばしたプレイヤーなので +20 (tobiBonus × 2人)
    // P3 (index 2) が飛んだので -10
    // P4 (index 3) が飛んだので -10
    expect(result).toEqual([100, 10, -50, -60]);
  });

  it('飛びプレイヤー2人、飛ばしたプレイヤー2人の場合', () => {
    const scores = [60, 30, -40, -50];
    const isTobi = [false, false, true, true];
    const tobiWinners = [0, 1];
    const tobiBonus = 10;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    // P1とP2が飛ばしたので各自 +10 (tobiBonus × 2人 / 2人)
    // P3 (index 2) が飛んだので -10
    // P4 (index 3) が飛んだので -10
    expect(result).toEqual([70, 40, -50, -60]);
  });

  it('飛ばしたプレイヤーがいない場合はそのまま返す', () => {
    const scores = [60, 10, -20, -50];
    const isTobi = [false, false, false, true];
    const tobiWinners: number[] = [];
    const tobiBonus = 10;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    expect(result).toEqual([60, 10, -20, -50]);
  });

  it('飛び賞が0の場合はそのまま返す', () => {
    const scores = [60, 10, -20, -50];
    const isTobi = [false, false, false, true];
    const tobiWinners = [0];
    const tobiBonus = 0;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    expect(result).toEqual([60, 10, -20, -50]);
  });

  it('飛びプレイヤーがいない場合はそのまま返す', () => {
    const scores = [60, 10, -20, -50];
    const isTobi = [false, false, false, false];
    const tobiWinners = [0];
    const tobiBonus = 10;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    expect(result).toEqual([60, 10, -20, -50]);
  });

  it('null値がある場合は正しく処理する', () => {
    const scores: (number | null)[] = [60, null, -20, -50];
    const isTobi = [false, false, false, true];
    const tobiWinners = [0];
    const tobiBonus = 10;

    const result = applyTobiBonus(scores, isTobi, tobiWinners, tobiBonus);

    // P1 (index 0) が飛ばしたプレイヤーなので +10
    // P4 (index 3) が飛んだので -10
    expect(result).toEqual([70, null, -20, -60]);
  });
});

describe('calculateAllScores with tobiWinners', () => {
  it('飛び賞が有効で飛ばしたプレイヤーがいる場合、飛び賞が加算/減算される', () => {
    const rawScores = [60000, 30000, 15000, -5000];
    const config: RuleConfig = {
      ...DEFAULT_RULE_CONFIG,
      tobiBonusEnabled: true,
      tobiBonus: 10,
    };
    const tobiWinners = [0]; // P1が飛ばした

    const result = calculateAllScores(rawScores, config, tobiWinners);

    expect(result.isTobi).toEqual([false, false, false, true]);

    // P1の収支に飛び賞 +10 が加算される
    // 基本計算: (60000 - 30000) / 1000 + 30 + 20 = 80
    // 飛び賞: +10
    // 合計: 90
    expect(result.scores[0]).toBe(90);

    // P4の収支から飛び賞 -10 が減算される
    // 基本計算: (-5000 - 30000) / 1000 + (-30) = -65
    // 飛び賞: -10
    // 合計: -75
    expect(result.scores[3]).toBe(-75);
  });

  it('飛び賞が無効の場合、飛び賞は加算されない', () => {
    const rawScores = [60000, 30000, 15000, -5000];
    const config: RuleConfig = {
      ...DEFAULT_RULE_CONFIG,
      tobiBonusEnabled: false,
      tobiBonus: 10,
    };
    const tobiWinners = [0];

    const result = calculateAllScores(rawScores, config, tobiWinners);

    // 飛び賞が無効なので加算されない
    // 基本計算: (60000 - 30000) / 1000 + 30 + 20 = 80
    expect(result.scores[0]).toBe(80);
  });

  it('tobiWinnersが未指定の場合、飛び賞は加算されない', () => {
    const rawScores = [60000, 30000, 15000, -5000];
    const config: RuleConfig = {
      ...DEFAULT_RULE_CONFIG,
      tobiBonusEnabled: true,
      tobiBonus: 10,
    };

    const result = calculateAllScores(rawScores, config);

    // tobiWinnersが未指定なので飛び賞は加算されない
    expect(result.scores[0]).toBe(80);
  });
});

// ===== 3人麻雀（三麻）テスト =====

describe('三麻: DEFAULT_SANMA_CONFIG', () => {
  it('デフォルト値が正しい', () => {
    expect(DEFAULT_SANMA_CONFIG.startingPoints).toBe(35000);
    expect(DEFAULT_SANMA_CONFIG.returnPoints).toBe(40000);
    expect(DEFAULT_SANMA_CONFIG.uma).toEqual([20, 0, -20]);
    expect(DEFAULT_SANMA_CONFIG.playerCount).toBe(3);
  });
});

describe('三麻: calculateFinalScore', () => {
  it('35000点で1位の場合、ウマ + オカ込み', () => {
    // (35000 - 40000) / 1000 + 20 + オカ15 = -5 + 20 + 15 = 30
    // オカ = (40000 - 35000) × 3 / 1000 = 15
    const result = calculateFinalScore(35000, 1, DEFAULT_SANMA_CONFIG);
    expect(result).toBe(30);
  });

  it('40000点で2位の場合、ウマ0（オカなし）', () => {
    // (40000 - 40000) / 1000 + 0 = 0
    const result = calculateFinalScore(40000, 2, DEFAULT_SANMA_CONFIG);
    expect(result).toBe(0);
  });

  it('30000点で3位の場合、ウマ-20', () => {
    // (30000 - 40000) / 1000 + (-20) = -10 + (-20) = -30
    const result = calculateFinalScore(30000, 3, DEFAULT_SANMA_CONFIG);
    expect(result).toBe(-30);
  });
});

describe('三麻: calculateAllScores', () => {
  it('3人分の収支・順位を正しく計算する', () => {
    const rawScores = [50000, 35000, 20000];
    const result = calculateAllScores(rawScores, DEFAULT_SANMA_CONFIG);

    expect(result.ranks).toEqual([1, 2, 3]);
    // 1位: (50000 - 40000) / 1000 + 20 + 15 = 45
    // 2位: (35000 - 40000) / 1000 + 0 = -5
    // 3位: (20000 - 40000) / 1000 + (-20) = -40
    expect(result.scores).toEqual([45, -5, -40]);
  });

  it('3人の収支合計が0になる（ゼロサム検証）', () => {
    const rawScores = [50000, 35000, 20000];
    const result = calculateAllScores(rawScores, DEFAULT_SANMA_CONFIG);
    const total = result.scores.reduce((sum, s) => (sum ?? 0) + (s ?? 0), 0);
    expect(total).toBe(0);
  });
});

describe('三麻: validateTotalScore', () => {
  it('合計105000の場合はtrue', () => {
    expect(validateTotalScore([50000, 35000, 20000], DEFAULT_SANMA_CONFIG)).toBe(true);
  });

  it('合計が不正の場合はfalse', () => {
    expect(validateTotalScore([50000, 35000, 20100], DEFAULT_SANMA_CONFIG)).toBe(false);
  });

  it('3人揃っていない場合はfalse', () => {
    expect(validateTotalScore([50000, null, 20000], DEFAULT_SANMA_CONFIG)).toBe(false);
  });
});

describe('三麻: detectAutoCompleteTarget', () => {
  it('2人入力済み、1人未入力の場合に対象を返す', () => {
    const result = detectAutoCompleteTarget(['50000', '', '20000'], 3);
    expect(result).toEqual({ targetIndex: 1, filledScores: [50000, 20000] });
  });

  it('3人分でない場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['50000', '35000', '20000', ''], 3)).toBeNull();
  });

  it('全員入力済みの場合はnullを返す', () => {
    expect(detectAutoCompleteTarget(['50000', '35000', '20000'], 3)).toBeNull();
  });
});

describe('三麻: calculateFourthPlayerScore（残り1人計算）', () => {
  it('2人分の素点から3人目を計算する', () => {
    expect(calculateFourthPlayerScore([50000, 20000], 105000)).toBe(35000);
  });

  it('マイナス点になる場合も正しく計算する', () => {
    expect(calculateFourthPlayerScore([60000, 50000], 105000)).toBe(-5000);
  });
});

describe('reverseCalculateRawScores', () => {
  it('四麻: 精算点から素点を逆算できる（ラウンドトリップ）', () => {
    const rawScores = [40000, 30000, 20000, 10000];
    const { scores } = calculateAllScores(rawScores, DEFAULT_RULE_CONFIG);
    const reversed = reverseCalculateRawScores(scores as number[], DEFAULT_RULE_CONFIG);
    expect(reversed).toEqual(rawScores);
  });

  it('四麻: 異なる素点パターンでも逆算できる', () => {
    const rawScores = [45000, 28000, 17000, 10000];
    const { scores } = calculateAllScores(rawScores, DEFAULT_RULE_CONFIG);
    const reversed = reverseCalculateRawScores(scores as number[], DEFAULT_RULE_CONFIG);
    expect(reversed).toEqual(rawScores);
  });

  it('三麻: 精算点から素点を逆算できる', () => {
    const rawScores = [50000, 35000, 20000];
    const { scores } = calculateAllScores(rawScores, DEFAULT_SANMA_CONFIG);
    const reversed = reverseCalculateRawScores(scores as number[], DEFAULT_SANMA_CONFIG);
    expect(reversed).toEqual(rawScores);
  });

  it('飛び賞あり: tobiWinnersを渡して正しく逆算できる', () => {
    const config: RuleConfig = { ...DEFAULT_RULE_CONFIG, tobiBonusEnabled: true, tobiBonus: 10 };
    const rawScores = [50000, 30000, 25000, -5000];
    const tobiWinners = [0];
    const { scores } = calculateAllScores(rawScores, config, tobiWinners);
    const reversed = reverseCalculateRawScores(scores as number[], config, tobiWinners);
    expect(reversed).toEqual(rawScores);
  });

  it('マイナス素点を含むケースでも逆算できる', () => {
    const rawScores = [55000, 30000, 20000, -5000];
    const { scores } = calculateAllScores(rawScores, DEFAULT_RULE_CONFIG);
    const reversed = reverseCalculateRawScores(scores as number[], DEFAULT_RULE_CONFIG);
    expect(reversed).toEqual(rawScores);
  });

  it('カスタムウマ設定でも逆算できる', () => {
    const config: RuleConfig = {
      ...DEFAULT_RULE_CONFIG,
      uma: [20, 10, -10, -20],
    };
    const rawScores = [40000, 30000, 20000, 10000];
    const { scores } = calculateAllScores(rawScores, config);
    const reversed = reverseCalculateRawScores(scores as number[], config);
    expect(reversed).toEqual(rawScores);
  });
});
