import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ImageBackground, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT } from '../src/theme/ThemeContext';
import { useApp, MealCategory, MealItem, MealSource } from '../src/store/AppStore';
import { api, FoodScanResult } from '../src/lib/api';
import { toUploadBase64 } from '../src/lib/image';
import { lookupBarcode } from '../src/lib/barcode';
import { SLOTS, slotInfo, mealCategoryByHour, formatTime } from '../src/lib/dates';
import { Food, FOODS, UNIT_LABEL, searchFoods, bestMatch, nutritionFor } from '../src/lib/foods';
import { ScreenHeader, Choice, Sheet } from '../src/components/ui';
import { NutritionFacts } from '../src/components/vybe';
import { QuantityEditor, Roller } from '../src/components/FoodCalculator';
import { GradientButton } from '../src/components/GradientButton';
import { IMG } from '../src/lib/images';

type Mode = 'search' | 'photo' | 'label' | 'barcode' | 'type';
type Row =
  | { kind: 'food'; food: Food; unit: string; qty: number }
  | { kind: 'ai'; item: MealItem; portion: number };

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'search', label: 'Search', icon: 'magnify' },
  { key: 'photo', label: 'Photo', icon: 'camera' },
  { key: 'label', label: 'Label', icon: 'file-document-outline' },
  { key: 'barcode', label: 'Barcode', icon: 'barcode-scan' },
  { key: 'type', label: 'Type', icon: 'keyboard-outline' },
];
const POPULAR = ['Rice (white, cooked)', 'Roti / chapati', 'Dal tadka', 'Idli', 'Plain dosa', 'Chai (with sugar)', 'Boiled egg', 'Banana', 'Chicken biryani', 'Curd / dahi'];
const CONF_COLOR: Record<string, string> = { high: '#4ADE80', medium: '#FACC15', low: '#FF6B6B' };
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function rowNutrition(r: Row) {
  if (r.kind === 'food') return nutritionFor(r.food, r.unit, r.qty);
  const k = r.portion, i = r.item;
  return { calories: i.calories * k, proteinG: i.proteinG * k, carbsG: i.carbsG * k, fatG: i.fatG * k,
    fiberG: (i.fiberG ?? 0) * k, sugarG: (i.sugarG ?? 0) * k, sodiumMg: (i.sodiumMg ?? 0) * k };
}

