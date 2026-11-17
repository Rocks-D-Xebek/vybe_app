import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
      <Text style={{ fontSize: 34 }}>{emoji}</Text>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>
      <Text style={{ color: colors.sub, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 }}>{sub}</Text>
    </View>
  );
}
