import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Image, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useApp } from '../src/store/AppStore';
import { ScreenHeader, Logo, Crown, Bolt } from '../src/components/ui';
import { MyAvatar } from '../src/components/vybe';
import { GradientButton } from '../src/components/GradientButton';
import { IMG } from '../src/lib/images';
import { dayKey } from '../src/lib/dates';
import { levelFor } from '../src/lib/levels';

export default function Wrapped() {
  const { colors } = useTheme();
  const app = useApp();
  const shot = useRef<any>(null); // host view captured as an image
  const [sharing, setSharing] = useState(false);

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dayKey(d)); }
  const inWeek = (t: number) => days.includes(dayKey(new Date(t)));
  const meals = app.meals.filter(m => inWeek(m.eatenAt));
  const workouts = app.workouts.filter(w => inWeek(w.at));
  const loggedDays = new Set(meals.map(m => dayKey(new Date(m.eatenAt)))).size;
  const avgKcal = loggedDays ? Math.round(meals.reduce((t, m) => t + m.totalCalories, 0) / loggedDays) : 0;
  const avgProtein = loggedDays ? Math.round(meals.reduce((t, m) => t + m.proteinG, 0) / loggedDays) : 0;
  const activeMin = workouts.reduce((t, w) => t + w.minutes, 0);
  const burned = workouts.reduce((t, w) => t + (w.kcal || 0), 0);
  const waterDays = days.filter(d => (app.waterByDay[d] ?? 0) >= app.targets.waterTargetMl).length;
  const foodCount: Record<string, number> = {};
  meals.forEach(m => m.items.forEach(i => { const k = i.name.toLowerCase(); foodCount[k] = (foodCount[k] ?? 0) + 1; }));
  const topFood = Object.entries(foodCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const badgesThisWeek = app.challenges.filter(c => c.completedAt && inWeek(c.completedAt)).length;
  const lv = levelFor(app.xp());
  const vibe = activeMin >= 150 ? 'BEAST MODE' : loggedDays >= 6 ? 'CONSISTENCY KING' : waterDays >= 5 ? 'HYDRO HOMIE' : loggedDays >= 3 ? 'ON THE RISE' : 'JUST GETTING STARTED';

  const stats = [
    ['🍽️', String(meals.length), 'meals logged'], ['🔥', avgKcal.toLocaleString(), 'avg kcal / day'],
    ['💪', `${avgProtein}g`, 'avg protein'], ['⚡', String(activeMin), 'active minutes'],
    ['🏃', burned.toLocaleString(), 'kcal burned'], ['💧', `${waterDays}/7`, 'water goal days'],
  ];

  async function share() {
    if (Platform.OS === 'web') { Alert.alert('Phone only', 'Sharing works in the app on your phone.'); return; }
    setSharing(true);
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 1 });
      if (uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Vybe Wrapped' });
    } catch (e: any) { Alert.alert('Could not share', e?.message ?? 'Try again.'); }
    setSharing(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Vybe Wrapped" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View ref={shot} collapsable={false}>
          <LinearGradient colors={['#1A0B33', '#07070B', '#2A0B22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 28, padding: 20, borderWidth: 2, borderColor: colors.lime, overflow: 'hidden' }}>
            <Image source={IMG.mrvyb} style={{ position: 'absolute', right: -30, top: -10, width: 170, height: 170, opacity: 0.35 }} />
            <Logo size={34} />
            <Text style={{ color: '#CFCFDA', fontWeight: '700', marginTop: 10 }}>MY WEEK, WRAPPED</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <MyAvatar size={52} ring={colors.lime} />
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>{app.profile.name || 'Champ'}</Text>
                <Text style={{ color: lv.color, fontWeight: '800' }}>{lv.emoji} Lv {lv.index} · {lv.name}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <Crown size={26} />
              <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 26, flexShrink: 1 }}>{vibe}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
              {stats.map(([e, v, l]) => (
                <View key={l} style={{ width: '31%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 2 }}>{v}</Text>
                  <Text style={{ color: '#CFCFDA', fontSize: 10, textAlign: 'center' }}>{l}</Text>
                </View>
              ))}
            </View>
            {(topFood || badgesThisWeek > 0) && (
              <View style={{ marginTop: 14, gap: 4 }}>
                {topFood && <Text style={{ color: '#FFFFFF' }}>🍛 Most eaten: <Text style={{ fontWeight: '900', textTransform: 'capitalize' }}>{topFood}</Text></Text>}
                {badgesThisWeek > 0 && <Text style={{ color: '#FFFFFF' }}>🏅 Badges unlocked: <Text style={{ fontWeight: '900' }}>{badgesThisWeek}</Text></Text>}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 }}>
              <Bolt size={16} />
              <Text style={{ color: '#CFCFDA', fontSize: 12, fontWeight: '700' }}>Tracked with VYBE · Move different.</Text>
            </View>
          </LinearGradient>
        </View>

        <GradientButton title="Share to stories" icon="share-social" variant="neon" busy={sharing} onPress={share} />
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center' }}>Covers the last 7 days. Only you decide what gets shared.</Text>
      </ScrollView>
    </View>
  );
}
