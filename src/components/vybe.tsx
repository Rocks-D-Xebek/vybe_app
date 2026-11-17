// VYBE feature components: challenge badges, the user's avatar, nutrition facts, XP level bar.
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGrad, Stop, Polygon } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../store/AppStore';
import { AVATARS, IMG } from '../lib/images';
import { levelFor } from '../lib/levels';
import type { Challenge } from '../lib/challenges';
import { Avatar } from './ui';

/* ---------- Badge ---------- */
export function Badge({ badge, size = 72, locked }: { badge: Challenge['badge']; size?: number; locked?: boolean }) {
  const { colors } = useTheme();
  const [c1, c2] = badge.colors;
  const id = `g${badge.name.replace(/\W/g, '')}`;
  const s = 100;
  const shape = {
    hex: <Polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill={`url(#${id})`} stroke={locked ? colors.border : '#FFFFFF'} strokeWidth={3} />,
    shield: <Path d="M50 3 L92 17 V48 C92 74 72 90 50 97 C28 90 8 74 8 48 V17 Z" fill={`url(#${id})`} stroke={locked ? colors.border : '#FFFFFF'} strokeWidth={3} />,
    circle: <Circle cx={50} cy={50} r={46} fill={`url(#${id})`} stroke={locked ? colors.border : '#FFFFFF'} strokeWidth={3} />,
    star: <Polygon points="50,2 61,30 92,24 74,50 92,76 61,70 50,98 39,70 8,76 26,50 8,24 39,30" fill={`url(#${id})`} stroke={locked ? colors.border : '#FFFFFF'} strokeWidth={3} />,
  }[badge.shape];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
      shadowColor: c1, shadowOpacity: locked ? 0 : 0.6, shadowRadius: 12, elevation: locked ? 0 : 6 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${s} ${s}`} style={{ position: 'absolute', opacity: locked ? 0.4 : 1 }}>
        <Defs>
          <SvgGrad id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} /><Stop offset="1" stopColor={c2} />
          </SvgGrad>
        </Defs>
        {shape}
      </Svg>
      <MaterialCommunityIcons name={badge.icon as any} size={size * 0.4} color={locked ? 'rgba(255,255,255,0.55)' : '#FFFFFF'} />
      {locked && (
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17,
          backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="lock" size={size * 0.18} color={colors.sub} />
        </View>
      )}
    </View>
  );
}

/* ---------- The current user's avatar ---------- */
export function MyAvatar({ size = 42, ring, onPress }: { size?: number; ring?: string; onPress?: () => void }) {
  const { avatar, profile } = useApp();
  const src = avatar.kind === 'preset' ? (avatar.index === -1 ? IMG.mrvyb : AVATARS[avatar.index])
    : avatar.kind === 'photo' ? { uri: avatar.uri } : undefined;
  const el = <Avatar source={src} name={profile.name} size={size} ring={ring} />;
  return onPress ? <Pressable onPress={onPress}>{el}</Pressable> : el;
}

/* ---------- Nutrition facts table ---------- */
export function NutritionFacts({ n, compact }: {
  n: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG?: number; sugarG?: number; sodiumMg?: number };
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const { targets } = useApp();
  const rows: [string, number, string, number | null, string][] = [
    ['Protein', n.proteinG, 'g', targets.proteinTarget, colors.lime],
    ['Carbs', n.carbsG, 'g', targets.carbsTarget, colors.cyan],
    ['Fat', n.fatG, 'g', targets.fatTarget, colors.magenta],
    ['Fibre', n.fiberG ?? 0, 'g', targets.fiberTarget, '#4ADE80'],
    ['Sugar', n.sugarG ?? 0, 'g', 50, '#FFC83D'],
    ['Sodium', n.sodiumMg ?? 0, 'mg', 2000, '#FF6A3D'],
  ];
  return (
    <View style={{ gap: compact ? 6 : 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: compact ? 24 : 32, fontWeight: '900' }}>{Math.round(n.calories)}</Text>
        <Text style={{ color: colors.sub, fontWeight: '700' }}>kcal</Text>
        <Text style={{ color: colors.sub, fontSize: 12, marginLeft: 'auto' }}>{Math.round((n.calories / targets.calorieTarget) * 100)}% of daily goal</Text>
      </View>
      {rows.map(([label, v, unit, target, color]) => (
        <View key={label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.sub, fontWeight: '700', fontSize: 13 }}>{label}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>
              {unit === 'mg' ? Math.round(v) : Math.round(v * 10) / 10}{unit}
              {target ? <Text style={{ color: colors.sub, fontWeight: '600' }}>  · {Math.round((v / target) * 100)}%</Text> : null}
            </Text>
          </View>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min(100, target ? (v / target) * 100 : 0)}%`, backgroundColor: color }} />
          </View>
        </View>
      ))}
      {(n.sodiumMg ?? 0) > 800 && (
        <Text style={{ color: '#FFC83D', fontSize: 12 }}>⚠️ High in salt. Drink extra water and go easy on salty food later today.</Text>
      )}
    </View>
  );
}

/* ---------- XP level bar ---------- */
export function LevelBar({ compact }: { compact?: boolean }) {
  const { colors } = useTheme();
  const app = useApp();
  const xp = app.xp();
  const lv = levelFor(xp);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: compact ? 16 : 22 }}>{lv.emoji}</Text>
        <Text style={{ color: lv.color, fontWeight: '900', fontSize: compact ? 14 : 17 }}>Lv {lv.index} · {lv.name}</Text>
        <Text style={{ color: colors.sub, fontSize: 12, marginLeft: 'auto' }}>
          {xp.toLocaleString()} XP{lv.next ? ` · ${lv.toNext} to ${lv.next.name}` : ' · max level'}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}>
        <LinearGradient colors={[colors.lime, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: `${Math.max(3, lv.progress * 100)}%` }} />
      </View>
    </View>
  );
}

/* ---------- Premium lock card ---------- */
export function PremiumLock({ title, text, onUnlock }: { title: string; text: string; onUnlock: () => void }) {
  const { colors } = useTheme();
  return (
    <LinearGradient colors={['#2A1550', '#4A0F35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22, padding: 18, borderWidth: 1.5, borderColor: '#FFC83D', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons name="crown" size={24} color="#FFC83D" />
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', flex: 1 }}>{title}</Text>
        <View style={{ backgroundColor: '#FFC83D', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: '#07070B', fontWeight: '900', fontSize: 11 }}>PREMIUM</Text>
        </View>
      </View>
      <Text style={{ color: '#E6E6EE', lineHeight: 20 }}>{text}</Text>
      <Pressable onPress={onUnlock} style={{ backgroundColor: '#FFC83D', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: '#07070B', fontWeight: '900' }}>Unlock VYBE Premium</Text>
      </Pressable>
    </LinearGradient>
  );
}
