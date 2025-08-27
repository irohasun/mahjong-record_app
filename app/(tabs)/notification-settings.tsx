import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Clock, Calendar, Trophy, ArrowLeft, TestTube } from 'lucide-react-native';
import { NotificationService, NotificationSettings } from '@/services/NotificationService';
import { ensureAuthenticated } from '@/utils/authUtils';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    gameReminders: true,
    weeklyStats: true,
    monthlyStats: true,
    achievementNotifications: true,
    reminderTime: '20:00',
    reminderDays: [1, 3, 5],
  });
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🔔 DEBUG: Loading notification settings...');
      
      // 権限状態を確認
      const permissionStatus = await NotificationService.checkPermissionStatus();
      setPermissionGranted(permissionStatus === 'granted');
      
      // 設定を読み込み
      const savedSettings = await NotificationService.getSettings();
      setSettings(savedSettings);
      
      console.log('✅ DEBUG: Settings loaded:', savedSettings);
    } catch (error) {
      console.error('❌ DEBUG: Failed to load settings:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: any) => {
    try {
      console.log('🔔 DEBUG: Updating setting:', key, value);
      
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      // 通知の有効/無効が変更された場合
      if (key === 'enabled') {
        if (value && !permissionGranted) {
          // 通知の許可状態を再確認
          const currentStatus = await NotificationService.checkPermissionStatus();
          if (currentStatus !== 'granted') {
            // 許可を要求
            const newStatus = await NotificationService.requestPermissionAgain();
            if (newStatus !== 'granted') {
              Alert.alert(
                '権限が必要', 
                '通知を有効にするには、通知の権限を許可してください。\n\n設定アプリで通知の許可を有効にすることもできます。'
              );
              setSettings({ ...newSettings, enabled: false });
              return;
            }
            setPermissionGranted(true);
          } else {
            setPermissionGranted(true);
          }
        }
      }
      
      await NotificationService.saveSettings(newSettings);
      console.log('✅ DEBUG: Setting updated successfully');
    } catch (error) {
      console.error('❌ DEBUG: Failed to update setting:', error);
      Alert.alert('エラー', '設定の更新に失敗しました');
    }
  };

  const handleReminderTimeChange = async (time: string) => {
    try {
      console.log('🔔 DEBUG: Updating reminder time:', time);
      
      const newSettings = { ...settings, reminderTime: time };
      setSettings(newSettings);
      await NotificationService.saveSettings(newSettings);
      
      console.log('✅ DEBUG: Reminder time updated successfully');
    } catch (error) {
      console.error('❌ DEBUG: Failed to update reminder time:', error);
      Alert.alert('エラー', 'リマインダー時間の更新に失敗しました');
    }
  };

  const handleRequestPermission = async () => {
    try {
      console.log('🔔 DEBUG: User requested permission again...');
      const status = await NotificationService.requestPermissionAgain();
      
      if (status === 'granted') {
        setPermissionGranted(true);
        Alert.alert('成功', '通知の許可が付与されました！');
      } else {
        Alert.alert('権限が拒否されました', '通知を有効にするには、設定アプリで通知の許可を有効にしてください。');
      }
    } catch (error) {
      console.error('❌ DEBUG: Failed to request permission:', error);
      Alert.alert('エラー', '権限の要求に失敗しました');
    }
  };

  const handleReminderDayToggle = async (day: number) => {
    try {
      console.log('🔔 DEBUG: Toggling reminder day:', day);
      
      const currentDays = settings.reminderDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      
      const newSettings = { ...settings, reminderDays: newDays };
      setSettings(newSettings);
      await NotificationService.saveSettings(newSettings);
      
      console.log('✅ DEBUG: Reminder days updated successfully');
    } catch (error) {
      console.error('❌ DEBUG: Failed to update reminder days:', error);
      Alert.alert('エラー', 'リマインダー曜日の更新に失敗しました');
    }
  };

  const handleTestNotification = async () => {
    try {
      console.log('🔔 DEBUG: Sending test notification...');
      
      await NotificationService.sendTestNotification();
      Alert.alert('テスト通知', 'テスト通知を送信しました。通知が表示されることを確認してください。');
      
      console.log('✅ DEBUG: Test notification sent successfully');
    } catch (error) {
      console.error('❌ DEBUG: Failed to send test notification:', error);
      Alert.alert('エラー', 'テスト通知の送信に失敗しました');
    }
  };

  const getDayLabel = (day: number): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[day];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>設定を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 通知の許可状態 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知の許可状態</Text>
          
          <View style={styles.permissionStatus}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Bell size={20} color={permissionGranted ? "#10B981" : "#EF4444"} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  {permissionGranted ? '通知が許可されています' : '通知が許可されていません'}
                </Text>
                <Text style={styles.settingSubtitle}>
                  {permissionGranted 
                    ? 'アプリからの通知を受信できます' 
                    : '通知を受信するには、通知の許可が必要です'
                  }
                </Text>
              </View>
            </View>
            
            {!permissionGranted && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={handleRequestPermission}
              >
                <Text style={styles.permissionButtonText}>許可を要求</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!permissionGranted && (
            <View style={styles.permissionHelp}>
              <Text style={styles.permissionHelpTitle}>通知の許可を有効にする方法</Text>
              <Text style={styles.permissionHelpText}>
                1. 設定アプリを開く{'\n'}
                2. 「通知」をタップ{'\n'}
                3. 「麻雀記録アプリ」をタップ{'\n'}
                4. 「通知を許可」をオンにする
              </Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  Alert.alert(
                    '設定アプリを開く',
                    '設定アプリで通知の許可を有効にしてください。',
                    [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '設定を開く', onPress: () => {
                        // iOSの設定アプリを開く
                        if (Platform.OS === 'ios') {
                          Linking.openURL('app-settings:');
                        }
                      }}
                    ]
                  );
                }}
              >
                <Text style={styles.settingsButtonText}>設定アプリを開く</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 通知の重要性説明 */}
        {!permissionGranted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>通知の重要性</Text>
            <View style={styles.importanceContent}>
              <Text style={styles.importanceText}>
                通知を有効にすることで、以下の機能が利用できます：
              </Text>
              <View style={styles.importanceList}>
                <Text style={styles.importanceItem}>• 対局リマインダー（定期的な対局の思い出し）</Text>
                <Text style={styles.importanceItem}>• 週次・月次統計の通知</Text>
                <Text style={styles.importanceItem}>• アチーブメント達成の通知</Text>
                <Text style={styles.importanceItem}>• 重要なアプリ更新情報</Text>
              </View>
            </View>
          </View>
        )}

        {/* 通知の有効/無効 */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Bell size={20} color="#3B82F6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>通知を有効にする</Text>
                <Text style={styles.settingSubtitle}>
                  {settings.enabled ? '通知が有効になっています' : '通知が無効になっています'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleSettingChange('enabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
              thumbColor={settings.enabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {settings.enabled && (
          <>
            {/* ゲームリマインダー */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ゲームリマインダー</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Clock size={20} color="#10B981" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>対局リマインダー</Text>
                    <Text style={styles.settingSubtitle}>定期的に対局を思い出させる</Text>
                  </View>
                </View>
                <Switch
                  value={settings.gameReminders}
                  onValueChange={(value) => handleSettingChange('gameReminders', value)}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor={settings.gameReminders ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>

              {settings.gameReminders && (
                <>
                  {/* リマインダー時間 */}
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <View style={styles.settingIcon}>
                        <Clock size={20} color="#F59E0B" />
                      </View>
                      <View style={styles.settingContent}>
                        <Text style={styles.settingTitle}>リマインダー時間</Text>
                        <Text style={styles.settingSubtitle}>通知を送信する時間</Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.reminderTime}
                      onChangeText={handleReminderTimeChange}
                      placeholder="20:00"
                      placeholderTextColor="#9CA3AF"
                      maxLength={5}
                    />
                  </View>

                  {/* リマインダー曜日 */}
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <View style={styles.settingIcon}>
                        <Calendar size={20} color="#8B5CF6" />
                      </View>
                      <View style={styles.settingContent}>
                        <Text style={styles.settingTitle}>リマインダー曜日</Text>
                        <Text style={styles.settingSubtitle}>通知を送信する曜日</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.daysContainer}>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButton,
                          (settings.reminderDays || []).includes(day) && styles.dayButtonActive
                        ]}
                        onPress={() => handleReminderDayToggle(day)}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          (settings.reminderDays || []).includes(day) && styles.dayButtonTextActive
                        ]}>
                          {getDayLabel(day)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* 統計通知 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>統計通知</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Calendar size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>週次統計</Text>
                    <Text style={styles.settingSubtitle}>毎週月曜日に週次統計を通知</Text>
                  </View>
                </View>
                <Switch
                  value={settings.weeklyStats}
                  onValueChange={(value) => handleSettingChange('weeklyStats', value)}
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                  thumbColor={settings.weeklyStats ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Calendar size={20} color="#10B981" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>月次統計</Text>
                    <Text style={styles.settingSubtitle}>毎月1日に月次統計を通知</Text>
                  </View>
                </View>
                <Switch
                  value={settings.monthlyStats}
                  onValueChange={(value) => handleSettingChange('monthlyStats', value)}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor={settings.monthlyStats ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* 実績通知 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>実績通知</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Trophy size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>実績解除通知</Text>
                    <Text style={styles.settingSubtitle}>実績を解除した際に通知</Text>
                  </View>
                </View>
                <Switch
                  value={settings.achievementNotifications}
                  onValueChange={(value) => handleSettingChange('achievementNotifications', value)}
                  trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
                  thumbColor={settings.achievementNotifications ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* テスト通知 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>テスト</Text>
              
              <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
                <TestTube size={20} color="#FFFFFF" />
                <Text style={styles.testButtonText}>テスト通知を送信</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 通知が無効の場合の説明 */}
        {!settings.enabled && (
          <View style={styles.section}>
            <View style={styles.infoContainer}>
              <Bell size={24} color="#6B7280" />
              <Text style={styles.infoText}>
                通知を有効にすると、対局リマインダーや統計通知を受け取ることができます。
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    textAlign: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionHelp: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  permissionHelpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  permissionHelpText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 12,
  },
  settingsButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  settingsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  importanceContent: {
    paddingVertical: 8,
  },
  importanceText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  importanceList: {
    marginLeft: 8,
  },
  importanceItem: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
