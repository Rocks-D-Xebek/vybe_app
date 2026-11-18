import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PurchasesPackage } from 'react-native-purchases';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useAuth } from '../src/store/Auth';
import { ScreenHeader } from '../src/components/ui';
import { GradientButton } from '../src/components/GradientButton';
import { IMG } from '../src/lib/images';
import { billingReady, getPackages, buy, restore } from '../src/lib/purchases';

const PERKS: [string, string, string][] = [
  ['account-tie', 'Personal AI plan', 'Mr. Vyb builds your diet + workout plan and coaches you every day'],
  ['earth', 'Challenge anyone, anywhere', 'Not just friends: any VYBE user in any country'],
  ['account-group', 'Group battles', 'Squad challenges of any size; invite free friends as guests'],
  ['infinity', 'Unlimited challenges', 'No monthly national or international limits'],
  ['trophy', 'Global Race', 'Weekly worldwide races and leaderboards'],
  ['crown', 'Gold crown', 'Stand out on every leaderboard'],
];

export default function Premium() {
  const { colors } = useTheme();
  const auth = useAuth();
  const [pkgs, setPkgs] = useState<PurchasesPackage[] | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getPackages().then(p => { setPkgs(p); setSel(Math.max(0, p.findIndex(x => x.packageType === 'ANNUAL'))); }).catch(() => setPkgs([])); }, []);

  async function purchase() {
    if (!auth.session) { router.push('/login'); return; }
    const pkg = pkgs?.[sel]; if (!pkg) return;
    setBusy(true);
    try {
      if (await buy(pkg)) {
        // The server is updated by the RevenueCat webhook; give it a moment
        setTimeout(() => auth.refresh(), 4000);
        Alert.alert('Welcome to Premium 👑', 'Everything is unlocked. Mr. Vyb is ready to build your plan.');
        router.back();
      }
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Purchase failed', e?.message ?? 'Try again');
    }
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="VYBE Premium" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#FFC83D' }}>
          <ImageBackground source={IMG.mrvyb} style={{ width: '100%', height: 200, justifyContent: 'flex-end' }} resizeMode="cover">
            <LinearGradient colors={['transparent', 'rgba(7,7,11,0.95)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }} />
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="crown" size={30} color="#FFC83D" />
              <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 28 }}>Go <Text style={{ color: '#FFC83D' }}>Premium</Text></Text>
            </View>
          </ImageBackground>
        </View>

        {auth.isPremium && (
          <View style={{ backgroundColor: '#FFC83D22', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FFC83D' }}>
            <Text style={{ color: colors.text, fontWeight: '900' }}>👑 You're Premium. Thanks for supporting VYBE!</Text>
          </View>
        )}

        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
          {PERKS.map(([icon, t, d]) => (
            <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFC83D22', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={icon as any} size={22} color="#FFC83D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '900' }}>{t}</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>{d}</Text>
              </View>
            </View>
          ))}
        </View>

        {!billingReady ? (
          <Text style={{ color: colors.sub, textAlign: 'center' }}>Payments open when VYBE launches on Google Play.</Text>
        ) : pkgs === null ? <ActivityIndicator color="#FFC83D" /> : pkgs.length === 0 ? (
          <Text style={{ color: colors.sub, textAlign: 'center' }}>Plans are loading from Google Play. Try again shortly.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {pkgs.map((p, i) => (
              <Pressable key={p.identifier} onPress={() => setSel(i)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18,
                borderWidth: 2, borderColor: sel === i ? '#FFC83D' : colors.border, backgroundColor: sel === i ? '#FFC83D14' : colors.surface }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>{p.product.title.replace(/\(.*\)$/, '').trim() || p.identifier}</Text>
                  <Text style={{ color: colors.sub, fontSize: 12 }}>{p.product.description}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>{p.product.priceString}</Text>
              </Pressable>
            ))}
            <GradientButton title={auth.session ? 'Unlock Premium' : 'Sign in to buy'} icon="diamond" variant="purple" busy={busy} onPress={purchase} />
          </View>
        )}
        {billingReady && (
          <Pressable onPress={async () => { const ok = await restore().catch(() => false); if (ok) auth.refresh(); Alert.alert(ok ? 'Restored 👑' : 'No purchase found'); }}>
            <Text style={{ color: colors.cyan, textAlign: 'center', fontWeight: '800' }}>Restore purchase</Text>
          </Pressable>
        )}
        <Text style={{ color: colors.sub, fontSize: 11, textAlign: 'center' }}>
          Billed through Google Play. Cancel anytime in Play Store → Payments & subscriptions.
        </Text>
      </ScrollView>
    </View>
  );
}
