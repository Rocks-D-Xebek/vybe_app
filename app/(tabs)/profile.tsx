import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { useTheme, ThemeMode } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';
import { Card } from '../../src/components/Card';
import { SectionTitle } from '../../src/components/SectionTitle';
import { Chip } from '../../src/components/Chip';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo, Avatar } from '../../src/components/ui';

export default function Profile() {
  const { colors, mode, setMode } = useTheme();
  const { profile, updateProfile, meals, streak } = useApp();
  const s = st(colors);
  const [name, setName] = useState(profile.name);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 40, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Logo size={30} tagline={false} />
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>Profile</Text>
      </View>
      {/* Identity */}
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Avatar name={profile.name} size={88} ring={colors.purple} />
        <TextInput style={{ color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center', minWidth: 180 }}
          value={name} onChangeText={setName} onBlur={() => updateProfile({ name })} />
        <Text style={{ color: colors.sub, fontWeight: '600' }}>{profile.goal}</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[[String(meals.length), 'meals logged'], [String(streak()), 'day streak'],
          [`${profile.currentWeightKg}kg`, `→ ${profile.targetWeightKg}kg`]].map(([v, l]) => (
          <Card key={l as string} style={{ flex: 1, alignItems: 'center', padding: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{v}</Text>
            <Text style={{ color: colors.sub, fontSize: 10, textAlign: 'center', marginTop: 3 }}>{l}</Text>
          </Card>
        ))}
      </View>

      {/* Insights entry */}
      <Pressable onPress={() => router.push('/insights')}>
        <Card glow="lime" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="stats-chart" size={26} color={colors.lime} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>My Insights</Text>
            <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>Weekly calories, meal timing, weight trend</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.sub} />
        </Card>
      </Pressable>

      {/* Theme */}
      <Card>
        <SectionTitle label="Appearance" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['dark', 'light', 'system'] as ThemeMode[]).map(m => (
            <View key={m} style={{ flex: 1 }}>
              <Chip label={m.toUpperCase()} active={mode === m} onPress={() => setMode(m)} />
            </View>
          ))}
        </View>
      </Card>

      {/* Targets */}
      <Card>
        <SectionTitle label="Daily targets" />
        {([['Calories', `${profile.calorieTarget} kcal`], ['Protein', `${profile.proteinTarget} g`],
          ['Carbs', `${profile.carbsTarget} g`], ['Fat', `${profile.fatTarget} g`],
          ['Water', `${(profile.waterTargetMl / 1000).toFixed(1)} L`], ['Steps', profile.stepTarget.toLocaleString()]] as const).map(([k, v]) => (
          <View key={k} style={s.row}>
            <Text style={{ color: colors.sub, fontWeight: '600' }}>{k}</Text>
            <Text style={{ color: colors.text, fontWeight: '900' }}>{v}</Text>
          </View>
        ))}
        <Text style={{ color: colors.sub, fontSize: 11, marginTop: 8 }}>
          Personalised targets arrive with Mr. Vyb’s diet plans (Phase 2 / Premium).
        </Text>
      </Card>

      {/* Premium */}
      <Card glow="purple" style={{ borderColor: colors.purple }}>
        <SectionTitle label="VYBE Premium" right="₹199–₹299/mo" />
        <Text style={{ color: colors.text, lineHeight: 20, fontWeight: '600' }}>
          Advanced Mr. Vyb conversations, AI diet plans, deep meal-timing insights, premium races.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Chip label="COMING SOON — PHASE 6" active onPress={() => Alert.alert('Soon ✨', 'Billing lands in Phase 6.')} />
        </View>
      </Card>

      <Pressable onPress={() => Alert.alert('Account', 'Auth + account deletion controls land with the backend (Phase 1).')}>
        <Text style={{ color: colors.danger, textAlign: 'center', fontWeight: '800' }}>Privacy & account →</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border },
});
