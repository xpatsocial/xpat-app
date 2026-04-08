/**
 * ActivationProgress — Visual progress indicator for the activation funnel
 *
 * Inspired by Slack's approach to driving users toward their 2,000-message
 * activation threshold. This component shows users their progress toward
 * becoming a fully activated x/pat member (3 spots saved + 1 chat message).
 *
 * Design: Glass card with animated progress bar and step checklist.
 * Collapses to a minimal pill after activation is complete.
 *
 * Reference: research/playbook-stewart-butterfield-product-led.md
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, animation } from '../theme';
import type { ActivationStep } from '../hooks/useActivationFunnel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActivationProgressProps {
  /** 0-1 progress toward full activation */
  progress: number;
  /** Individual step breakdown */
  steps: ActivationStep[];
  /** Whether user has crossed the activation threshold */
  isActivated: boolean;
  /** Whether to show in compact (pill) mode */
  compact?: boolean;
  /** Called when user taps a step (to navigate to relevant screen) */
  onStepPress?: (stepId: string) => void;
  /** Called when the card is dismissed */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Step Row
// ---------------------------------------------------------------------------

function StepRow({
  step,
  onPress,
}: {
  step: ActivationStep;
  onPress?: () => void;
}) {
  const checkScale = useSharedValue(step.completed ? 1 : 0);

  useEffect(() => {
    checkScale.value = withSpring(step.completed ? 1 : 0, animation.spring);
  }, [step.completed]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const emptyStyle = useAnimatedStyle(() => ({
    opacity: 1 - checkScale.value,
    transform: [{ scale: 1 - checkScale.value * 0.5 }],
  }));

  return (
    <TouchableOpacity
      style={styles.stepRow}
      onPress={onPress}
      disabled={step.completed}
      activeOpacity={0.7}
    >
      <View style={styles.stepCheck}>
        <Animated.View style={[styles.checkCircleFilled, checkStyle]}>
          <Feather name="check" size={12} color={colors.dark.bg} />
        </Animated.View>
        <Animated.View style={[styles.checkCircleEmpty, emptyStyle]}>
          <Feather
            name={step.icon as any}
            size={12}
            color={colors.dark.text3}
          />
        </Animated.View>
      </View>
      <Text
        style={[
          styles.stepLabel,
          step.completed && styles.stepLabelCompleted,
        ]}
      >
        {step.label}
      </Text>
      {!step.completed && (
        <Feather name="chevron-right" size={14} color={colors.dark.text3} />
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function ProgressBar({ progress }: { progress: number }) {
  const barWidth = useSharedValue(0);
  const barColor = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withSpring(progress, { damping: 20, stiffness: 100 });
    barColor.value = withTiming(progress, { duration: 600 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
    backgroundColor: interpolateColor(
      barColor.value,
      [0, 0.5, 1],
      [colors.dark.text3, colors.teal, colors.tealLight],
    ),
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ActivationProgress({
  progress,
  steps,
  isActivated,
  compact = false,
  onStepPress,
  onDismiss,
}: ActivationProgressProps) {
  const cardScale = useSharedValue(1);
  const prevProgressRef = useRef(progress);

  // Pulse animation when progress changes
  useEffect(() => {
    if (progress > prevProgressRef.current && progress < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cardScale.value = withSequence(
        withSpring(1.02, animation.springFast),
        withSpring(1, animation.spring),
      );
    }
    prevProgressRef.current = progress;
  }, [progress]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Don't render if activated and dismissed
  if (isActivated && compact) {
    return null;
  }

  // Activated celebration state
  if (isActivated) {
    return (
      <Animated.View style={[styles.card, styles.cardActivated, cardStyle]}>
        <View style={styles.activatedRow}>
          <View style={styles.activatedBadge}>
            <Feather name="zap" size={14} color={colors.dark.bg} />
          </View>
          <View style={styles.activatedContent}>
            <Text style={styles.activatedTitle}>You're activated!</Text>
            <Text style={styles.activatedSubtitle}>
              You're part of the community now
            </Text>
          </View>
          {onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={16} color={colors.dark.text3} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }

  // Compact pill mode
  if (compact) {
    const completedCount = steps.filter((s) => s.completed).length;
    return (
      <TouchableOpacity
        style={styles.pill}
        activeOpacity={0.8}
        onPress={() => {
          // Find first incomplete step
          const nextStep = steps.find((s) => !s.completed);
          if (nextStep && onStepPress) onStepPress(nextStep.id);
        }}
      >
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>
          {completedCount}/{steps.length} steps to go
        </Text>
        <ProgressBar progress={progress} />
      </TouchableOpacity>
    );
  }

  // Full card mode
  const percentage = Math.round(progress * 100);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.subtitle}>{percentage}% complete</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={16} color={colors.dark.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      <ProgressBar progress={progress} />

      {/* Steps */}
      <View style={styles.stepsList}>
        {steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            onPress={() => onStepPress?.(step.id)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  cardActivated: {
    borderColor: colors.teal + '40',
    backgroundColor: colors.teal + '10',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: colors.dark.bg3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 4,
  },

  // Steps
  stepsList: {
    gap: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  stepCheck: {
    width: 24,
    height: 24,
    marginRight: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleFilled: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleEmpty: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
  stepLabelCompleted: {
    color: colors.dark.text3,
    textDecorationLine: 'line-through',
  },

  // Compact pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: spacing.sm,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    flex: 1,
  },

  // Activated state
  activatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  activatedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activatedContent: {
    flex: 1,
  },
  activatedTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.teal,
  },
  activatedSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
});
