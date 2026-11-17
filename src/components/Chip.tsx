import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Chip({ label, onPress, active }: { label: string; onPress?: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: active ? colors.lime : colors.surface2,
      borderWidth: 1, borderColor: active ? colors.lime : colors.border,
    }}>
      <Text style={{ color: active ? colors.onAccent : colors.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
