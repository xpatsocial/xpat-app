import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme';

const TAB_ICONS: Record<string, string> = {
  Explore: 'compass',
  Feed: 'rss',
  Chat: 'message-circle',
  Profile: 'user',
};

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.4,
};

interface GlassTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  // Animated indicator position
  const indicatorX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(state.index, SPRING_CONFIG);
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    if (tabWidth.value === 0) return { opacity: 0 };
    const itemWidth = tabWidth.value / tabCount;
    return {
      opacity: 1,
      transform: [
        { translateX: indicatorX.value * itemWidth + (itemWidth - 48) / 2 },
      ],
    };
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View
        style={styles.container}
        onLayout={(e) => {
          tabWidth.value = e.nativeEvent.layout.width;
        }}
      >
        {/* Glass background */}
        {Platform.OS === 'ios' ? (
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill}>
            <View style={styles.glassOverlay} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
        )}

        {/* Glass border */}
        <View style={styles.glassBorder} />

        {/* Sliding indicator */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Tab buttons */}
        <View style={styles.tabRow}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const iconName = TAB_ICONS[route.name] || 'circle';

            return (
              <TabButton
                key={route.key}
                icon={iconName}
                label={route.name}
                isFocused={isFocused}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                onLongPress={() => {
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface TabButtonProps {
  icon: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({ icon, label, isFocused, onPress, onLongPress }: TabButtonProps) {
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    colorProgress.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
    if (isFocused) {
      scale.value = withSpring(1.1, SPRING_CONFIG);
    } else {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.6, { duration: 250 }),
  }));

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={iconStyle}>
        <Feather
          name={icon as any}
          size={22}
          color={isFocused ? colors.teal : colors.dark.text2}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          { color: isFocused ? colors.teal : colors.dark.text2 },
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>

      {/* Active glow dot */}
      {isFocused && <View style={styles.glowDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 28, 30, 0.55)',
  },
  androidBg: {
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderRadius: 32,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(46, 196, 160, 0.12)',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 3,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  glowDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
