import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { AppEvent, EventRsvp, EventCategory } from '../types';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<EventCategory, { emoji: string; label: string }> = {
  meetup: { emoji: '\uD83E\uDD1D', label: 'Meetup' },
  coworking: { emoji: '\uD83D\uDCBB', label: 'Coworking' },
  dinner: { emoji: '\uD83C\uDF7D\uFE0F', label: 'Dinner' },
  activity: { emoji: '\uD83C\uDFC4', label: 'Activity' },
  workshop: { emoji: '\uD83C\uDFA8', label: 'Workshop' },
  other: { emoji: '\uD83D\uDCCC', label: 'Other' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventCardProps {
  event: AppEvent;
  onPress?: (event: AppEvent) => void;
  onRSVP?: (event: AppEvent, status: 'going' | 'interested') => void;
  myRsvpStatus?: 'going' | 'interested' | 'cancelled' | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateBadge(startsAt: string): { label: string; color: string } | null {
  const now = new Date();
  const eventDate = new Date(startsAt);
  const todayStr = now.toDateString();
  const eventStr = eventDate.toDateString();

  if (eventStr === todayStr) return { label: 'Today', color: colors.amber };

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (eventStr === tomorrow.toDateString()) return { label: 'Tomorrow', color: colors.teal };

  return null;
}

function formatEventTime(startsAt: string): string {
  const date = new Date(startsAt);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGoingRsvps(event: AppEvent): EventRsvp[] {
  if (!event.event_rsvps) return [];
  return event.event_rsvps.filter((r) => r.status === 'going');
}

function getInitial(name?: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventCard({ event, onPress, onRSVP, myRsvpStatus }: EventCardProps) {
  const badge = getDateBadge(event.starts_at);
  const cat = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.other;
  const goingList = getGoingRsvps(event);
  const goingCount = goingList.length;
  const spotsLeft = event.max_attendees ? event.max_attendees - goingCount : null;
  const avatarsToShow = goingList.slice(0, 5);
  const isGoing = myRsvpStatus === 'going';
  const isInterested = myRsvpStatus === 'interested';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(event)}
      activeOpacity={0.7}
    >
      {/* Header: category + title + badge */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.catEmoji}>{cat.emoji}</Text>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{cat.label}</Text>
        </View>
      </View>

      {/* Description */}
      {event.description && (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      )}

      {/* Meta: time + venue */}
      <View style={styles.metaRow}>
        <Feather name="clock" size={12} color={colors.dark.text2} />
        <Text style={styles.metaText}>{formatEventTime(event.starts_at)}</Text>
      </View>

      {event.venue_name ? (
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.dark.text2} />
          <Text style={styles.metaText}>{event.venue_name}</Text>
        </View>
      ) : (
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.dark.text2} />
          <Text style={styles.metaText}>{event.city}, {event.country}</Text>
        </View>
      )}

      {/* Who's Going — avatar row */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {/* Avatar stack */}
          {avatarsToShow.length > 0 && (
            <View style={styles.avatarStack}>
              {avatarsToShow.map((rsvp, i) => (
                <View
                  key={rsvp.id}
                  style={[
                    styles.avatarCircle,
                    { marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i },
                  ]}
                >
                  {rsvp.profiles?.avatar_url ? (
                    <Image
                      source={{ uri: rsvp.profiles.avatar_url }}
                      style={styles.avatarImage}
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {getInitial(rsvp.profiles?.display_name)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Count label */}
          <View style={styles.countRow}>
            <Text style={styles.goingCount}>
              {goingCount} going
            </Text>
            {spotsLeft !== null && spotsLeft > 0 && (
              <Text style={styles.spotsLeft}>
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
              </Text>
            )}
            {spotsLeft !== null && spotsLeft <= 0 && (
              <Text style={[styles.spotsLeft, { color: colors.red }]}>Full</Text>
            )}
          </View>
        </View>

        {/* RSVP Buttons */}
        <View style={styles.rsvpButtons}>
          {onRSVP && (
            <>
              <TouchableOpacity
                style={[
                  styles.rsvpBtn,
                  isInterested && styles.rsvpBtnActiveAmber,
                ]}
                onPress={() => onRSVP(event, 'interested')}
                activeOpacity={0.7}
              >
                <Feather
                  name="bell"
                  size={14}
                  color={isInterested ? colors.dark.bg : colors.amber}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.joinButton,
                  isGoing && styles.joinButtonActive,
                ]}
                onPress={() => onRSVP(event, 'going')}
                activeOpacity={0.7}
              >
                <Text style={[styles.joinText, isGoing && styles.joinTextActive]}>
                  {isGoing ? 'Going' : 'Join'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  catEmoji: {
    fontSize: 16,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.text,
    flexShrink: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.dark.text,
    textTransform: 'uppercase',
  },
  categoryPill: {
    backgroundColor: colors.glass.light,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  categoryText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.dark.bg3,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.dark.bg2,
  },
  avatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.teal,
  },
  countRow: {
    flexDirection: 'column',
    gap: 1,
  },
  goingCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  spotsLeft: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.amber,
  },
  rsvpButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rsvpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpBtnActiveAmber: {
    backgroundColor: colors.amber,
  },
  joinButton: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  joinButtonActive: {
    backgroundColor: 'rgba(46, 196, 160, 0.2)',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  joinText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.bg,
  },
  joinTextActive: {
    color: colors.teal,
  },
});
