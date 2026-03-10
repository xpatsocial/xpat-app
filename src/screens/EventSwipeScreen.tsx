import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import SwipeCardDeck, {
  SwipeCardDeckRef,
  SwipeDirection,
} from '../components/SwipeCardDeck';
import { LegacyAppEvent } from '../types';

// ---------------------------------------------------------------------------
// Extended event type with display helpers
// ---------------------------------------------------------------------------

interface SwipeEvent extends LegacyAppEvent {
  attendee_count: number;
  creator_name: string;
  category_emoji: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_EVENTS: SwipeEvent[] = [
  {
    id: 1,
    creator_id: 'u1',
    spot_id: null,
    title: 'Sunset Rooftop Social',
    description:
      'Casual meetup for digital nomads in Chiang Mai. Bring your own drinks — we bring the vibes. Meet people, swap stories, watch the sun set.',
    event_time: '2026-03-15T17:30:00Z',
    city: 'Chiang Mai',
    country: 'Thailand',
    lat: 18.795,
    lng: 98.968,
    created_at: '2026-03-01T00:00:00Z',
    attendee_count: 14,
    creator_name: 'Sofia M.',
    category_emoji: '\uD83C\uDF05',
  },
  {
    id: 2,
    creator_id: 'u2',
    spot_id: null,
    title: 'Morning Surf + Breakfast',
    description:
      'Meet at 6 AM at Echo Beach. All levels welcome — boards available for rent. Breakfast burritos after at the beach shack.',
    event_time: '2026-03-16T06:00:00Z',
    city: 'Bali',
    country: 'Indonesia',
    lat: -8.655,
    lng: 115.135,
    created_at: '2026-03-02T00:00:00Z',
    attendee_count: 8,
    creator_name: 'Liam C.',
    category_emoji: '\uD83C\uDFC4',
  },
  {
    id: 3,
    creator_id: 'u3',
    spot_id: null,
    title: 'Lisbon Walking Tour: Hidden Gems',
    description:
      'Off-the-beaten-path walking tour through Alfama + Mouraria. Street art, pasteis, rooftop views. 3 hours, comfortable shoes required.',
    event_time: '2026-03-18T10:00:00Z',
    city: 'Lisbon',
    country: 'Portugal',
    lat: 38.704,
    lng: -9.178,
    created_at: '2026-03-05T00:00:00Z',
    attendee_count: 22,
    creator_name: 'Amara O.',
    category_emoji: '\uD83D\uDEB6',
  },
  {
    id: 4,
    creator_id: 'u4',
    spot_id: null,
    title: 'Co-work & Chill Thursday',
    description:
      'Reserved the big table at Punspace. Pomodoro sessions, then tacos at 6 PM. Bring your laptop and your appetite.',
    event_time: '2026-03-20T09:00:00Z',
    city: 'Chiang Mai',
    country: 'Thailand',
    lat: 18.795,
    lng: 98.968,
    created_at: '2026-03-08T00:00:00Z',
    attendee_count: 11,
    creator_name: 'Jonas E.',
    category_emoji: '\uD83D\uDCBB',
  },
  {
    id: 5,
    creator_id: 'u5',
    spot_id: null,
    title: 'Salsa Night for Nomads',
    description:
      'Beginner-friendly salsa class at 7 PM, then open dancing until late. No partner needed. Salsa shoes optional.',
    event_time: '2026-03-22T19:00:00Z',
    city: 'Medell\u00EDn',
    country: 'Colombia',
    lat: 6.244,
    lng: -75.581,
    created_at: '2026-03-10T00:00:00Z',
    attendee_count: 19,
    creator_name: 'Priya P.',
    category_emoji: '\uD83D\uDC83',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventDateTime(iso: string): { date: string; time: string; badge: string | null } {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toDateString();
  const eventStr = d.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let badge: string | null = null;
  if (eventStr === todayStr) badge = 'TODAY';
  else if (eventStr === tomorrow.toDateString()) badge = 'TOMORROW';

  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return { date, time, badge };
}

// ---------------------------------------------------------------------------
// Card content
// ---------------------------------------------------------------------------

function EventSwipeCard({ event }: { event: SwipeEvent }) {
  const { date, time, badge } = formatEventDateTime(event.event_time);

  return (
    <View style={cardStyles.card}>
      {/* Top visual area */}
      <View style={cardStyles.heroArea}>
        <Text style={cardStyles.heroEmoji}>{event.category_emoji}</Text>
        {badge && (
          <View
            style={[
              cardStyles.timeBadge,
              { backgroundColor: badge === 'TODAY' ? colors.amber : colors.teal },
            ]}
          >
            <Text style={cardStyles.timeBadgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={cardStyles.info}>
        <Text style={cardStyles.title}>{event.title}</Text>

        {/* Date & time row */}
        <View style={cardStyles.metaRow}>
          <Feather name="calendar" size={13} color={colors.teal} />
          <Text style={cardStyles.metaText}>{date}</Text>
          <Feather
            name="clock"
            size={13}
            color={colors.teal}
            style={{ marginLeft: spacing.sm }}
          />
          <Text style={cardStyles.metaText}>{time}</Text>
        </View>

        {/* Location */}
        {event.city && (
          <View style={cardStyles.metaRow}>
            <Feather name="map-pin" size={13} color={colors.amber} />
            <Text style={cardStyles.locationText}>
              {event.city}
              {event.country ? `, ${event.country}` : ''}
            </Text>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <Text style={cardStyles.description} numberOfLines={3}>
            {event.description}
          </Text>
        )}

        {/* Footer: host + attendees */}
        <View style={cardStyles.footer}>
          <View style={cardStyles.hostRow}>
            <View style={cardStyles.hostAvatar}>
              <Text style={cardStyles.hostInitial}>
                {event.creator_name.charAt(0)}
              </Text>
            </View>
            <Text style={cardStyles.hostName}>{event.creator_name}</Text>
          </View>

          <View style={cardStyles.attendeesRow}>
            <Feather name="users" size={13} color={colors.dark.text2} />
            <Text style={cardStyles.attendeesText}>
              {event.attendee_count} going
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Custom overlays
// ---------------------------------------------------------------------------

function GoingOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.teal }]}>
      <Feather name="check-circle" size={32} color={colors.teal} />
      <Text style={[overlayLabel, { color: colors.teal }]}>GOING</Text>
    </View>
  );
}

function SkipEventOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.red }]}>
      <Feather name="x" size={32} color={colors.red} />
      <Text style={[overlayLabel, { color: colors.red }]}>SKIP</Text>
    </View>
  );
}

function InterestedOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.amber }]}>
      <Feather name="bell" size={32} color={colors.amber} />
      <Text style={[overlayLabel, { color: colors.amber }]}>INTERESTED</Text>
    </View>
  );
}

const overlayBadge: any = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.lg,
  borderRadius: radius.lg,
  borderWidth: 3,
  gap: spacing.xs,
};

const overlayLabel: any = {
  fontFamily: fonts.bodyBold,
  fontSize: 22,
  letterSpacing: 3,
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function EventSwipeScreen() {
  const navigation = useNavigation();
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const [events] = useState<SwipeEvent[]>(MOCK_EVENTS);

  const handleSwipe = useCallback((event: SwipeEvent, direction: SwipeDirection) => {
    switch (direction) {
      case 'right':
        // TODO: insert RSVP "going" via supabase
        break;
      case 'left':
        break;
      case 'up':
        // TODO: insert RSVP "interested" via supabase
        break;
    }
  }, []);

  return (
    <SafeAreaView style={screenStyles.root} edges={['top']}>
      {/* Header */}
      <View style={screenStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={screenStyles.title}>Events Near You</Text>
        <TouchableOpacity
          style={screenStyles.undoBtn}
          onPress={() => deckRef.current?.undo()}
          activeOpacity={0.7}
        >
          <Feather name="rotate-ccw" size={20} color={colors.dark.text2} />
        </TouchableOpacity>
      </View>

      {/* Card deck */}
      <SwipeCardDeck
        ref={deckRef}
        data={events}
        keyExtractor={(e) => String(e.id)}
        renderCard={(event) => <EventSwipeCard event={event} />}
        onSwipe={handleSwipe}
        renderRightOverlay={() => <GoingOverlay />}
        renderLeftOverlay={() => <SkipEventOverlay />}
        renderUpOverlay={() => <InterestedOverlay />}
      />

      {/* Action buttons */}
      <View style={screenStyles.actions}>
        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionSkip]}
          onPress={() => deckRef.current?.swipeLeft()}
          activeOpacity={0.7}
        >
          <Feather name="x" size={28} color={colors.red} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionInterested]}
          onPress={() => deckRef.current?.swipeUp()}
          activeOpacity={0.7}
        >
          <Feather name="bell" size={22} color={colors.amber} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionGoing]}
          onPress={() => deckRef.current?.swipeRight()}
          activeOpacity={0.7}
        >
          <Feather name="check-circle" size={28} color={colors.teal} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.dark.text,
  },
  undoBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...shadows.sm,
  },
  actionSkip: {
    backgroundColor: colors.dark.bg2,
    borderColor: colors.red,
  },
  actionInterested: {
    width: 50,
    height: 50,
    backgroundColor: colors.dark.bg2,
    borderColor: colors.amber,
  },
  actionGoing: {
    backgroundColor: colors.dark.bg2,
    borderColor: colors.teal,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
  },
  heroArea: {
    flex: 0.45,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 72,
  },
  timeBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  timeBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.dark.text,
    letterSpacing: 1,
  },
  info: {
    flex: 0.55,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.dark.bg3,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.dark.bg4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostInitial: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.teal,
  },
  hostName: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attendeesText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
});
