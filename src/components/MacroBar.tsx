import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function MacroBar({ label, value, target, color }: {
  label: string; value: number; target: number; color: string;
}) {
  const { colors } = useTheme();
  const pct = Math.min(100, (value / target) * 100);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.sub, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{label.toUpperCase()}</Text>
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{Math.round(value)}g</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ color: colors.sub, fontSize: 10 }}>target {target}g</Text>
    </View>
  );
}
