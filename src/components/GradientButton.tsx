import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

export function GradientButton({ title, onPress, busy, variant = 'lime' }: {
  title: string; onPress?: () => void; busy?: boolean; variant?: 'lime' | 'purple';
}) {
  const { colors } = useTheme();
  const grad: [string, string] = variant === 'purple'
    ? [colors.purple, colors.magenta]
    : [colors.lime, colors.cyan];
  return (
    <Pressable onPress={onPress} disabled={busy} style={{ borderRadius: 16 }}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center',
          shadowColor: grad[0], shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
        {busy
          ? <ActivityIndicator color={colors.onAccent} />
          : <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}
