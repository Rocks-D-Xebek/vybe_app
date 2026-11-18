import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Share, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/store/Auth';
import { INVITE_BASE } from '../src/lib/supabase';
import { ScreenHeader, Avatar } from '../src/components/ui';
import { searchUsers, loadFriends, sendFriendRequest, respondFriend, removeFriend, avatarSource, flagOf, PublicProfile, FriendLists } from '../src/lib/social';

export default function Friends() {
  const { colors } = useTheme();
  const auth = useAuth();
  const me = auth.session?.user.id;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [lists, setLists] = useState<FriendLists>({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try { setLists(await loadFriends(me)); } catch {}
    setLoading(false);
  }, [me]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setTimeout(async () => setResults(await searchUsers(q).catch(() => [])), 300);
    return () => clearTimeout(t);
  }, [q]);

  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Friends" />
        <View style={{ padding: 24, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Sign in to add friends and challenge them.</Text>
          <Pressable onPress={() => router.push('/login')} style={{ backgroundColor: colors.lime, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.onAccent, fontWeight: '900' }}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const link = INVITE_BASE + (auth.profile?.invite_code ?? '');
  const isFriend = (id: string) => lists.friends.some(f => f.id === id);
  const isPending = (id: string) => lists.outgoing.some(f => f.id === id);

  const Row = ({ p, right }: { p: PublicProfile; right?: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Avatar source={avatarSource(p.avatar)} name={p.display_name} size={44} ring={p.is_premium ? '#FFC83D' : colors.purple} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{p.display_name} {p.is_premium ? '👑' : ''}</Text>
        <Text style={{ color: colors.sub, fontSize: 12 }}>@{p.username} · {p.city ?? '—'} {flagOf(p.country)} · {p.xp} XP</Text>
      </View>
      {right}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Friends" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.lime} />}>
        {/* Invite */}
        <View style={[card(colors), { borderColor: colors.lime }]}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Invite your squad</Text>
          <Text style={{ color: colors.sub, marginTop: 4 }}>Anyone who opens your link becomes your friend instantly.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable onPress={() => Share.share({ message: `Race me on VYBE 🏁 Add me: ${link}  (or search @${auth.profile?.username})` })}
              style={{ flex: 1, backgroundColor: colors.lime, borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="whatsapp" size={20} color={colors.onAccent} />
              <Text style={{ color: colors.onAccent, fontWeight: '900' }}>Share invite</Text>
            </Pressable>
            <View style={{ backgroundColor: colors.surface2, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>@{auth.profile?.username ?? '…'}</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.purple, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={20} color={colors.sub} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search @username" placeholderTextColor={colors.sub} autoCapitalize="none"
            style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', paddingVertical: 13, paddingHorizontal: 8 }} />
        </View>
        {results.filter(r => r.id !== me).length > 0 && (
          <View style={card(colors)}>
            {results.filter(r => r.id !== me).map(p => (
              <Row key={p.id} p={p} right={isFriend(p.id) ? <Text style={{ color: colors.lime, fontWeight: '800' }}>Friends ✓</Text>
                : isPending(p.id) ? <Text style={{ color: colors.sub, fontWeight: '700' }}>Requested</Text>
                : <Pressable onPress={async () => {
                    try { const r = await sendFriendRequest(p.id); Alert.alert(r === 'accepted' ? 'You are now friends 🎉' : 'Request sent 👋'); load(); }
                    catch (e: any) { Alert.alert('Oops', e.message); }
                  }} style={{ backgroundColor: colors.lime, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: colors.onAccent, fontWeight: '900' }}>Add</Text>
                  </Pressable>} />
            ))}
          </View>
        )}

        {/* Requests */}
        {lists.incoming.length > 0 && (
          <View style={card(colors)}>
            <Text style={title(colors)}>Friend requests</Text>
            {lists.incoming.map(p => (
              <Row key={p.id} p={p} right={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={async () => { await respondFriend(p.id, true).catch(() => {}); load(); }}
                    style={{ backgroundColor: colors.lime, borderRadius: 12, padding: 8 }}><Ionicons name="checkmark" size={18} color={colors.onAccent} /></Pressable>
                  <Pressable onPress={async () => { await respondFriend(p.id, false).catch(() => {}); load(); }}
                    style={{ backgroundColor: colors.surface2, borderRadius: 12, padding: 8 }}><Ionicons name="close" size={18} color={colors.text} /></Pressable>
                </View>} />
            ))}
          </View>
        )}

        {/* Friends */}
        <View style={card(colors)}>
          <Text style={title(colors)}>My friends ({lists.friends.length})</Text>
          {loading && !lists.friends.length ? <ActivityIndicator color={colors.lime} /> : lists.friends.length === 0 ? (
            <Text style={{ color: colors.sub }}>No friends yet. Share your invite link on WhatsApp 👆</Text>
          ) : lists.friends.map(p => (
            <Row key={p.id} p={p} right={
              <Pressable onPress={() => router.push({ pathname: '/challenge/new', params: { opponent: p.id } })}
                onLongPress={() => Alert.alert('Remove friend?', `Remove ${p.display_name}?`, [{ text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => { await removeFriend(me, p.id); load(); } }])}
                style={{ backgroundColor: colors.purple, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>⚔️ Challenge</Text>
              </Pressable>} />
          ))}
        </View>
        {lists.outgoing.length > 0 && (
          <Text style={{ color: colors.sub, fontSize: 12 }}>Waiting for: {lists.outgoing.map(o => '@' + o.username).join(', ')}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14 });
const title = (c: any) => ({ color: c.text, fontWeight: '900' as const, fontSize: 16, marginBottom: 4 });
