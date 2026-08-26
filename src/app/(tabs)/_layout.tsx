import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { colors } from '@/constants/theme';

const tabIcons = {
  index: '⌂',
  transactions: '≡',
  items: '□',
  stats: '⌁',
  settings: '⚙',
} as const;

function TabIcon({
  route,
  color,
}: {
  route: keyof typeof tabIcons;
  color: ColorValue;
}) {
  return <Text style={[styles.icon, { color }]}>{tabIcons[route]}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabIcon color={color} route="index" />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: '내역',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} route="transactions" />
          ),
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: '품목',
          tabBarIcon: ({ color }) => <TabIcon color={color} route="items" />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '통계',
          tabBarIcon: ({ color }) => <TabIcon color={color} route="stats" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabIcon color={color} route="settings" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    minHeight: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  icon: {
    fontSize: 20,
    fontWeight: '700',
  },
});
