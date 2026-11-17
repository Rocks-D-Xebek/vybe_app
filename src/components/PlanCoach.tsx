// Premium: Mr. Vyb builds a personal diet + workout plan by chatting, then sticks to it daily.
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ScrollView, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../theme/ThemeContext';
import { useApp } from '../store/AppStore';
import { api } from '../lib/api';
import { dayKey } from '../lib/dates';
import { IMG } from '../lib/images';
import { PremiumLock } from './vybe';
import { Choice } from './ui';

const OPENER = "Let's build YOUR plan 🔥 I'll ask a few quick questions like a friend would, then design your diet and workouts. First up: what's the goal? Lose weight, gain weight, build muscle, get fitter, run faster… or something else?";
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PlanCoach() {
  const { colors } = useTheme();
  const app = useApp();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const listRef = useRef<FlatList>(null);

  if (!app.premium) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Image source={IMG.mrvyb} style={{ width: '100%', height: 220, borderRadius: 22 }} resizeMode="cover" />
        <PremiumLock title="Your personal plan"
          text="Chat with Mr. Vyb like a mentor. He builds a precise diet + workout plan for weight loss, weight gain, muscle, running or any goal, then guides you every single day."
          onUnlock={() => router.push('/(tabs)/profile')} />
      </ScrollView>
    );
  }

  const msgs = app.planChat.length ? app.planChat : [{ role: 'model' as const, text: OPENER }];
  const userContext = {
    name: app.profile.name, currentWeightKg: app.profile.currentWeightKg, targetWeightKg: app.profile.targetWeightKg,
    recentDailyCalories: Math.round(app.totalsFor(dayKey()).calories), workoutsLogged: app.workouts.length,
    existingPlan: app.plan ? { title: app.plan.title, targets: app.plan.targets } : 'none',
  };

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: 'user' as const, text: text.trim() }];
    app.set('planChat', next); setInput(''); setBusy(true);
    try {
      const res = await api.planChat(next, userContext);
      app.set('planChat', [...next, { role: 'model', text: res.reply }]);
      if (res.plan?.weekly?.length) {
        app.set('plan', res.plan); app.set('planStartedAt', app.planStartedAt ?? Date.now()); setEditing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e: any) {
      app.set('planChat', [...next, { role: 'model', text: `Lost signal 📡 ${e?.message ?? ''} Send that again?` }]);
    }
    setBusy(false);
  }

  // Plan view
  if (app.plan && !editing) {
    const p = app.plan;
    const todayName = DAYS[new Date().getDay()];
    const week = app.planStartedAt ? Math.floor((Date.now() - app.planStartedAt) / (7 * 86400000)) + 1 : 1;
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <LinearGradient colors={['#2A1550', '#0B0B12']} style={{ borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: '#FFC83D' }}>
          <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 14 }}>Week {Math.min(week, p.durationWeeks)} of {p.durationWeeks}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 4 }}>{p.title}</Text>
          <Text style={{ color: '#D8D8E4', marginTop: 6, lineHeight: 20 }}>{p.summary}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {[`${p.targets.calories} kcal`, `P ${p.targets.proteinG}g`, `C ${p.targets.carbsG}g`, `F ${p.targets.fatG}g`,
              `Fibre ${p.targets.fiberG}g`, `${(p.targets.waterMl / 1000).toFixed(1)} L water`].map(t => (
              <View key={t} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{t}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>This week</Text>
        {p.weekly.map(d => {
          const today = d.day === todayName;
          return (
            <View key={d.day} style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: today ? 2 : 1,
              borderColor: today ? colors.lime : colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: today ? colors.lime : colors.sub, fontWeight: '900', width: 40 }}>{d.day}</Text>
                <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{d.workout.title}</Text>
                {d.workout.minutes ? <Text style={{ color: colors.sub }}>{d.workout.minutes} min</Text> : null}
              </View>
              {today && d.workout.exercises?.length ? (
                <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>{d.workout.exercises.join(' · ')}</Text>
              ) : null}
            </View>
          );
        })}

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 }}>Meals</Text>
        {p.meals.map(m => (
          <View key={m.slot} style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.lime, fontWeight: '900', textTransform: 'capitalize' }}>{m.slot} · {m.time}</Text>
            {m.options.map((o, i) => <Text key={i} style={{ color: colors.text, marginTop: 4 }}>• {o}</Text>)}
          </View>
        ))}

        {p.rules?.length > 0 && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '900', marginBottom: 6 }}>Mr. Vyb's rules</Text>
            {p.rules.map((r, i) => <Text key={i} style={{ color: colors.text, marginTop: 4 }}>⚡ {r}</Text>)}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Choice flex label="Adjust my plan" selected onPress={() => setEditing(true)} />
          <Choice flex label="Stop plan" onPress={() => Alert.alert('Stop following this plan?', 'Mr. Vyb will stop bringing it up.', [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Stop', style: 'destructive', onPress: () => { app.set('plan', null); app.set('planStartedAt', null); app.set('planChat', []); } }])} />
        </View>
      </ScrollView>
    );
  }

  // Conversation
  return (
    <View style={{ flex: 1 }}>
      {editing && (
        <Pressable onPress={() => setEditing(false)} style={{ padding: 10, alignItems: 'center' }}>
          <Text style={{ color: colors.cyan, fontWeight: '800' }}>← Back to my plan</Text>
        </Pressable>
      )}
      <FlatList ref={listRef} data={msgs} keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={busy ? <Text style={{ color: colors.sub, fontSize: 12 }}>Mr. Vyb is thinking about your plan…</Text> : undefined}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            {item.role === 'model' && <Image source={IMG.mrvyb} style={{ width: 30, height: 30, borderRadius: 15 }} />}
            <View style={{ borderRadius: 18, padding: 12, flexShrink: 1, backgroundColor: item.role === 'user' ? colors.lime : colors.surface,
              borderWidth: item.role === 'user' ? 0 : 1, borderColor: '#FFC83D' }}>
              {item.role === 'model' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <MaterialCommunityIcons name="crown" size={12} color="#FFC83D" />
                  <Text style={{ color: '#FFC83D', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>PLAN BUILDER</Text>
                </View>
              )}
              <Text style={{ color: item.role === 'user' ? colors.onAccent : colors.text, lineHeight: 20 }}>{item.text}</Text>
            </View>
          </View>
        )} />
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        <TextInput style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: colors.text,
          borderWidth: 1, borderColor: colors.border }}
          placeholder={editing ? 'What should change? e.g. more veg meals' : 'Answer Mr. Vyb…'} placeholderTextColor={colors.sub}
          value={input} onChangeText={setInput} onSubmitEditing={() => send(input)} />
        <Pressable onPress={() => send(input)} disabled={busy}
          style={{ backgroundColor: '#FFC83D', borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
          <Text style={{ color: '#07070B', fontWeight: '900' }}>{busy ? '…' : 'SEND'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
