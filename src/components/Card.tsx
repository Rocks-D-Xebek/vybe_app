import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Card({ children, style, glow }: {
  children: React.ReactNode; style?: ViewStyle; glow?: 'lime' | 'purple';
}) {
  const { colors } = useTheme();
  const glowColor = glow === 'purple' ? colors.purple : colors.lime;
  return (
    <View style={[{
      backgroundColor: colors.surface,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      padding: 16,
      ...(glow ? {
        shadowColor: glowColor, shadowOpacity: 0.22, shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 }, elevation: 10,
      } : {}),
    }, style]}>
      {children}
    </View>
  );
}
