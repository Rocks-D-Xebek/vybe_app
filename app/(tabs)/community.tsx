import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo, Avatar } from '../../src/components/ui';
import { IMG, AVATARS } from '../../src/lib/images';
import { FONT } from '../../src/theme/ThemeContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { Card } from '../../src/components/Card';
import { SectionTitle } from '../../src/components/SectionTitle';
import { Chip } from '../../src/components/Chip';
import { PreviewBanner } from '../../src/components/PreviewBanner';

// NOTE: preview feed — the moderated UGC backend lands in Phase 5.
const POSTS = [
  { user: 'Priya S.', avatar: AVATARS[5], tag: 'PROGRESS', text: 'Down 4kg in 6 weeks 🙌 Consistency > perfection. Thank you Mr. Vyb for the meal-timing nudges!', likes: 128 },
  { user: 'Rohan M.', avatar: AVATARS[4], tag: 'WORKOUT', text: 'PR’d my 5K this morning — 24:38. The Race leaderboard had me sweating more than the run 😂', likes: 94 },
  { user: 'VYBE Official', avatar: IMG.mrvyb, tag: 'CHALLENGE', text: 'New community challenge: 10k steps daily for 7 days. Badge + bragging rights on the line 👟', likes: 210 },
];

export default function Community() {
  const { colors } = useTheme();
  const s = st(colors);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 40, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Logo size={30} tagline={false} />
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 16 }}>Community</Text>
      </View>

      <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.lime }}>
        <ImageBackground source={IMG.communityHero} style={{ width: '100%', height: 180, justifyContent: 'flex-end' }} resizeMode="cover">
          <LinearGradient colors={['transparent', 'rgba(7,7,11,0.92)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }} />
          <View style={{ padding: 16 }}>
            <Text style={{ fontFamily: FONT.marker, color: '#FFFFFF', fontSize: 26, transform: [{ rotate: '-3deg' }] }}>
              Your squad. <Text style={{ color: colors.lime }}>Your wins.</Text>
            </Text>
          </View>
        </ImageBackground>
      </View>

      <PreviewBanner text="The VYBE community is coming soon. Posts below are examples, not real members." />

      {/* Composer — blueprint 6.D: everything goes through AI screening + manager review */}
      <Card glow="lime">
        <SectionTitle label="Share your win" />
        <TextInput style={s.input} placeholder="Gym pic, milestone, story…" placeholderTextColor={colors.sub}
          value={draft} onChangeText={setDraft} multiline />
        <View style={{ marginTop: 10 }}>
          <Chip label="POST → GOES THROUGH AI SCREENING FIRST" active onPress={() => setDraft('')} />
        </View>
      </Card>

      {POSTS.map((p, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar source={p.avatar} size={42} ring={i === 2 ? colors.lime : colors.purple} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{p.user}</Text>
              <Text style={{ color: colors.sub, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{p.tag}</Text>
            </View>
          </View>
          <Text style={{ color: colors.text, lineHeight: 20 }}>{p.text}</Text>
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
            <Pressable onPress={() => setLiked(l => ({ ...l, [i]: !l[i] }))}>
              <Text style={{ color: liked[i] ? colors.magenta : colors.sub, fontWeight: '800' }}>
                {liked[i] ? '❤️' : '🤍'} {p.likes + (liked[i] ? 1 : 0)}
              </Text>
            </Pressable>
            <Text style={{ color: colors.sub, fontWeight: '700' }}>💬 {12 + i * 3}</Text>
            <Text style={{ color: colors.sub, fontWeight: '700' }}>↗ Share</Text>
          </View>
        </Card>
      ))}

      <Text style={{ color: colors.sub, fontSize: 11, textAlign: 'center', paddingHorizontal: 24 }}>
        Phase 5: member profiles, follows, uploads, AI content screening & the manager approval dashboard.
      </Text>
    </ScrollView>
  );
}

const st = (c: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  input: { backgroundColor: c.surface2, borderRadius: 14, padding: 14, color: c.text, minHeight: 80, textAlignVertical: 'top' },
});
