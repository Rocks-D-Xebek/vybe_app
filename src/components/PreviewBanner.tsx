import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Clearly marks screens that still show sample data (blueprint principle #2). */
export function PreviewBanner({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cyan,
    }}>
      <Text style={{ fontSize: 18 }}>🚧</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }}>
          PREVIEW · SAMPLE DATA
        </Text>
        <Text style={{ color: colors.text, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{text}</Text>
      </View>
    </View>
  );
}
