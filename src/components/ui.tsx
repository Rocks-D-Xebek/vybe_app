// Shared VYBE design pieces (graffiti logo, stickers, neon ring, headers, avatars, sheets).
import React from 'react';
import { View, Text, Pressable, Image, Modal, ImageSourcePropType, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, FONT } from '../theme/ThemeContext';

/* ---------- Stickers ---------- */
export function Crown({ size = 22, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  const c = color ?? colors.lime;
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 30 24">
      <Path d="M3 20 L1 5 L9 12 L15 2 L21 12 L29 5 L27 20 Z" fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" />
      <Circle cx={1.5} cy={5} r={1.8} fill={c} /><Circle cx={15} cy={2} r={1.8} fill={c} /><Circle cx={28.5} cy={5} r={1.8} fill={c} />
    </Svg>
  );
}

export function Bolt({ size = 20, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <Svg width={size * 0.7} height={size} viewBox="0 0 14 20">
      <Path d="M9 0 L1 11 H6 L4 20 L13 7 H8 Z" fill={color ?? colors.lime} />
    </Svg>
  );
}

/* ---------- Logo ---------- */
export function Logo({ size = 34, tagline = true }: { size?: number; tagline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={{ fontFamily: FONT.marker, fontSize: size, color: colors.text, lineHeight: size * 1.15,
          textShadowColor: colors.purple, textShadowRadius: 10, textShadowOffset: { width: 2, height: 2 } }}>VYBE</Text>
        <View style={{ marginLeft: 2, marginTop: -2, transform: [{ rotate: '18deg' }] }}><Crown size={size * 0.45} /></View>
      </View>
      {tagline && (
        <Text style={{ fontFamily: FONT.marker, color: colors.lime, fontSize: size * 0.36, marginTop: -size * 0.18,
          transform: [{ rotate: '-4deg' }] }}>Move different.</Text>
      )}
    </View>
  );
}

/* ---------- Neon gradient ring ---------- */
export function GradientRing({ size = 150, stroke = 14, progress, children }: {
  size?: number; stroke?: number; progress: number; children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGrad id="vybeRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.lime} />
            <Stop offset="0.55" stopColor={colors.cyan} />
            <Stop offset="1" stopColor={colors.magenta} />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface2} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#vybeRing)" strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} strokeLinecap="round"
          rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/* ---------- Screen header (for stack screens) ---------- */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row',
      alignItems: 'center', backgroundColor: colors.bg }}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 6 }}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
      <View style={{ minWidth: 38, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/* ---------- Section header with optional "See All" ---------- */
export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: colors.cyan, fontWeight: '700', fontSize: 13 }}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.cyan} />
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ source, name, size = 40, ring }: {
  source?: ImageSourcePropType; name?: string; size?: number; ring?: string;
}) {
  const { colors } = useTheme();
  const border = ring ? { borderWidth: 2.5, borderColor: ring } : {};
  if (source) {
    return <Image source={source} style={{ width: size, height: size, borderRadius: size / 2, ...border }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.lime,
      alignItems: 'center', justifyContent: 'center', ...border }}>
      <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: size * 0.42 }}>
        {(name || 'V').slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

/* ---------- Pill ---------- */
export function Pill({ children, color, style }: { children: React.ReactNode; color?: string; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6,
      borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: color ?? colors.border }, style]}>
      {children}
    </View>
  );
}

/* ---------- Bottom sheet ---------- */
export function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 20, paddingBottom: insets.bottom + 20, borderWidth: 1, borderColor: colors.purple }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.surface2, marginBottom: 14 }} />
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 14 }}>{title}</Text>
        {children}
      </View>
    </Modal>
  );
}

/* ---------- Choice chip with selected state ---------- */
export function Choice({ label, selected, onPress, flex }: { label: string; selected?: boolean; onPress: () => void; flex?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: flex ? 1 : undefined, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
      alignItems: 'center', backgroundColor: selected ? colors.lime : colors.surface2,
      borderWidth: 1, borderColor: selected ? colors.lime : colors.border }}>
      <Text style={{ color: selected ? colors.onAccent : colors.text, fontWeight: '800', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
