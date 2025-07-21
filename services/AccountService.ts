import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Account } from '@/types/GameRecord';

const ACCOUNT_KEY = 'mahjong_account';

export class AccountService {
  static async getAccount(): Promise<Account> {
    try {
      const accountData = await AsyncStorage.getItem(ACCOUNT_KEY);
      
      if (accountData) {
        return JSON.parse(accountData);
      }
      
      // 新しいアカウントを作成
      const newAccount: Account = {
        accountId: uuidv4(),
        username: 'プレイヤー',
        createdDate: new Date().toISOString(),
        isPremium: false,
        monthlyGameCount: 0,
        lastResetDate: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(newAccount));
      return newAccount;
      
    } catch (error) {
      console.error('Failed to get account:', error);
      throw new Error('アカウントの取得に失敗しました');
    }
  }

  static async updateUsername(username: string): Promise<void> {
    try {
      const account = await this.getAccount();
      account.username = username;
      await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    } catch (error) {
      console.error('Failed to update username:', error);
      throw new Error('ユーザー名の更新に失敗しました');
    }
  }

  static async setPremium(isPremium: boolean): Promise<void> {
    try {
      const account = await this.getAccount();
      account.isPremium = isPremium;
      if (isPremium) {
        account.purchaseDate = new Date().toISOString();
      }
      await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    } catch (error) {
      console.error('Failed to update premium status:', error);
      throw new Error('プレミアムステータスの更新に失敗しました');
    }
  }

  static async incrementMonthlyGameCount(): Promise<void> {
    try {
      const account = await this.getAccount();
      
      // 月が変わったかチェック
      const now = new Date();
      const lastReset = new Date(account.lastResetDate);
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        account.monthlyGameCount = 0;
        account.lastResetDate = now.toISOString();
      }
      
      account.monthlyGameCount++;
      await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    } catch (error) {
      console.error('Failed to increment game count:', error);
      throw new Error('対局数の更新に失敗しました');
    }
  }

  static async getMonthlyGameCount(): Promise<number> {
    try {
      const account = await this.getAccount();
      
      // 月が変わったかチェック
      const now = new Date();
      const lastReset = new Date(account.lastResetDate);
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        return 0;
      }
      
      return account.monthlyGameCount;
    } catch (error) {
      console.error('Failed to get monthly game count:', error);
      return 0;
    }
  }

  static async resetAccount(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACCOUNT_KEY);
    } catch (error) {
      console.error('Failed to reset account:', error);
      throw new Error('アカウントのリセットに失敗しました');
    }
  }
}