import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import SwipeCardDeck, {
  SwipeCardDeckRef,
  SwipeDirection,
} from '../components/SwipeCardDeck';
import { AppEvent, EventCategory } from '../types';
import { useEvents } from '../hooks/useEvents';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  meetup: '🤝',
  coworking: '💻',
  dinner: '🍽️',
  activity: '🎯',
  workshop: '🛠️',
  other: '📍',
};

interface SwipeEvent extends AppEvent {
  attendee_count: number;
  creator_name: string;
  category_emoji: string;
}

function toSwipeEvent(e: AppEvent): SwipeEvent {
  return {
    ...e,
    attendee_count: e.event_rsvps?.filter((r) => r.status === 'going').length ?? 0,
    creator_name: e.profiles?.display_name ?? 'Nomad',
    category_emoji: CATEGORY_EMOJI[e.category] ?? '📍',
  };
}

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
  const { date, time, badge } = formatEventDateTime(event.starts_at);

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
  const [events, setEvents] = useState<SwipeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { upcomingEvents, rsvp } = useEvents();

  useEffect(() => {
    upcomingEvents(30).then((data) => {
      setEvents(data.map(toSwipeEvent));
      setLoading(false);
    });
  }, [upcomingEvents]);

  const handleSwipe = useCallback(
    (event: SwipeEvent, direction: SwipeDirection) => {
      switch (direction) {
        case 'right':
          rsvp(event.id, 'going');
          break;
        case 'left':
          break;
        case 'up':
          rsvp(event.id, 'interested');
          break;
      }
    },
    [rsvp],
  );

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
      {loading ? (
        <View style={screenStyles.center}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      ) : events.length === 0 ? (
        <View style={screenStyles.center}>
          <Feather name="calendar" size={48} color={colors.dark.text3} />
          <Text style={screenStyles.emptyText}>No upcoming events</Text>
        </View>
      ) : (
        <SwipeCardDeck
          ref={deckRef}
          data={events}
          keyExtractor={(e) => e.id}
          renderCard={(event) => <EventSwipeCard event={event} />}
          onSwipe={handleSwipe}
          renderRightOverlay={() => <GoingOverlay />}
          renderLeftOverlay={() => <SkipEventOverlay />}
          renderUpOverlay={() => <InterestedOverlay />}
        />
      )}

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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text3,
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
