import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.6,
};

interface AnimatedPressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  scaleDown?: number;
  haptic?: boolean;
  disabled?: boolean;
}

export default function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  scaleDown = 0.96,
  haptic = true,
  disabled = false,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(scaleDown, SPRING_CONFIG);
      pressed.value = true;
    })
    .onFinalize((_, success) => {
      scale.value = withSpring(1, SPRING_CONFIG);
      pressed.value = false;
      if (success && onPress) {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(400)
    .onBegin(() => {
      scale.value = withSpring(scaleDown * 0.98, SPRING_CONFIG);
    })
    .onStart(() => {
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (onLongPress) onLongPress();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
    });

  const gesture = onLongPress
    ? Gesture.Race(longPressGesture, tapGesture)
    : tapGesture;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
