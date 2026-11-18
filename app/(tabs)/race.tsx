import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ImageBackground, Share, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';
import { Logo, Avatar, Crown, Section } from '../../src/components/ui';
import { Badge, PremiumLock } from '../../src/components/vybe';
import { SocialRace } from '../../src/components/SocialRace';
import { useAuth } from '../../src/store/Auth';
import { PreviewBanner } from '../../src/components/PreviewBanner';
import { GradientButton } from '../../src/components/GradientButton';
import { IMG, AVATARS } from '../../src/lib/images';
import { CHALLENGES, challengeStatus } from '../../src/lib/challenges';

// Global Race leaderboard is sample data until accounts launch (phase 2).
const PODIUM = [
  { rank: 2, name: 'Sara', time: '00:22:49', flag: '🇮🇳', avatar: AVATARS[0] },
  { rank: 1, name: 'Kenji', time: '00:22:31', flag: '🇯🇵', avatar: AVATARS[1] },
  { rank: 3, name: 'Maria', time: '00:23:10', flag: '🇺🇸', avatar: AVATARS[2] },
];

function untilSunday() {
  const now = new Date(); const end = new Date(now);
  end.setDate(now.getDate() + ((7 - now.getDay()) % 7)); end.setHours(23, 59, 59, 0);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return { d: Math.floor(ms / 86400000), h: Math.floor(ms / 3600000) % 24, m: Math.floor(ms / 60000) % 60 };
}

