import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/store/Auth';
import { ScreenHeader, Choice, Avatar } from '../../src/components/ui';
import { GradientButton } from '../../src/components/GradientButton';
import { ACTIVITIES, METRICS, loadFriends, searchUsers, createChallenge, randomMatch, avatarSource, flagOf, PublicProfile } from '../../src/lib/social';

export default function NewChallenge() {
  const { colors } = useTheme();
  const auth = useAuth();
  const me = auth.session?.user.id;
  const params = useLocalSearchParams<{ opponent?: string; random?: string }>();
  const premium = auth.isPremium;

  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [picked, setPicked] = useState<PublicProfile[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [activity, setActivity] = useState('run');
  const [metric, setMetric] = useState<'minutes' | 'sessions' | 'kcal' | 'km'>('minutes');
  const [target, setTarget] = useState('');
  const [days, setDays] = useState(7);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const random = params.random === '1';

  useEffect(() => {
    if (!me) return;
    loadFriends(me).then(l => {
      setFriends(l.friends);
      const pre = l.friends.find(f => f.id === params.opponent);
      if (pre) setPicked([pre]);
    }).catch(() => {});
  }, [me]);

  // Premium can challenge anyone: search all users
  useEffect(() => {
    if (!premium) return;
    const t = setTimeout(async () => setResults(await searchUsers(q).catch(() => [])), 300);
    return () => clearTimeout(t);
  }, [q, premium]);

  const toggle = (p: PublicProfile) => setPicked(cur => cur.some(x => x.id === p.id)
    ? cur.filter(x => x.id !== p.id)
    : premium ? [...cur, p] : [p]);

  const act = ACTIVITIES.find(a => a.key === activity)!;
  const scopeOf = (p: PublicProfile) => {
    const mine = auth.profile;
    if (!mine) return '';
    if (p.country !== mine.country) return 'International';
    if (mine.city && p.city && mine.city.trim().toLowerCase() === p.city.trim().toLowerCase()) return 'Same city · unlimited';
    return 'National';
  };

  async function submit() {
    setBusy(true);
    try {
      const t = parseFloat(target) || null;
      const id = random
        ? await randomMatch({ activity, metric, target: t, days })
        : await createChallenge({ opponents: picked.map(p => p.id), title: title.trim() || `${act.label} ${picked.length > 1 ? 'squad battle' : 'duel'}`,
            activity, metric, target: t, days });
      await auth.refresh();
      router.replace({ pathname: '/challenge/[id]', params: { id } });
    } catch (e: any) { Alert.alert('Could not create challenge', e?.message ?? 'Try again'); }
    setBusy(false);
  }

  if (!me) { router.replace('/login'); return null; }
  const q2 = auth.quota;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={random ? 'Random match' : 'New challenge'} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!premium && q2 && !random && (
          <View style={[card(colors), { borderColor: colors.cyan }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>This month: {q2.national_limit - q2.national_used} national · {q2.international_limit - q2.international_used} international left</Text>
            <Text style={{ color: colors.sub, fontSize: 12, marginTop: 4 }}>Same-city challenges are unlimited. 1v1 only. 👑 Premium: anyone, anywhere, groups, no limits.</Text>
          </View>
        )}

        {random ? (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>🎲 We'll pick an opponent for you</Text>
            <Text style={{ color: colors.sub, marginTop: 4 }}>{premium ? 'Anyone in the world who is open to matches.' : `Someone in ${auth.profile?.city || 'your city'} who is open to matches.`}</Text>
          </View>
        ) : (
          <View style={card(colors)}>
            <Text style={label(colors)}>{premium ? 'Who? (pick one, or many for a group)' : 'Pick a friend'}</Text>
            {picked.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {picked.map(p => <Choice key={p.id} label={`✓ @${p.username}`} selected onPress={() => toggle(p)} />)}
              </View>
            )}
            {premium && (
              <TextInput value={q} onChangeText={setQ} placeholder="Search anyone by @username" placeholderTextColor={colors.sub} autoCapitalize="none"
                style={{ backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, padding: 12, fontWeight: '600', marginBottom: 8 }} />
            )}
            {[...(premium ? results.filter(r => r.id !== me) : []), ...friends].filter((p, i, a) => a.findIndex(x => x.id === p.id) === i).slice(0, 25).map(p => {
              const sel = picked.some(x => x.id === p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                  <Avatar source={avatarSource(p.avatar)} name={p.display_name} size={38} ring={sel ? colors.lime : undefined} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>{p.display_name}</Text>
                    <Text style={{ color: colors.sub, fontSize: 12 }}>@{p.username} {flagOf(p.country)} · {scopeOf(p)}</Text>
                  </View>
                  <Ionicons name={sel ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={sel ? colors.lime : colors.sub} />
                </Pressable>
              );
            })}
            {friends.length === 0 && !premium && (
              <Pressable onPress={() => router.push('/friends')}><Text style={{ color: colors.cyan, fontWeight: '800' }}>No friends yet. Invite some →</Text></Pressable>
            )}
          </View>
        )}

        <View style={card(colors)}>
          <Text style={label(colors)}>Activity</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACTIVITIES.map(a => (
              <Pressable key={a.key} onPress={() => setActivity(a.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9,
                borderRadius: 14, backgroundColor: activity === a.key ? colors.lime : colors.surface2 }}>
                <MaterialCommunityIcons name={a.icon as any} size={18} color={activity === a.key ? colors.onAccent : colors.text} />
                <Text style={{ color: activity === a.key ? colors.onAccent : colors.text, fontWeight: '800' }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[label(colors), { marginTop: 14 }]}>Count by</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {METRICS.map(m => <Choice key={m.key} label={m.label} selected={metric === m.key} onPress={() => setMetric(m.key)} />)}
          </View>
          <Text style={[label(colors), { marginTop: 14 }]}>Goal (optional, empty = highest total wins)</Text>
          <TextInput value={target} onChangeText={t => setTarget(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad"
            placeholder={`e.g. ${metric === 'km' ? '25' : metric === 'kcal' ? '3000' : metric === 'sessions' ? '5' : '300'} ${metric}`} placeholderTextColor={colors.sub}
            style={{ backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, padding: 12, fontWeight: '700' }} />
          <Text style={[label(colors), { marginTop: 14 }]}>Duration</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 3, 7, 14, 30].map(d => <Choice flex key={d} label={`${d}d`} selected={days === d} onPress={() => setDays(d)} />)}
          </View>
          {!random && (
            <>
              <Text style={[label(colors), { marginTop: 14 }]}>Name (optional)</Text>
              <TextInput value={title} onChangeText={setTitle} maxLength={60} placeholder={`${act.label} ${picked.length > 1 ? 'squad battle' : 'duel'}`}
                placeholderTextColor={colors.sub} style={{ backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, padding: 12, fontWeight: '700' }} />
            </>
          )}
        </View>

        <GradientButton title={random ? 'Find my opponent' : picked.length > 1 ? `Start group battle (${picked.length + 1})` : 'Send challenge'}
          icon="flash" variant="neon" busy={busy} disabled={!random && picked.length === 0} onPress={submit} />
        <Text style={{ color: colors.sub, fontSize: 12, textAlign: 'center' }}>
          Duels start when your opponent accepts. Log progress in the challenge; opponents can flag suspicious entries.
        </Text>
      </ScrollView>
    </View>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14 });
const label = (c: any) => ({ color: c.text, fontWeight: '800' as const, marginBottom: 8 });
