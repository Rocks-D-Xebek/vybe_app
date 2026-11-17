import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ImageBackground, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, FONT } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';
import { Logo, Avatar, Crown, Choice } from '../../src/components/ui';
import { GradientButton } from '../../src/components/GradientButton';
import { PreviewBanner } from '../../src/components/PreviewBanner';
import { IMG, AVATARS } from '../../src/lib/images';

// NOTE: sample data until the Race backend (Phase 4). Clearly labelled in the UI.
const PODIUM = [
  { rank: 2, name: 'Sara', time: '00:22:49', flag: '🇮🇳', avatar: AVATARS[0] },
  { rank: 1, name: 'Kenji', time: '00:22:31', flag: '🇯🇵', avatar: AVATARS[1] },
  { rank: 3, name: 'Maria', time: '00:23:10', flag: '🇺🇸', avatar: AVATARS[2] },
];
const ROWS = [
  { rank: 4, name: 'Liam', time: '00:23:41', flag: '🇧🇷', avatar: AVATARS[3] },
  { rank: 5, name: 'Priya', time: '00:24:05', flag: '🇬🇧', avatar: AVATARS[5] },
  { rank: 6, name: 'Rohan', time: '00:24:30', flag: '🇮🇳', avatar: AVATARS[4] },
];
const BADGES = [
  { icon: 'medal', label: 'First 5K', color: '#FFC83D' },
  { icon: 'fire', label: '7-day streak', color: '#FF6A3D' },
  { icon: 'lightning-bolt', label: 'Sub-25 5K', color: '#C8FF00' },
  { icon: 'diamond-stone', label: '100 km club', color: '#22E4FF' },
  { icon: 'crown', label: 'Top 3', color: '#A855F7' },
] as const;

function untilSunday() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  end.setHours(23, 59, 59, 0);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return { d: Math.floor(ms / 86400000), h: Math.floor(ms / 3600000) % 24, m: Math.floor(ms / 60000) % 60 };
}

