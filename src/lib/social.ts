// Friends, challenges and leaderboards (Supabase). All rules are enforced by the database functions.
import { supabase, rpc, CloudProfile } from './supabase';
import { AVATARS, IMG } from './images';

export type PublicProfile = Pick<CloudProfile, 'id' | 'username' | 'display_name' | 'avatar' | 'city' | 'country' | 'xp' | 'is_premium'>;
const PUBLIC = 'id, username, display_name, avatar, city, country, xp, is_premium';

export function avatarSource(avatar?: string | null) {
  if (!avatar) return undefined;
  if (avatar === 'mrvyb') return IMG.mrvyb;
  const m = /^preset:(\d+)$/.exec(avatar);
  if (m) return AVATARS[Number(m[1])];
  if (avatar.startsWith('https://')) return { uri: avatar };
  return undefined;
}

export async function searchUsers(q: string): Promise<PublicProfile[]> {
  const term = q.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, '');
  if (!supabase || term.length < 2) return [];
  const { data } = await supabase.from('profiles').select(PUBLIC).ilike('username', `${term}%`).not('username', 'is', null).limit(20);
  return (data ?? []) as PublicProfile[];
}

export interface FriendLists { friends: PublicProfile[]; incoming: PublicProfile[]; outgoing: PublicProfile[] }

export async function loadFriends(me: string): Promise<FriendLists> {
  if (!supabase) return { friends: [], incoming: [], outgoing: [] };
  const { data: rows } = await supabase.from('friendships').select('requester, addressee, status');
  const ids = new Set<string>();
  (rows ?? []).forEach(r => ids.add(r.requester === me ? r.addressee : r.requester));
  const { data: profs } = ids.size
    ? await supabase.from('profiles').select(PUBLIC).in('id', [...ids])
    : { data: [] as PublicProfile[] };
  const byId = new Map((profs ?? []).map(p => [p.id, p as PublicProfile]));
  const out: FriendLists = { friends: [], incoming: [], outgoing: [] };
  (rows ?? []).forEach(r => {
    const other = byId.get(r.requester === me ? r.addressee : r.requester);
    if (!other) return;
    if (r.status === 'accepted') out.friends.push(other);
    else if (r.addressee === me) out.incoming.push(other);
    else out.outgoing.push(other);
  });
  out.friends.sort((a, b) => b.xp - a.xp);
  return out;
}

export const sendFriendRequest = (id: string) => rpc<string>('send_friend_request', { p_user: id });
export const respondFriend = (id: string, accept: boolean) => rpc('respond_friend_request', { p_user: id, p_accept: accept });
export const removeFriend = async (me: string, id: string) => {
  await supabase?.from('friendships').delete().or(`and(requester.eq.${me},addressee.eq.${id}),and(requester.eq.${id},addressee.eq.${me})`);
};
export const PENDING_INVITE_KEY = 'vybe-pending-invite';
export const acceptInvite = (code: string) => rpc<string>('accept_invite', { p_code: code });

/* ---------------- Challenges ---------------- */
export interface Challenge {
  id: string; creator: string; kind: 'duel' | 'group'; title: string; activity: string;
  metric: 'minutes' | 'sessions' | 'kcal' | 'km'; target: number | null; scope: string; duration_days: number;
  live_video: boolean; status: 'pending' | 'active' | 'finished' | 'cancelled'; starts_at: string | null; ends_at: string | null;
  winner: string | null; created_at: string;
}
export interface Member { challenge_id: string; user_id: string; status: string; temporary: boolean; progress: number; profile?: PublicProfile }
export interface Entry { id: number; user_id: string; value: number; source: string; note: string | null; flagged: boolean; created_at: string }

export const ACTIVITIES = [
  { key: 'run', label: 'Running', icon: 'run-fast' }, { key: 'walk', label: 'Walking', icon: 'walk' },
  { key: 'gym', label: 'Gym', icon: 'dumbbell' }, { key: 'swim', label: 'Swimming', icon: 'swim' },
  { key: 'cycling', label: 'Cycling', icon: 'bike' }, { key: 'yoga', label: 'Yoga', icon: 'meditation' },
  { key: 'any', label: 'Any workout', icon: 'lightning-bolt' },
];
export const METRICS = [
  { key: 'minutes', label: 'Minutes' }, { key: 'sessions', label: 'Sessions' }, { key: 'kcal', label: 'Calories burned' }, { key: 'km', label: 'Kilometres' },
] as const;

