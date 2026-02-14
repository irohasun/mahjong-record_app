/**
 * TDD: 4人目の素点自動計算テスト
 *
 * 要件:
 * - 3人分の素点入力が完了したら、4人目を自動計算
 * - 合計が100000 (= 25000 * 4) になるように計算
 * - 入力済みプレイヤーを正しく検出
 */

import {
  calculateFourthPlayerScore,
  detectAutoCompleteTarget,
  DEFAULT_RULE_CONFIG,
} from '@/utils/ScoreCalculator';

describe('calculateFourthPlayerScore', () => {
  const totalPoints = DEFAULT_RULE_CONFIG.startingPoints * 4; // 100000

  describe('正常系: 3人分の素点から4人目を計算', () => {
    it('3人分の素点合計が75000の場合、4人目は25000', () => {
      const threeScores = [25000, 25000, 25000];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(25000);
    });

    it('3人分の素点合計が65000の場合、4人目は35000', () => {
      const threeScores = [30000, 20000, 15000];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(35000);
    });

    it('4人目がマイナス（飛び）になるケース', () => {
      const threeScores = [50000, 40000, 20000];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(-10000);
    });

    it('4人目が0になるケース', () => {
      const threeScores = [50000, 30000, 20000];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(0);
    });

    it('大きな偏りがあるケース（1人が大勝ち）', () => {
      const threeScores = [80000, 10000, 5000];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(5000);
    });

    it('百点単位の素点を正しく計算する', () => {
      const threeScores = [31100, 24500, 18900];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(25500);
    });
  });

  describe('カスタム合計点数', () => {
    it('合計120000のルール（30000点持ち）', () => {
      const customTotal = 30000 * 4; // 120000
      const threeScores = [30000, 30000, 30000];
      const result = calculateFourthPlayerScore(threeScores, customTotal);
      expect(result).toBe(30000);
    });
  });

  describe('エッジケース', () => {
    it('入力が3人未満の場合はnullを返す', () => {
      const result = calculateFourthPlayerScore([25000, 25000], totalPoints);
      expect(result).toBeNull();
    });

    it('空配列の場合はnullを返す', () => {
      const result = calculateFourthPlayerScore([], totalPoints);
      expect(result).toBeNull();
    });

    it('入力が4人以上の場合はnullを返す（既に全員入力済み）', () => {
      const result = calculateFourthPlayerScore(
        [25000, 25000, 25000, 25000],
        totalPoints
      );
      expect(result).toBeNull();
    });

    it('全員0点の場合（3人が0なら4人目は100000）', () => {
      const threeScores = [0, 0, 0];
      const result = calculateFourthPlayerScore(threeScores, totalPoints);
      expect(result).toBe(100000);
    });
  });
});

describe('detectAutoCompleteTarget', () => {
  describe('正常系: 未入力プレイヤーの検出', () => {
    it('4人目だけが未入力の場合、index 3を返す', () => {
      const rawScores = ['25000', '30000', '20000', ''];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toEqual({
        targetIndex: 3,
        filledScores: [25000, 30000, 20000],
      });
    });

    it('1人目だけが未入力の場合、index 0を返す', () => {
      const rawScores = ['', '30000', '20000', '25000'];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toEqual({
        targetIndex: 0,
        filledScores: [30000, 20000, 25000],
      });
    });

    it('2人目だけが未入力の場合、index 1を返す', () => {
      const rawScores = ['25000', '', '20000', '30000'];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toEqual({
        targetIndex: 1,
        filledScores: [25000, 20000, 30000],
      });
    });

    it('3人目だけが未入力の場合、index 2を返す', () => {
      const rawScores = ['25000', '30000', '', '20000'];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toEqual({
        targetIndex: 2,
        filledScores: [25000, 30000, 20000],
      });
    });
  });

  describe('自動補完が不要/不可能なケース', () => {
    it('全員入力済みの場合はnullを返す', () => {
      const rawScores = ['25000', '30000', '20000', '25000'];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toBeNull();
    });

    it('2人以上未入力の場合はnullを返す', () => {
      const rawScores = ['25000', '', '', '25000'];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toBeNull();
    });

    it('全員未入力の場合はnullを返す', () => {
      const rawScores = ['', '', '', ''];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toBeNull();
    });

    it('1人だけ入力済みの場合はnullを返す', () => {
      const rawScores = ['25000', '', '', ''];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toBeNull();
    });
  });

  describe('素点文字列のパース', () => {
    it('下2桁"00"が付いた素点文字列を正しくパースする', () => {
      // 実際のアプリでは "350" + "00" = "35000" という形式で保存される
      const rawScores = ['35000', '24500', '15500', ''];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toEqual({
        targetIndex: 3,
        filledScores: [35000, 24500, 15500],
      });
    });

    it('数値に変換できない文字列がある場合はnullを返す', () => {
      const rawScores = ['abc', '25000', '25000', ''];
      const result = detectAutoCompleteTarget(rawScores);
      expect(result).toBeNull();
    });
  });
});

describe('統合テスト: detectAutoCompleteTarget + calculateFourthPlayerScore', () => {
  const totalPoints = DEFAULT_RULE_CONFIG.startingPoints * 4;

  it('3人入力後に4人目を自動計算するフロー', () => {
    const rawScores = ['35000', '24500', '15500', ''];

    const target = detectAutoCompleteTarget(rawScores);
    expect(target).not.toBeNull();

    if (target) {
      const fourthScore = calculateFourthPlayerScore(
        target.filledScores,
        totalPoints
      );
      expect(fourthScore).toBe(25000); // 100000 - 35000 - 24500 - 15500 = 25000
      expect(target.targetIndex).toBe(3);
    }
  });

  it('1人目が未入力で他3人入力済みのフロー', () => {
    const rawScores = ['', '30000', '20000', '25000'];

    const target = detectAutoCompleteTarget(rawScores);
    expect(target).not.toBeNull();

    if (target) {
      const firstScore = calculateFourthPlayerScore(
        target.filledScores,
        totalPoints
      );
      expect(firstScore).toBe(25000); // 100000 - 30000 - 20000 - 25000 = 25000
      expect(target.targetIndex).toBe(0);
    }
  });

  it('飛びが発生するケースのフロー', () => {
    const rawScores = ['50000', '40000', '', '20000'];

    const target = detectAutoCompleteTarget(rawScores);
    expect(target).not.toBeNull();

    if (target) {
      const thirdScore = calculateFourthPlayerScore(
        target.filledScores,
        totalPoints
      );
      expect(thirdScore).toBe(-10000); // 100000 - 50000 - 40000 - 20000 = -10000
      expect(target.targetIndex).toBe(2);
    }
  });
});
