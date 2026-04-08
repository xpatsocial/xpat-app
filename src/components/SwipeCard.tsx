import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors, radius, shadows } from '../theme';

// ---------------------------------------------------------------------------
// Animated gradient border wrapper for premium card feel
// ---------------------------------------------------------------------------

interface SwipeCardFrameProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Enable the animated gradient border (default true) */
  animatedBorder?: boolean;
}

/**
 * Shared card frame for all swipe cards.
 * - Consistent rounded corners (radius.xl)
 * - Glass border with subtle inner shadow
 * - Overflow hidden for hero images
 * - Optional animated gradient border
 */
export default function SwipeCardFrame({
  children,
  style,
  animatedBorder = true,
}: SwipeCardFrameProps) {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (!animatedBorder) return;
    rotation.value = withRepeat(
      withTiming(360, { duration: 6000 }),
      -1,   // infinite
      false, // no reverse
    );
  }, [animatedBorder, rotation]);

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={[styles.outerWrap, style]}>
      {/* Animated gradient border layer */}
      {animatedBorder && (
        <Animated.View style={[styles.gradientBorderWrap, animatedGradientStyle]}>
          <LinearGradient
            colors={[
              'rgba(46, 196, 160, 0.35)',
              'rgba(232, 128, 58, 0.25)',
              'rgba(61, 219, 181, 0.2)',
              'rgba(232, 128, 58, 0.3)',
              'rgba(46, 196, 160, 0.35)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          />
        </Animated.View>
      )}
      {/* Card inner with glass effect */}
      <View style={styles.innerCard}>
        {/* Top inner shadow for glass depth */}
        <LinearGradient
          colors={['rgba(255,255,255,0.04)', 'transparent']}
          style={styles.innerShadowTop}
          pointerEvents="none"
        />
        {children}
      </View>
    </View>
  );
}

const BORDER_WIDTH = 1.5;

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBorderWrap: {
    ...StyleSheet.absoluteFillObject,
    // Scale up so rotation doesn't show corners
    transform: [{ scale: 1.5 }],
  },
  gradientBorder: {
    width: '100%',
    height: '100%',
  },
  innerCard: {
    flex: 1,
    margin: BORDER_WIDTH,
    borderRadius: radius.xl - BORDER_WIDTH,
    overflow: 'hidden',
    backgroundColor: colors.dark.bg2,
  },
  innerShadowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 10,
    borderTopLeftRadius: radius.xl - BORDER_WIDTH,
    borderTopRightRadius: radius.xl - BORDER_WIDTH,
  },
});
