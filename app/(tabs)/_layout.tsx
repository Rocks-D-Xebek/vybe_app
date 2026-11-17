import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'coach', title: 'Coach', icon: 'hardware-chip-outline', iconActive: 'hardware-chip' },
  { name: 'race', title: 'Race', icon: 'trophy-outline', iconActive: 'trophy' },
  { name: 'community', title: 'Community', icon: 'people-outline', iconActive: 'people' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.surface, borderTopColor: colors.purple + '55', borderTopWidth: 1,
        height: 62 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6,
      },
      tabBarActiveTintColor: colors.lime,
      tabBarInactiveTintColor: colors.sub,
      tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
    }}>
      {TABS.map(t => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? t.iconActive : t.icon} size={24} color={color as string} />,
        }} />
      ))}
    </Tabs>
  );
}
