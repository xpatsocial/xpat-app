/**
 * OfflineBanner — ambient offline indicator
 *
 * Appears at top of screen when connectivity drops.
 * Slides in/out with spring animation.
 * Shows cached data count so users know what's available offline.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { colors, fonts, spacing } from '../theme';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);

  useEffect(() => {
    translateY.value = withSpring(isOnline ? -80 : 0, {
      damping: 15,
      stiffness: 120,
    });
  }, [isOnline]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top + 8 }, animStyle]} accessibilityLiveRegion="polite">
      <View style={styles.pill} accessible accessibilityRole="alert" accessibilityLabel="You are offline. Showing cached data">
        <Feather name="wifi-off" size={13} color={colors.amber} />
        <Text style={styles.text}>Offline — showing cached data</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.amber + '40',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },
});
