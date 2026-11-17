import React, { useState } from 'react';
import { View, Text, TextInput, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useApp } from '../src/store/AppStore';
import { GradientButton } from '../src/components/GradientButton';
import { Logo, Bolt } from '../src/components/ui';
import { IMG } from '../src/lib/images';

export default function Welcome() {
  const { colors } = useTheme();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  if (app.onboarded) return <Redirect href="/(tabs)/home" />;

  function start() {
    app.finishOnboarding(name);
    router.replace('/(tabs)/home');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ImageBackground source={IMG.welcomeHero} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.1)', 'rgba(7,7,11,0.92)', '#07070B']}
          locations={[0, 0.3, 0.62, 1]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled">
            <Logo size={56} />
            <View style={{ flex: 1, minHeight: 200 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bolt size={22} />
              <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 22 }}>Your AI coach, always with you</Text>
            </View>
            <Text style={{ color: '#E6E6EE', fontSize: 15, lineHeight: 22, marginTop: 8 }}>
              Snap meals, chat with Mr. Vyb, race your friends and watch your habits level up.
            </Text>

            <Text style={{ color: '#FFFFFF', fontWeight: '800', marginTop: 26, marginBottom: 8 }}>What should we call you?</Text>
            <TextInput
              value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor="#8A8AA0"
              maxLength={24} returnKeyType="go" onSubmitEditing={start}
              style={{ backgroundColor: 'rgba(17,17,24,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: colors.purple,
                color: '#FFFFFF', fontSize: 17, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 14 }} />

            <View style={{ marginTop: 16 }}>
              <GradientButton title="Start my journey" icon="arrow-forward" variant="neon" onPress={start} />
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