export async function myChallenges(me: string): Promise<{ c: Challenge; members: Member[] }[]> {
  if (!supabase) return [];
  const { data: mine } = await supabase.from('challenge_members').select('challenge_id').eq('user_id', me).neq('status', 'declined');
  const ids = (mine ?? []).map(m => m.challenge_id);
  if (!ids.length) return [];
  const [{ data: cs }, { data: ms }] = await Promise.all([
    supabase.from('challenges').select('*').in('id', ids).order('created_at', { ascending: false }).limit(60),
    supabase.from('challenge_members').select('*').in('challenge_id', ids),
  ]);
  const userIds = [...new Set((ms ?? []).map(m => m.user_id))];
  const { data: profs } = await supabase.from('profiles').select(PUBLIC).in('id', userIds);
  const pById = new Map((profs ?? []).map(p => [p.id, p as PublicProfile]));
  return (cs ?? []).map(c => ({
    c: c as Challenge,
    members: (ms ?? []).filter(m => m.challenge_id === c.id).map(m => ({ ...(m as Member), profile: pById.get(m.user_id) }))
      .sort((a, b) => b.progress - a.progress),
  }));
}

export async function challengeDetail(id: string) {
  if (!supabase) throw new Error('Accounts are not set up yet.');
  const [{ data: c, error }, { data: ms }, { data: es }] = await Promise.all([
    supabase.from('challenges').select('*').eq('id', id).single(),
    supabase.from('challenge_members').select('*').eq('challenge_id', id),
    supabase.from('challenge_entries').select('*').eq('challenge_id', id).order('created_at', { ascending: false }).limit(100),
  ]);
  if (error || !c) throw new Error('Challenge not found');
  const { data: profs } = await supabase.from('profiles').select(PUBLIC).in('id', (ms ?? []).map(m => m.user_id));
  const pById = new Map((profs ?? []).map(p => [p.id, p as PublicProfile]));
  return {
    c: c as Challenge,
    members: (ms ?? []).map(m => ({ ...(m as Member), profile: pById.get(m.user_id) })).sort((a, b) => b.progress - a.progress),
    entries: (es ?? []) as Entry[],
    profiles: pById,
  };
}

export const createChallenge = (a: { opponents: string[]; title: string; activity: string; metric: string; target: number | null; days: number; liveVideo?: boolean }) =>
  rpc<string>('create_challenge', { p_opponents: a.opponents, p_title: a.title, p_activity: a.activity, p_metric: a.metric,
    p_target: a.target ?? 0, p_days: a.days, p_live_video: !!a.liveVideo, p_random: false });
export const randomMatch = (a: { activity: string; metric: string; target: number | null; days: number }) =>
  rpc<string>('random_match', { p_activity: a.activity, p_metric: a.metric, p_target: a.target ?? 0, p_days: a.days });
export const respondChallenge = (id: string, accept: boolean) => rpc('respond_challenge', { p_challenge: id, p_accept: accept });
export const addEntry = (id: string, value: number, note?: string) => rpc('add_challenge_entry', { p_challenge: id, p_value: value, p_source: 'manual', p_note: note ?? null });
export const flagEntry = (id: number) => rpc('flag_entry', { p_entry: id });

export interface LeaderRow { rank: number; id: string; username: string; display_name: string; avatar: string | null; city: string | null; country: string; xp: number; is_me: boolean }
export const leaderboard = (scope: 'friends' | 'city' | 'country' | 'global') => rpc<LeaderRow[]>('leaderboard', { p_scope: scope });

export const flagOf = (cc?: string | null) =>
  cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65)) : '';

export function timeLeft(ends?: string | null) {
  if (!ends) return '';
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24;
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.floor(ms / 60000) % 60}m left`;
}
