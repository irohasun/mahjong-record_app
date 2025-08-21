import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// 通知の設定を定義
export interface NotificationSettings {
  enabled: boolean;
  gameReminders: boolean;
  weeklyStats: boolean;
  monthlyStats: boolean;
  achievementNotifications: boolean;
  reminderTime?: string; // HH:mm形式
  reminderDays?: number[]; // 0-6 (日曜日-土曜日)
}

// デフォルト設定
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  gameReminders: true,
  weeklyStats: true,
  monthlyStats: true,
  achievementNotifications: true,
  reminderTime: '20:00',
  reminderDays: [1, 3, 5], // 月、水、金
};

// ストレージキー
const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: 'notification_settings',
  EXPO_PUSH_TOKEN: 'expo_push_token',
};

export class NotificationService {
  /**
   * 通知の初期化
   */
  static async initialize() {
    console.log('🔔 DEBUG: Initializing notifications...');
    
    try {
      // 通知の権限をリクエスト
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ DEBUG: Notification permission not granted');
        return false;
      }
      
      // デバイスが物理デバイスかチェック
      if (!Device.isDevice) {
        console.log('❌ DEBUG: Not a physical device, skipping push token');
        return false;
      }
      
      // Expo Push Tokenを取得
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
      });
      
      console.log('✅ DEBUG: Push token obtained:', token.data);
      
      // トークンを保存
      await AsyncStorage.setItem(STORAGE_KEYS.EXPO_PUSH_TOKEN, token.data);
      
      // 通知の動作を設定
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      return true;
    } catch (error) {
      console.error('❌ DEBUG: Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * 通知設定を取得
   */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (settingsJson) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('❌ DEBUG: Failed to get notification settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 通知設定を保存
   */
  static async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(newSettings));
      
      // 設定に応じて通知をスケジュールまたはキャンセル
      if (newSettings.enabled) {
        await this.scheduleNotifications(newSettings);
      } else {
        await this.cancelAllNotifications();
      }
      
      console.log('✅ DEBUG: Notification settings saved:', newSettings);
    } catch (error) {
      console.error('❌ DEBUG: Failed to save notification settings:', error);
      throw error;
    }
  }

  /**
   * 通知をスケジュール
   */
  static async scheduleNotifications(settings: NotificationSettings) {
    try {
      // 既存の通知をキャンセル
      await this.cancelAllNotifications();
      
      if (!settings.enabled) return;
      
      // ゲームリマインダー
      if (settings.gameReminders && settings.reminderTime) {
        await this.scheduleGameReminders(settings);
      }
      
      // 週次統計
      if (settings.weeklyStats) {
        await this.scheduleWeeklyStats();
      }
      
      // 月次統計
      if (settings.monthlyStats) {
        await this.scheduleMonthlyStats();
      }
      
      console.log('✅ DEBUG: Notifications scheduled successfully');
    } catch (error) {
      console.error('❌ DEBUG: Failed to schedule notifications:', error);
    }
  }

  /**
   * ゲームリマインダーをスケジュール
   */
  private static async scheduleGameReminders(settings: NotificationSettings) {
    if (!settings.reminderTime || !settings.reminderDays) return;
    
    const [hour, minute] = settings.reminderTime.split(':').map(Number);
    
    for (const day of settings.reminderDays) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '麻雀対局の時間です！',
          body: '今日も良い対局をしましょう。記録を忘れずに！',
          data: { type: 'game_reminder' },
        },
        trigger: {
          hour,
          minute,
          weekday: day + 1, // expo-notificationsは1-7を使用
          repeats: true,
        },
      });
    }
  }

  /**
   * 週次統計通知をスケジュール
   */
  private static async scheduleWeeklyStats() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '今週の対局結果',
        body: '今週の対局統計を確認してみましょう！',
        data: { type: 'weekly_stats' },
      },
      trigger: {
        hour: 9,
        minute: 0,
        weekday: 1, // 月曜日
        repeats: true,
      },
    });
  }

  /**
   * 月次統計通知をスケジュール
   */
  private static async scheduleMonthlyStats() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '今月の対局結果',
        body: '今月の対局統計を確認してみましょう！',
        data: { type: 'monthly_stats' },
      },
      trigger: {
        hour: 9,
        minute: 0,
        day: 1, // 毎月1日
        repeats: true,
      },
    });
  }

  /**
   * 全ての通知をキャンセル
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ DEBUG: All notifications cancelled');
    } catch (error) {
      console.error('❌ DEBUG: Failed to cancel notifications:', error);
    }
  }

  /**
   * 即座に通知を送信（テスト用）
   */
  static async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'テスト通知',
          body: '通知機能が正常に動作しています！',
          data: { type: 'test' },
        },
        trigger: null, // 即座に送信
      });
      console.log('✅ DEBUG: Test notification sent');
    } catch (error) {
      console.error('❌ DEBUG: Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * 実績通知を送信
   */
  static async sendAchievementNotification(achievement: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 実績解除！',
          body: achievement,
          data: { type: 'achievement' },
        },
        trigger: null,
      });
      console.log('✅ DEBUG: Achievement notification sent:', achievement);
    } catch (error) {
      console.error('❌ DEBUG: Failed to send achievement notification:', error);
    }
  }

  /**
   * 通知の権限状態を確認
   */
  static async checkPermissionStatus(): Promise<Notifications.PermissionStatus> {
    try {
      return await Notifications.getPermissionsAsync();
    } catch (error) {
      console.error('❌ DEBUG: Failed to check permission status:', error);
      return { status: 'undetermined', granted: false, expires: 'never' };
    }
  }

  /**
   * 通知の権限をリクエスト
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ DEBUG: Failed to request permission:', error);
      return false;
    }
  }
}
