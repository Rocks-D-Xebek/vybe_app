import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';
import { Card } from '../../src/components/Card';
import { SectionTitle } from '../../src/components/SectionTitle';
import { EmptyState } from '../../src/components/EmptyState';
import { dayKey } from '../../src/lib/dates';

export default function Insights() {
  const { colors } = useTheme();
  const app = useApp();
  const s = st(colors);

  // Real data from the on-device store (blueprint: no fabricated values)
  const days: { key: string; label: string; calories: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const t = app.totalsFor(k);
    days.push({ key: k, label: d.toLocaleDateString([], { weekday: 'narrow' }),
      calories: Math.round(t.calories), count: app.meals.filter(m => dayKey(new Date(m.eatenAt)) === k).length });
  }
  const maxCal = Math.max(app.profile.calorieTarget, ...days.map(d => d.calories), 1);

  // Meal timing intelligence (blueprint 7.F) — computed from actual eatenAt times
  const byCat = (cat: string) => app.meals.filter(m => m.category === cat).slice(-30);
  const avgTime = (cat: string) => {
    const ms = byCat(cat);
    if (ms.length < 2) return null;
    const avg = ms.reduce((t, m) => t + new Date(m.eatenAt).getHours() * 60 + new Date(m.eatenAt).getMinutes(), 0) / ms.length;
    const h = Math.floor(avg / 60), m = Math.round(avg % 60);
    const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const loggedDays = new Set(app.meals.map(m => dayKey(new Date(m.eatenAt)))).size;
  const proteinDays = days.filter(d => app.totalsFor(d.key).protein >= app.profile.proteinTarget * 0.8).length;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }}>
      <Card glow="purple">
        <SectionTitle label="This week’s calories" right={`target ~${(app.profile.calorieTarget * 7).toLocaleString()}`} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, paddingTop: 10 }}>
          {days.map(d => (
            <View key={d.key} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={{ color: colors.sub, fontSize: 9, fontWeight: '700' }}>{d.calories > 0 ? d.calories : ''}</Text>
              <View style={{
                width: 22, borderRadius: 6,
                height: Math.max(4, (d.calories / maxCal) * 90),
                backgroundColor: d.calories > 0 ? colors.purple : colors.surface2,
              }} />
              <Text style={{ color: colors.sub, fontSize: 11, fontWeight: '800' }}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Meal timing intelligence — a major VYBE feature (blueprint 7.F) */}
      <Card glow="lime">
        <SectionTitle label="Meal timing intelligence" right="90-day window" />
        {app.meals.length < 4
          ? <EmptyState emoji="⏰" title="Not enough data yet"
              sub={`Log ${4 - app.meals.length} more meal${app.meals.length === 3 ? '' : 's'} and I’ll show your eating rhythm.`} />
          : (
            <View style={{ gap: 12 }}>
              {(['breakfast', 'lunch', 'dinner'] as const).map(cat => (
                <View key={cat} style={s.timeRow}>
                  <Text style={{ color: colors.text, fontWeight: '800', textTransform: 'capitalize', flex: 1 }}>{cat}</Text>
                  <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>{avgTime(cat) ?? '—'}</Text>
                </View>
              ))}
              <Text style={{ color: colors.sub, fontSize: 12, lineHeight: 17 }}>
                Based on {app.meals.length} meals across {loggedDays} days. Missing meals ≠ skipped meals — we never score what wasn’t logged.
              </Text>
            </View>
          )}
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <SectionTitle label="Consistency" />
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{loggedDays}d</Text>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>days with logged meals</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <SectionTitle label="Protein days" />
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{proteinDays}/7</Text>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>near your protein target</Text>
        </Card>
      </View>

      <Card>
        <SectionTitle label="Weight trend" />
        {app.weights.length === 0
          ? <EmptyState emoji="⚖️" title="No weigh-ins yet" sub="Log your weight from the Home tab to see the trend." />
          : app.weights.slice(0, 5).map(w => (
            <View key={w.at} style={s.timeRow}>
              <Text style={{ color: colors.sub }}>{new Date(w.at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
              <Text style={{ color: colors.text, fontWeight: '900' }}>{w.kg} kg</Text>
            </View>
          ))}
      </Card>
    </ScrollView>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
});
