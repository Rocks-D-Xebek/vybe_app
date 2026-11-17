import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ImageBackground, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useApp, MealCategory } from '../src/store/AppStore';
import { api } from '../src/lib/api';
import { toUploadBase64 } from '../src/lib/image';
import { mealCategoryByHour, formatTime } from '../src/lib/dates';
import { ScreenHeader, Choice } from '../src/components/ui';
import { GradientButton } from '../src/components/GradientButton';
import { IMG } from '../src/lib/images';

interface Row {
  name: string; quantity: string; confidence: string;
  calories: number; proteinG: number; carbsG: number; fatG: number; portion: number;
}

const CATS: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const WHEN = [{ label: 'Now', min: 0 }, { label: '30 min ago', min: 30 }, { label: '1 hr ago', min: 60 }, { label: '2 hr ago', min: 120 }];
const CONF_COLOR: Record<string, string> = { high: '#4ADE80', medium: '#FACC15', low: '#FF6B6B' };

export default function Scan() {
  const { colors } = useTheme();
  const app = useApp();

  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [cat, setCat] = useState<MealCategory>(mealCategoryByHour());
  const [ago, setAgo] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKcal, setNewKcal] = useState('');
  const [newProtein, setNewProtein] = useState('');

  async function pick(source: 'camera' | 'gallery') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', `Allow ${source} access to scan meals.`); return; }
    const r = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (r.canceled || !r.assets[0]?.uri) return;
    setPhoto(r.assets[0].uri);
    analyze(r.assets[0].uri);
  }

  async function analyze(uri: string) {
    setBusy(true); setError(''); setRows([]); setNote('');
    try {
      const b64 = await toUploadBase64(uri);
      const res = await api.scanFood(b64, cat);
      if (!res.items?.length) {
        setError(res.uncertaintyNote || "Couldn't spot any food. Try a clearer photo or add items manually.");
      } else {
        setRows(res.items.map(i => ({
          name: i.name, quantity: i.estimatedQuantity, confidence: i.confidence,
          calories: i.estimatedCalories, proteinG: i.proteinG, carbsG: i.carbsG, fatG: i.fatG, portion: 1,
        })));
        setNote(res.uncertaintyNote);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message || 'Scan failed. Check your internet and try again.');
    }
    setBusy(false);
  }

  const setPortion = (i: number, d: number) =>
    setRows(r => r.map((x, j) => j === i ? { ...x, portion: Math.min(5, Math.max(0.5, x.portion + d)) } : x));

  function addManual() {
    const kcal = parseFloat(newKcal);
    if (!newName.trim() || !kcal) { Alert.alert('Add item', 'Enter a name and calories.'); return; }
    setRows(r => [...r, { name: newName.trim(), quantity: '1 serving', confidence: 'you', calories: kcal,
      proteinG: parseFloat(newProtein) || 0, carbsG: 0, fatG: 0, portion: 1 }]);
    setNewName(''); setNewKcal(''); setNewProtein(''); setAdding(false);
  }

  const total = rows.reduce((t, r) => ({
    kcal: t.kcal + r.calories * r.portion, p: t.p + r.proteinG * r.portion,
    c: t.c + r.carbsG * r.portion, f: t.f + r.fatG * r.portion,
  }), { kcal: 0, p: 0, c: 0, f: 0 });

  function save() {
    const eatenAt = Date.now() - ago * 60000;
    app.addMeal({
      items: rows.map(r => ({ name: r.name, quantity: r.portion === 1 ? r.quantity : `${r.quantity} ×${r.portion}`,
        calories: r.calories * r.portion, proteinG: r.proteinG * r.portion, carbsG: r.carbsG * r.portion,
        fatG: r.fatG * r.portion, confidence: r.confidence })),
      totalCalories: total.kcal, proteinG: total.p, carbsG: total.c, fatG: total.f,
      category: cat, eatenAt, source: photo ? 'scan' : 'manual', confirmed: true,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  const edited = rows.some(r => r.portion !== 1 || r.confidence === 'you');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Scan Your Food" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Photo area with scanner brackets */}
        <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <ImageBackground source={photo ? { uri: photo } : IMG.scanHero} style={{ width: '100%', height: 270 }} resizeMode="cover">
            {!photo && (
              <View style={{ position: 'absolute', left: 14, top: 18, transform: [{ rotate: '-8deg' }] }}>
                {['SCAN', 'EAT', 'TRACK', 'VYBE'].map(w => (
                  <Text key={w} style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 22, lineHeight: 24,
                    textShadowColor: '#000', textShadowRadius: 6 }}>{w}</Text>
                ))}
              </View>
            )}
            {photo && <Brackets color={colors.purple} />}
            {busy && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <ActivityIndicator size="large" color={colors.lime} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Mr. Vyb is checking your plate…</Text>
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              <Pressable onPress={() => pick('camera')} disabled={busy}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.lime, borderRadius: 999,
                  paddingHorizontal: 18, paddingVertical: 11 }}>
                <Ionicons name="camera" size={18} color={colors.onAccent} />
                <Text style={{ color: colors.onAccent, fontWeight: '900' }}>{photo ? 'Retake' : 'Photo'}</Text>
              </Pressable>
              <Pressable onPress={() => pick('gallery')} disabled={busy}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(17,17,24,0.92)', borderRadius: 999,
                  paddingHorizontal: 18, paddingVertical: 11, borderWidth: 1, borderColor: colors.border }}>
                <Ionicons name="images" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Gallery</Text>
              </Pressable>
              <Pressable onPress={() => setAdding(true)} disabled={busy}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(17,17,24,0.92)', borderRadius: 999,
                  paddingHorizontal: 18, paddingVertical: 11, borderWidth: 1, borderColor: colors.border }}>
                <Ionicons name="search" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Manual</Text>
              </Pressable>
            </View>
          </ImageBackground>
        </View>

        {!!error && (
          <View style={{ backgroundColor: '#3A1020', borderColor: colors.danger, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>⚠️ {error}</Text>
            {photo && <Choice label="Try again" selected onPress={() => analyze(photo)} />}
          </View>
        )}

        {/* AI detected foods */}
        {(rows.length > 0 || adding) && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{photo ? 'AI Detected Foods' : 'Your Meal'}</Text>
              <Text style={{ color: colors.sub, fontSize: 12 }}>tap − / + to fix portions</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
                borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CONF_COLOR[r.confidence] ?? colors.cyan }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={2}>{r.name}</Text>
                  <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                    {r.quantity}{r.portion !== 1 ? `  ×${r.portion}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => setPortion(i, -0.5)} hitSlop={6}><Ionicons name="remove-circle-outline" size={24} color={colors.sub} /></Pressable>
                <Pressable onPress={() => setPortion(i, 0.5)} hitSlop={6}><Ionicons name="add-circle-outline" size={24} color={colors.lime} /></Pressable>
                <Text style={{ color: colors.text, fontWeight: '900', width: 66, textAlign: 'right' }}>{Math.round(r.calories * r.portion)} kcal</Text>
                <Pressable onPress={() => setRows(x => x.filter((_, j) => j !== i))} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.sub} />
                </Pressable>
              </View>
            ))}

            {adding ? (
              <View style={{ gap: 8, marginTop: 10 }}>
                <TextInput value={newName} onChangeText={setNewName} placeholder="Food name (e.g. Lay's Classic, 1 small pack)"
                  placeholderTextColor={colors.sub} style={input(colors)} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={newKcal} onChangeText={setNewKcal} placeholder="kcal" keyboardType="numeric"
                    placeholderTextColor={colors.sub} style={[input(colors), { flex: 1 }]} />
                  <TextInput value={newProtein} onChangeText={setNewProtein} placeholder="protein g (optional)" keyboardType="numeric"
                    placeholderTextColor={colors.sub} style={[input(colors), { flex: 1.4 }]} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Choice flex label="Cancel" onPress={() => setAdding(false)} />
                  <Choice flex label="Add item" selected onPress={addManual} />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setAdding(true)} style={{ marginTop: 10, borderWidth: 1.5, borderColor: colors.purple, borderRadius: 16,
                paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '800' }}>Add another item</Text>
              </Pressable>
            )}
            {!!note && <Text style={{ color: colors.sub, fontSize: 12, lineHeight: 17, marginTop: 12 }}>ℹ️ {note}</Text>}
          </View>
        )}

        {rows.length > 0 && (
          <>
            {/* Total */}
            <View style={{ backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
              <Text style={{ color: colors.sub, fontWeight: '700' }}>Meal Total{edited ? ' (Edited)' : ''}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
                <Text style={{ color: colors.text, fontSize: 36, fontWeight: '900', flex: 1 }}>{Math.round(total.kcal)} <Text style={{ fontSize: 18 }}>kcal</Text></Text>
                {[['Protein', total.p, colors.lime], ['Carbs', total.c, colors.cyan], ['Fat', total.f, colors.magenta]].map(([l, v, c]) => (
                  <View key={l as string} style={{ alignItems: 'center', marginLeft: 16 }}>
                    <Text style={{ color: c as string, fontWeight: '900', fontSize: 18 }}>{Math.round(v as number)}g</Text>
                    <Text style={{ color: colors.sub, fontSize: 11 }}>{l as string}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* When + what meal */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.sub, fontWeight: '700' }}>Which meal?</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {CATS.map(c => <Choice flex key={c} label={c[0].toUpperCase() + c.slice(1)} selected={cat === c} onPress={() => setCat(c)} />)}
              </View>
              <Text style={{ color: colors.sub, fontWeight: '700', marginTop: 6 }}>
                When did you eat? <Text style={{ color: colors.text }}>{formatTime(Date.now() - ago * 60000)}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {WHEN.map(w => <Choice flex key={w.label} label={w.label} selected={ago === w.min} onPress={() => setAgo(w.min)} />)}
              </View>
            </View>

            <GradientButton title="Save Meal" icon="checkmark-circle" variant="neon" onPress={save} />
          </>
        )}

        {!photo && rows.length === 0 && !adding && (
          <LinearGradient colors={[colors.purple + '33', 'transparent']} style={{ borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12 }}>
            <Image source={IMG.mrvyb} style={{ width: 54, height: 54, borderRadius: 27 }} />
            <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>
              Snap your plate from the top in good light. I'll estimate each item. You fix anything I get wrong before saving. 🍛
            </Text>
          </LinearGradient>
        )}
      </ScrollView>
    </View>
  );
}

function Brackets({ color }: { color: string }) {
  const s = { position: 'absolute' as const, width: 40, height: 40, borderColor: color };
  return (
    <>
      <View style={[s, { top: 14, left: 14, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 }]} />
      <View style={[s, { top: 14, right: 14, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 }]} />
      <View style={[s, { bottom: 70, left: 14, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 }]} />
      <View style={[s, { bottom: 70, right: 14, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 }]} />
    </>
  );
}

const input = (c: any) => ({
  backgroundColor: c.surface2, borderRadius: 12, color: c.text, paddingHorizontal: 12, paddingVertical: 11, fontWeight: '600' as const,
});
