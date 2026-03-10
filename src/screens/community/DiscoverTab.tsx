import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, shadows } from '../../theme';
import SwipeCardDeck, { SwipeCardDeckRef, SwipeDirection } from '../../components/SwipeCardDeck';

interface NomadProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_city: string | null;
  current_country: string | null;
  interests: string[];
  mutual_connections: number;
}

const MOCK_NOMADS: NomadProfile[] = [
  { id: '1', display_name: 'Sofia Martinez', username: 'sofiamar', avatar_url: null, bio: 'Full-stack dev exploring Southeast Asia. Coffee addict.', current_city: 'Chiang Mai', current_country: 'Thailand', interests: ['coworking', 'hiking', 'specialty coffee'], mutual_connections: 3 },
  { id: '2', display_name: 'Liam Chen', username: 'liamdigital', avatar_url: null, bio: 'Product designer chasing surf and sunsets.', current_city: 'Bali', current_country: 'Indonesia', interests: ['surfing', 'design', 'street food'], mutual_connections: 1 },
  { id: '3', display_name: 'Amara Osei', username: 'amarawanders', avatar_url: null, bio: 'Content creator | 42 countries | Plant mom', current_city: 'Lisbon', current_country: 'Portugal', interests: ['photography', 'coworking', 'vegan food'], mutual_connections: 5 },
  { id: '4', display_name: 'Jonas Eriksson', username: 'jonasnomad', avatar_url: null, bio: 'Backend engineer from Stockholm. Love a good co-live.', current_city: 'Mexico City', current_country: 'Mexico', interests: ['co-living', 'mezcal', 'running'], mutual_connections: 0 },
  { id: '5', display_name: 'Priya Patel', username: 'priyaontheroad', avatar_url: null, bio: 'Yoga teacher & UX writer bouncing between cities.', current_city: 'Medell\u00EDn', current_country: 'Colombia', interests: ['yoga', 'writing', 'cafe culture'], mutual_connections: 2 },
];

function NomadCard({ nomad }: { nomad: NomadProfile }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.avatarArea}>
        <View style={cardStyles.placeholder}><Text style={cardStyles.initial}>{nomad.display_name.charAt(0).toUpperCase()}</Text></View>
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{nomad.display_name}</Text>
        {nomad.username && <Text style={cardStyles.username}>@{nomad.username}</Text>}
        <View style={cardStyles.locRow}><Feather name="map-pin" size={12} color={colors.amber} /><Text style={cardStyles.loc}>{nomad.current_city}{nomad.current_country ? `, ${nomad.current_country}` : ''}</Text></View>
        {nomad.bio && <Text style={cardStyles.bio} numberOfLines={2}>{nomad.bio}</Text>}
        <View style={cardStyles.pills}>
          {nomad.interests.slice(0, 3).map((i) => <View key={i} style={cardStyles.pill}><Text style={cardStyles.pillText}>{i}</Text></View>)}
        </View>
        {nomad.mutual_connections > 0 && <View style={cardStyles.locRow}><Feather name="users" size={11} color={colors.teal} /><Text style={cardStyles.mutual}>{nomad.mutual_connections} mutual</Text></View>}
      </View>
    </View>
  );
}

function OverlayBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[overlayBadge, { borderColor: color }]}>
      <Feather name={icon as any} size={28} color={color} />
      <Text style={[overlayLabel, { color }]}>{label}</Text>
    </View>
  );
}

const overlayBadge: any = { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 3, gap: spacing.xs };
const overlayLabel: any = { fontFamily: fonts.bodyBold, fontSize: 20, letterSpacing: 3 };

export default function DiscoverTab() {
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const [nomads] = useState<NomadProfile[]>(MOCK_NOMADS);

  const handleSwipe = useCallback((nomad: NomadProfile, direction: SwipeDirection) => {
    // swipe action — persistence wired in v1.3
  }, []);

  return (
    <View style={styles.root}>
      <SwipeCardDeck
        ref={deckRef}
        data={nomads}
        keyExtractor={(n) => n.id}
        renderCard={(nomad) => <NomadCard nomad={nomad} />}
        onSwipe={handleSwipe}
        renderRightOverlay={() => <OverlayBadge icon="user-plus" label="CONNECT" color={colors.teal} />}
        renderLeftOverlay={() => <OverlayBadge icon="x" label="SKIP" color={colors.red} />}
        renderUpOverlay={() => <OverlayBadge icon="star" label="SUPER" color={colors.amber} />}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.red }]} onPress={() => deckRef.current?.swipeLeft()} activeOpacity={0.7}><Feather name="x" size={24} color={colors.red} /></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSm, { borderColor: colors.amber }]} onPress={() => deckRef.current?.swipeUp()} activeOpacity={0.7}><Feather name="star" size={20} color={colors.amber} /></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.teal }]} onPress={() => deckRef.current?.swipeRight()} activeOpacity={0.7}><Feather name="user-plus" size={24} color={colors.teal} /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg },
  btn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: colors.dark.bg2, ...shadows.sm },
  btnSm: { width: 46, height: 46, borderRadius: 23 },
});

const cardStyles = StyleSheet.create({
  card: { flex: 1 },
  avatarArea: { flex: 1, backgroundColor: colors.dark.bg3, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.dark.bg4, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.heading, fontSize: 38, color: colors.teal },
  info: { padding: spacing.md, gap: spacing.xs },
  name: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },
  username: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text3 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  loc: { fontFamily: fonts.body, fontSize: 12, color: colors.amber },
  bio: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2, lineHeight: 18, marginTop: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  pill: { backgroundColor: 'rgba(46,196,160,0.1)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46,196,160,0.2)' },
  pillText: { fontFamily: fonts.body, fontSize: 10, color: colors.teal },
  mutual: { fontFamily: fonts.body, fontSize: 11, color: colors.teal },
});