export default function Race() {
  const { colors } = useTheme();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [left, setLeft] = useState(untilSunday());
  const pad = (n: number) => String(n).padStart(2, '0');

  useEffect(() => { const t = setInterval(() => setLeft(untilSunday()), 30000); return () => clearInterval(t); }, []);

  // Mark challenges complete as soon as the logs reach the target
  useEffect(() => {
    const newlyDone = app.challenges.filter(j => !j.completedAt).filter(j => {
      const c = CHALLENGES.find(x => x.id === j.id);
      return c && challengeStatus(c, app, j.joinedAt).done;
    });
    if (newlyDone.length) {
      app.set('challenges', prev => prev.map(j => newlyDone.some(n => n.id === j.id) ? { ...j, completedAt: Date.now() } : j));
      const names = newlyDone.map(n => CHALLENGES.find(c => c.id === n.id)?.badge.name).join(', ');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Badge unlocked! 🏅', `You earned: ${names}. +100 XP`);
    }
  }, [app.meals, app.workouts, app.waterByDay]);

  // Completed entries stay forever (they are the earned badges); at most one running entry per challenge.
  const running = (id: string) => app.challenges.find(c => c.id === id && !c.completedAt);
  const join = (id: string) => {
    app.set('challenges', prev => [...prev.filter(c => !(c.id === id && !c.completedAt)), { id, joinedAt: Date.now() }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const active = CHALLENGES.filter(c => running(c.id));
  const available = CHALLENGES.filter(c => !running(c.id));
  const earnedIds = new Set(app.challenges.filter(c => c.completedAt).map(c => c.id));
  const openStreak = app.openStreak();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Logo size={30} tagline={false} />
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>Race & Challenges</Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 22, marginTop: 14 }}>
        {/* 1v1 / group challenges with friends, leaderboards */}
        <SocialRace />

        {/* Active solo challenges */}
        {active.length > 0 && (
          <View>
            <Section title="Your challenges" />
            <View style={{ gap: 12 }}>
              {active.map(c => {
                const j = running(c.id)!;
                const st = challengeStatus(c, app, j.joinedAt);
                return (
                  <View key={c.id} style={[card(colors), { flexDirection: 'row', gap: 14, alignItems: 'center', borderColor: c.badge.colors[0] }]}>
                    <Badge badge={c.badge} size={58} locked={!st.done} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>{c.title}</Text>
                      <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>{c.desc}</Text>
                      <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.surface2, marginTop: 8, overflow: 'hidden' }}>
                        <LinearGradient colors={c.badge.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ height: '100%', width: `${Math.min(100, (st.value / c.target) * 100)}%` }} />
                      </View>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 5 }}>
                        {Math.round(st.value).toLocaleString()} / {c.target.toLocaleString()} {c.unit} · {st.expired ? 'time up, try again' : `${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left`}
                      </Text>
                    </View>
                    {st.expired && <Pressable onPress={() => join(c.id)}><Ionicons name="refresh" size={22} color={colors.lime} /></Pressable>}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Available solo challenges */}
        <View>
          <Section title="Solo challenges" />
          <Text style={{ color: colors.sub, marginTop: -4, marginBottom: 12 }}>Tracked from your own logs. Every challenge has its own badge.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {available.map(c => (
              <Pressable key={c.id} onPress={() => join(c.id)}
                style={[card(colors), { width: '47.5%', alignItems: 'center', gap: 8, paddingVertical: 18 }]}>
                <Badge badge={c.badge} size={66} locked={!earnedIds.has(c.id)} />
                <Text style={{ color: colors.text, fontWeight: '900', textAlign: 'center' }}>{c.title}</Text>
                <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center', minHeight: 32 }}>{c.desc}</Text>
                <View style={{ backgroundColor: earnedIds.has(c.id) ? colors.surface2 : colors.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ color: earnedIds.has(c.id) ? colors.text : colors.onAccent, fontWeight: '900', fontSize: 12 }}>
                    {earnedIds.has(c.id) ? 'Earned ✓ · Redo' : 'Join'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Global race */}
        <View>
          <Section title="Global Race 🌍" />
          {!auth.isPremium ? (
            <View style={{ gap: 12 }}>
              <ImageBackground source={IMG.raceHero} style={{ width: '100%', height: 150, borderRadius: 22, overflow: 'hidden' }} imageStyle={{ opacity: 0.55 }} resizeMode="cover">
                <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 28 }}>MOVE <Text style={{ color: colors.lime }}>DIFFERENT.</Text></Text>
                </View>
              </ImageBackground>
              <PremiumLock title="Race the world"
                text="Join the weekly Global Race, challenge anyone in any country, create group challenges and run unlimited battles."
                onUnlock={() => router.push('/premium')} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <PreviewBanner text="Global Race goes live with accounts. Runners below are sample data." />
              <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFC83D' }}>
                <ImageBackground source={IMG.raceHero} style={{ width: '100%', height: 220 }} resizeMode="cover">
                  <LinearGradient colors={['rgba(7,7,11,0.95)', 'rgba(7,7,11,0.4)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 0.9, y: 0.5 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                  <View style={{ padding: 18, flex: 1 }}>
                    <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 18 }}>GLOBAL RACE</Text>
                    <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 32, lineHeight: 36 }}>MOVE{'\n'}DIFFERENT.</Text>
                    <View style={{ flex: 1 }} />
                    <View style={{ alignSelf: 'flex-end', backgroundColor: 'rgba(7,7,11,0.85)', borderRadius: 14, padding: 10 }}>
                      <Text style={{ color: '#CFCFDA', fontSize: 11, textAlign: 'center' }}>Race ends in</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>{pad(left.d)} : {pad(left.h)} : {pad(left.m)}</Text>
                    </View>
                  </View>
                </ImageBackground>
                <View style={{ backgroundColor: colors.surface, padding: 14, flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <GradientButton title="Join Global Race" icon="arrow-forward" onPress={() => Alert.alert('Almost there', 'Global Race registration opens with accounts.')} />
                  </View>
                  <Pressable onPress={() => Share.share({ message: 'Race me on VYBE. Move different. 🏁' })}
                    style={{ width: 56, borderRadius: 18, borderWidth: 1.5, borderColor: colors.purple, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="share-social" size={22} color={colors.purple} />
                  </Pressable>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
                {PODIUM.map(p => {
                  const first = p.rank === 1;
                  const ring = first ? '#FFC83D' : p.rank === 2 ? colors.cyan : colors.magenta;
                  return (
                    <View key={p.rank} style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, paddingTop: first ? 14 : 10,
                      paddingBottom: 14, borderWidth: first ? 2 : 1, borderColor: first ? '#FFC83D' : colors.border, marginBottom: first ? 18 : 0 }}>
                      {first && <View style={{ position: 'absolute', top: -20 }}><Crown size={34} color="#FFC83D" /></View>}
                      <View>
                        <Avatar source={p.avatar} size={first ? 70 : 56} ring={ring} />
                        <View style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: ring,
                          alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }}>
                          <Text style={{ color: '#07070B', fontWeight: '900', fontSize: 12 }}>{p.rank}</Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.text, fontWeight: '900', marginTop: 8 }}>{p.name}</Text>
                      <Text style={{ color: first ? '#FFC83D' : colors.text, fontWeight: '800', fontSize: 13 }}>{p.time}</Text>
                      <Text style={{ fontSize: 18 }}>{p.flag}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 14 });
