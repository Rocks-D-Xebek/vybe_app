import React from 'react';
import { Tabs, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';

function TabIcon({ emoji, focused, color }: { emoji: string; focused: boolean; color: string }) {
  return (
    <View style={{
      width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? color + '22' : 'transparent',
    }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { profile } = useApp();

  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: colors.surface, borderTopColor: colors.border,
        height: 84, paddingBottom: 22, paddingTop: 6,
      },
      tabBarActiveTintColor: colors.lime,
      tabBarInactiveTintColor: colors.sub,
      tabBarLabelStyle: { fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: '900', letterSpacing: 3, fontSize: 17 },
      headerShadowVisible: false,
    }}>
      <Tabs.Screen name="home" options={{
        title: 'VYBE',
        tabBarIcon: p => <TabIcon emoji="🏠" focused={p.focused} color={colors.lime} />,
        headerRight: () => (
          <Pressable onPress={() => router.push('/profile')} style={{ marginRight: 16 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.lime,
            }}>
              <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 14 }}>
                {profile.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        ),
      }} />
      <Tabs.Screen name="coach" options={{
        title: 'COACH',
        tabBarIcon: p => <TabIcon emoji="🤖" focused={p.focused} color={colors.lime} />,
      }} />
      <Tabs.Screen name="race" options={{
        title: 'RACE',
        tabBarIcon: p => <TabIcon emoji="🏁" focused={p.focused} color={colors.lime} />,
      }} />
      <Tabs.Screen name="community" options={{
        title: 'COMMUNITY',
        tabBarIcon: p => <TabIcon emoji="👥" focused={p.focused} color={colors.lime} />,
      }} />
      <Tabs.Screen name="insights" options={{
        title: 'INSIGHTS',
        tabBarIcon: p => <TabIcon emoji="📊" focused={p.focused} color={colors.lime} />,
      }} />
    </Tabs>
  );
}
