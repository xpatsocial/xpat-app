import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, shadows } from '../../theme';
import SwipeCardDeck, { SwipeCardDeckRef, SwipeDirection } from '../../components/SwipeCardDeck';
import { AppEvent } from '../../types';

interface SwipeEvent extends AppEvent {
  attendee_count: number;
  creator_name: string;
  category_emoji: string;
}

const MOCK_EVENTS: SwipeEvent[] = [
  { id: 1, creator_id: 'u1', spot_id: null, title: 'Sunset Rooftop Social', description: 'Casual meetup for digital nomads. Bring your own drinks.', event_time: '2026-03-15T17:30:00Z', city: 'Chiang Mai', country: 'Thailand', lat: 18.795, lng: 98.968, created_at: '2026-03-01T00:00:00Z', attendee_count: 14, creator_name: 'Sofia M.', category_emoji: '\uD83C\uDF05' },
  { id: 2, creator_id: 'u2', spot_id: null, title: 'Morning Surf + Breakfast', description: 'Meet at 6 AM at Echo Beach. All levels welcome.', event_time: '2026-03-16T06:00:00Z', city: 'Bali', country: 'Indonesia', lat: -8.655, lng: 115.135, created_at: '2026-03-02T00:00:00Z', attendee_count: 8, creator_name: 'Liam C.', category_emoji: '\uD83C\uDFC4' },
  { id: 3, creator_id: 'u3', spot_id: null, title: 'Lisbon Walking Tour: Hidden Gems', description: 'Off-the-beaten-path through Alfama + Mouraria.', event_time: '2026-03-18T10:00:00Z', city: 'Lisbon', country: 'Portugal', lat: 38.704, lng: -9.178, created_at: '2026-03-05T00:00:00Z', attendee_count: 22, creator_name: 'Amara O.', category_emoji: '\uD83D\uDEB6' },
  { id: 4, creator_id: 'u4', spot_id: null, title: 'Co-work & Chill Thursday', description: 'Reserved the big table at Punspace.', event_time: '2026-03-20T09:00:00Z', city: 'Chiang Mai', country: 'Thailand', lat: 18.795, lng: 98.968, created_at: '2026-03-08T00:00:00Z', attendee_count: 11, creator_name: 'Jonas E.', category_emoji: '\uD83D\uDCBB' },
  { id: 5, creator_id: 'u5', spot_id: null, title: 'Salsa Night for Nomads', description: 'Beginner-friendly salsa at 7 PM.', event_time: '2026-03-22T19:00:00Z', city: 'Medell\u00EDn', country: 'Colombia', lat: 6.244, lng: -75.581, created_at: '2026-03-10T00:00:00Z', attendee_count: 19, creator_name: 'Priya P.', category_emoji: '\uD83D\uDC83' },
];

function EventCard({ event }: { event: SwipeEvent }) {
  const d = new Date(event.event_time);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.hero}>
        <Text style={cardStyles.heroEmoji}>{event.category_emoji}</Text>
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.title}>{event.title}</Text>
        <View style={cardStyles.row}><Feather name="calendar" size={12} color={colors.teal} /><Text style={cardStyles.meta}>{date}</Text><Feather name="clock" size={12} color={colors.teal} style={{ marginLeft: spacing.sm }} /><Text style={cardStyles.meta}>{time}</Text></View>
        {event.city && <View style={cardStyles.row}><Feather name="map-pin" size={12} color={colors.amber} /><Text style={cardStyles.loc}>{event.city}, {event.country}</Text></View>}
        {event.description && <Text style={cardStyles.desc} numberOfLines={3}>{event.description}</Text>}
        <View style={cardStyles.footer}>
          <Text style={cardStyles.host}>{event.creator_name}</Text>
          <View style={cardStyles.row}><Feather name="users" size={12} color={colors.dark.text2} /><Text style={cardStyles.attendees}>{event.attendee_count} going</Text></View>
        </View>
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

export default function EventsTab() {
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const [events] = useState<SwipeEvent[]>(MOCK_EVENTS);

  const handleSwipe = useCallback((event: SwipeEvent, direction: SwipeDirection) => {
    console.log(`[Events] ${direction}: ${event.title}`);
  }, []);

  return (
    <View style={styles.root}>
      <SwipeCardDeck
        ref={deckRef}
        data={events}
        keyExtractor={(e) => String(e.id)}
        renderCard={(event) => <EventCard event={event} />}
        onSwipe={handleSwipe}
        renderRightOverlay={() => <OverlayBadge icon="check-circle" label="GOING" color={colors.teal} />}
        renderLeftOverlay={() => <OverlayBadge icon="x" label="SKIP" color={colors.red} />}
        renderUpOverlay={() => <OverlayBadge icon="bell" label="INTERESTED" color={colors.amber} />}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.red }]} onPress={() => deckRef.current?.swipeLeft()} activeOpacity={0.7}><Feather name="x" size={24} color={colors.red} /></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSm, { borderColor: colors.amber }]} onPress={() => deckRef.current?.swipeUp()} activeOpacity={0.7}><Feather name="bell" size={20} color={colors.amber} /></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.teal }]} onPress={() => deckRef.current?.swipeRight()} activeOpacity={0.7}><Feather name="check-circle" size={24} color={colors.teal} /></TouchableOpacity>
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
  hero: { flex: 0.4, backgroundColor: colors.dark.bg3, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 64 },
  info: { flex: 0.6, padding: spacing.md, gap: spacing.xs },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.teal },
  loc: { fontFamily: fonts.body, fontSize: 11, color: colors.amber },
  desc: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2, lineHeight: 18, marginTop: spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dark.bg3 },
  host: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2 },
  attendees: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2 },
});
