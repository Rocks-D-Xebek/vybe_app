import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AppStoreProvider } from '../src/store/AppStore';

function Root() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{
          presentation: 'card', headerShown: true, title: 'PROFILE',
          headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
        }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AppStoreProvider>
        <Root />
      </AppStoreProvider>
    </ThemeProvider>
  );
}
