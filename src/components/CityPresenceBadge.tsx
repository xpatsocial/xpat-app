import React, { useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, animation } from '../theme';

interface CityPresenceBadgeProps {
  city: string;
  count: number;
  onPress: () => void;
}

export default function CityPresenceBadge({ city, count, onPress }: CityPresenceBadgeProps) {
  const scale = useSharedValue(1);
  const prevCount = useSharedValue(count);

  // Animate on count change
  useEffect(() => {
    if (count !== prevCount.value && count > 0) {
      scale.value = withSequence(
        withSpring(1.12, animation.springFast),
        withSpring(1, animation.spring),
      );
    }
    prevCount.value = count;
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <GlassView intensity={70} tint="dark" style={styles.blur}>
          <Feather name="users" size={13} color={colors.teal} />
          <Text style={styles.count}>{count}</Text>
          <Text style={styles.label}>
            nomad{count !== 1 ? 's' : ''} in {city}
          </Text>
          <Feather name="chevron-right" size={12} color={colors.dark.text3} />
        </GlassView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  count: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.teal,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
  },
});
