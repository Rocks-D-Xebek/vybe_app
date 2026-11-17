import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function GradientButton({ title, onPress, busy, variant = 'lime', icon, disabled }: {
  title: string; onPress?: () => void; busy?: boolean; variant?: 'lime' | 'purple' | 'neon';
  icon?: IconName; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const grad: [string, string] =
    variant === 'purple' ? [colors.purple, colors.magenta]
    : variant === 'neon' ? [colors.lime, colors.purple]
    : [colors.lime, colors.cyan];
  const textColor = variant === 'purple' ? '#FFFFFF' : colors.onAccent;
  return (
    <Pressable onPress={onPress} disabled={busy || disabled}
      style={({ pressed }) => ({ borderRadius: 18, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ borderRadius: 18, paddingVertical: 16, alignItems: 'center',
          shadowColor: grad[1], shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
        {busy
          ? <ActivityIndicator color={textColor} />
          : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {icon && <Ionicons name={icon} size={20} color={textColor} />}
              <Text style={{ color: textColor, fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>{title}</Text>
            </View>
          )}
      </LinearGradient>
    </Pressable>
  );
}
