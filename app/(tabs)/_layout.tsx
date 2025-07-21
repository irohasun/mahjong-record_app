import { Tabs } from 'expo-router';
import { ChartBar as BarChart3, History, Plus, User } from 'lucide-react-native';
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
        tabBarActiveTintColor: colors.tabBarActiveColor,
        tabBarInactiveTintColor: colors.tabBarInactiveColor,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      />
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
        name="account"
        options={{
          title: 'アカウント',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}