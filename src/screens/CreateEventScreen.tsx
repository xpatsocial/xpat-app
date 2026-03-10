import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useEvents, CreateEventInput } from '../hooks/useEvents';
import { usePostHog } from '../lib/posthog';
import { EventCategory } from '../types';

// ---------------------------------------------------------------------------
// Category options
// ---------------------------------------------------------------------------

const CATEGORIES: { key: EventCategory; label: string; emoji: string }[] = [
  { key: 'meetup', label: 'Meetup', emoji: '\uD83E\uDD1D' },
  { key: 'coworking', label: 'Cowork', emoji: '\uD83D\uDCBB' },
  { key: 'dinner', label: 'Dinner', emoji: '\uD83C\uDF7D\uFE0F' },
  { key: 'activity', label: 'Activity', emoji: '\uD83C\uDFC4' },
  { key: 'workshop', label: 'Workshop', emoji: '\uD83C\uDFA8' },
  { key: 'other', label: 'Other', emoji: '\uD83D\uDCCC' },
];

// ---------------------------------------------------------------------------
// Quick time helpers (since we don't have a date picker lib)
// ---------------------------------------------------------------------------

function roundToNextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeDisplay(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Quick-schedule presets
const QUICK_TIMES = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'In 3 hours', hours: 3 },
  { label: 'Tomorrow 10 AM', hours: -1 }, // special
  { label: 'Tomorrow 7 PM', hours: -2 }, // special
];

function getQuickTime(preset: typeof QUICK_TIMES[number]): Date {
  if (preset.hours === -1) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  if (preset.hours === -2) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return d;
  }
  return addHours(new Date(), preset.hours);
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreateEventScreen({ navigation, route }: any) {
  const { user, profile } = useAuth();
  const { createEvent } = useEvents();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();

  // Pre-fill from route params (spot context or city)
  const spot = route?.params?.spot;
  const prefillCity = spot?.city ?? profile?.current_city ?? '';
  const prefillCountry = spot?.country ?? profile?.current_country ?? '';
  const prefillVenue = spot?.name ?? '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(prefillCity);
  const [country, setCountry] = useState(prefillCountry);
  const [venueName, setVenueName] = useState(prefillVenue);
  const [category, setCategory] = useState<EventCategory>('meetup');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [startsAt, setStartsAt] = useState<Date>(roundToNextHour());
  const [loading, setLoading] = useState(false);

  // Date adjustment (simple increment/decrement since no native date picker lib)
  function adjustDate(days: number) {
    const d = new Date(startsAt);
    d.setDate(d.getDate() + days);
    setStartsAt(d);
    Haptics.selectionAsync();
  }

  function adjustHour(hours: number) {
    const d = new Date(startsAt);
    d.setHours(d.getHours() + hours);
    if (d > new Date()) {
      setStartsAt(d);
      Haptics.selectionAsync();
    }
  }

  async function handleSubmit() {
    if (!user) return;
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your event a name.');
      return;
    }
    if (!city.trim() || !country.trim()) {
      Alert.alert('Missing location', 'City and country are required.');
      return;
    }

    setLoading(true);

    const input: CreateEventInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      city: city.trim(),
      country: country.trim(),
      venue_name: venueName.trim() || undefined,
      spot_id: spot?.id ? String(spot.id) : undefined,
      starts_at: startsAt.toISOString(),
      max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
      category,
    };

    const { error } = await createEvent(input);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      posthog.capture('event_created', {
        category,
        city: city.trim(),
        country: country.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Event created!', `"${title}" is live. Share it with the community!`);
      navigation.goBack();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Host an Event</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={styles.subtitle}>
          1-minute setup. Bring nomads together.
        </Text>

        {/* Title */}
        <Text style={styles.label}>What's happening?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sunset Rooftop Social"
          placeholderTextColor={colors.dark.text2}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          returnKeyType="next"
        />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catPill,
                category === cat.key && styles.catActive,
              ]}
              onPress={() => {
                setCategory(cat.key);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.catText,
                  category === cat.key && styles.catTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* When — quick presets + manual adjust */}
        <Text style={styles.label}>When</Text>
        <View style={styles.quickRow}>
          {QUICK_TIMES.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={styles.quickPill}
              onPress={() => {
                setStartsAt(getQuickTime(preset));
                Haptics.selectionAsync();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.quickText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateTimeBox}>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => adjustDate(-1)}
            >
              <Feather name="chevron-left" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
            <View style={styles.dateDisplay}>
              <Feather name="calendar" size={14} color={colors.teal} />
              <Text style={styles.dateText}>
                {formatDateDisplay(startsAt)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => adjustDate(1)}
            >
              <Feather name="chevron-right" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => adjustHour(-1)}
            >
              <Feather name="minus" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
            <View style={styles.dateDisplay}>
              <Feather name="clock" size={14} color={colors.teal} />
              <Text style={styles.dateText}>
                {formatTimeDisplay(startsAt)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => adjustHour(1)}
            >
              <Feather name="plus" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Where */}
        <Text style={styles.label}>Where</Text>
        <TextInput
          style={styles.input}
          placeholder="Venue name (optional)"
          placeholderTextColor={colors.dark.text2}
          value={venueName}
          onChangeText={setVenueName}
        />
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="City"
            placeholderTextColor={colors.dark.text2}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Country"
            placeholderTextColor={colors.dark.text2}
            value={country}
            onChangeText={setCountry}
          />
        </View>

        {/* Description */}
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What should people know? Bring anything?"
          placeholderTextColor={colors.dark.text2}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Max attendees */}
        <Text style={styles.label}>Max Attendees (optional)</Text>
        <View style={styles.maxRow}>
          {['6', '8', '12', '20', ''].map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.maxPill,
                maxAttendees === val && styles.maxPillActive,
              ]}
              onPress={() => {
                setMaxAttendees(val);
                Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.maxText,
                  maxAttendees === val && styles.maxTextActive,
                ]}
              >
                {val || 'No limit'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.dark.bg} />
          ) : (
            <>
              <Feather name="calendar" size={18} color={colors.dark.bg} />
              <Text style={styles.submitText}>Create Event</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    marginBottom: spacing.xl,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  textArea: {
    minHeight: 80,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },

  // Category
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.bg2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  catActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  catEmoji: {
    fontSize: 14,
  },
  catText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  catTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },

  // Quick time presets
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickPill: {
    backgroundColor: colors.glass.medium,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  quickText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.teal,
  },

  // Date/time box
  dateTimeBox: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.text,
  },

  // Max attendees
  maxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  maxPill: {
    backgroundColor: colors.dark.bg2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  maxPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  maxText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  maxTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
});
