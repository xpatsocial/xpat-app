import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import EventCard from '../../components/EventCard';
import { AppEvent } from '../../types';

// ---------------------------------------------------------------------------
// Date strip helpers
// ---------------------------------------------------------------------------

function getNext14Days(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

function formatDayLabel(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tmrw';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatDayNum(d: Date): string {
  return String(d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();
  const { upcomingEvents, cityEvents, rsvp } = useEvents();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [rsvpStates, setRsvpStates] = useState<Record<string, string>>({});

  const dates = useMemo(() => getNext14Days(), []);

  // -----------------------------------------------------------------------
  // Fetch events
  // -----------------------------------------------------------------------
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const city = profile?.current_city;
      const data = city ? await cityEvents(city) : await upcomingEvents(50);
      setEvents(data);

      // Build local RSVP state map for current user
      if (user) {
        const map: Record<string, string> = {};
        for (const e of data) {
          const myRsvp = e.event_rsvps?.find((r) => r.user_id === user.id);
          if (myRsvp) map[e.id] = myRsvp.status;
        }
        setRsvpStates(map);
      }
    } catch (err) {
      console.error('[EventsTab] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.current_city, user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Refetch when screen regains focus (e.g. after creating an event)
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  // -----------------------------------------------------------------------
  // Filter by selected date
  // -----------------------------------------------------------------------
  const filteredEvents = events.filter((e) => {
    const eventDate = new Date(e.starts_at);
    if (!isSameDay(eventDate, selectedDate)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title?.toLowerCase().includes(q) ||
        e.venue_name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Count events per date for dot indicators
  const eventCountByDate = new Map<string, number>();
  for (const e of events) {
    const key = new Date(e.starts_at).toDateString();
    eventCountByDate.set(key, (eventCountByDate.get(key) ?? 0) + 1);
  }

  // -----------------------------------------------------------------------
  // RSVP handler
  // -----------------------------------------------------------------------
  const handleRSVP = useCallback(
    async (event: AppEvent, status: 'going' | 'interested') => {
      if (!user) {
        navigation.navigate('Auth');
        return;
      }

      // Toggle off if already that status
      const currentStatus = rsvpStates[event.id];
      const newStatus = currentStatus === status ? 'cancelled' : status;

      Haptics.selectionAsync();
      setRsvpStates((prev) => ({ ...prev, [event.id]: newStatus }));

      const { error } = await rsvp(event.id, newStatus as any);
      if (error) {
        Alert.alert('Error', error);
        // Revert
        setRsvpStates((prev) => ({
          ...prev,
          [event.id]: currentStatus ?? 'cancelled',
        }));
      } else {
        // Refresh to get updated attendee list
        fetchEvents();
      }
    },
    [user, rsvpStates, rsvp, fetchEvents, navigation],
  );

  // -----------------------------------------------------------------------
  // Date strip
  // -----------------------------------------------------------------------
  const dateStripRef = useRef<ScrollView>(null);

  function handleDateSelect(d: Date) {
    setSelectedDate(d);
    Haptics.selectionAsync();
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="calendar" size={48} color={colors.dark.text3} />
      <Text style={styles.emptyTitle}>No events this day</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to host! Meetups start movements.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => {
          if (!user) {
            navigation.navigate('Auth');
            return;
          }
          navigation.navigate('CreateEvent');
        }}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={16} color={colors.dark.bg} />
        <Text style={styles.emptyButtonText}>Host Event</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Date strip */}
      <ScrollView
        ref={dateStripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {dates.map((d, i) => {
          const isSelected = isSameDay(d, selectedDate);
          const hasEvents = (eventCountByDate.get(d.toDateString()) ?? 0) > 0;

          return (
            <TouchableOpacity
              key={i}
              style={[styles.dateCell, isSelected && styles.dateCellActive]}
              onPress={() => handleDateSelect(d)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateDayLabel,
                  isSelected && styles.dateDayLabelActive,
                ]}
              >
                {formatDayLabel(d)}
              </Text>
              <Text
                style={[
                  styles.dateDayNum,
                  isSelected && styles.dateDayNumActive,
                ]}
              >
                {formatDayNum(d)}
              </Text>
              {hasEvents && (
                <View
                  style={[
                    styles.dateDot,
                    isSelected && styles.dateDotActive,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Events list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => {
                // Future: navigate to event detail
              }}
              onRSVP={handleRSVP}
              myRsvpStatus={
                (rsvpStates[item.id] as any) ?? null
              }
            />
          )}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB: Host Event */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (!user) {
            navigation.navigate('Auth');
            return;
          }
          navigation.navigate('CreateEvent');
        }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={22} color={colors.dark.bg} />
        <Text style={styles.fabText}>Host</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },

  // Date strip
  dateStrip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  dateCellActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  dateDayLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDayLabelActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },
  dateDayNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.dark.text,
    marginTop: 1,
  },
  dateDayNumActive: {
    color: colors.dark.bg,
  },
  dateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
    marginTop: 2,
  },
  dateDotActive: {
    backgroundColor: colors.dark.bg,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },
});
