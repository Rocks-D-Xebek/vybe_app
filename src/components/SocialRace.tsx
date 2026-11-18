// Race tab: 1v1 / group challenges with friends, monthly limits, leaderboards.
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../store/Auth';
import { useApp } from '../store/AppStore';
import { cloudReady } from '../lib/supabase';
import { myChallenges, leaderboard, avatarSource, flagOf, timeLeft, ACTIVITIES, Challenge, Member, LeaderRow } from '../lib/social';
import { Avatar, Choice, Crown } from './ui';

type Scope = 'friends' | 'city' | 'country' | 'global';

export function SocialRace() {
  const { colors } = useTheme();
  const auth = useAuth();
  const app = useApp();
  const me = auth.session?.user.id;
  const [list, setList] = useState<{ c: Challenge; members: Member[] }[] | null>(null);
  const [scope, setScope] = useState<Scope>('friends');
  const [board, setBoard] = useState<LeaderRow[] | null>(null);

  const load = useCallback(async (s: Scope = scope) => {
    if (!me) return;
    myChallenges(me).then(setList).catch(() => setList([]));
    leaderboard(s).then(setBoard).catch(() => setBoard([]));
    auth.refresh().catch(() => {});
  }, [me, scope]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Not configured yet / signed out
  if (!cloudReady || !me) {
    const streak = app.openStreak();
    return (
      <LinearGradient colors={['#14142A', '#0B0B12']} style={{ borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: colors.cyan, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="sword-cross" size={22} color={colors.cyan} />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', flex: 1 }}>Challenge friends</Text>
        </View>
        <Text style={{ color: '#D8D8E4', lineHeight: 20 }}>
          Run, walk, swim, gym: 1v1 with anyone in your city for free, or a random match. Plus 5 national and 3 international challenges every month.
        </Text>
        <Text style={{ color: '#CFCFDA', fontSize: 12 }}>🔥 Login streak {streak}d · 7 days → +1 national · 30 days → +3 national +2 international</Text>
        <Pressable onPress={() => router.push('/login')} disabled={!cloudReady}
          style={{ backgroundColor: colors.cyan, borderRadius: 14, paddingVertical: 12, alignItems: 'center', opacity: cloudReady ? 1 : 0.5 }}>
          <Text style={{ color: '#07070B', fontWeight: '900' }}>{cloudReady ? 'Sign in to start battling' : 'Accounts launch soon'}</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (auth.profile && !auth.profile.username) {
    return (
      <Pressable onPress={() => router.push('/account-setup')} style={[card(colors), { borderColor: colors.lime }]}>
        <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Pick your @username to start challenging →</Text>
      </Pressable>
    );
  }

  const q = auth.quota;
  const invites = (list ?? []).filter(x => x.members.some(m => m.user_id === me && m.status === 'invited') && x.c.status !== 'cancelled' && x.c.status !== 'finished');
  const live = (list ?? []).filter(x => (x.c.status === 'active' || x.c.status === 'pending') && !invites.includes(x));
  const done = (list ?? []).filter(x => x.c.status === 'finished').slice(0, 5);

  const ChallengeRow = ({ c, members }: { c: Challenge; members: Member[] }) => {
    const act = ACTIVITIES.find(a => a.key === c.activity);
    const others = members.filter(m => m.user_id !== me && m.status !== 'declined');
    const meM = members.find(m => m.user_id === me);
    const lead = members[0];
    return (
      <Pressable onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={(act?.icon ?? 'lightning-bolt') as any} size={22} color={c.kind === 'group' ? '#FFC83D' : colors.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{c.title}</Text>
          <Text style={{ color: colors.sub, fontSize: 12 }} numberOfLines={1}>
            vs {others.length === 1 ? others[0].profile?.display_name : `${others.length} people`} ·{' '}
            {c.status === 'pending' ? 'waiting' : c.status === 'finished' ? (c.winner === me ? 'you won 🏆' : 'finished') : timeLeft(c.ends_at)}
          </Text>
        </View>
        {c.status === 'active' && (
          <Text style={{ color: lead?.user_id === me ? colors.lime : colors.text, fontWeight: '900' }}>
            {lead?.user_id === me ? 'Leading' : `${Math.round(meM?.progress ?? 0)}`}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.sub} />
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Actions + limits */}
      <LinearGradient colors={['#14142A', '#0B0B12']} style={{ borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: colors.cyan, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="sword-cross" size={22} color={colors.cyan} />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', flex: 1 }}>Battle your squad</Text>
          {auth.isPremium && <MaterialCommunityIcons name="crown" size={22} color="#FFC83D" />}
        </View>
        {q && !auth.isPremium && (
          <Text style={{ color: '#CFCFDA', fontSize: 12 }}>
            This month: {Math.max(0, q.national_limit - q.national_used)}/{q.national_limit} national · {Math.max(0, q.international_limit - q.international_used)}/{q.international_limit} international left · city = unlimited · 🔥 streak {q.login_streak}d
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn icon="flash" label="Challenge" color={colors.lime} onPress={() => router.push('/challenge/new')} />
          <Btn icon="dice-5" label="Random" color={colors.magenta} onPress={() => router.push({ pathname: '/challenge/new', params: { random: '1' } })} />
          <Btn icon="account-group" label="Friends" color={colors.cyan} onPress={() => router.push('/friends')} />
        </View>
      </LinearGradient>

      {list === null ? <ActivityIndicator color={colors.lime} /> : (
        <>
          {invites.length > 0 && (
            <View style={[card(colors), { borderColor: colors.magenta }]}>
              <Text style={title(colors)}>⚔️ You've been challenged ({invites.length})</Text>
              {invites.map(x => <ChallengeRow key={x.c.id} {...x} />)}
            </View>
          )}
          <View style={card(colors)}>
            <Text style={title(colors)}>Live battles</Text>
            {live.length ? live.map(x => <ChallengeRow key={x.c.id} {...x} />)
              : <Text style={{ color: colors.sub }}>No battles yet. Challenge a friend or hit Random 🎲</Text>}
          </View>
          {done.length > 0 && (
            <View style={card(colors)}>
              <Text style={title(colors)}>Recent results</Text>
              {done.map(x => <ChallengeRow key={x.c.id} {...x} />)}
            </View>
          )}
        </>
      )}

      {/* Leaderboard */}
      <View style={card(colors)}>
        <Text style={title(colors)}>Leaderboard · XP</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {(['friends', 'city', 'country', 'global'] as Scope[]).map(s => (
            <Choice key={s} label={s[0].toUpperCase() + s.slice(1)} selected={scope === s} onPress={() => { setScope(s); setBoard(null); load(s); }} />
          ))}
        </View>
        {board === null ? <ActivityIndicator color={colors.lime} /> : board.length === 0 ? (
          <Text style={{ color: colors.sub }}>{scope === 'city' && !auth.profile?.city ? 'Add your city in Profile to see your city ranking.' : 'Nobody here yet.'}</Text>
        ) : board.map(r => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 12,
            backgroundColor: r.is_me ? colors.lime + '18' : 'transparent', borderWidth: r.is_me ? 1.5 : 0, borderColor: colors.lime, marginTop: r.is_me && r.rank > 50 ? 8 : 0 }}>
            <View style={{ width: 28, alignItems: 'center' }}>
              {r.rank <= 3 ? <Crown size={18} color={['#FFC83D', '#C0C0D0', '#E08A4B'][r.rank - 1]} /> : <Text style={{ color: colors.sub, fontWeight: '900' }}>{r.rank}</Text>}
            </View>
            <Avatar source={avatarSource(r.avatar)} name={r.display_name} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{r.is_me ? 'You' : r.display_name} {flagOf(r.country)}</Text>
              <Text style={{ color: colors.sub, fontSize: 11 }}>@{r.username}{r.city ? ` · ${r.city}` : ''}</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '900' }}>{r.xp.toLocaleString()} XP</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Btn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: color, borderRadius: 14, paddingVertical: 11, alignItems: 'center', gap: 2 }}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#07070B" />
      <Text style={{ color: '#07070B', fontWeight: '900', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14 });
const title = (c: any) => ({ color: c.text, fontWeight: '900' as const, fontSize: 16, marginBottom: 4 });
