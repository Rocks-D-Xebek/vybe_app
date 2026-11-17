import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/theme/ThemeContext';
import { GradientButton } from '../src/components/GradientButton';

const FEATURES = [
  ['📷', 'Snap your meal — AI does the math'],
  ['🤖', 'Mr. Vyb, your adaptive AI coach'],
  ['🥬', 'Fridge Check → healthy meals from what you have'],
  ['📊', '90-day meal-timing intelligence'],
  ['🏁', 'Races & leaderboards that keep you hooked'],
];

export default function Welcome() {
  const { colors, isDark } = useTheme();
  const s = st(colors);

  return (
    <View style={s.root}>
      <LinearGradient
        colors={isDark ? ['rgba(168,85,247,0.35)', 'transparent'] : ['rgba(124,58,237,0.15)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.glowDot} />
      <Text style={s.wordmark}>VYBE</Text>
      <Text style={s.tagline}>MOVE{'\n'}DIFFERENT.</Text>
      <Text style={s.body}>
        Eat smarter, move more, build habits that actually stick — with an AI coach
        that gets you.
      </Text>

      <View style={{ gap: 12, marginTop: 28, width: '100%' }}>
        {FEATURES.map(([e, t]) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 'auto', width: '100%', gap: 14 }}>
        <GradientButton title="START MY JOURNEY →" onPress={() => router.replace('/(tabs)/home')} />
        <Pressable onPress={() => router.replace('/(tabs)/home')}>
          <Text style={{ color: colors.sub, textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
            I already have an account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 72, backgroundColor: c.bg },
  glowDot: {
    position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130,
    backgroundColor: c.purple, opacity: 0.28,
  },
  wordmark: { color: c.lime, fontSize: 15, fontWeight: '900', letterSpacing: 8 },
  tagline: { color: c.text, fontSize: 52, fontWeight: '900', lineHeight: 54, marginTop: 18 },
  body: { color: c.sub, fontSize: 15, lineHeight: 22, marginTop: 16 },
});
