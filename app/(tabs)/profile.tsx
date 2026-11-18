import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert, Switch, Image, ImageBackground, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeMode, FONT } from '../../src/theme/ThemeContext';
import { useApp, Reminders } from '../../src/store/AppStore';
import { Logo, Sheet, Choice } from '../../src/components/ui';
import { MyAvatar, LevelBar, Badge } from '../../src/components/vybe';
import { AVATARS, IMG } from '../../src/lib/images';
import { api } from '../../src/lib/api';
import { toUploadBase64 } from '../../src/lib/image';
import { CHALLENGES } from '../../src/lib/challenges';
import { ensurePermission, applyReminders } from '../../src/lib/reminders';
import { useAuth } from '../../src/store/Auth';
import { cloudReady, rpc } from '../../src/lib/supabase';
import { billingReady } from '../../src/lib/purchases';

export default function Profile() {
  const { colors, mode, setMode } = useTheme();
  const app = useApp();
  const { profile, targets } = app;
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [name, setName] = useState(profile.name);
  const [pickAvatar, setPickAvatar] = useState(false);
  const [making, setMaking] = useState(false);

  const earned = app.challenges.filter(c => c.completedAt).map(c => CHALLENGES.find(x => x.id === c.id)).filter(Boolean);

  async function usePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (r.canceled || !r.assets[0]?.uri) return;
    const dest = FileSystem.documentDirectory + `avatar-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: r.assets[0].uri, to: dest });
    app.set('avatar', { kind: 'photo', uri: dest });
    setPickAvatar(false);
  }

  async function makeover(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = fromCamera
      ? await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled || !r.assets[0]?.uri) return;
    setMaking(true);
    try {
      const res = await api.avatarMakeover(await toUploadBase64(r.assets[0].uri, 1024));
      const ext = res.mimeType.includes('jpeg') ? 'jpg' : 'png';
      const dest = FileSystem.documentDirectory + `banner-${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(dest, res.imageBase64, { encoding: 'base64' });
      app.set('bannerUri', dest);
      Alert.alert('Looking fresh 🔥', 'Your graffiti banner is now on your Home screen.');
    } catch (e: any) {
      Alert.alert('Makeover failed', e?.message ?? 'Try again with a clear, well-lit photo of your face.');
    }
    setMaking(false);
  }

  async function toggleReminder(key: keyof Reminders, value: boolean) {
    if (Platform.OS === 'web') { Alert.alert('Phone only', 'Reminders work in the app on your phone.'); return; }
    if (value && !(await ensurePermission())) { Alert.alert('Notifications are off', 'Allow notifications for VYBE in your phone settings.'); return; }
    const next = { ...app.reminders, [key]: value };
    app.set('reminders', next);
    await applyReminders(next, profile.name.split(' ')[0] || 'champ', app.plan?.title).catch(() => {});
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 40, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Logo size={30} tagline={false} />
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>Profile</Text>
      </View>

      {/* Banner + identity */}
      <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.purple }}>
        <ImageBackground source={app.bannerUri ? { uri: app.bannerUri } : IMG.homeHero} style={{ width: '100%', height: 170 }} resizeMode="cover">
          <LinearGradient colors={['transparent', 'rgba(7,7,11,0.95)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }} />
          {making && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator color={colors.lime} size="large" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Spraying your graffiti look… (~20s)</Text>
            </View>
          )}
        </ImageBackground>
        <View style={{ backgroundColor: colors.surface, padding: 14, paddingTop: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ marginTop: -44 }}>
            <MyAvatar size={88} ring={colors.lime} onPress={() => setPickAvatar(true)} />
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime,
              alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="pencil" size={14} color={colors.onAccent} />
            </View>
          </View>
          <View style={{ flex: 1, paddingBottom: 4 }}>
            <TextInput style={{ color: colors.text, fontSize: 22, fontWeight: '900', padding: 0 }}
              value={name} onChangeText={setName} onBlur={() => app.updateProfile({ name: name.trim() || profile.name })} />
            <Text style={{ color: colors.sub, fontWeight: '600' }}>{app.plan ? app.plan.title : profile.goal}</Text>
          </View>
          {auth.isPremium && <MaterialCommunityIcons name="crown" size={26} color="#FFC83D" />}
        </View>
        <View style={{ backgroundColor: colors.surface, paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', gap: 8 }}>
          <Choice flex label="✨ Graffiti selfie" selected onPress={() => makeover(true)} />
          <Choice flex label="From gallery" onPress={() => makeover(false)} />
        </View>
      </View>

      <View style={card(colors)}><LevelBar /></View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[[String(app.meals.length), 'meals logged'], [String(app.streak()), 'day streak'], [String(app.workouts.length), 'workouts'],
          [String(earned.length), 'badges']].map(([v, l]) => (
          <View key={l} style={[card(colors), { flex: 1, alignItems: 'center', padding: 10 }]}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{v}</Text>
            <Text style={{ color: colors.sub, fontSize: 10, textAlign: 'center', marginTop: 3 }}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Badges */}
      <View style={card(colors)}>
        <Text style={title(colors)}>My badges</Text>
        {earned.length === 0 ? (
          <Text style={{ color: colors.sub }}>Finish a challenge in Race to earn your first badge 🏅</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {earned.map(c => c && (
              <View key={c.id} style={{ alignItems: 'center', width: 80 }}>
                <Badge badge={c.badge} size={64} />
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6 }}>{c.badge.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Insights + Wrapped */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable style={[card(colors), { flex: 1, gap: 6 }]} onPress={() => router.push('/insights')}>
          <Ionicons name="stats-chart" size={24} color={colors.lime} />
          <Text style={{ color: colors.text, fontWeight: '900' }}>My Insights</Text>
          <Text style={{ color: colors.sub, fontSize: 12 }}>Trends & meal timing</Text>
        </Pressable>
        <Pressable style={[card(colors), { flex: 1, gap: 6 }]} onPress={() => router.push('/wrapped')}>
          <Text style={{ fontSize: 22 }}>🎁</Text>
          <Text style={{ color: colors.text, fontWeight: '900' }}>Vybe Wrapped</Text>
          <Text style={{ color: colors.sub, fontSize: 12 }}>Share your week</Text>
        </Pressable>
      </View>

      {/* Account */}
      <View style={card(colors)}>
        <Text style={title(colors)}>Account</Text>
        {!cloudReady ? (
          <Text style={{ color: colors.sub }}>Accounts launch soon. Everything is saved on this phone.</Text>
        ) : !auth.session ? (
          <>
            <Text style={{ color: colors.sub, marginBottom: 10 }}>Sign in to back up your data, add friends and join challenges.</Text>
            <Choice label="Sign in / Sign up" selected onPress={() => router.push('/login')} />
          </>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '900' }}>@{auth.profile?.username ?? '…'}</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>
                  {auth.profile?.city || 'No city'} · {auth.session.user.email ?? auth.session.user.phone ?? ''}
                </Text>
              </View>
              <Choice label="Edit" onPress={() => router.push('/account-setup')} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cloud-done" size={16} color={colors.lime} />
              <Text style={{ color: colors.sub, fontSize: 12, flex: 1 }}>
                {auth.lastSync ? `Backed up ${new Date(auth.lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Backing up…'}
              </Text>
              <Pressable onPress={() => auth.syncNow()}><Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 12 }}>Back up now</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Choice flex label="👥 Friends" onPress={() => router.push('/friends')} />
              <Choice flex label="Sign out" onPress={() => Alert.alert('Sign out?', 'Your data stays on this phone and in the cloud.', [
                { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => auth.signOut() }])} />
            </View>
            <Pressable onPress={() => Alert.alert('Delete account?', 'This permanently deletes your VYBE account, friends, challenges and cloud backup. Data on this phone stays until you uninstall.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete forever', style: 'destructive', onPress: async () => {
                try { await rpc('delete_my_account'); await auth.signOut(); Alert.alert('Account deleted'); }
                catch (e: any) { Alert.alert('Could not delete', e?.message ?? 'Try again'); }
              } }])}>
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>Delete my account</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Premium */}
      <LinearGradient colors={['#2A1550', '#4A0F35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: '#FFC83D', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="crown" size={24} color="#FFC83D" />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', flex: 1 }}>VYBE Premium</Text>
        </View>
        <Text style={{ color: '#E6E6EE', lineHeight: 20 }}>
          Personal AI diet & workout plans from Mr. Vyb · Global Race · challenge anyone, anywhere · group challenges · unlimited challenges.
        </Text>
        <Pressable onPress={() => router.push('/premium')} style={{ backgroundColor: '#FFC83D', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: '#07070B', fontWeight: '900' }}>{auth.isPremium ? "You're Premium 👑" : 'See Premium plans'}</Text>
        </Pressable>
        {!billingReady && (
          // Only before launch: lets you try Premium features on this phone (social limits still use the server's Premium flag)
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Premium (testing mode)</Text>
              <Text style={{ color: '#CFCFDA', fontSize: 12 }}>Disappears once Google Play billing is connected</Text>
            </View>
            <Switch value={app.premium} onValueChange={v => app.set('premium', v)} trackColor={{ true: '#FFC83D', false: '#444' }} thumbColor="#FFFFFF" />
          </View>
        )}
      </LinearGradient>

      {/* Plan */}
      {app.plan && (
        <View style={card(colors)}>
          <Text style={title(colors)}>My plan</Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{app.plan.title}</Text>
          <Text style={{ color: colors.sub, marginTop: 4, lineHeight: 19 }}>{app.plan.summary}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Choice flex label="Open plan" selected onPress={() => router.push('/(tabs)/coach')} />
            <Choice flex label="Stop this plan" onPress={() => Alert.alert('Stop following this plan?', 'Mr. Vyb will stop bringing it up. You can make a new one anytime.', [
              { text: 'Keep it', style: 'cancel' },
              { text: 'Stop plan', style: 'destructive', onPress: () => { app.set('plan', null); app.set('planStartedAt', null); app.set('planChat', []); } }])} />
          </View>
        </View>
      )}

      {/* Reminders */}
      <View style={card(colors)}>
        <Text style={title(colors)}>Smart reminders</Text>
        {([['water', 'Water breaks', '5 gentle nudges between 10 AM and 7 PM'], ['meals', 'Meal logging', 'Breakfast, snacks, lunch & dinner (5 a day)'],
          ['plan', "Today's plan step", '7 AM, when you have a plan']] as const).map(([k, l, d]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{l}</Text>
              <Text style={{ color: colors.sub, fontSize: 12 }}>{d}</Text>
            </View>
            <Switch value={app.reminders[k]} onValueChange={v => toggleReminder(k, v)} trackColor={{ true: colors.lime, false: colors.surface2 }} thumbColor="#FFFFFF" />
          </View>
        ))}
      </View>

      {/* Theme */}
      <View style={card(colors)}>
        <Text style={title(colors)}>Appearance</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['dark', 'light', 'system'] as ThemeMode[]).map(m => <Choice flex key={m} label={m[0].toUpperCase() + m.slice(1)} selected={mode === m} onPress={() => setMode(m)} />)}
        </View>
      </View>

      {/* Targets */}
      <View style={card(colors)}>
        <Text style={title(colors)}>Daily targets</Text>
        {([['Calories', `${targets.calorieTarget} kcal`], ['Protein', `${targets.proteinTarget} g`], ['Carbs', `${targets.carbsTarget} g`],
          ['Fat', `${targets.fatTarget} g`], ['Fibre', `${targets.fiberTarget} g`], ['Water', `${(targets.waterTargetMl / 1000).toFixed(1)} L`],
          ['Active minutes', `${targets.activeMinTarget} min`]] as const).map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.sub, fontWeight: '600' }}>{k}</Text>
            <Text style={{ color: colors.text, fontWeight: '900' }}>{v}</Text>
          </View>
        ))}
        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 8 }}>
          {app.plan ? 'Set by your Mr. Vyb plan.' : 'Get personal targets with a Mr. Vyb plan (Premium).'}
        </Text>
      </View>

      {/* Avatar picker */}
      <Sheet visible={pickAvatar} onClose={() => setPickAvatar(false)} title="Pick your look">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {[...AVATARS.map((a, i) => ({ src: a, i })), { src: IMG.mrvyb, i: -1 }].map(({ src, i }) => {
            const sel = app.avatar.kind === 'preset' && app.avatar.index === i;
            return (
              <Pressable key={i} onPress={() => { app.set('avatar', { kind: 'preset', index: i }); setPickAvatar(false);
                if (auth.session) auth.saveProfile({ avatar: i === -1 ? 'mrvyb' : `preset:${i}` }).catch(() => {}); }}>
                <Image source={src} style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: sel ? colors.lime : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Choice flex label="📷 Use my photo" selected onPress={usePhoto} />
          <Choice flex label="Initial only" onPress={() => { app.set('avatar', { kind: 'initial' }); setPickAvatar(false); }} />
        </View>
      </Sheet>
    </ScrollView>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 16 });
const title = (c: any) => ({ color: c.text, fontSize: 17, fontWeight: '800' as const, marginBottom: 10 });
