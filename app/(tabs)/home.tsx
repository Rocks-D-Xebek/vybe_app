import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';
import { api, FoodScanResult } from '../../src/lib/api';
import { Card } from '../../src/components/Card';
import { SectionTitle } from '../../src/components/SectionTitle';
import { Ring } from '../../src/components/Ring';
import { MacroBar } from '../../src/components/MacroBar';
import { Chip } from '../../src/components/Chip';
import { GradientButton } from '../../src/components/GradientButton';
import { EmptyState } from '../../src/components/EmptyState';
import { greeting, mealCategoryByHour, timeAwarePrompt, formatTime, dayKey } from '../../src/lib/dates';

export default function Home() {
  const { colors } = useTheme();
  const app = useApp();
  const s = st(colors);

  const todayKey = dayKey();
  const totals = app.totalsFor(todayKey);
  const { profile, waterMl } = app;
  const remaining = Math.max(0, profile.calorieTarget - totals.calories);
  const waterPct = waterMl / profile.waterTargetMl;

  const [scan, setScan] = useState<FoodScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [weight, setWeight] = useState('');

  async function scanMeal() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera needed', 'Allow camera access to scan meals.'); return; }
    const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (r.canceled || !r.assets[0].base64) return;
    setBusy(true);
    try {
      setScan(await api.scanFood(r.assets[0].base64, mealCategoryByHour()));
    } catch (e: any) { Alert.alert('Scan failed', e.message); }
    setBusy(false);
  }

  function saveScan() {
    if (!scan) return;
    app.addMeal({
      items: scan.items.map(i => ({ name: i.name, quantity: i.estimatedQuantity,
        calories: i.estimatedCalories, proteinG: i.proteinG, carbsG: i.carbsG, fatG: i.fatG, confidence: i.confidence })),
      totalCalories: scan.items.reduce((t, i) => t + i.estimatedCalories, 0),
      proteinG: scan.items.reduce((t, i) => t + i.proteinG, 0),
      carbsG: scan.items.reduce((t, i) => t + i.carbsG, 0),
      fatG: scan.items.reduce((t, i) => t + i.fatG, 0),
      category: mealCategoryByHour(), eatenAt: Date.now(),
      source: 'scan', confirmed: true,
    });
    setScan(null);
    Alert.alert('Saved ✓', 'Meal added to today’s log.');
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }}>
      <View>
        <Text style={s.greet}>{greeting()},</Text>
        <Text style={s.name}>{profile.name.split(' ')[0]} 👋</Text>
        <Text style={s.prompt}>“{timeAwarePrompt()}”</Text>
      </View>

      {/* Daily nutrition ring */}
      <Card glow="lime">
        <SectionTitle label="Today’s fuel" right={`${app.todayMeals().length} meals logged`} />
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View>
            <Ring size={176} progress={totals.calories / profile.calorieTarget}
              color={colors.lime} track={colors.surface2} />
            <View style={s.ringCenter}>
              <Text style={s.ringBig}>{Math.round(remaining).toLocaleString()}</Text>
              <Text style={s.ringSub}>kcal left</Text>
              <Text style={s.ringTiny}>of {profile.calorieTarget.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <MacroBar label="Protein" value={totals.protein} target={profile.proteinTarget} color={colors.magenta} />
          <MacroBar label="Carbs" value={totals.carbs} target={profile.carbsTarget} color={colors.cyan} />
          <MacroBar label="Fat" value={totals.fat} target={profile.fatTarget} color={colors.purple} />
        </View>
      </Card>

      {/* Blueprint 3.B: food scanner is PROMINENT, not hidden */}
      <GradientButton title={busy ? 'SCANNING…' : '📷 SCAN MY MEAL'} onPress={scanMeal} busy={busy} />

      {/* Confirm-before-recording (blueprint principle #3) */}
      {scan && (
        <Card glow="purple" style={{ borderColor: colors.purple }}>
          <SectionTitle label="Confirm your meal" right={scan.overallConfidence + ' confidence'} />
          {scan.items.map((it, i) => (
            <View key={i} style={s.scanRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{it.name}</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>{it.estimatedQuantity}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{it.estimatedCalories} kcal</Text>
            </View>
          ))}
          <Text style={s.note}>⚠️ {scan.uncertaintyNote}</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            <GradientButton title="LOOKS RIGHT — SAVE" onPress={saveScan} />
            <Pressable onPress={() => setScan(null)}>
              <Text style={{ color: colors.sub, textAlign: 'center', fontWeight: '700' }}>Retake photo</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {/* Hydration */}
      <Card>
        <SectionTitle label="Hydration check 💧" right={`${(waterMl / 1000).toFixed(1)}L / ${(profile.waterTargetMl / 1000).toFixed(1)}L`} />
        <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.surface2, overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ width: `${Math.min(100, waterPct * 100)}%`, height: '100%', backgroundColor: colors.cyan, borderRadius: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[250, 500, 750].map(ml => (
            <View key={ml} style={{ flex: 1 }}>
              <Chip label={`+${ml}ml`} onPress={() => app.addWater(ml)} active={false} />
            </View>
          ))}
        </View>
      </Card>

      {/* Steps + streak */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <SectionTitle label="Steps" right="today" />
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>—</Text>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 4 }}>
            of {profile.stepTarget.toLocaleString()} target
          </Text>
          <Text style={[s.note, { marginTop: 8 }]}>Live steps arrive with Health Connect (Phase 1.5).</Text>
        </Card>
        <Card style={{ flex: 1 }} glow="purple">
          <SectionTitle label="Streak" />
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{app.streak()}🔥</Text>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 4 }}>days logging meals</Text>
        </Card>
      </View>

      {/* Weight quick log */}
      <Card>
        <SectionTitle label="Weight" right={`target ${profile.targetWeightKg} kg`} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 12, paddingHorizontal: 14, color: colors.text, fontWeight: '700' }}
            placeholder={String(profile.currentWeightKg)} placeholderTextColor={colors.sub}
            keyboardType="numeric" value={weight} onChangeText={setWeight} />
          <View style={{ flex: 1 }}>
            <Chip label="LOG TODAY ⚡" active onPress={() => {
              const kg = parseFloat(weight);
              if (!kg) return;
              app.addWeight(kg); app.updateProfile({ currentWeightKg: kg }); setWeight('');
              Alert.alert('Logged ✓', `${kg} kg added to your history.`);
            }} />
          </View>
        </View>
      </Card>

      {/* Today's meals */}
      <Card>
        <SectionTitle label="Today’s meals" />
        {app.todayMeals().length === 0
          ? <EmptyState emoji="🍽️" title="Nothing logged yet"
              sub="Hit ‘Scan my meal’ above — Mr. Vyb will estimate it and you confirm." />
          : app.todayMeals().map(m => (
            <View key={m.id} style={s.scanRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{m.category} · {m.items.length} item{m.items.length > 1 ? 's' : ''}</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>{formatTime(m.eatenAt)}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{Math.round(m.totalCalories)} kcal</Text>
            </View>
          ))}
      </Card>

      <Pressable onPress={() => router.push('/coach')}>
        <Card glow="purple" style={{ borderColor: colors.purple }}>
          <SectionTitle label="Mr. Vyb says" />
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600' }}>
            “{app.todayMeals().length === 0
              ? 'Blank page today — one scanned meal is all it takes. I’m right here when you’re ready.'
              : 'Solid logging today. Protein’s the next boss level — tap me for quick wins.'}”
          </Text>
          <Text style={{ color: colors.lime, fontWeight: '800', marginTop: 8 }}>CHAT WITH MR. VYB →</Text>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  greet: { color: c.sub, fontSize: 14, fontWeight: '600' },
  name: { color: c.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
  prompt: { color: c.lime, fontSize: 13, fontWeight: '700', marginTop: 6 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringBig: { color: c.text, fontSize: 34, fontWeight: '900' },
  ringSub: { color: c.sub, fontSize: 12, fontWeight: '700' },
  ringTiny: { color: c.sub, fontSize: 10, marginTop: 2 },
  scanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  note: { color: c.sub, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
