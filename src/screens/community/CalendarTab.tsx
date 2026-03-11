import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../../theme';
import { useEvents } from '../../hooks/useEvents';
import { AppEvent } from '../../types';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('default', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function CalendarTab({ searchQuery = '' }: { searchQuery?: string }) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const { upcomingEvents } = useEvents();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    upcomingEvents(200).then((data) => {
      setEvents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Refetch events when screen gains focus (e.g. after creating an event)
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.venue_name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, AppEvent[]> = {};
    searchFilteredEvents.forEach((event) => {
      const d = new Date(event.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [searchFilteredEvents]);

  const dateKey = useCallback(
    (year: number, month: number, day: number) => `${year}-${month}-${day}`,
    []
  );

  const selectedEvents = useMemo(() => {
    const key = dateKey(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
    return eventsByDate[key] || [];
  }, [selectedDate, eventsByDate, dateKey]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    // Pad end to complete the last row
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [currentYear, currentMonth]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayPress = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };

  const isPast = (day: number): boolean => {
    const cellDate = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    return cellDate < todayStart;
  };

  const isToday = (day: number): boolean => {
    return isSameDay(new Date(currentYear, currentMonth, day), today);
  };

  const isSelected = (day: number): boolean => {
    return isSameDay(new Date(currentYear, currentMonth, day), selectedDate);
  };

  const hasEvents = (day: number): boolean => {
    return !!eventsByDate[dateKey(currentYear, currentMonth, day)];
  };

  const renderDayCell = (day: number | null, index: number) => {
    if (day === null) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const past = isPast(day);
    const todayFlag = isToday(day);
    const selected = isSelected(day);
    const dotVisible = hasEvents(day);

    return (
      <TouchableOpacity
        key={`day-${day}`}
        style={[
          styles.dayCell,
          todayFlag && styles.todayCell,
          selected && !todayFlag && styles.selectedCell,
        ]}
        onPress={() => handleDayPress(day)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayText,
            past && styles.pastDayText,
            todayFlag && styles.todayText,
            selected && !todayFlag && styles.selectedDayText,
          ]}
        >
          {day}
        </Text>
        {dotVisible && (
          <View
            style={[styles.eventDot, todayFlag && styles.eventDotOnToday]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderEventItem = ({ item }: { item: AppEvent }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventTimeStrip} />
      <View style={styles.eventContent}>
        <Text style={styles.eventName} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.eventMeta}>
          <Feather
            name="clock"
            size={12}
            color={colors.dark.text2}
            style={styles.metaIcon}
          />
          <Text style={styles.eventMetaText}>{formatTime(item.starts_at)}</Text>
        </View>
        {item.venue_name ? (
          <View style={styles.eventMeta}>
            <Feather
              name="map-pin"
              size={12}
              color={colors.dark.text2}
              style={styles.metaIcon}
            />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {item.venue_name}
            </Text>
          </View>
        ) : null}
        {item.rsvp_count != null ? (
          <View style={styles.eventMeta}>
            <Feather
              name="users"
              size={12}
              color={colors.dark.text2}
              style={styles.metaIcon}
            />
            <Text style={styles.eventMetaText}>
              {item.rsvp_count} attending
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="calendar" size={40} color={colors.dark.text3} />
      <Text style={styles.emptyText}>
        {searchQuery.trim()
          ? `No events matching "${searchQuery.trim()}"`
          : 'No events this day'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {formatMonth(currentYear, currentMonth)}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} hitSlop={12}>
          <Feather name="chevron-right" size={22} color={colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <View key={d} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {Array.from({ length: calendarDays.length / 7 }, (_, rowIdx) => (
          <View key={`row-${rowIdx}`} style={styles.weekRow}>
            {calendarDays
              .slice(rowIdx * 7, rowIdx * 7 + 7)
              .map((day, colIdx) => renderDayCell(day, rowIdx * 7 + colIdx))}
          </View>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Events list */}
      <FlatList
        data={selectedEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.eventList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekDayText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text3,
    textTransform: 'uppercase',
  },
  grid: {
    paddingHorizontal: spacing.xs,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
  },
  todayCell: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
  },
  selectedCell: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
  },
  dayText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
  },
  pastDayText: {
    color: colors.dark.text3,
    opacity: 0.5,
  },
  todayText: {
    fontFamily: fonts.bodyBold,
    color: colors.dark.bg,
  },
  selectedDayText: {
    fontFamily: fonts.bodyBold,
    color: colors.teal,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
    marginTop: 2,
  },
  eventDotOnToday: {
    backgroundColor: colors.dark.bg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  eventList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark.bg3,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  eventTimeStrip: {
    width: 3,
    backgroundColor: colors.teal,
  },
  eventContent: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  eventName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaIcon: {
    marginRight: 6,
  },
  eventMetaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text3,
    marginTop: spacing.sm,
  },
});
