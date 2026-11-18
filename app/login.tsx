import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ImageBackground, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useAuth } from '../src/store/Auth';
import { cloudReady } from '../src/lib/supabase';
import { Logo } from '../src/components/ui';
import { IMG } from '../src/lib/images';

type Step = 'pick' | 'email' | 'email-code' | 'phone' | 'phone-code';

export default function Login() {
  const { colors } = useTheme();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pick');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>, next?: Step) => {
    setBusy(true);
    try {
      await fn();
      if (next) { setStep(next); setCode(''); } else done();
    } catch (e: any) { Alert.alert('Sign-in problem', e?.message ?? 'Try again'); }
    setBusy(false);
  };
  const done = () => router.replace('/account-setup');

  const input = { backgroundColor: 'rgba(17,17,24,0.92)', borderRadius: 16, borderWidth: 1.5, borderColor: colors.purple, color: '#FFFFFF',
    fontSize: 17, fontWeight: '700' as const, paddingHorizontal: 16, paddingVertical: 14 };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ImageBackground source={IMG.communityHero} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(7,7,11,0.85)', '#07070B']} locations={[0, 0.45, 0.75]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={() => (step === 'pick' ? router.back() : setStep('pick'))} hitSlop={12}>
                <Ionicons name={step === 'pick' ? 'close' : 'chevron-back'} size={28} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={{ marginTop: 20 }}><Logo size={48} /></View>
            <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 22, marginTop: 24 }}>Join the squad</Text>
            <Text style={{ color: '#E6E6EE', fontSize: 15, lineHeight: 22, marginTop: 6 }}>
              Challenge friends, climb leaderboards and keep your progress safe in the cloud, even if you change phones.
            </Text>
            <View style={{ flex: 1, minHeight: 40 }} />

            {!cloudReady && (
              <View style={{ backgroundColor: '#3A1020', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.danger }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Accounts are not switched on yet. Your data is safe on this phone.</Text>
              </View>
            )}

            {cloudReady && step === 'pick' && (
              <View style={{ gap: 12 }}>
                <Pressable onPress={() => run(auth.signInGoogle)} disabled={busy}
                  style={{ backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  {busy ? <ActivityIndicator color="#000" /> : <Ionicons name="logo-google" size={20} color="#000" />}
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Continue with Google</Text>
                </Pressable>
                <Pressable onPress={() => setStep('phone')} style={{ backgroundColor: '#25D366', borderRadius: 16, paddingVertical: 15,
                  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  <MaterialCommunityIcons name="whatsapp" size={22} color="#000" />
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Continue with WhatsApp</Text>
                </Pressable>
                <Pressable onPress={() => setStep('email')} style={{ borderRadius: 16, paddingVertical: 15, borderWidth: 1.5, borderColor: colors.lime,
                  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="mail" size={20} color={colors.lime} />
                  <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>Continue with email</Text>
                </Pressable>
                <Text style={{ color: '#9A9AB0', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                  By continuing you agree to VYBE's Terms and Privacy Policy. Your meals and health data stay private.
                </Text>
              </View>
            )}

            {step === 'email' && (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Your email</Text>
                <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoFocus
                  placeholder="you@example.com" placeholderTextColor="#8A8AA0" style={input} />
                <Primary label="Send me a code" busy={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)}
                  onPress={() => run(() => auth.sendEmailCode(email), 'email-code')} />
              </View>
            )}
            {step === 'email-code' && (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Enter the 6-digit code sent to {email}</Text>
                <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} autoFocus
                  placeholder="123456" placeholderTextColor="#8A8AA0" style={[input, { letterSpacing: 6, textAlign: 'center' }]} />
                <Primary label="Verify" busy={busy} disabled={code.length < 6} onPress={() => run(() => auth.verifyEmailCode(email, code))} />
                <Pressable onPress={() => run(() => auth.sendEmailCode(email), 'email-code')}><Text style={{ color: colors.cyan, textAlign: 'center', fontWeight: '700' }}>Resend code</Text></Pressable>
              </View>
            )}
            {step === 'phone' && (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Your WhatsApp number</Text>
                <TextInput value={phone} onChangeText={t => setPhone('+' + t.replace(/[^\d]/g, ''))} keyboardType="phone-pad" autoFocus
                  placeholder="+91 98765 43210" placeholderTextColor="#8A8AA0" style={input} />
                <Text style={{ color: '#9A9AB0', fontSize: 12 }}>We'll send a code on WhatsApp. Later you can choose to get meal reminders there too.</Text>
                <Primary label="Send WhatsApp code" busy={busy} disabled={phone.replace(/\D/g, '').length < 10}
                  onPress={() => run(() => auth.sendWhatsAppCode(phone), 'phone-code')} />
              </View>
            )}
            {step === 'phone-code' && (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Enter the code sent to {phone} on WhatsApp</Text>
                <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} autoFocus
                  placeholder="123456" placeholderTextColor="#8A8AA0" style={[input, { letterSpacing: 6, textAlign: 'center' }]} />
                <Primary label="Verify" busy={busy} disabled={code.length < 6} onPress={() => run(() => auth.verifyWhatsAppCode(phone, code))} />
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

function Primary({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={busy || disabled} style={{ backgroundColor: colors.lime, borderRadius: 16, paddingVertical: 15,
      alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
      {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 16 }}>{label}</Text>}
    </Pressable>
  );
}
