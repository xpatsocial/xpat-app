import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { ActivityStatus } from '../types';

const STATUS_OPTIONS: { value: ActivityStatus; label: string; icon: string; color: string }[] = [
  { value: 'available', label: 'Available', icon: 'smile', color: colors.teal },
  { value: 'exploring', label: 'Exploring', icon: 'compass', color: colors.amber },
  { value: 'working', label: 'Working', icon: 'monitor', color: '#8B8BF5' },
  { value: 'offline', label: 'Offline', icon: 'moon', color: colors.dark.text2 },
];

interface AvailabilityToggleProps {
  userId: string;
  city?: string | null;
  country?: string | null;
  compact?: boolean;
}

export default function AvailabilityToggle({ userId, city, country, compact = false }: AvailabilityToggleProps) {
  const [status, setStatus] = useState<ActivityStatus>('offline');
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Fetch current status
    supabase
      .from('user_availability')
      .select('status')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setStatus(data.status as ActivityStatus);
      });
  }, [userId]);

  async function updateStatus(newStatus: ActivityStatus) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus(newStatus);
    setExpanded(false);

    scale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, 150);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    await supabase
      .from('user_availability')
      .upsert({
        user_id: userId,
        status: newStatus,
        city: city || null,
        country: country || null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });
  }

  const currentOption = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[3];

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => {
          const nextIdx = (STATUS_OPTIONS.findIndex(s => s.value === status) + 1) % STATUS_OPTIONS.length;
          updateStatus(STATUS_OPTIONS[nextIdx].value);
        }}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.compactPill, { borderColor: currentOption.color + '40' }, containerStyle]}>
          <View style={[styles.statusDot, { backgroundColor: currentOption.color }]} />
          <Text style={[styles.compactText, { color: currentOption.color }]}>
            {currentOption.label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.mainPill, { borderColor: currentOption.color + '40' }, containerStyle]}>
          <View style={[styles.statusDot, { backgroundColor: currentOption.color }]} />
          <Feather name={currentOption.icon as any} size={14} color={currentOption.color} />
          <Text style={[styles.statusText, { color: currentOption.color }]}>
            {currentOption.label}
          </Text>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.dark.text2}
          />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdown}>
          {STATUS_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownItem,
                status === option.value && styles.dropdownItemActive,
              ]}
              onPress={() => updateStatus(option.value)}
              activeOpacity={0.7}
            >
              <Feather name={option.icon as any} size={16} color={option.color} />
              <Text style={[styles.dropdownText, { color: option.color }]}>
                {option.label}
              </Text>
              {status === option.value && (
                <Feather name="check" size={14} color={option.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  mainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.dark.bg2,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    flex: 1,
  },
  compactText: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(46, 196, 160, 0.08)',
  },
  dropdownText: {
    fontFamily: fonts.body,
    fontSize: 13,
    flex: 1,
  },
});
