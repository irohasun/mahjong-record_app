import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountService } from './AccountService';

const AD_VIEWS_KEY = 'mahjong_ad_views';
const FREE_GAME_LIMIT = 3;

export class MonetizationService {
  static async canAddGame(): Promise<boolean> {
    try {
      const account = await AccountService.getAccount();
      
      if (account.isPremium) {
        return true;
      }
      
      const monthlyCount = await AccountService.getMonthlyGameCount();
      return monthlyCount < FREE_GAME_LIMIT;
    } catch (error) {
      console.error('Failed to check game limit:', error);
      return false;
    }
  }

  static async isPremium(): Promise<boolean> {
    try {
      const account = await AccountService.getAccount();
      return account.isPremium;
    } catch (error) {
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  static async getMonthlyGameCount(): Promise<number> {
    try {
      return await AccountService.getMonthlyGameCount();
    } catch (error) {
      console.error('Failed to get monthly game count:', error);
      return 0;
    }
  }

  static async incrementGameCount(): Promise<void> {
    try {
      await AccountService.incrementMonthlyGameCount();
    } catch (error) {
      console.error('Failed to increment game count:', error);
    }
  }

  static async recordAdView(): Promise<void> {
    try {
      const adViews = await AsyncStorage.getItem(AD_VIEWS_KEY);
      const views = adViews ? JSON.parse(adViews) : [];
      
      views.push({
        timestamp: new Date().toISOString(),
        type: 'game_limit',
      });
      
      await AsyncStorage.setItem(AD_VIEWS_KEY, JSON.stringify(views));
    } catch (error) {
      console.error('Failed to record ad view:', error);
    }
  }

  static async purchasePremium(): Promise<boolean> {
    try {
      // 実際の課金処理はここに実装
      // RevenueCatやApp Store課金APIを使用
      
      // 一時的に成功として扱う
      await AccountService.setPremium(true);
      return true;
    } catch (error) {
      console.error('Failed to purchase premium:', error);
      return false;
    }
  }

  static async restorePurchase(): Promise<boolean> {
    try {
      // 実際の復元処理はここに実装
      // RevenueCatやApp Store課金APIを使用
      
      // 一時的に失敗として扱う
      return false;
    } catch (error) {
      console.error('Failed to restore purchase:', error);
      return false;
    }
  }
}