export default function Race() {
  const { colors } = useTheme();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState('Leaderboard');
  const [left, setLeft] = useState(untilSunday());

  useEffect(() => {
    const t = setInterval(() => setLeft(untilSunday()), 30000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Logo size={30} tagline={false} />
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>Global Race</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <PreviewBanner text="Races launch soon. Runners and prizes below are sample data." />
      </View>

      {/* Hero */}
      <View style={{ marginHorizontal: 16, marginTop: 14, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.purple }}>
        <ImageBackground source={IMG.raceHero} style={{ width: '100%', height: 250 }} resizeMode="cover">
          <LinearGradient colors={['rgba(7,7,11,0.95)', 'rgba(7,7,11,0.4)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 0.9, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ padding: 18, flex: 1 }}>
            <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 18, transform: [{ rotate: '-4deg' }] }}>GLOBAL RACE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 36, lineHeight: 40, transform: [{ rotate: '-4deg' }] }}>MOVE</Text>
              <View style={{ marginLeft: 6, transform: [{ rotate: '15deg' }] }}><Crown size={24} /></View>
            </View>
            <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 36, lineHeight: 40, transform: [{ rotate: '-4deg' }] }}>DIFFERENT.</Text>
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={{ color: '#E6E6EE', fontSize: 12, lineHeight: 17, fontWeight: '600' }}>
                Same planet.{'\n'}Different paces.{'\n'}One <Text style={{ color: colors.lime, fontWeight: '900' }}>VYBE</Text>.
              </Text>
              <View style={{ backgroundColor: 'rgba(7,7,11,0.85)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: '#CFCFDA', fontSize: 11, textAlign: 'center' }}>Race ends in</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>
                  {pad(left.d)} : {pad(left.h)} : {pad(left.m)}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {['Days', 'Hrs', 'Mins'].map(l => <Text key={l} style={{ color: '#9A9AB0', fontSize: 10 }}>{l}</Text>)}
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Stats + join */}
        <View style={{ backgroundColor: colors.surface, padding: 14, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[['location', '5 KM', 'Distance'], ['people', '24,892', 'Runners'], ['trophy', 'Top 3 win', 'Gift cards']].map(([i, v, l]) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={i as any} size={20} color={i === 'trophy' ? '#FFC83D' : colors.lime} />
                <View>
                  <Text style={{ color: colors.text, fontWeight: '900' }}>{v}</Text>
                  <Text style={{ color: colors.sub, fontSize: 11 }}>{l}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <GradientButton title={joined ? "You're in! ✓" : 'Join Global Race'} icon={joined ? undefined : 'arrow-forward'}
                variant="lime" onPress={() => {
                  setJoined(j => !j);
                  if (!joined) Alert.alert('Preview', 'Race registration opens with the Race launch. We saved your interest!');
                }} />
            </View>
            <Pressable onPress={() => Share.share({ message: 'Join me on VYBE — Move different. 🏁' })}
              style={{ width: 56, borderRadius: 18, borderWidth: 1.5, borderColor: colors.purple, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="share-social" size={22} color={colors.purple} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 20 }}>
        {['Leaderboard', 'Friends', 'Countries', 'Prizes'].map(t => <Choice key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />)}
      </View>

      {/* Podium */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingHorizontal: 16, marginTop: 22 }}>
        {PODIUM.map(p => {
          const first = p.rank === 1;
          const ring = first ? '#FFC83D' : p.rank === 2 ? colors.cyan : colors.magenta;
          return (
            <View key={p.rank} style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20,
              paddingTop: first ? 14 : 10, paddingBottom: 14, borderWidth: first ? 2 : 1, borderColor: first ? '#FFC83D' : colors.border,
              marginBottom: first ? 18 : 0 }}>
              {first && <View style={{ position: 'absolute', top: -20 }}><Crown size={34} color="#FFC83D" /></View>}
              <View>
                <Avatar source={p.avatar} size={first ? 74 : 60} ring={ring} />
                <View style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: ring,
                  alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }}>
                  <Text style={{ color: '#07070B', fontWeight: '900', fontSize: 12 }}>{p.rank}</Text>
                </View>
              </View>
              <Text style={{ color: colors.text, fontWeight: '900', marginTop: 8 }}>{p.name}</Text>
              <Text style={{ color: first ? '#FFC83D' : colors.text, fontWeight: '800', fontSize: first ? 15 : 13 }}>{p.time}</Text>
              <Text style={{ fontSize: 18, marginTop: 2 }}>{p.flag}</Text>
            </View>
          );
        })}
      </View>

      {/* Rows */}
      <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {ROWS.map((r, i) => (
          <View key={r.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <Text style={{ color: colors.sub, fontWeight: '900', width: 28 }}>{r.rank}</Text>
            <Avatar source={r.avatar} size={36} />
            <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{r.name}</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{r.time}</Text>
            <Text style={{ fontSize: 18 }}>{r.flag}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18,
        borderWidth: 2, borderColor: colors.lime, backgroundColor: colors.lime + '14' }}>
        <Text style={{ color: colors.lime, fontWeight: '900', width: 28 }}>{joined ? '—' : '–'}</Text>
        <Avatar name={profile.name} size={36} ring={colors.lime} />
        <Text style={{ color: colors.text, fontWeight: '900', flex: 1 }}>You</Text>
        <Text style={{ color: colors.sub, fontWeight: '700' }}>{joined ? 'Starts soon' : 'Not joined'}</Text>
        <Text style={{ fontSize: 18 }}>🇮🇳</Text>
      </View>

      {/* Badges */}
      <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: 12 }}>Badges to unlock</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {BADGES.map(b => (
            <View key={b.label} style={{ width: 92, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 70, height: 70, borderRadius: 22, transform: [{ rotate: '45deg' }], backgroundColor: colors.surface,
                borderWidth: 2, borderColor: b.color, alignItems: 'center', justifyContent: 'center',
                shadowColor: b.color, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 }}>
                <View style={{ transform: [{ rotate: '-45deg' }] }}>
                  <MaterialCommunityIcons name={b.icon} size={30} color={b.color} />
                </View>
              </View>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{b.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
