import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ImageBackground, Image, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../../src/theme/ThemeContext';
import { useApp, Mood } from '../../src/store/AppStore';
import { Logo, GradientRing, Section, Avatar, Pill, Sheet, Choice, Crown } from '../../src/components/ui';
import { IMG } from '../../src/lib/images';
import { timeAwarePrompt, formatTime, dayKey } from '../../src/lib/dates';

const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: 'great', emoji: '🤩', label: 'Great' }, { key: 'good', emoji: '🙂', label: 'Good' },
  { key: 'okay', emoji: '😐', label: 'Okay' }, { key: 'low', emoji: '😔', label: 'Low' },
  { key: 'stressed', emoji: '😣', label: 'Stressed' },
];
const WORKOUTS = ['Walk', 'Run', 'Gym', 'Yoga', 'Cycling', 'Sports'];

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export default function Home() {
  const { colors } = useTheme();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const { profile } = app;

  const today = dayKey();
  const totals = app.totalsFor(today);
  const activeMin = app.activeMinutes();
  const log = app.dayLogs[today] ?? {};
  const streak = app.streak();
  const meals = app.todayMeals();
  const firstName = profile.name.split(' ')[0] || 'Champ';

  const [sheet, setSheet] = useState<null | 'water' | 'workout' | 'mood'>(null);
  const [wType, setWType] = useState('Walk');
  const [wMin, setWMin] = useState(30);
  const [weight, setWeight] = useState('');

  const coachMsg = (() => {
    const waterLeft = (profile.waterTargetMl - app.waterMl) / 1000;
    const h = new Date().getHours();
    if (meals.length === 0) return `${timeAwarePrompt()} Snap your first meal and I'll do the math 📸`;
    if (totals.protein < profile.proteinTarget * 0.5 && h >= 15)
      return `Protein is at ${Math.round(totals.protein)}g of ${profile.proteinTarget}g. Paneer, eggs or dal next? 💪`;
    if (waterLeft > 1 && h >= 14) return `You're ${waterLeft.toFixed(1)} L away from your water goal. Sip sip! 💧`;
    if (activeMin < profile.activeMinTarget / 2) return `A short 20 min walk gets you closer to ${profile.activeMinTarget} active minutes. You got this! 🚀`;
    return `You're on fire today, ${firstName}! Keep the vybe going 🔥`;
  })();

  const progressRows = [
    { icon: 'flame' as const, color: '#FF8A00', value: Math.round(totals.calories).toLocaleString(), target: `/ ${profile.calorieTarget.toLocaleString()} kcal` },
    { icon: 'water' as const, color: colors.cyan, value: (app.waterMl / 1000).toFixed(1), target: `/ ${(profile.waterTargetMl / 1000).toFixed(1)} L water` },
    { icon: 'flash' as const, color: colors.magenta, value: String(activeMin), target: `/ ${profile.activeMinTarget} min active` },
    { icon: 'heart' as const, color: colors.purple, value: log.sleepHrs != null ? String(log.sleepHrs) : '–', target: 'hr sleep' },
  ];

  const focus = [
    { label: 'Log\nMeal', icon: 'silverware-fork-knife', bg: '#0F3A22', border: colors.lime, onPress: () => router.push('/scan') },
    { label: 'Track\nWorkout', icon: 'run-fast', bg: '#2A1550', border: colors.purple, onPress: () => setSheet('workout') },
    { label: 'Drink\nWater', icon: 'water', bg: '#0C2A4A', border: colors.cyan, onPress: () => setSheet('water') },
    { label: 'Mind &\nMood', icon: 'brain', bg: '#4A0F35', border: colors.magenta, onPress: () => setSheet('mood') },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
          <Logo size={34} />
          <View style={{ flex: 1 }} />
          <Pill color={colors.purple}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={{ color: colors.lime, fontWeight: '800', fontSize: 13 }}>{streak} day streak</Text>
          </Pill>
          <Pressable onPress={() => router.push('/(tabs)/profile')}>
            <Avatar name={firstName} size={42} ring={colors.purple} />
          </Pressable>
        </View>

        {/* Hero */}
        <ImageBackground source={IMG.homeHero} resizeMode="cover"
          style={{ width: '100%', height: 190, marginTop: 10, justifyContent: 'center' }}>
          <LinearGradient colors={[colors.bg, colors.bg + 'CC', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 0.85, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={['transparent', colors.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 }} />
          <View style={{ paddingHorizontal: 18, maxWidth: '62%' }}>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900' }}>
              Hey <Text style={{ color: colors.lime }}>{firstName}!</Text> 👋
            </Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 6, opacity: 0.9 }}>
              Smaller steps. Bigger stories.
            </Text>
            <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 15, marginTop: 8, transform: [{ rotate: '-3deg' }] }}>
              {timeAwarePrompt()}
            </Text>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: 16, gap: 22 }}>
          {/* Today's progress */}
          <View style={card(colors)}>
            <Section title="Today's Progress" action="See All" onAction={() => router.push('/insights')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <GradientRing size={140} stroke={13} progress={totals.calories / profile.calorieTarget}>
                <Ionicons name="restaurant" size={20} color={colors.lime} />
                <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>
                  {Math.max(0, Math.round(profile.calorieTarget - totals.calories)).toLocaleString()}
                </Text>
                <Text style={{ color: colors.sub, fontSize: 12, fontWeight: '600' }}>kcal left</Text>
              </GradientRing>
              <View style={{ flex: 1, gap: 12 }}>
                {progressRows.map(r => (
                  <View key={r.target} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={r.icon} size={18} color={r.color} />
                    <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>{r.value}</Text>
                    <Text style={{ color: colors.sub, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>{r.target}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {[['Protein', totals.protein, profile.proteinTarget, colors.lime],
                ['Carbs', totals.carbs, profile.carbsTarget, colors.cyan],
                ['Fat', totals.fat, profile.fatTarget, colors.magenta]].map(([l, v, t, c]) => (
                <View key={l as string} style={{ flex: 1 }}>
                  <Text style={{ color: colors.sub, fontSize: 11, fontWeight: '700' }}>{l as string}
                    <Text style={{ color: colors.text }}>  {Math.round(v as number)}g</Text></Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.min(100, ((v as number) / (t as number)) * 100)}%`, backgroundColor: c as string, borderRadius: 3 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Today's focus */}
          <View>
            <Section title="Today's Focus" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {focus.map(f => (
                <Pressable key={f.label} onPress={() => { tap(); f.onPress(); }}
                  style={({ pressed }) => ({ flex: 1, aspectRatio: 0.82, borderRadius: 18, backgroundColor: f.bg, borderWidth: 1.5,
                    borderColor: f.border, alignItems: 'center', justifyContent: 'center', gap: 8, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                  <MaterialCommunityIcons name={f.icon} size={30} color={f.border} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Coach card */}
          <Pressable onPress={() => router.push('/(tabs)/coach')}>
            <LinearGradient colors={['#1A1030', '#0B0B12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, borderWidth: 2, borderColor: colors.lime, flexDirection: 'row', overflow: 'hidden' }}>
              <Image source={IMG.mrvyb} style={{ width: 120, height: 140 }} resizeMode="cover" />
              <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>Your VYBE Coach</Text>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
                  </View>
                </View>
                <Text style={{ color: '#D8D8E4', fontSize: 13, lineHeight: 19, marginTop: 6 }}>{coachMsg}</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Today's meals */}
          <View>
            <Section title="Today's Meals" action="Add" onAction={() => router.push('/scan')} />
            {meals.length === 0 ? (
              <Pressable onPress={() => router.push('/scan')} style={[card(colors), { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
                <Image source={IMG.emptyMeals} style={{ width: 76, height: 76, borderRadius: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Plate's empty… for now</Text>
                  <Text style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>Tap to scan your first meal. Mr. Vyb estimates, you confirm.</Text>
                </View>
              </Pressable>
            ) : (
              <View style={card(colors)}>
                {meals.map((m, i) => (
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12,
                    borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{{ breakfast: '🍳', lunch: '🍛', dinner: '🍲', snack: '🥨' }[m.category]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '800', textTransform: 'capitalize' }} numberOfLines={1}>
                        {m.category} · {m.items.map(x => x.name).join(', ')}
                      </Text>
                      <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                        {formatTime(m.eatenAt)} · P {Math.round(m.proteinG)}g · C {Math.round(m.carbsG)}g · F {Math.round(m.fatG)}g
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '900' }}>{Math.round(m.totalCalories)}</Text>
                    <Pressable hitSlop={10} onPress={() => Alert.alert('Remove meal?', 'This deletes it from today.', [
                      { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => app.removeMeal(m.id) }])}>
                      <Ionicons name="close" size={18} color={colors.sub} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Challenge: real data from the user's own streak */}
          <View>
            <Section title="Ongoing Challenge" />
            <View style={[card(colors), { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#2A1550', alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: colors.purple }}>
                <Crown size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>7-Day Consistency</Text>
                <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                  {streak >= 7 ? 'Completed! Legend status 👑' : `Log meals ${7 - Math.min(streak, 7)} more day${7 - streak === 1 ? '' : 's'} in a row`}
                </Text>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 8, overflow: 'hidden' }}>
                  <LinearGradient colors={[colors.purple, colors.magenta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${Math.min(100, (streak / 7) * 100)}%` }} />
                </View>
              </View>
              <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>{Math.min(streak, 7)}/7</Text>
            </View>
          </View>

          {/* Weight */}
          <View style={card(colors)}>
            <Section title="Weight" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }}>{profile.currentWeightKg} kg</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>target {profile.targetWeightKg} kg</Text>
              </View>
              <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg"
                placeholderTextColor={colors.sub}
                style={{ width: 80, backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, fontWeight: '800',
                  paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center' }} />
              <Choice label="Log" selected onPress={() => {
                const kg = parseFloat(weight.replace(',', '.'));
                if (!kg || kg < 20 || kg > 300) { Alert.alert('Check the number', 'Enter your weight in kg, e.g. 68.5'); return; }
                app.addWeight(kg); setWeight(''); tap();
              }} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Water sheet */}
      <Sheet visible={sheet === 'water'} onClose={() => setSheet(null)} title="Hydration check 💧">
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900', textAlign: 'center' }}>
          {(app.waterMl / 1000).toFixed(2)} <Text style={{ color: colors.sub, fontSize: 18 }}>/ {(profile.waterTargetMl / 1000).toFixed(1)} L</Text>
        </Text>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surface2, marginVertical: 16, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, (app.waterMl / profile.waterTargetMl) * 100)}%`, backgroundColor: colors.cyan }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Choice flex label="−250 ml" onPress={() => { app.addWater(-250); tap(); }} />
          <Choice flex label="+250 ml" selected onPress={() => { app.addWater(250); tap(); }} />
          <Choice flex label="+500 ml" selected onPress={() => { app.addWater(500); tap(); }} />
        </View>
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 12 }}>Added too much? Tap −250 ml to fix it.</Text>
      </Sheet>

      {/* Workout sheet */}
      <Sheet visible={sheet === 'workout'} onClose={() => setSheet(null)} title="Track workout 🏃">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WORKOUTS.map(w => <Choice key={w} label={w} selected={wType === w} onPress={() => setWType(w)} />)}
        </View>
        <Text style={{ color: colors.sub, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Minutes</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[10, 20, 30, 45, 60].map(m => <Choice flex key={m} label={String(m)} selected={wMin === m} onPress={() => setWMin(m)} />)}
        </View>
        <View style={{ marginTop: 18 }}>
          <Pressable onPress={() => { app.addWorkout(wType, wMin); setSheet(null); tap(); }}
            style={{ backgroundColor: colors.lime, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}>
            <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 16 }}>Save {wMin} min {wType.toLowerCase()}</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
          Today: {activeMin} active min · automatic tracking arrives with Health Connect
        </Text>
      </Sheet>

      {/* Mood + sleep sheet */}
      <Sheet visible={sheet === 'mood'} onClose={() => setSheet(null)} title="Mind & mood 🧠">
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 8 }}>How are you feeling?</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MOODS.map(m => (
            <Pressable key={m.key} onPress={() => { app.setDayLog({ mood: m.key }); tap(); }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5,
                borderColor: log.mood === m.key ? colors.magenta : colors.border,
                backgroundColor: log.mood === m.key ? colors.magenta + '22' : colors.surface2 }}>
              <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: colors.sub, fontWeight: '700', marginTop: 18, marginBottom: 8 }}>Sleep last night (hours)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[5, 6, 7, 8, 9].map(h => <Choice flex key={h} label={String(h)} selected={log.sleepHrs === h}
            onPress={() => { app.setDayLog({ sleepHrs: h }); tap(); }} />)}
        </View>
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 14 }}>
          Mr. Vyb uses this to adjust his advice. It stays on your phone.
        </Text>
      </Sheet>
    </View>
  );
}

const card = (c: any) => ({
  backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 16,
});
