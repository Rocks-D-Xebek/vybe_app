import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/theme/ThemeContext';
import { Card } from '../../src/components/Card';
import { SectionTitle } from '../../src/components/SectionTitle';
import { Chip } from '../../src/components/Chip';
import { GradientButton } from '../../src/components/GradientButton';
import { PreviewBanner } from '../../src/components/PreviewBanner';

// NOTE: static preview data — gets replaced by the Race API in Phase 4.
const LEADERS = [
  { name: 'Aarav K.', km: 12.4, you: false },
  { name: 'Priya S.', km: 11.8, you: false },
  { name: 'Rohan M.', km: 10.2, you: false },
  { name: 'You', km: 8.6, you: true },
  { name: 'Dev P.', km: 7.9, you: false },
];

export default function Race() {
  const { colors } = useTheme();
  const s = st(colors);
  const [joined, setJoined] = useState(false);

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }}>
      <PreviewBanner text="Races are coming soon. This is how they'll look — the racers and prizes below aren't real yet." />

      {/* Featured race hero */}
      <LinearGradient colors={[colors.purple, colors.magenta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11, letterSpacing: 3 }}>FEATURED RACE</Text>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>LIVE 🔴</Text>
          </View>
        </View>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 10 }}>MONSOON 5K SPRINT</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 4 }}>
          3 days left · 214 racers · prize pool ₹2,000
        </Text>
        <View style={{ marginTop: 16 }}>
          <GradientButton title={joined ? '✓ REGISTERED' : 'JOIN RACE — FREE'} onPress={() => setJoined(j => !j)} busy={false} />
        </View>
      </LinearGradient>

      {/* Leaderboard */}
      <Card glow="purple">
        <SectionTitle label="Leaderboard" right="this week" />
        {LEADERS.map((p, i) => (
          <View key={p.name} style={[s.row, p.you && { backgroundColor: colors.lime + '14', borderRadius: 12 }]}>
            <Text style={[s.rank, { color: i === 0 ? colors.lime : colors.sub }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: p.you ? '900' : '700' }}>
                {p.name}{p.you ? ' (you)' : ''}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{p.km} km</Text>
          </View>
        ))}
        <Text style={{ color: colors.sub, fontSize: 11, marginTop: 10 }}>
          Live GPS tracking, global/friends rankings & verified activities land with the Race backend (Phase 4).
        </Text>
      </Card>

      {/* Categories */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Chip label="🏆 Global" active /></View>
        <View style={{ flex: 1 }}><Chip label="👥 Friends" /></View>
        <View style={{ flex: 1 }}><Chip label="📅 Weekly" /></View>
      </View>

      {/* Achievements preview */}
      <Card>
        <SectionTitle label="Achievements" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {['🏅 First 5K', '🔥 7-day streak', '⚡ Sub-25 5K', '💎 100km total'].map(a => (
            <View key={a} style={{ backgroundColor: colors.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: colors.sub, fontSize: 12, fontWeight: '700' }}>{a}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 12 },
  rank: { fontSize: 16, fontWeight: '900', width: 22 },
});
