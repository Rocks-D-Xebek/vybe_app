// HealthifyMe-style calculator: pick a unit (piece / katori / bowl / grams / ounce…) and roll the quantity.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { Food, UNIT_LABEL, unitsOf, stepFor, nutritionFor, gramsFor } from '../lib/foods';
import { GradientButton } from './GradientButton';

const ITEM_W = 64;

function valuesFor(unit: string): number[] {
  const step = stepFor(unit);
  const max = unit === 'g' || unit === 'ml' ? 1000 : unit === 'oz' ? 40 : 20;
  const out: number[] = [];
  for (let v = step; v <= max + 1e-9; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Horizontal wheel that snaps to values; − / + buttons on each side. */
export function Roller({ unit, value, onChange }: { unit: string; value: number; onChange: (v: number) => void }) {
  const { colors } = useTheme();
  const values = useMemo(() => valuesFor(unit), [unit]);
  const ref = useRef<any>(null);
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, values.findIndex(v => Math.abs(v - value) < 1e-6));

  useEffect(() => {
    if (width) ref.current?.scrollTo({ x: idx * ITEM_W, animated: true });
  }, [idx, width, unit]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / ITEM_W)));
    if (values[i] !== value) { onChange(values[i]); Haptics.selectionAsync().catch(() => {}); }
  };
  const bump = (d: number) => {
    const i = Math.min(values.length - 1, Math.max(0, idx + d));
    onChange(values[i]); Haptics.selectionAsync().catch(() => {});
  };
  const pad = Math.max(0, (width - ITEM_W) / 2);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable onPress={() => bump(-1)} hitSlop={8} style={[btn(colors), { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]}>
        <Ionicons name="remove" size={26} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, height: 64 }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {/* centre marker */}
        <View pointerEvents="none" style={{ position: 'absolute', left: pad, width: ITEM_W, top: 0, bottom: 0, borderRadius: 16,
          borderWidth: 2, borderColor: colors.lime, backgroundColor: colors.lime + '18' }} />
        {width > 0 && (
          <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={ITEM_W} decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: pad }} onMomentumScrollEnd={settle} onScrollEndDrag={settle}
            contentOffset={{ x: idx * ITEM_W, y: 0 }}>
            {values.map((v, i) => {
              const d = Math.abs(i - idx);
              return (
                <Pressable key={v} onPress={() => onChange(v)} style={{ width: ITEM_W, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: d === 0 ? colors.text : colors.sub, fontWeight: '900', fontSize: d === 0 ? 26 : d === 1 ? 18 : 15,
                    opacity: d > 2 ? 0.4 : 1 }}>{fmt(v)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      <Pressable onPress={() => bump(1)} hitSlop={8} style={btn(colors)}>
        <Ionicons name="add" size={26} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

/** Unit chips + roller + live nutrition, used in a sheet. */
export function QuantityEditor({ food, unit: unit0, qty: qty0, actionLabel, onDone, onRemove }: {
  food: Food; unit?: string; qty?: number; actionLabel: string;
  onDone: (unit: string, qty: number) => void; onRemove?: () => void;
}) {
  const { colors } = useTheme();
  const [unit, setUnit] = useState(unit0 ?? food.defaultUnit);
  const [qty, setQty] = useState(qty0 ?? food.defaultQty);
  const n = nutritionFor(food, unit, qty);
  const grams = Math.round(gramsFor(food, unit, qty));

  function pickUnit(u: string) {
    if (u === unit) return;
    // Keep roughly the same amount when switching units
    const g = gramsFor(food, unit, qty);
    const per = gramsFor(food, u, 1);
    const step = stepFor(u);
    setUnit(u);
    setQty(Math.max(step, Math.round(g / per / step) * step));
  }

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 8 }}>Measure in</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {unitsOf(food).map(u => {
            const sel = u === unit;
            return (
              <Pressable key={u} onPress={() => pickUnit(u)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
                backgroundColor: sel ? colors.lime : colors.surface2, borderWidth: 1, borderColor: sel ? colors.lime : colors.border }}>
                <Text style={{ color: sel ? colors.onAccent : colors.text, fontWeight: '800' }}>{UNIT_LABEL[u] ?? u}</Text>
                {u !== 'g' && u !== 'oz' && (
                  <Text style={{ color: sel ? colors.onAccent : colors.sub, fontSize: 10, textAlign: 'center' }}>{food.units[u]} g</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 8 }}>
          How much? <Text style={{ color: colors.text }}>{fmt(qty)} {(UNIT_LABEL[unit] ?? unit).toLowerCase()}{unit !== 'g' && unit !== 'oz' ? ` (≈ ${grams} g)` : ''}</Text>
        </Text>
        <Roller unit={unit} value={qty} onChange={setQty} />
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 16, padding: 12, alignItems: 'center' }}>
        <View style={{ flex: 1.3 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{Math.round(n.calories)}</Text>
          <Text style={{ color: colors.sub, fontSize: 11 }}>kcal</Text>
        </View>
        {[['Protein', n.proteinG, colors.lime], ['Carbs', n.carbsG, colors.cyan], ['Fat', n.fatG, colors.magenta], ['Fibre', n.fiberG, '#4ADE80']].map(([l, v, c]) => (
          <View key={l as string} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: c as string, fontWeight: '900', fontSize: 15 }}>{Math.round((v as number) * 10) / 10}g</Text>
            <Text style={{ color: colors.sub, fontSize: 10 }}>{l as string}</Text>
          </View>
        ))}
      </View>

      <GradientButton title={actionLabel} icon="checkmark-circle" variant="neon" onPress={() => onDone(unit, qty)} />
      {onRemove && (
        <Pressable onPress={onRemove} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: colors.danger, fontWeight: '800' }}>Remove from meal</Text>
        </Pressable>
      )}
    </View>
  );
}

const btn = (c: any) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center' as const, justifyContent: 'center' as const,
  backgroundColor: c.lime });
