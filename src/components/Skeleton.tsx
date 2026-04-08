import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
}

export default function Skeleton({ width, height, borderRadius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.dark.bg3,
        },
        animatedStyle,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    />
  );
}
