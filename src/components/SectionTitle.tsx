import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function SectionTitle({ label, right }: { label: string; right?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800',
        letterSpacing: 2.5, textTransform: 'uppercase' }}>{label}</Text>
      {right ? <Text style={{ color: colors.sub, fontSize: 12, fontWeight: '600' }}>{right}</Text> : null}
    </View>
  );
}
