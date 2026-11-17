import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ImageBackground, Image, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../../src/theme/ThemeContext';
import { useApp, Mood, Meal, WorkoutPart } from '../../src/store/AppStore';
import { Logo, GradientRing, Section, Pill, Sheet, Choice, Crown } from '../../src/components/ui';
import { MyAvatar, NutritionFacts, LevelBar } from '../../src/components/vybe';
import { IMG } from '../../src/lib/images';
import { timeAwarePrompt, formatTime, dayKey, SLOTS, slotInfo } from '../../src/lib/dates';
import { ACTIVITIES, QUICK, kcalFor, kcalForParts, iconOf } from '../../src/lib/workouts';

const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: 'great', emoji: '🤩', label: 'Great' }, { key: 'good', emoji: '🙂', label: 'Good' },
  { key: 'okay', emoji: '😐', label: 'Okay' }, { key: 'low', emoji: '😔', label: 'Low' },
  { key: 'stressed', emoji: '😣', label: 'Stressed' },
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export default function Home() {
  const { colors } = useTheme();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const { profile, targets } = app;

  const today = dayKey();
  const totals = app.totalsFor(today);
  const activeMin = app.activeMinutes();
  const burned = app.burnedKcal();
  const log = app.dayLogs[today] ?? {};
  const streak = app.streak();
  const meals = app.todayMeals();
  const firstName = profile.name.split(' ')[0] || 'Champ';
  const planDay = app.plan?.weekly?.find(d => d.day === DAYS[new Date().getDay()]);

  const [sheet, setSheet] = useState<null | 'water' | 'workout' | 'mood'>(null);
  const [mealOpen, setMealOpen] = useState<Meal | null>(null);
  const [wType, setWType] = useState('Gym (mixed)');
  const [wMin, setWMin] = useState(30);
  const [precise, setPrecise] = useState(false);
  const [parts, setParts] = useState<WorkoutPart[]>([]);
  const [partAct, setPartAct] = useState('Weight training');
  const [partMin, setPartMin] = useState('10');
  const [partInt, setPartInt] = useState<WorkoutPart['intensity']>('moderate');
  const [weight, setWeight] = useState('');

  const coachMsg = (() => {
    if (planDay) return `We're taking the next step towards your goal. Today: ${planDay.workout.title}${planDay.workout.minutes ? ` (${planDay.workout.minutes} min)` : ''}. ${planDay.tip ?? ''}`;
    const waterLeft = (targets.waterTargetMl - app.waterMl) / 1000;
    const h = new Date().getHours();
    if (meals.length === 0) return `${timeAwarePrompt()} Snap, scan or just type your meal and I'll do the math 📸`;
    if (totals.protein < targets.proteinTarget * 0.5 && h >= 15)
      return `Protein is at ${Math.round(totals.protein)}g of ${targets.proteinTarget}g. Paneer, eggs or dal next? 💪`;
    if (totals.fiber < targets.fiberTarget * 0.4 && h >= 16)
      return `Only ${Math.round(totals.fiber)}g fibre so far. Add fruit, salad or sprouts 🥗`;
    if (waterLeft > 1 && h >= 14) return `You're ${waterLeft.toFixed(1)} L away from your water goal. Sip sip! 💧`;
    if (activeMin < targets.activeMinTarget / 2) return `A short 20 min walk gets you closer to ${targets.activeMinTarget} active minutes. You got this! 🚀`;
    return `You're on fire today, ${firstName}! Keep the vybe going 🔥`;
  })();

  const progressRows = [
    { icon: 'flame' as const, color: '#FF8A00', value: Math.round(totals.calories).toLocaleString(), target: `/ ${targets.calorieTarget.toLocaleString()} kcal eaten` },
    { icon: 'water' as const, color: colors.cyan, value: (app.waterMl / 1000).toFixed(1), target: `/ ${(targets.waterTargetMl / 1000).toFixed(1)} L water` },
    { icon: 'flash' as const, color: colors.magenta, value: String(activeMin), target: `/ ${targets.activeMinTarget} min · ${burned} kcal burned` },
    { icon: 'moon' as const, color: colors.purple, value: log.sleepHrs != null ? String(log.sleepHrs) : '–', target: 'hr sleep' },
  ];

  const focus = [
    { label: 'Log\nMeal', icon: 'silverware-fork-knife', bg: '#0F3A22', border: colors.lime, onPress: () => router.push('/scan') },
    { label: 'Track\nWorkout', icon: 'run-fast', bg: '#2A1550', border: colors.purple, onPress: () => setSheet('workout') },
    { label: 'Drink\nWater', icon: 'water', bg: '#0C2A4A', border: colors.cyan, onPress: () => setSheet('water') },
    { label: 'Mind &\nMood', icon: 'brain', bg: '#4A0F35', border: colors.magenta, onPress: () => setSheet('mood') },
  ] as const;

  const quickKcal = kcalFor(wType, wMin, profile.currentWeightKg);
  const preciseKcal = kcalForParts(parts, profile.currentWeightKg);

  function saveWorkout() {
    if (precise) {
      if (!parts.length) { Alert.alert('Add an activity', 'Add at least one part of your session.'); return; }
      const minutes = parts.reduce((t, p) => t + p.minutes, 0);
      app.addWorkout({ type: parts.length === 1 ? parts[0].activity : `${parts[0].activity} + ${parts.length - 1} more`, minutes, kcal: preciseKcal, parts });
    } else {
      app.addWorkout({ type: wType, minutes: wMin, kcal: quickKcal });
    }
    setParts([]); setSheet(null); tap();
  }

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
          <MyAvatar size={42} ring={colors.purple} onPress={() => router.push('/(tabs)/profile')} />
        </View>

        {/* Hero (user's own graffiti banner if they made one) */}
        <ImageBackground source={app.bannerUri ? { uri: app.bannerUri } : IMG.homeHero} resizeMode="cover"
          style={{ width: '100%', height: 190, marginTop: 10, justifyContent: 'center' }}>
          <LinearGradient colors={[colors.bg, colors.bg + 'CC', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 0.85, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={['transparent', colors.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 }} />
          <View style={{ paddingHorizontal: 18, maxWidth: '62%' }}>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900' }}>
              Hey <Text style={{ color: colors.lime }}>{firstName}!</Text> 👋
            </Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 6, opacity: 0.9 }}>Smaller steps. Bigger stories.</Text>
            <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 15, marginTop: 8, transform: [{ rotate: '-3deg' }] }}>{timeAwarePrompt()}</Text>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: 16, gap: 22 }}>
          <Pressable onPress={() => router.push('/(tabs)/profile')}><LevelBar compact /></Pressable>

          {/* Today's progress */}
          <View style={card(colors)}>
            <Section title="Today's Progress" action="See All" onAction={() => router.push('/insights')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <GradientRing size={140} stroke={13} progress={totals.calories / targets.calorieTarget}>
                <Ionicons name="restaurant" size={20} color={colors.lime} />
                <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>
                  {Math.max(0, Math.round(targets.calorieTarget - totals.calories + burned)).toLocaleString()}
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
              {([['Protein', totals.protein, targets.proteinTarget, colors.lime], ['Carbs', totals.carbs, targets.carbsTarget, colors.cyan],
                ['Fat', totals.fat, targets.fatTarget, colors.magenta], ['Fibre', totals.fiber, targets.fiberTarget, '#4ADE80']] as const).map(([l, v, t, c]) => (
                <View key={l} style={{ flex: 1 }}>
                  <Text style={{ color: colors.sub, fontSize: 11, fontWeight: '700' }}>{l}<Text style={{ color: colors.text }}> {Math.round(v)}g</Text></Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.min(100, (v / t) * 100)}%`, backgroundColor: c, borderRadius: 3 }} />
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

          {/* Coach card / today's plan step */}
          <Pressable onPress={() => router.push('/(tabs)/coach')}>
            <LinearGradient colors={['#1A1030', '#0B0B12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, borderWidth: 2, borderColor: planDay ? '#FFC83D' : colors.lime, flexDirection: 'row', overflow: 'hidden' }}>
              <Image source={IMG.mrvyb} style={{ width: 120, height: 150 }} resizeMode="cover" />
              <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', flex: 1 }}>{planDay ? `Today's step · ${planDay.focus}` : 'Your VYBE Coach'}</Text>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
                  </View>
                </View>
                <Text style={{ color: '#D8D8E4', fontSize: 13, lineHeight: 19, marginTop: 6 }} numberOfLines={5}>{coachMsg}</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {planDay && planDay.workout.exercises?.length > 0 && (
            <View style={card(colors)}>
              <Section title={planDay.workout.title} />
              {planDay.workout.exercises.slice(0, 8).map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                  <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={18} color={colors.lime} />
                  <Text style={{ color: colors.text, flex: 1 }}>{e}</Text>
                </View>
              ))}
              <View style={{ marginTop: 8 }}>
                <Choice label="I did it! Log this workout" selected onPress={() => {
                  app.addWorkout({ type: planDay.workout.title, minutes: planDay.workout.minutes || 30,
                    kcal: kcalFor('Gym (mixed)', planDay.workout.minutes || 30, profile.currentWeightKg) });
                  tap(); Alert.alert('Logged 💪', 'Mr. Vyb is proud. +15 XP');
                }} />
              </View>
            </View>
          )}

          {/* Today's meals, one card per slot (log any slot at any time) */}
          <View>
            <Section title="Today's Meals" />
            {meals.length === 0 && (
              <Pressable onPress={() => router.push('/scan')} style={[card(colors), { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }]}>
                <Image source={IMG.emptyMeals} style={{ width: 64, height: 64, borderRadius: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Plate's empty… for now</Text>
                  <Text style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>Search, snap, scan or type. Forgot earlier meals? Add them anytime.</Text>
                </View>
              </Pressable>
            )}
            <View style={{ gap: 10 }}>
              {SLOTS.map(sl => {
                const list = meals.filter(m => m.category === sl.key);
                const kcal = list.reduce((t, m) => t + m.totalCalories, 0);
                return (
                  <View key={sl.key} style={[card(colors), { paddingVertical: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>{sl.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '900' }}>{sl.label}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12 }}>{list.length ? `${Math.round(kcal)} kcal` : sl.window}</Text>
                      </View>
                      <Pressable onPress={() => router.push({ pathname: '/scan', params: { slot: sl.key } })} hitSlop={8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: list.length ? colors.surface2 : colors.lime,
                          borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 }}>
                        <Ionicons name="add" size={16} color={list.length ? colors.text : colors.onAccent} />
                        <Text style={{ color: list.length ? colors.text : colors.onAccent, fontWeight: '900', fontSize: 13 }}>Add</Text>
                      </Pressable>
                    </View>
                    {list.map(m => (
                      <Pressable key={m.id} onPress={() => setMealOpen(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10,
                        paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>
                            {m.items.map(x => `${x.name} (${x.quantity})`).join(', ')}
                          </Text>
                          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                            P {Math.round(m.proteinG)}g · C {Math.round(m.carbsG)}g · F {Math.round(m.fatG)}g · Fibre {Math.round(m.fiberG ?? 0)}g
                          </Text>
                        </View>
                        <Text style={{ color: colors.text, fontWeight: '900' }}>{Math.round(m.totalCalories)}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.sub} />
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Today's workouts */}
          {app.workouts.some(w => dayKey(new Date(w.at)) === today) && (
            <View style={card(colors)}>
              <Section title="Today's Workouts" />
              {app.workouts.filter(w => dayKey(new Date(w.at)) === today).map(w => (
                <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                  <MaterialCommunityIcons name={iconOf(w.parts?.[0]?.activity ?? w.type) as any} size={22} color={colors.purple} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>{w.type}</Text>
                    {w.parts && w.parts.length > 1 && (
                      <Text style={{ color: colors.sub, fontSize: 12 }}>{w.parts.map(p => `${p.minutes}m ${p.activity}`).join(' · ')}</Text>
                    )}
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{w.minutes}m · {w.kcal} kcal</Text>
                  <Pressable hitSlop={8} onPress={() => app.removeWorkout(w.id)}><Ionicons name="close" size={18} color={colors.sub} /></Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Vybe Wrapped */}
          <Pressable onPress={() => router.push('/wrapped')}>
            <LinearGradient colors={[colors.purple, colors.magenta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 34 }}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 20 }}>Your week, wrapped</Text>
                <Text style={{ color: '#FFFFFFDD', fontSize: 13 }}>See your highlights and share them on Insta</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          {/* Challenge from real streak */}
          <Pressable onPress={() => router.push('/(tabs)/race')}>
            <View style={[card(colors), { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#2A1550', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.purple }}>
                <Crown size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                  {app.challenges.filter(c => !c.completedAt).length ? `${app.challenges.filter(c => !c.completedAt).length} challenge(s) running` : 'Join a challenge'}
                </Text>
                <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>Earn unique badges and XP in Race</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.sub} />
            </View>
          </Pressable>

          {/* Weight */}
          <View style={card(colors)}>
            <Section title="Weight" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }}>{profile.currentWeightKg} kg</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>target {profile.targetWeightKg} kg</Text>
              </View>
              <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={colors.sub}
                style={{ width: 80, backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center' }} />
              <Choice label="Log" selected onPress={() => {
                const kg = parseFloat(weight.replace(',', '.'));
                if (!kg || kg < 20 || kg > 300) { Alert.alert('Check the number', 'Enter your weight in kg, e.g. 68.5'); return; }
                app.addWeight(kg); setWeight(''); tap();
              }} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Meal details */}
      <Sheet visible={!!mealOpen} onClose={() => setMealOpen(null)} title={mealOpen ? `${slotInfo(mealOpen.category).label}${mealOpen.timeApprox ? '' : ` · ${formatTime(mealOpen.eatenAt)}`}` : ''}>
        {mealOpen && (
          <ScrollView style={{ maxHeight: 520 }}>
            {mealOpen.items.map((it, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{it.name} <Text style={{ color: colors.sub, fontWeight: '500' }}>· {it.quantity}</Text></Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{Math.round(it.calories)} kcal</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
            <NutritionFacts n={{ calories: mealOpen.totalCalories, proteinG: mealOpen.proteinG, carbsG: mealOpen.carbsG, fatG: mealOpen.fatG,
              fiberG: mealOpen.fiberG, sugarG: mealOpen.sugarG, sodiumMg: mealOpen.sodiumMg }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Choice flex label={app.isFavourite(mealOpen) ? '★ Favourite' : '☆ Add to favourites'} selected={app.isFavourite(mealOpen)}
                onPress={() => app.toggleFavourite(mealOpen)} />
              <Choice flex label="Delete meal" onPress={() => Alert.alert('Delete meal?', 'This removes it from today.', [
                { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { app.removeMeal(mealOpen.id); setMealOpen(null); } }])} />
            </View>
          </ScrollView>
        )}
      </Sheet>

      {/* Water */}
      <Sheet visible={sheet === 'water'} onClose={() => setSheet(null)} title="Hydration check 💧">
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900', textAlign: 'center' }}>
          {(app.waterMl / 1000).toFixed(2)} <Text style={{ color: colors.sub, fontSize: 18 }}>/ {(targets.waterTargetMl / 1000).toFixed(1)} L</Text>
        </Text>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surface2, marginVertical: 16, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, (app.waterMl / targets.waterTargetMl) * 100)}%`, backgroundColor: colors.cyan }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Choice flex label="−250 ml" onPress={() => { app.addWater(-250); tap(); }} />
          <Choice flex label="+250 ml" selected onPress={() => { app.addWater(250); tap(); }} />
          <Choice flex label="+500 ml" selected onPress={() => { app.addWater(500); tap(); }} />
        </View>
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 12 }}>Added too much? Tap −250 ml to fix it.</Text>
      </Sheet>

      {/* Workout */}
      <Sheet visible={sheet === 'workout'} onClose={() => setSheet(null)} title="Track workout 🏃">
        <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <Choice flex label="Quick" selected={!precise} onPress={() => setPrecise(false)} />
            <Choice flex label="Detailed (more precise)" selected={precise} onPress={() => setPrecise(true)} />
          </View>
          {!precise ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK.map(w => <Choice key={w} label={w} selected={wType === w} onPress={() => setWType(w)} />)}
              </View>
              <Text style={{ color: colors.sub, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Minutes</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[15, 30, 45, 60, 90].map(m => <Choice flex key={m} label={String(m)} selected={wMin === m} onPress={() => setWMin(m)} />)}
              </View>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'center', marginTop: 16 }}>≈ {quickKcal} kcal burned</Text>
              <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Average for your weight ({profile.currentWeightKg} kg). Use Detailed for a sharper number.</Text>
            </>
          ) : (
            <>
              <Text style={{ color: colors.sub, marginBottom: 10, lineHeight: 18 }}>Break your session down, e.g. 10 min weights, 10 min boxing, 5 min stretching.</Text>
              {parts.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                  <MaterialCommunityIcons name={iconOf(p.activity) as any} size={20} color={colors.lime} />
                  <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{p.minutes} min {p.activity} · {p.intensity}</Text>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{kcalFor(p.activity, p.minutes, profile.currentWeightKg, p.intensity)} kcal</Text>
                  <Pressable onPress={() => setParts(x => x.filter((_, j) => j !== i))}><Ionicons name="close" size={18} color={colors.sub} /></Pressable>
                </View>
              ))}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} style={{ flexGrow: 0 }}>
                {ACTIVITIES.map(a => <Choice key={a.name} label={a.name} selected={partAct === a.name} onPress={() => setPartAct(a.name)} />)}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput value={partMin} onChangeText={setPartMin} keyboardType="numeric" placeholder="min" placeholderTextColor={colors.sub}
                  style={{ width: 64, backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, fontWeight: '800', paddingVertical: 10, textAlign: 'center' }} />
                {(['light', 'moderate', 'intense'] as const).map(it => <Choice key={it} label={it} selected={partInt === it} onPress={() => setPartInt(it)} />)}
              </View>
              <View style={{ marginTop: 10 }}>
                <Choice label={`+ Add ${partMin || 0} min ${partAct}`} onPress={() => {
                  const m = parseInt(partMin, 10); if (!m) return;
                  setParts(x => [...x, { activity: partAct, minutes: m, intensity: partInt }]);
                }} />
              </View>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'center', marginTop: 14 }}>
                {parts.reduce((t, p) => t + p.minutes, 0)} min · ≈ {preciseKcal} kcal burned
              </Text>
            </>
          )}
          <Pressable onPress={saveWorkout} style={{ backgroundColor: colors.lime, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 16 }}>Save workout</Text>
          </Pressable>
        </ScrollView>
      </Sheet>

      {/* Mood + sleep */}
      <Sheet visible={sheet === 'mood'} onClose={() => setSheet(null)} title="Mind & mood 🧠">
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 8 }}>How are you feeling?</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MOODS.map(m => (
            <Pressable key={m.key} onPress={() => { app.setDayLog({ mood: m.key }); tap(); }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5,
                borderColor: log.mood === m.key ? colors.magenta : colors.border, backgroundColor: log.mood === m.key ? colors.magenta + '22' : colors.surface2 }}>
              <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: colors.sub, fontWeight: '700', marginTop: 18, marginBottom: 8 }}>Sleep last night (hours)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[5, 6, 7, 8, 9].map(h => <Choice flex key={h} label={String(h)} selected={log.sleepHrs === h} onPress={() => { app.setDayLog({ sleepHrs: h }); tap(); }} />)}
        </View>
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 14 }}>Mr. Vyb uses this to adjust his advice. It stays on your phone.</Text>
      </Sheet>
    </View>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 16 });
