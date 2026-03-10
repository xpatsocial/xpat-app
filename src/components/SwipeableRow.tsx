import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing } from '../theme';

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

const ACTION_WIDTH = 72;
const SNAP_THRESHOLD = 40;

interface SwipeAction {
  icon: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  rightActions?: SwipeAction[];
}

export default function SwipeableRow({
  children,
  style,
  rightActions = [],
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const totalActionWidth = rightActions.length * ACTION_WIDTH;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      context.value = translateX.value;
    })
    .onUpdate((e) => {
      const newX = context.value + e.translationX;
      // Clamp: no swipe right beyond 0, elastic resistance past action width
      if (newX > 0) {
        translateX.value = newX * 0.2;
      } else if (newX < -totalActionWidth) {
        const overflow = newX + totalActionWidth;
        translateX.value = -totalActionWidth + overflow * 0.2;
      } else {
        translateX.value = newX;
      }
    })
    .onEnd((e) => {
      if (translateX.value < -SNAP_THRESHOLD) {
        translateX.value = withSpring(-totalActionWidth, SPRING_CONFIG);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    width: interpolate(
      -translateX.value,
      [0, totalActionWidth],
      [0, totalActionWidth],
      Extrapolation.CLAMP,
    ),
  }));

  function handleAction(action: SwipeAction) {
    translateX.value = withSpring(0, SPRING_CONFIG);
    action.onPress();
  }

  if (rightActions.length === 0) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.wrapper, style]}>
      {/* Action buttons revealed behind */}
      <Animated.View style={[styles.actionsContainer, actionsStyle]}>
        {rightActions.map((action, i) => (
          <GestureDetector
            key={i}
            gesture={Gesture.Tap().onEnd(() => runOnJS(handleAction)(action))}
          >
            <Animated.View style={[styles.actionBtn, { backgroundColor: action.bgColor }]}>
              <Feather name={action.icon as any} size={18} color={action.color} />
            </Animated.View>
          </GestureDetector>
        ))}
      </Animated.View>

      {/* Main content row */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: colors.dark.bg,
  },
});
