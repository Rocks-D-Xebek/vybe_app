import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AppStoreProvider, useApp } from '../src/store/AppStore';

function Root() {
  const { colors, isDark } = useTheme();
  const { ready } = useApp();
  const [fontsLoaded] = useFonts({ PermanentMarker_400Regular });

  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="insights" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="wrapped" options={{ animation: 'slide_from_right' }} />
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
