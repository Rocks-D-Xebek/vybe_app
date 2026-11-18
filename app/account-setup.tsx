// After sign-in: choose @username, display name, city and country (needed for city / national / international rules).
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/store/Auth';
import { useApp } from '../src/store/AppStore';
import { ScreenHeader, Choice } from '../src/components/ui';
import { GradientButton } from '../src/components/GradientButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { acceptInvite, PENDING_INVITE_KEY } from '../src/lib/social';

export const COUNTRIES: [string, string][] = [
  ['IN', '🇮🇳 India'], ['US', '🇺🇸 USA'], ['GB', '🇬🇧 UK'], ['AE', '🇦🇪 UAE'], ['CA', '🇨🇦 Canada'], ['AU', '🇦🇺 Australia'],
  ['SG', '🇸🇬 Singapore'], ['DE', '🇩🇪 Germany'], ['SA', '🇸🇦 Saudi Arabia'], ['NZ', '🇳🇿 New Zealand'], ['MY', '🇲🇾 Malaysia'], ['NP', '🇳🇵 Nepal'],
];

export default function AccountSetup() {
  const { colors } = useTheme();
  const auth = useAuth();
  const app = useApp();
  const p = auth.profile;
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('IN');
  const [other, setOther] = useState('');
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!p) return;
    setUsername(p.username ?? suggest(app.profile.name || p.display_name));
    setName(p.display_name || app.profile.name);
    setCity(p.city ?? '');
    setCountry(p.country ?? 'IN');
    setOpen(p.open_to_match);
  }, [p?.id]);

  const valid = /^[a-z0-9_.]{3,20}$/.test(username);
  const finalCountry = country === 'OTHER' ? other.toUpperCase() : country;

  async function save() {
    if (!/^[A-Z]{2}$/.test(finalCountry)) { Alert.alert('Country', 'Enter a 2-letter country code, e.g. FR'); return; }
    setBusy(true);
    try {
      await auth.saveProfile({ username, display_name: name.trim() || username, city: city.trim(), country: finalCountry, open_to_match: open });
      if (!app.profile.name) app.updateProfile({ name: name.trim() || username });
      // Someone opened an invite link before signing up: make them friends now
      const pending = await AsyncStorage.getItem(PENDING_INVITE_KEY).catch(() => null);
      if (pending) { await acceptInvite(pending).catch(() => {}); await AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {}); }
      router.replace(pending ? '/friends' : '/(tabs)/race');
    } catch (e: any) { Alert.alert('Could not save', e?.message ?? 'Try again'); }
    setBusy(false);
  }

  const input = { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, color: colors.text,
    fontSize: 16, fontWeight: '700' as const, paddingHorizontal: 14, paddingVertical: 12 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Your VYBE ID" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.sub, lineHeight: 20 }}>Friends find you by your @username. Your city decides who counts as a local challenge.</Text>

        <Text style={label(colors)}>Username</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', ...input, paddingVertical: 0 }}>
          <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>@</Text>
          <TextInput value={username} onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))}
            autoCapitalize="none" style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 4 }} />
        </View>
        <Text style={{ color: valid ? colors.sub : colors.danger, fontSize: 12 }}>3–20 letters, numbers, _ or .</Text>

        <Text style={label(colors)}>Display name</Text>
        <TextInput value={name} onChangeText={setName} maxLength={40} style={input} placeholder="Your name" placeholderTextColor={colors.sub} />

        <Text style={label(colors)}>City</Text>
        <TextInput value={city} onChangeText={setCity} maxLength={60} style={input} placeholder="e.g. Hyderabad" placeholderTextColor={colors.sub} />

        <Text style={label(colors)}>Country</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {COUNTRIES.map(([c, l]) => <Choice key={c} label={l} selected={country === c} onPress={() => setCountry(c)} />)}
          <Choice label="Other" selected={country === 'OTHER'} onPress={() => setCountry('OTHER')} />
        </View>
        {country === 'OTHER' && (
          <TextInput value={other} onChangeText={t => setOther(t.replace(/[^a-zA-Z]/g, '').slice(0, 2))} autoCapitalize="characters"
            placeholder="2-letter code, e.g. FR" placeholderTextColor={colors.sub} style={input} />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Open to random matches</Text>
            <Text style={{ color: colors.sub, fontSize: 12 }}>Let people near you challenge you at random</Text>
          </View>
          <Switch value={open} onValueChange={setOpen} trackColor={{ true: colors.lime, false: colors.surface2 }} thumbColor="#FFFFFF" />
        </View>

        <View style={{ marginTop: 14 }}>
          <GradientButton title="Save & continue" icon="arrow-forward" variant="neon" busy={busy} disabled={!valid} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}

const suggest = (n: string) => (n || 'vyber').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) + Math.floor(Math.random() * 900 + 100);
const label = (c: any) => ({ color: c.text, fontWeight: '800' as const, marginTop: 8 });
