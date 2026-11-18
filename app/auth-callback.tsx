// Sign-in links (email link, Google) come back here: vybe://auth-callback?code=…
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { supabase } from '../src/lib/supabase';
import { Logo } from '../src/components/ui';

export default function AuthCallback() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [error, setError] = useState(params.error_description ?? '');

  useEffect(() => {
    (async () => {
      if (!supabase || !params.code) { if (!params.error_description) setError('Sign-in link is missing its code.'); return; }
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        const { error: e } = await supabase.auth.exchangeCodeForSession(params.code);
        if (e) { setError(e.message.includes('verifier') ? 'Open the link on the same phone where you asked for it.' : e.message); return; }
      }
      router.replace('/account-setup');
    })();
  }, [params.code]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }}>
      <Logo size={44} />
      {error ? (
        <>
          <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '700' }}>{error}</Text>
          <Pressable onPress={() => router.replace('/login')} style={{ backgroundColor: colors.lime, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 }}>
            <Text style={{ color: colors.onAccent, fontWeight: '900' }}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 22 }}>Signing you in…</Text>
          <ActivityIndicator color={colors.lime} />
        </>
      )}
    </View>
  );
}