export default function LogFood() {
  const { colors } = useTheme();
  const app = useApp();
  const params = useLocalSearchParams<{ slot?: string }>();
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const [slot, setSlot] = useState<MealCategory>((SLOTS.some(s => s.key === params.slot) ? params.slot : mealCategoryByHour()) as MealCategory);
  const [day, setDay] = useState<0 | 1>(0); // 0 = today, 1 = yesterday
  const [mode, setMode] = useState<Mode>('search');
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState<MealSource>('search');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [fav, setFav] = useState(false);
  const [editing, setEditing] = useState<{ food: Food; index: number | null; unit?: string; qty?: number } | null>(null);

  const allCustom = app.customFoods;
  const results = useMemo(() => searchFoods(query.split(/,| and /i).pop() ?? '', allCustom), [query, allCustom]);
  const listParts = query.split(/,| and | \+ /i).map(s => s.trim()).filter(Boolean);
  const recents = useMemo(() => {
    const seen = new Set<string>();
    return [...app.meals].reverse().flatMap(m => m.items).filter(i => {
      const k = i.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true;
    }).slice(0, 10);
  }, [app.meals]);

  const fail = (e: any) => setError(e?.message || 'Something went wrong. Try again.');

  /* ---------- Search / calculator ---------- */
  function openFood(food: Food) { setEditing({ food, index: null }); }

  async function askMrVyb(name: string): Promise<Food | null> {
    const res = await api.foodInfo(name);
    const food: Food = {
      id: 'ai-' + res.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: res.name, aliases: [name.toLowerCase()],
      per100: res.per100, units: res.units, defaultUnit: res.defaultUnit, defaultQty: res.defaultQty, custom: true,
    };
    app.set('customFoods', prev => [food, ...prev.filter(f => f.id !== food.id)].slice(0, 300));
    return food;
  }

  async function lookupWithAI(name: string) {
    setBusy(true); setError('');
    try { const f = await askMrVyb(name); if (f) openFood(f); } catch (e) { fail(e); }
    setBusy(false);
  }

  async function addAll() {
    setBusy(true); setError('');
    const added: Row[] = [];
    try {
      for (const part of listParts) {
        const f = bestMatch(part, allCustom) ?? await askMrVyb(part);
        if (f) added.push({ kind: 'food', food: f, unit: f.defaultUnit, qty: f.defaultQty });
      }
      setRows(r => [...r, ...added]); setQuery(''); setSource('search');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) { if (added.length) setRows(r => [...r, ...added]); fail(e); }
    setBusy(false);
  }

  function addRecent(item: MealItem) {
    const f = item.foodId ? [...allCustom, ...FOODS].find(x => x.id === item.foodId) : null;
    if (f && item.unit && item.qty) openFood(f), setEditing({ food: f, index: null, unit: item.unit, qty: item.qty });
    else setRows(r => [...r, { kind: 'ai', item, portion: 1 }]);
  }

  /* ---------- Photo / label / text / barcode (AI) ---------- */
  const addAiRows = (r: FoodScanResult, src: MealSource) => {
    if (!r.items?.length) { setError(r.uncertaintyNote || "Couldn't find any food there. Try again."); return; }
    setRows(prev => [...prev, ...r.items.map(i => ({ kind: 'ai' as const, portion: 1, item: {
      name: i.name, quantity: i.estimatedQuantity, confidence: i.confidence, calories: i.estimatedCalories,
      proteinG: i.proteinG, carbsG: i.carbsG, fatG: i.fatG, fiberG: i.fiberG ?? 0, sugarG: i.sugarG ?? 0, sodiumMg: i.sodiumMg ?? 0 } }))]);
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
  async function doPhoto(cam: boolean) {
    const uri = await pickImage(cam); if (!uri) return;
    setPhoto(uri); setBusy(true); setError('');
    try { addAiRows(await api.scanFood(await toUploadBase64(uri), slot), 'scan'); } catch (e) { fail(e); }
    setBusy(false);
  }
  async function doLabel(cam: boolean) {
    const uri = await pickImage(cam); if (!uri) return;
    setPhoto(uri); setBusy(true); setError('');
    try { addAiRows(await api.foodLabel(await toUploadBase64(uri, 1400), amount || 'one full pack'), 'label'); } catch (e) { fail(e); }
    setBusy(false);
  }
  async function doText() {
    if (!text.trim()) return;
    setBusy(true); setError('');
    try { addAiRows(await api.foodText(text.trim()), 'text'); setText(''); } catch (e) { fail(e); }
    setBusy(false);
  }
  async function openBarcode() {
    if (!camPerm?.granted) { const r = await requestCamPerm(); if (!r.granted) return; }
    setScanning(true);
  }
  async function onBarcode(code: string) {
    if (!scanning) return;
    setScanning(false); setBusy(true); setError('');
    try {
      const p = await lookupBarcode(code);
      if (!p) setError("This barcode isn't in the food database yet. Use 'Label' and snap the nutrition table instead.");
      else {
        const units: Record<string, number> = p.servingG ? { serving: p.servingG, pack: p.servingG } : {};
        const food: Food = { id: 'bc-' + code, name: p.name, aliases: [], custom: true,
          per100: { kcal: p.calories, p: p.proteinG, c: p.carbsG, f: p.fatG, fib: p.fiberG, sug: p.sugarG, na: p.sodiumMg },
          units, defaultUnit: p.servingG ? 'serving' : 'g', defaultQty: p.servingG ? 1 : 100 };
        app.set('customFoods', prev => [food, ...prev.filter(f => f.id !== food.id)].slice(0, 300));
        setSource('barcode'); openFood(food);
      }
    } catch (e) { fail(e); }
    setBusy(false);
  }

  /* ---------- Totals & save ---------- */
  const total = rows.map(rowNutrition).reduce((t, n) => ({
    calories: t.calories + n.calories, proteinG: t.proteinG + n.proteinG, carbsG: t.carbsG + n.carbsG, fatG: t.fatG + n.fatG,
    fiberG: t.fiberG + n.fiberG, sugarG: t.sugarG + n.sugarG, sodiumMg: t.sodiumMg + n.sodiumMg,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 });

  // Logged for the current slot today → now. Otherwise the slot's usual time (marked approximate).
  const isNow = day === 0 && slot === mealCategoryByHour();
  const eatenAt = (() => {
    if (isNow) return Date.now();
    const d = new Date(); d.setDate(d.getDate() - day);
    const [h, m] = slotInfo(slot).usual; d.setHours(h, m, 0, 0);
    return Math.min(d.getTime(), Date.now());
  })();

  function save() {
    const items: MealItem[] = rows.map(r => {
      const n = rowNutrition(r);
      const base = { calories: n.calories, proteinG: n.proteinG, carbsG: n.carbsG, fatG: n.fatG, fiberG: n.fiberG, sugarG: n.sugarG, sodiumMg: n.sodiumMg };
      return r.kind === 'food'
        ? { ...base, name: r.food.name, quantity: `${fmt(r.qty)} ${(UNIT_LABEL[r.unit] ?? r.unit).toLowerCase()}`, foodId: r.food.id, unit: r.unit, qty: r.qty, confidence: 'high' }
        : { ...r.item, ...base, quantity: r.portion === 1 ? r.item.quantity : `${r.item.quantity} ×${fmt(r.portion)}` };
    });
    const meal = { items, totalCalories: total.calories, proteinG: total.proteinG, carbsG: total.carbsG, fatG: total.fatG,
      fiberG: total.fiberG, sugarG: total.sugarG, sodiumMg: total.sodiumMg, category: slot, eatenAt, source, confirmed: true, timeApprox: !isNow };
    app.addMeal(meal);
    if (fav && !app.isFavourite({ ...meal, id: '', loggedAt: 0 })) app.toggleFavourite({ ...meal, id: '', loggedAt: 0 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  const info = slotInfo(slot);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={`Add ${info.label}`} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Slot + day */}
        <View style={{ gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
            {SLOTS.map(s => <Choice key={s.key} label={`${s.emoji} ${s.label}`} selected={slot === s.key} onPress={() => setSlot(s.key)} />)}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Choice label="Today" selected={day === 0} onPress={() => setDay(0)} />
            <Choice label="Yesterday" selected={day === 1} onPress={() => setDay(1)} />
            <Text style={{ color: colors.sub, fontSize: 12, flex: 1, textAlign: 'right' }}>
              {isNow ? `Logging now · ${formatTime(Date.now())}` : `Saved at ~${formatTime(eatenAt)}`}
            </Text>
          </View>
        </View>

        {/* Mode switch */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 4, borderWidth: 1, borderColor: colors.border }}>
          {MODES.map(m => (
            <Pressable key={m.key} onPress={() => { setMode(m.key); setError(''); }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, gap: 2, backgroundColor: mode === m.key ? colors.lime : 'transparent' }}>
              <MaterialCommunityIcons name={m.icon as any} size={19} color={mode === m.key ? colors.onAccent : colors.sub} />
              <Text style={{ color: mode === m.key ? colors.onAccent : colors.sub, fontWeight: '800', fontSize: 11 }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* SEARCH */}
        {mode === 'search' && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5,
              borderColor: colors.purple, paddingHorizontal: 12 }}>
              <Ionicons name="search" size={20} color={colors.sub} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search: rice, biryani, idli, butter naan…"
                placeholderTextColor={colors.sub} autoFocus={rows.length === 0} returnKeyType="search"
                style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', paddingVertical: 13, paddingHorizontal: 8 }} />
              {!!query && <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={colors.sub} /></Pressable>}
            </View>

            {listParts.length > 1 && (
              <Pressable onPress={addAll} disabled={busy} style={[card(colors), { borderColor: colors.lime, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <MaterialCommunityIcons name="playlist-plus" size={24} color={colors.lime} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '900' }}>Add all {listParts.length} foods</Text>
                  <Text style={{ color: colors.sub, fontSize: 12 }} numberOfLines={2}>{listParts.join(' + ')}, adjust each after</Text>
                </View>
                {busy ? <ActivityIndicator color={colors.lime} /> : <Ionicons name="add-circle" size={26} color={colors.lime} />}
              </Pressable>
            )}

            {query.trim() ? (
              <View style={card(colors)}>
                {results.map((f, i) => {
                  const n = nutritionFor(f, f.defaultUnit, f.defaultQty);
                  return (
                    <Pressable key={f.id} onPress={() => openFood(f)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11,
                      borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '800' }}>{f.name}{f.custom ? '  ✨' : ''}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                          {fmt(f.defaultQty)} {(UNIT_LABEL[f.defaultUnit] ?? f.defaultUnit).toLowerCase()} · {Math.round(n.calories)} kcal · P {Math.round(n.proteinG)}g
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={28} color={colors.lime} />
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => lookupWithAI(listParts[listParts.length - 1] ?? query)} disabled={busy}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: results.length ? 1 : 0, borderTopColor: colors.border }}>
                  <Image source={IMG.mrvyb} style={{ width: 30, height: 30, borderRadius: 15 }} />
                  <Text style={{ color: colors.cyan, fontWeight: '800', flex: 1 }}>
                    {results.length ? 'Not it? ' : ''}Ask Mr. Vyb about “{(listParts[listParts.length - 1] ?? query).trim()}”
                  </Text>
                  {busy && <ActivityIndicator color={colors.cyan} />}
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {recents.length > 0 && (
                  <>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>Recent</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {recents.map((it, i) => <Choice key={i} label={`↺ ${it.name}`} onPress={() => addRecent(it)} />)}
                    </View>
                  </>
                )}
                {app.favourites.length > 0 && (
                  <>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>Favourite meals</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {app.favourites.map(f => <Choice key={f.id} label={`⭐ ${f.name}`} onPress={() => {
                        setRows(r => [...r, ...f.items.map(item => ({ kind: 'ai' as const, item, portion: 1 }))]); setSource('favourite');
                      }} />)}
                    </View>
                  </>
                )}
                <Text style={{ color: colors.text, fontWeight: '800' }}>Popular</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {POPULAR.map(name => { const f = FOODS.find(x => x.name === name)!; return <Choice key={name} label={f.name} onPress={() => openFood(f)} />; })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* PHOTO */}
        {mode === 'photo' && (
          <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <ImageBackground source={photo ? { uri: photo } : IMG.scanHero} style={{ width: '100%', height: 240 }} resizeMode="cover">
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

        {/* LABEL */}
        {mode === 'label' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Snap the nutrition table 🏷️</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>For packets without barcodes: chakodi, murukku, local namkeen.</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 14, marginBottom: 6 }}>How much did you eat?</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 50 g, half pack, full pack" placeholderTextColor={colors.sub} style={input(colors)} />
            {busy ? <View style={{ marginTop: 14 }}><ActivityIndicator color={colors.lime} /></View> : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Btn icon="camera" label="Snap label" primary onPress={() => doLabel(true)} /></View>
                <View style={{ flex: 1 }}><Btn icon="images" label="Gallery" onPress={() => doLabel(false)} /></View>
              </View>
            )}
          </View>
        )}

        {/* BARCODE */}
        {mode === 'barcode' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Scan a barcode ▦</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>Exact numbers for branded packets (Open Food Facts). Then pick how much you ate.</Text>
            <View style={{ marginTop: 14 }}>{busy ? <ActivityIndicator color={colors.lime} /> : <Btn icon="barcode" label="Open scanner" primary onPress={openBarcode} />}</View>
          </View>
        )}

        {/* TYPE */}
        {mode === 'type' && (
          <View style={card(colors)}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Describe your meal ⌨️</Text>
            <Text style={{ color: colors.sub, marginTop: 6, lineHeight: 19 }}>Mixed dishes or home recipes: tell Mr. Vyb like you'd tell a friend.</Text>
            <TextInput value={text} onChangeText={setText} multiline placeholder={'e.g. 2 chakodi and a cutting chai\nHome-made aloo paratha with lots of butter'}
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

        {/* Meal being built */}
        {rows.length > 0 && (
          <View style={card(colors)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{info.emoji} Your {info.label}</Text>
              <Text style={{ color: colors.sub, fontSize: 12 }}>tap a food to change it</Text>
            </View>
            {rows.map((r, i) => {
              const n = rowNutrition(r);
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Pressable style={{ flex: 1 }} onPress={() => r.kind === 'food' && setEditing({ food: r.food, index: i, unit: r.unit, qty: r.qty })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {r.kind === 'ai' && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: CONF_COLOR[r.item.confidence ?? ''] ?? colors.cyan }} />}
                      <Text style={{ color: colors.text, fontWeight: '800', flexShrink: 1 }} numberOfLines={2}>{r.kind === 'food' ? r.food.name : r.item.name}</Text>
                    </View>
                    <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                      {r.kind === 'food' ? `${fmt(r.qty)} ${(UNIT_LABEL[r.unit] ?? r.unit).toLowerCase()}  ✎` : `${r.item.quantity}${r.portion !== 1 ? ` ×${fmt(r.portion)}` : ''}`}
                    </Text>
                  </Pressable>
                  {r.kind === 'ai' && (
                    <>
                      <Pressable hitSlop={6} onPress={() => setRows(x => x.map((y, j) => j === i && y.kind === 'ai' ? { ...y, portion: Math.max(0.5, y.portion - 0.5) } : y))}>
                        <Ionicons name="remove-circle-outline" size={24} color={colors.sub} />
                      </Pressable>
                      <Pressable hitSlop={6} onPress={() => setRows(x => x.map((y, j) => j === i && y.kind === 'ai' ? { ...y, portion: Math.min(10, y.portion + 0.5) } : y))}>
                        <Ionicons name="add-circle-outline" size={24} color={colors.lime} />
                      </Pressable>
                    </>
                  )}
                  <Text style={{ color: colors.text, fontWeight: '900', width: 64, textAlign: 'right' }}>{Math.round(n.calories)} kcal</Text>
                  <Pressable hitSlop={8} onPress={() => setRows(x => x.filter((_, j) => j !== i))}><Ionicons name="close" size={20} color={colors.sub} /></Pressable>
                </View>
              );
            })}
            {!!note && <Text style={{ color: colors.sub, fontSize: 12, lineHeight: 17, marginTop: 10 }}>ℹ️ {note}</Text>}
          </View>
        )}

        {rows.length > 0 && (
          <>
            <View style={card(colors)}>
              <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 6 }}>What this {info.label.toLowerCase()} gives you</Text>
              <NutritionFacts n={total} />
            </View>
            <Pressable onPress={() => setFav(f => !f)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color="#FFC83D" />
              <Text style={{ color: colors.text, fontWeight: '700' }}>Save as favourite for one-tap logging</Text>
            </Pressable>
            <GradientButton title={`Save ${info.label}`} icon="checkmark-circle" variant="neon" onPress={save} />
          </>
        )}
      </ScrollView>

      {/* Calculator sheet */}
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.food.name ?? ''}>
        {editing && (
          <QuantityEditor key={editing.food.id + (editing.index ?? 'new')} food={editing.food} unit={editing.unit} qty={editing.qty}
            actionLabel={editing.index === null ? `Add to ${info.label}` : 'Update'}
            onRemove={editing.index !== null ? () => { setRows(x => x.filter((_, j) => j !== editing.index)); setEditing(null); } : undefined}
            onDone={(unit, qty) => {
              const row: Row = { kind: 'food', food: editing.food, unit, qty };
              setRows(x => editing.index === null ? [...x, row] : x.map((y, j) => (j === editing.index ? row : y)));
              setEditing(null); setQuery('');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }} />
        )}
      </Sheet>

      {/* Barcode camera */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
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

const card = (c: any) => ({ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 14 });
const input = (c: any) => ({ backgroundColor: c.surface2, borderRadius: 12, color: c.text, paddingHorizontal: 12, paddingVertical: 11, fontWeight: '600' as const });
