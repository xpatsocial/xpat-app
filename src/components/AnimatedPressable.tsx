import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { animation } from '../theme';

const SPRING_CONFIG = animation.springPress;

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' | 'warning';

interface AnimatedPressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  scaleDown?: number;
  haptic?: boolean;
  /** Haptic feedback style for tap. Defaults to 'light'. */
  hapticStyle?: HapticStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'menuitem' | 'imagebutton' | 'none';
  accessibilityState?: { selected?: boolean; disabled?: boolean; checked?: boolean | 'mixed'; expanded?: boolean; busy?: boolean };
}

function triggerHaptic(style: HapticStyle) {
  switch (style) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'selection':
      Haptics.selectionAsync();
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}

export default function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  scaleDown = 0.96,
  haptic = true,
  hapticStyle = 'light',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
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
          triggerHaptic(hapticStyle);
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
        // Long press activation always uses heavy impact (iOS HIG pattern)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
      <Animated.View
        style={[style, animatedStyle]}
        accessible
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, ...accessibilityState }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
