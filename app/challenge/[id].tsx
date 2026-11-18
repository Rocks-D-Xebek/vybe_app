import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, RefreshControl, Share } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, FONT } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/store/Auth';
import { useApp } from '../../src/store/AppStore';
import { ScreenHeader, Avatar, Crown, Choice } from '../../src/components/ui';
import { dayKey } from '../../src/lib/dates';
import { challengeDetail, respondChallenge, addEntry, flagEntry, avatarSource, flagOf, timeLeft, ACTIVITIES, Challenge, Member, Entry, PublicProfile } from '../../src/lib/social';

export default function ChallengeDetail() {
  const { colors } = useTheme();
  const auth = useAuth();
  const app = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = auth.session?.user.id;
  const [d, setD] = useState<{ c: Challenge; members: Member[]; entries: Entry[]; profiles: Map<string, PublicProfile> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setD(await challengeDetail(id)); } catch (e: any) { Alert.alert('Oops', e.message); }
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!d) return <View style={{ flex: 1, backgroundColor: colors.bg }}><ScreenHeader title="Challenge" /></View>;
  const { c, members, entries, profiles } = d;
  const mine = members.find(m => m.user_id === me);
  const act = ACTIVITIES.find(a => a.key === c.activity);
  const leader = members.filter(m => m.status === 'accepted')[0];
  const unit = c.metric === 'km' ? 'km' : c.metric === 'kcal' ? 'kcal' : c.metric === 'sessions' ? 'sessions' : 'min';
  const max = Math.max(c.target ?? 0, ...members.map(m => m.progress), 1);

  // Quick-add from today's logged workouts that match this challenge
  const todays = app.workouts.filter(w => dayKey(new Date(w.at)) === dayKey()).filter(w => {
    const t = (w.parts?.map(p => p.activity).join(' ') ?? w.type).toLowerCase();
    return c.activity === 'any' || t.includes(c.activity) || (c.activity === 'gym' && /gym|weight|boxing|hiit|cardio/.test(t))
      || (c.activity === 'swim' && t.includes('swim')) || (c.activity === 'cycling' && t.includes('cycl'));
  });
  const quickValue = (w: typeof todays[number]) => c.metric === 'minutes' ? w.minutes : c.metric === 'kcal' ? w.kcal : c.metric === 'sessions' ? 1 : 0;

  async function submit(v: number, note?: string) {
    if (!v || v <= 0) return;
    setBusy(true);
    try { await addEntry(c.id, v, note); setValue(''); await load(); }
    catch (e: any) { Alert.alert('Could not add', e.message); }
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={c.kind === 'group' ? 'Squad battle' : 'Duel'}
        right={<Pressable onPress={() => Share.share({ message: `I'm in a ${act?.label ?? c.activity} challenge on VYBE: "${c.title}" 🔥 Move different.` })}>
          <Ionicons name="share-social" size={22} color={colors.text} /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.lime} />}>
        <LinearGradient colors={[colors.purple, colors.magenta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name={(act?.icon ?? 'lightning-bolt') as any} size={22} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFFCC', fontWeight: '800', letterSpacing: 1 }}>{(act?.label ?? c.activity).toUpperCase()} · {c.scope.toUpperCase()}</Text>
          </View>
          <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 28, marginTop: 6 }}>{c.title}</Text>
          <Text style={{ color: '#FFFFFFDD', marginTop: 4, fontWeight: '600' }}>
            {c.target ? `First to ${c.target} ${unit}` : `Most ${unit} wins`} · {c.status === 'active' ? timeLeft(c.ends_at)
              : c.status === 'pending' ? 'waiting for opponent' : c.status === 'finished' ? 'finished' : 'cancelled'}
          </Text>
          {c.status === 'finished' && c.winner && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <Crown size={24} color="#FFC83D" />
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
                {c.winner === me ? 'You won! 🏆' : `${profiles.get(c.winner)?.display_name ?? 'Someone'} won`}
              </Text>
            </View>
          )}
        </LinearGradient>

        {mine?.status === 'invited' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Choice flex label="✓ Accept" selected onPress={async () => { await respondChallenge(c.id, true).catch(e => Alert.alert('Oops', e.message)); load(); }} /></View>
            <View style={{ flex: 1 }}><Choice flex label="Decline" onPress={async () => { await respondChallenge(c.id, false).catch(() => {}); router.back(); }} /></View>
          </View>
        )}

        {/* Standings */}
        <View style={card(colors)}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 6 }}>Standings</Text>
          {members.filter(m => m.status !== 'declined').map((m, i) => {
            const p = m.profile;
            return (
              <View key={m.user_id} style={{ paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: i === 0 ? '#FFC83D' : colors.sub, fontWeight: '900', width: 18 }}>{i + 1}</Text>
                  <Avatar source={avatarSource(p?.avatar)} name={p?.display_name} size={36} ring={m === leader && m.progress > 0 ? '#FFC83D' : undefined} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>{m.user_id === me ? 'You' : p?.display_name} {flagOf(p?.country)}</Text>
                    <Text style={{ color: colors.sub, fontSize: 11 }}>
                      {m.status === 'invited' ? 'invited' : m.status === 'removed' ? 'guest (left after event)' : `@${p?.username}`}{m.temporary && m.status !== 'removed' ? ' · guest' : ''}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '900' }}>{Math.round(m.progress * 10) / 10} {unit}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 6, marginLeft: 28, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.min(100, (m.progress / max) * 100)}%`, backgroundColor: m.user_id === me ? colors.lime : colors.purple }} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Log progress */}
        {c.status === 'active' && mine?.status === 'accepted' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Log progress</Text>
            {todays.filter(w => quickValue(w) > 0).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {todays.filter(w => quickValue(w) > 0).map(w => (
                  <Choice key={w.id} label={`+ ${quickValue(w)} ${unit} · ${w.type}`} onPress={() => submit(quickValue(w), w.type)} />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput value={value} onChangeText={t => setValue(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder={`${unit} done`}
                placeholderTextColor={colors.sub} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 12, color: colors.text, padding: 12, fontWeight: '800' }} />
              <Pressable onPress={() => submit(parseFloat(value))} disabled={busy}
                style={{ backgroundColor: colors.lime, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                <Text style={{ color: colors.onAccent, fontWeight: '900' }}>Add</Text>
              </Pressable>
            </View>
            <Text style={{ color: colors.sub, fontSize: 11, marginTop: 8 }}>
              Play fair: your opponents can see and flag every entry. GPS-verified runs and live video gym battles are coming next.
            </Text>
          </View>
        )}

        {/* Activity feed */}
        {entries.length > 0 && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 6 }}>Activity</Text>
            {entries.map(e => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, opacity: e.flagged ? 0.5 : 1 }}>
                <Text style={{ color: colors.text, flex: 1 }}>
                  <Text style={{ fontWeight: '800' }}>{e.user_id === me ? 'You' : profiles.get(e.user_id)?.display_name}</Text> +{e.value} {unit}
                  {e.note ? <Text style={{ color: colors.sub }}> · {e.note}</Text> : null}
                  {e.flagged ? <Text style={{ color: colors.danger }}> · flagged</Text> : null}
                </Text>
                <Text style={{ color: colors.sub, fontSize: 11 }}>{new Date(e.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
                {e.user_id !== me && !e.flagged && c.status === 'active' && (
                  <Pressable hitSlop={8} onPress={() => Alert.alert('Flag this entry?', 'Flagged entries stop counting. Only flag if it looks fake.', [
                    { text: 'Cancel', style: 'cancel' }, { text: 'Flag', style: 'destructive', onPress: async () => { await flagEntry(e.id).catch(x => Alert.alert('Oops', x.message)); load(); } }])}>
                    <Ionicons name="flag-outline" size={16} color={colors.sub} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14 });
