import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

interface EventCardProps {
  event: {
    id: number;
    title: string;
    description?: string;
    event_time: string;
    city?: string;
    rsvp_count: number;
    creator_name?: string;
  };
  onRSVP: (eventId: number) => void;
  onPress: (eventId: number) => void;
}

function getDateBadge(eventTime: string): { label: string; color: string } | null {
  const now = new Date();
  const eventDate = new Date(eventTime);

  const todayStr = now.toDateString();
  const eventStr = eventDate.toDateString();

  if (eventStr === todayStr) {
    return { label: 'Today', color: colors.amber };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (eventStr === tomorrow.toDateString()) {
    return { label: 'Tomorrow', color: colors.teal };
  }

  return null;
}

function formatEventTime(eventTime: string): string {
  const date = new Date(eventTime);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitial(name?: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export default function EventCard({ event, onRSVP, onPress }: EventCardProps) {
  const badge = getDateBadge(event.event_time);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(event.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
      </View>

      {event.description && (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      )}

      <View style={styles.metaRow}>
        <Feather name="clock" size={12} color={colors.dark.text2} />
        <Text style={styles.metaText}>{formatEventTime(event.event_time)}</Text>
        {event.city && (
          <>
            <Feather
              name="map-pin"
              size={12}
              color={colors.dark.text2}
              style={{ marginLeft: spacing.sm }}
            />
            <Text style={styles.metaText}>{event.city}</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {event.creator_name && (
            <View style={styles.creatorRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {getInitial(event.creator_name)}
                </Text>
              </View>
              <Text style={styles.creatorName}>{event.creator_name}</Text>
            </View>
          )}

          <View style={styles.rsvpInfo}>
            <Feather name="users" size={12} color={colors.dark.text2} />
            <Text style={styles.rsvpCount}>{event.rsvp_count}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => onRSVP(event.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.joinText}>Join</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

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
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    marginBottom: spacing.sm,
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
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.teal,
  },
  creatorName: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  rsvpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rsvpCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  joinButton: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  joinText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
  },
});
