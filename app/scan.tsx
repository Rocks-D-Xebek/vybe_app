import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ImageBackground, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useApp, MealCategory, MealItem, MealSource } from '../src/store/AppStore';
import { api, FoodScanResult } from '../src/lib/api';
import { toUploadBase64 } from '../src/lib/image';
import { lookupBarcode, Per100 } from '../src/lib/barcode';
import { mealCategoryByHour, formatTime } from '../src/lib/dates';
import { ScreenHeader, Choice } from '../src/components/ui';
import { NutritionFacts } from '../src/components/vybe';
import { GradientButton } from '../src/components/GradientButton';
import { IMG } from '../src/lib/images';

type Mode = 'photo' | 'label' | 'barcode' | 'type';
interface Row extends MealItem { portion: number }

const CATS: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const WHEN = [{ label: 'Now', min: 0 }, { label: '30m ago', min: 30 }, { label: '1h ago', min: 60 }, { label: '2h ago', min: 120 }];
const CONF_COLOR: Record<string, string> = { high: '#4ADE80', medium: '#FACC15', low: '#FF6B6B' };
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'photo', label: 'Photo', icon: 'camera' },
  { key: 'label', label: 'Label', icon: 'file-document-outline' },
  { key: 'barcode', label: 'Barcode', icon: 'barcode-scan' },
  { key: 'type', label: 'Type it', icon: 'keyboard-outline' },
];

const toRows = (r: FoodScanResult): Row[] => r.items.map(i => ({
  name: i.name, quantity: i.estimatedQuantity, confidence: i.confidence, calories: i.estimatedCalories,
  proteinG: i.proteinG, carbsG: i.carbsG, fatG: i.fatG, fiberG: i.fiberG ?? 0, sugarG: i.sugarG ?? 0,
  sodiumMg: i.sodiumMg ?? 0, portion: 1,
}));

