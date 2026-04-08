import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { colors, fonts, spacing, radius } from '../theme';

interface StreakAnimationProps {
  streakCount: number;
  visible: boolean;
}

function getStreakTier(count: number): { emoji: string; size: number; glowRadius: number } {
  if (count >= 30) return { emoji: '🔥', size: 48, glowRadius: 20 };
  if (count >= 7) return { emoji: '🔥', size: 36, glowRadius: 14 };
  return { emoji: '🔥', size: 28, glowRadius: 10 };
}

export default function StreakAnimation({ streakCount, visible }: StreakAnimationProps) {
  const scale = useSharedValue(0);
  const counterValue = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const tier = getStreakTier(streakCount);

  useEffect(() => {
    if (visible) {
      // Entrance: scale up -> overshoot -> settle
      scale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 150 }),
      );

      // Counter animates up with spring
      counterValue.value = withDelay(200,
        withSpring(streakCount, { damping: 20, stiffness: 100 }),
      );

      // Glow pulses in
      glowOpacity.value = withDelay(100, withSequence(
        withTiming(0.8, { duration: 300 }),
        withTiming(0.4, { duration: 400 }),
        withTiming(0.6, { duration: 300 }),
      ));
    } else {
      scale.value = withTiming(0, { duration: 200 });
      counterValue.value = 0;
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, streakCount]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0, 0.3, 1], [0, 1, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const numberStyle = useAnimatedStyle(() => ({
    // Display the rounded animated value
    opacity: interpolate(scale.value, [0, 0.5, 1], [0, 0.5, 1]),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Glow behind fire */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: tier.glowRadius * 4,
            height: tier.glowRadius * 4,
            borderRadius: tier.glowRadius * 2,
          },
          glowStyle,
        ]}
      />

      {/* Fire emoji */}
      <Text style={[styles.emoji, { fontSize: tier.size }]}>{tier.emoji}</Text>

      {/* Streak count */}
      <Animated.View style={numberStyle}>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{streakCount}</Text>
          <Text style={styles.dayLabel}>day streak</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.amber,
    top: -10,
  },
  emoji: {
    textAlign: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    backgroundColor: colors.dark.bg2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  countText: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.amber,
  },
  dayLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
});
