// Opened from an invite link (vybe://invite/CODE). Signs in if needed, then makes you friends.
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FONT } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/store/Auth';
import { acceptInvite, PENDING_INVITE_KEY } from '../../src/lib/social';
import { Logo } from '../../src/components/ui';

export default function Invite() {
  const { colors } = useTheme();
  const auth = useAuth();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [msg, setMsg] = useState('Adding your friend…');

  useEffect(() => {
    if (!auth.ready || !code) return;
    if (!auth.session) {
      AsyncStorage.setItem(PENDING_INVITE_KEY, code).catch(() => {});
      setMsg('Sign in to accept the invite');
      return;
    }
    acceptInvite(code).then(() => setMsg("You're friends now! 🎉")).catch(e => setMsg(e.message));
  }, [auth.ready, auth.session?.user.id, code]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }}>
      <Logo size={44} />
      <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 22, textAlign: 'center' }}>{msg}</Text>
      {msg.startsWith('Adding') ? <ActivityIndicator color={colors.lime} /> : (
        <Pressable onPress={() => router.replace(auth.session ? '/friends' : '/login')}
          style={{ backgroundColor: colors.lime, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 }}>
          <Text style={{ color: colors.onAccent, fontWeight: '900' }}>{auth.session ? 'See friends' : 'Sign in'}</Text>
        </Pressable>
      )}
    </View>
  );
}