export default function Scan() {
  const { colors } = useTheme();
  const app = useApp();
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState<MealSource>('scan');
  const [cat, setCat] = useState<MealCategory>(mealCategoryByHour());
  const [ago, setAgo] = useState(0);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<Per100 | null>(null);
  const [grams, setGrams] = useState('');
  const [fav, setFav] = useState(false);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    return [...app.meals].reverse().filter(m => {
      const k = m.items.map(i => i.name).join('|').toLowerCase();
      if (seen.has(k)) return false; seen.add(k); return true;
    }).slice(0, 8);
  }, [app.meals]);

  const fail = (e: any) => setError(e?.message || 'Something went wrong. Try again.');
  const addRows = (r: FoodScanResult, src: MealSource) => {
    if (!r.items?.length) { setError(r.uncertaintyNote || "Couldn't find any food there. Try again."); return; }
    setRows(prev => [...prev, ...toRows(r)]);
    setNote(r.uncertaintyNote); setSource(src);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  async function pickImage(fromCamera: boolean): Promise<string | null> {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access so VYBE can read your photo.'); return null; }
    const r = fromCamera ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    return r.canceled || !r.assets[0]?.uri ? null : r.assets[0].uri;
  }

  async function doPhoto(fromCamera: boolean) {
    const uri = await pickImage(fromCamera); if (!uri) return;
    setPhoto(uri); setBusy(true); setError('');
    try { addRows(await api.scanFood(await toUploadBase64(uri), cat), 'scan'); } catch (e) { fail(e); }
    setBusy(false);
  }

  async function doLabel(fromCamera: boolean) {
    const uri = await pickImage(fromCamera); if (!uri) return;
    setPhoto(uri); setBusy(true); setError('');
    try { addRows(await api.foodLabel(await toUploadBase64(uri, 1400), amount || 'one full pack'), 'label'); } catch (e) { fail(e); }
    setBusy(false);
  }

  async function doText() {
    if (!text.trim()) return;
    setBusy(true); setError('');
    try { addRows(await api.foodText(text.trim()), 'text'); setText(''); } catch (e) { fail(e); }
    setBusy(false);
  }

  async function openBarcode() {
    if (!camPerm?.granted) {
      const r = await requestCamPerm();
      if (!r.granted) { Alert.alert('Camera needed', 'Allow camera access to scan barcodes.'); return; }
    }
    setProduct(null); setScanning(true);
  }

  async function onBarcode(code: string) {
    if (!scanning) return;
    setScanning(false); setBusy(true); setError('');
    try {
      const p = await lookupBarcode(code);
      if (!p) setError("This barcode isn't in the food database yet. Use 'Label' and snap the nutrition table instead.");
      else { setProduct(p); setGrams(String(p.servingG ?? 100)); }
    } catch (e) { fail(e); }
    setBusy(false);
  }

  function addProduct() {
    if (!product) return;
    const g = parseFloat(grams) || 100; const f = g / 100;
    setRows(prev => [...prev, {
      name: product.name, quantity: `${g} g`, confidence: 'high', calories: product.calories * f,
      proteinG: product.proteinG * f, carbsG: product.carbsG * f, fatG: product.fatG * f,
      fiberG: product.fiberG * f, sugarG: product.sugarG * f, sodiumMg: product.sodiumMg * f, portion: 1,
    }]);
    setSource('barcode'); setProduct(null);
  }

  const setPortion = (i: number, d: number) =>
    setRows(r => r.map((x, j) => j === i ? { ...x, portion: Math.min(5, Math.max(0.25, x.portion + d)) } : x));

  const total = rows.reduce((t, r) => ({
    calories: t.calories + r.calories * r.portion, proteinG: t.proteinG + r.proteinG * r.portion,
    carbsG: t.carbsG + r.carbsG * r.portion, fatG: t.fatG + r.fatG * r.portion,
    fiberG: t.fiberG + (r.fiberG ?? 0) * r.portion, sugarG: t.sugarG + (r.sugarG ?? 0) * r.portion,
    sodiumMg: t.sodiumMg + (r.sodiumMg ?? 0) * r.portion,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 });

  function save() {
    const items: MealItem[] = rows.map(({ portion, ...r }) => ({
      ...r, quantity: portion === 1 ? r.quantity : `${r.quantity} ×${portion}`,
      calories: r.calories * portion, proteinG: r.proteinG * portion, carbsG: r.carbsG * portion, fatG: r.fatG * portion,
      fiberG: (r.fiberG ?? 0) * portion, sugarG: (r.sugarG ?? 0) * portion, sodiumMg: (r.sodiumMg ?? 0) * portion,
    }));
    const meal = {
      items, totalCalories: total.calories, proteinG: total.proteinG, carbsG: total.carbsG, fatG: total.fatG,
      fiberG: total.fiberG, sugarG: total.sugarG, sodiumMg: total.sodiumMg,
      category: cat, eatenAt: Date.now() - ago * 60000, source, confirmed: true,
    };
    app.addMeal(meal);
    if (fav && !app.isFavourite({ ...meal, id: '', loggedAt: 0 })) app.toggleFavourite({ ...meal, id: '', loggedAt: 0 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  const quick = [
    ...app.favourites.map(f => ({ key: 'f' + f.id, label: `⭐ ${f.name}`, items: f.items })),
    ...recents.filter(m => !app.isFavourite(m)).map(m => ({ key: 'r' + m.id, label: `↺ ${m.items.map(i => i.name).join(' + ')}`, items: m.items })),
  ].slice(0, 12);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Log Your Food" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Mode switch */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 4, borderWidth: 1, borderColor: colors.border }}>
          {MODES.map(m => (
            <Pressable key={m.key} onPress={() => { setMode(m.key); setError(''); }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 14, gap: 2,
                backgroundColor: mode === m.key ? colors.lime : 'transparent' }}>
              <MaterialCommunityIcons name={m.icon as any} size={20} color={mode === m.key ? colors.onAccent : colors.sub} />
              <Text style={{ color: mode === m.key ? colors.onAccent : colors.sub, fontWeight: '800', fontSize: 12 }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Mode body */}
        {mode === 'photo' && (
          <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <ImageBackground source={photo ? { uri: photo } : IMG.scanHero} style={{ width: '100%', height: 250 }} resizeMode="cover">
              {!photo && (
                <View style={{ position: 'absolute', left: 14, top: 14, transform: [{ rotate: '-8deg' }] }}>
                  {['SCAN', 'EAT', 'TRACK', 'VYBE'].map(w => (
                    <Text key={w} style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: 22, lineHeight: 24, textShadowColor: '#000', textShadowRadius: 6 }}>{w}</Text>
                  ))}
                </View>
              )}
              {busy && <Busy text="Mr. Vyb is checking your plate…" />}
              <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                <Btn icon="camera" label={photo ? 'Retake' : 'Camera'} primary onPress={() => doPhoto(true)} disabled={busy} />
                <Btn icon="images" label="Gallery" onPress={() => doPhoto(false)} disabled={busy} />
              </View>
            </ImageBackground>
          </View>
        )}

        {mode === 'label' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Snap the nutrition table 🏷️</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>
              Perfect for packets without barcodes: chakodi, murukku, local namkeen. Mr. Vyb reads the label and does the maths for what you ate.
            </Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 14, marginBottom: 6 }}>How much did you eat?</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 50 g, half pack, full pack"
              placeholderTextColor={colors.sub} style={input(colors)} />
            {photo && mode === 'label' && <Image source={{ uri: photo }} style={{ height: 140, borderRadius: 14, marginTop: 12 }} resizeMode="cover" />}
            {busy ? <View style={{ marginTop: 14 }}><ActivityIndicator color={colors.lime} /></View> : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Btn icon="camera" label="Snap label" primary onPress={() => doLabel(true)} /></View>
                <View style={{ flex: 1 }}><Btn icon="images" label="Gallery" onPress={() => doLabel(false)} /></View>
              </View>
            )}
          </View>
        )}

        {mode === 'barcode' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Scan a barcode ▦</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>
              Exact numbers for branded packets from the free Open Food Facts database.
            </Text>
            {busy ? <View style={{ marginTop: 14 }}><ActivityIndicator color={colors.lime} /></View> : product ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>{product.name}</Text>
                <Text style={{ color: colors.sub }}>{Math.round(product.calories)} kcal per 100 g · P {product.proteinG}g · C {product.carbsG}g · F {product.fatG}g</Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>How many grams did you eat?</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={grams} onChangeText={setGrams} keyboardType="numeric" style={[input(colors), { flex: 1 }]} />
                  <Choice label="Add" selected onPress={addProduct} />
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 14 }}><Btn icon="barcode" label="Open scanner" primary onPress={openBarcode} /></View>
            )}
          </View>
        )}

        {mode === 'type' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>What did you eat? ⌨️</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>
              Just say it like you'd tell a friend. No need to know calories: Mr. Vyb works them out.
            </Text>
            <TextInput value={text} onChangeText={setText} multiline placeholder={'e.g. Chilli potato chips 100 g\n2 chakodi and a cutting chai\n1 plate chicken biryani'}
              placeholderTextColor={colors.sub} style={[input(colors), { minHeight: 90, marginTop: 12, textAlignVertical: 'top' }]} />
            <View style={{ marginTop: 12 }}>
              <GradientButton title="Ask Mr. Vyb" icon="sparkles" variant="neon" busy={busy} disabled={!text.trim()} onPress={doText} />
            </View>
          </View>
        )}

        {!!error && (
          <View style={{ backgroundColor: '#3A1020', borderColor: colors.danger, borderWidth: 1, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>⚠️ {error}</Text>
          </View>
        )}

        {/* Favourites & recents */}
        {rows.length === 0 && quick.length > 0 && (
          <View>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Eat this again?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quick.map(q => (
                <Pressable key={q.key} onPress={() => { setRows(q.items.map(i => ({ ...i, portion: 1 }))); setSource('favourite'); }}
                  style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9, maxWidth: '100%' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Detected / added items */}
        {rows.length > 0 && (
          <View style={card(colors)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Your Meal</Text>
              <Text style={{ color: colors.sub, fontSize: 12 }}>− / + fixes portions</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CONF_COLOR[r.confidence ?? ''] ?? colors.cyan }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={2}>{r.name}</Text>
                  <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>{r.quantity}{r.portion !== 1 ? `  ×${r.portion}` : ''}</Text>
                </View>
                <Pressable onPress={() => setPortion(i, -0.25)} hitSlop={6}><Ionicons name="remove-circle-outline" size={24} color={colors.sub} /></Pressable>
                <Pressable onPress={() => setPortion(i, 0.25)} hitSlop={6}><Ionicons name="add-circle-outline" size={24} color={colors.lime} /></Pressable>
                <Text style={{ color: colors.text, fontWeight: '900', width: 62, textAlign: 'right' }}>{Math.round(r.calories * r.portion)} kcal</Text>
                <Pressable onPress={() => setRows(x => x.filter((_, j) => j !== i))} hitSlop={8}><Ionicons name="close" size={20} color={colors.sub} /></Pressable>
              </View>
            ))}
            <Pressable onPress={() => setMode('type')} style={{ marginTop: 10, borderWidth: 1.5, borderColor: colors.purple, borderRadius: 16,
              paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '800' }}>Add another item</Text>
            </Pressable>
            {!!note && <Text style={{ color: colors.sub, fontSize: 12, lineHeight: 17, marginTop: 12 }}>ℹ️ {note}</Text>}
          </View>
        )}

        {rows.length > 0 && (
          <>
            <View style={card(colors)}>
              <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 6 }}>What this meal gives you</Text>
              <NutritionFacts n={total} />
            </View>

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
              <Pressable onPress={() => setFav(f => !f)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color="#FFC83D" />
                <Text style={{ color: colors.text, fontWeight: '700' }}>Save as favourite for one-tap logging</Text>
              </Pressable>
            </View>

            <GradientButton title="Save Meal" icon="checkmark-circle" variant="neon" onPress={save} />
          </>
        )}

        {rows.length === 0 && !busy && mode === 'photo' && (
          <LinearGradient colors={[colors.purple + '33', 'transparent']} style={{ borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12 }}>
            <Image source={IMG.mrvyb} style={{ width: 54, height: 54, borderRadius: 27 }} />
            <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>
              Snap your plate from the top in good light. I'll estimate each item and you fix anything I get wrong. 🍛
            </Text>
          </LinearGradient>
        )}
      </ScrollView>

      {/* Barcode camera */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => onBarcode(data)} />
          <View style={{ position: 'absolute', top: '35%', left: '10%', right: '10%', height: 160, borderWidth: 3, borderColor: colors.lime, borderRadius: 20 }} />
          <Text style={{ position: 'absolute', top: '28%', alignSelf: 'center', color: '#FFFFFF', fontWeight: '800' }}>Point at the barcode</Text>
          <Pressable onPress={() => setScanning(false)} style={{ position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: colors.surface,
            borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Busy({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <ActivityIndicator size="large" color={colors.lime} />
      <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{text}</Text>
    </View>
  );
}

function Btn({ icon, label, onPress, primary, disabled }: { icon: any; label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12,
        backgroundColor: primary ? colors.lime : 'rgba(17,17,24,0.92)', borderWidth: primary ? 0 : 1, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }}>
      <Ionicons name={icon} size={18} color={primary ? colors.onAccent : '#FFFFFF'} />
      <Text style={{ color: primary ? colors.onAccent : '#FFFFFF', fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 16 });
const input = (c: any) => ({ backgroundColor: c.surface2, borderRadius: 12, color: c.text, paddingHorizontal: 12, paddingVertical: 11, fontWeight: '600' as const });
