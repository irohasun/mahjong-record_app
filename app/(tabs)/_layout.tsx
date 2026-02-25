import { Tabs } from 'expo-router';
import { ChartBar as BarChart3, History, Plus, User, Users } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  const colors = {
    primary: '#FF6B35',
    tabBarBackground: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    tabBarActiveColor: '#FF6B35',
    tabBarInactiveColor: colorScheme === 'dark' ? '#8E8E93' : '#6D6D70',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 0,
          height: 83,
          paddingTop: 8,
          paddingBottom: 25,
        },
        // 各タブを均等幅にして左右の偏りを解消
        tabBarItemStyle: { flex: 1 },
        tabBarActiveTintColor: colors.tabBarActiveColor,
        tabBarInactiveTintColor: colors.tabBarInactiveColor,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="statistics"
        options={{
          title: '統計',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '履歴',
          tabBarIcon: ({ size, color }) => (
            <History size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-game"
        options={{
          title: '対局記録',
          tabBarIcon: ({ size, color }) => (
            <Plus size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'フレンド',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'アカウント',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      {/** 編集画面 / プロフィール編集 / データの取り扱い / グループ詳細 をタブから完全に除外（スペース消滅） */}
      <Tabs.Screen
        name="edit-game"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="group-details"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile-edit"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="data-processing"
        options={{
          href: null,
        }}
      />
      {/** 非表示にするタブ（プライバシーポリシー / 利用規約） */}
      <Tabs.Screen
        name="privacy-policy"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="terms-of-service"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}