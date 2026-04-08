/**
 * FirstWeekGuide — "Your first week in [City]"
 *
 * Personalized onboarding for newcomers to a city.
 * Implements the "do things that don't scale" principle:
 * a warm, personal welcome that makes every city feel like home.
 *
 * Shows actionable steps: find a cowork, meet nomads, explore spots.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import GlassView from './GlassView';

interface FirstWeekGuideProps {
  city: string;
  country: string;
  /** Number of spots in this city */
  spotCount: number;
  /** Number of nomads currently in this city */
  nomadCount: number;
  /** Number of upcoming events */
  eventCount: number;
  onExploreSpots: () => void;
  onMeetNomads: () => void;
  onViewEvents: () => void;
  onDismiss: () => void;
}

interface GuideStep {
  icon: string;
  title: string;
  subtitle: string;
  action: () => void;
  actionLabel: string;
  color: string;
  available: boolean;
}

export default function FirstWeekGuide({
  city,
  country,
  spotCount,
  nomadCount,
  eventCount,
  onExploreSpots,
  onMeetNomads,
  onViewEvents,
  onDismiss,
}: FirstWeekGuideProps) {
  const steps: GuideStep[] = [
    {
      icon: 'map-pin',
      title: 'Find your spots',
      subtitle: `${spotCount} nomad-approved spots in ${city}`,
      action: onExploreSpots,
      actionLabel: 'Explore',
      color: colors.teal,
      available: spotCount > 0,
    },
    {
      icon: 'users',
      title: 'Meet fellow nomads',
      subtitle: `${nomadCount} nomad${nomadCount !== 1 ? 's' : ''} here now`,
      action: onMeetNomads,
      actionLabel: 'Browse',
      color: colors.amber,
      available: nomadCount > 0,
    },
    {
      icon: 'calendar',
      title: 'Join an event',
      subtitle: eventCount > 0
        ? `${eventCount} event${eventCount !== 1 ? 's' : ''} this week`
        : 'Be the first to host one',
      action: onViewEvents,
      actionLabel: eventCount > 0 ? 'View' : 'Create',
      color: '#6C63FF',
      available: true,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your first week in {city}</Text>
          <Text style={styles.subtitle}>{country}</Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss first week guide"
        >
          <Feather name="x" size={14} color={colors.dark.text3} />
        </TouchableOpacity>
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.title}
            style={styles.stepRow}
            onPress={step.action}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${step.title}: ${step.subtitle}`}
          >
            <View style={[styles.stepIcon, { backgroundColor: `${step.color}15` }]}>
              <Feather name={step.icon as any} size={16} color={step.color} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            </View>
            <View style={[styles.actionPill, { borderColor: `${step.color}40` }]}>
              <Text style={[styles.actionText, { color: step.color }]}>
                {step.actionLabel}
              </Text>
              <Feather name="chevron-right" size={12} color={step.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.welcomeFooter}>
        <Feather name="heart" size={12} color={colors.amber} />
        <Text style={styles.welcomeText}>
          Every city feels like home
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  stepSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    marginTop: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  welcomeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(232,128,58,0.06)',
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  welcomeText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.amber,
    fontStyle: 'italic',
  },
});
