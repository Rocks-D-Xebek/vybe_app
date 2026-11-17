import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/theme/ThemeContext';
import { useApp } from '../../src/store/AppStore';
import { api, ChatMsg, FridgeResult } from '../../src/lib/api';
import { dayKey } from '../../src/lib/dates';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { GradientButton } from '../../src/components/GradientButton';

const SUGGESTIONS = ['Give me a 20-min no-equipment workout 🔥', 'How can I hit my protein goal today?', 'I missed my workout — help'];

export default function Coach() {
  const { colors } = useTheme();
  const app = useApp();
  const s = st(colors);
  const listRef = useRef<FlatList>(null);

  const [tab, setTab] = useState<'chat' | 'fridge'>('chat');
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'model', text: "Yo, I'm Mr. Vyb ⚡ Your goals, my brain. What are we working on today?" },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  // Fridge state
  const [fridgeImgs, setFridgeImgs] = useState<string[]>([]);
  const [fridge, setFridge] = useState<FridgeResult | null>(null);
  const [confirmed, setConfirmed] = useState<string[]>([]);

  const userContext = {
    goal: app.profile.goal,
    currentWeightKg: app.profile.currentWeightKg,
    targetWeightKg: app.profile.targetWeightKg,
    todayCalories: Math.round(app.totalsFor(dayKey()).calories),
    calorieTarget: app.profile.calorieTarget,
    streak: app.streak(),
    mealsLoggedToday: app.todayMeals().length,
  };

  async function ask(text: string, history = msgs) {
    const next = [...history, { role: 'user' as const, text }];
    setMsgs(next); setInput('');
    setBusy(true);
    try {
      const { reply } = await api.coachChat(next, userContext);
      setMsgs([...next, { role: 'model', text: reply }]);
    } catch {
      setMsgs([...next, { role: 'model', text: 'Lost signal 📡 Check your internet and hit me again.' }]);
    }
    setBusy(false);
  }

  async function addFridgePhotos() {
    const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, allowsMultipleSelection: true, selectionLimit: 3 });
    if (r.canceled) return;
    const imgs = r.assets.map(a => a.base64).filter(Boolean) as string[];
    setFridgeImgs(prev => [...prev, ...imgs].slice(0, 3));
  }

  async function analyzeFridge() {
    if (fridgeImgs.length === 0) { Alert.alert('Add photos', 'Snap up to 3 fridge shelves first.'); return; }
    setBusy(true);
    try {
      const res = await api.analyzeFridge(fridgeImgs);
      setFridge(res);
      setConfirmed(res.confirmedIngredients.map(i => i.name));
    } catch (e: any) { Alert.alert('Fridge check failed', e.message); }
    setBusy(false);
  }

  function mealIdeasFromFridge() {
    if (confirmed.length === 0) return;
    setTab('chat');
    ask(`Fridge Check complete. Confirmed ingredients: ${confirmed.join(', ')}.
Suggest 3 healthy, tasty meals using these. Include calories, macros, and why each fits my goals.`);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Mode switch */}
      <View style={s.switchRow}>
        {(['chat', 'fridge'] as const).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1 }}>
            <LinearGradient colors={tab === t ? [colors.lime, colors.cyan] : ['transparent', 'transparent']}
              style={{ borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: tab === t ? colors.onAccent : colors.sub, fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>
                {t === 'chat' ? '💬 CHAT' : '🥬 FRIDGE CHECK'}
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      {tab === 'chat' ? (
        <>
          <FlatList
            ref={listRef} data={msgs}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyExtractor={(_, i) => String(i)}
            ListFooterComponent={busy ? <Text style={{ color: colors.sub, fontSize: 12, marginLeft: 4 }}>Mr. Vyb is typing…</Text> : undefined}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === 'user' ? s.me : s.bot]}>
                {item.role === 'model' && <Text style={{ color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 3 }}>MR. VYB</Text>}
                <Text style={{ color: item.role === 'user' ? colors.onAccent : colors.text, lineHeight: 20 }}>{item.text}</Text>
              </View>
            )}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {SUGGESTIONS.map(x => <Chip key={x} label={x} onPress={() => !busy && ask(x)} />)}
          </ScrollView>
          <View style={s.row}>
            <TextInput style={s.input} placeholder="Ask Mr. Vyb…" placeholderTextColor={colors.sub}
              value={input} onChangeText={setInput} onSubmitEditing={() => input.trim() && ask(input.trim())} />
            <Pressable style={s.send} onPress={() => input.trim() && ask(input.trim())} disabled={busy}>
              <Text style={{ color: colors.onAccent, fontWeight: '900' }}>{busy ? '…' : 'SEND'}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <LinearGradient colors={[colors.purple + '33', colors.magenta + '22']} style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.purple }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Fridge check! 👀</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 20 }}>
              Show me what’s in your fridge — photo up to 3 shelves. I’ll spot the ingredients, ask when I’m unsure, then we turn them into something healthy, tasty and on track with your goals.
            </Text>
          </LinearGradient>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Chip label="📸 ADD SHELF PHOTOS" onPress={addFridgePhotos} /></View>
            <View style={{ flex: 1 }}><GradientButton title={busy ? '…' : 'ANALYZE'} onPress={analyzeFridge} busy={busy} variant="purple" /></View>
          </View>

          {fridgeImgs.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {fridgeImgs.map((b64, i) => (
                <Image key={i} source={{ uri: `data:image/jpeg;base64,${b64}` }} style={{ width: 72, height: 72, borderRadius: 12 }} />
              ))}
            </View>
          )}

          {fridge && (
            <Card>
              <Text style={{ color: colors.text, fontWeight: '900', letterSpacing: 1, fontSize: 12, marginBottom: 10 }}>SPOTTED IN YOUR FRIDGE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {confirmed.map(name => (
                  <Chip key={name} label={`${name} ✓`} active onPress={() => setConfirmed(c => c.filter(x => x !== name))} />
                ))}
              </View>
              {fridge.uncertainItems.map((u, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <Text style={{ color: colors.text, flex: 1, fontWeight: '600' }}>❓ {u.question}</Text>
                  <Chip label="Yes" active onPress={() => { setConfirmed(c => [...c, u.name]); setFridge(f => f && { ...f, uncertainItems: f.uncertainItems.filter((_, j) => j !== i) }); }} />
                  <Chip label="No" onPress={() => setFridge(f => f && { ...f, uncertainItems: f.uncertainItems.filter((_, j) => j !== i) })} />
                </View>
              ))}
              <View style={{ marginTop: 14 }}>
                <GradientButton title={`GET MEAL IDEAS FROM ${confirmed.length} INGREDIENTS →`} onPress={mealIdeasFromFridge} variant="purple" />
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  switchRow: { flexDirection: 'row', margin: 16, marginBottom: 4, backgroundColor: c.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.border },
  bubble: { maxWidth: '82%', borderRadius: 18, padding: 12 },
  me: { alignSelf: 'flex-end', backgroundColor: c.lime, borderBottomRightRadius: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
  row: { flexDirection: 'row', padding: 12, gap: 8 },
  input: { flex: 1, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: c.text, borderWidth: 1, borderColor: c.border },
  send: { backgroundColor: c.lime, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
});
