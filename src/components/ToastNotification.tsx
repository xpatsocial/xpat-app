import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import GlassView from './GlassView';
import { colors, fonts, spacing, radius, animation } from '../theme';

export type ToastType = 'success' | 'error' | 'info' | 'neutral';

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState extends ToastConfig {
  id: number;
}

const TOAST_COLORS: Record<ToastType, string> = {
  success: colors.teal,
  error: colors.red,
  info: colors.amber,
  neutral: colors.dark.text2,
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
  neutral: 'bell',
};

const DEFAULT_DURATION = 3000;

// Singleton event system
type ToastListener = (config: ToastConfig) => void;
let _listener: ToastListener | null = null;

/** Static API — call from anywhere: Toast.show({ type: 'success', title: 'Saved!' }) */
export const Toast = {
  show: (config: ToastConfig) => {
    if (_listener) _listener(config);
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastState; onDismiss: (id: number) => void }) {
  const translateY = useSharedValue(-120);
  const progress = useSharedValue(0);
  const color = TOAST_COLORS[toast.type];
  const icon = TOAST_ICONS[toast.type];
  const duration = toast.duration || DEFAULT_DURATION;

  useEffect(() => {
    // Haptic feedback
    if (toast.type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Slide in
    translateY.value = withSpring(0, animation.spring);

    // Progress bar
    progress.value = withTiming(1, { duration });

    // Auto dismiss
    const timer = setTimeout(() => {
      translateY.value = withTiming(-120, { duration: 250 }, (finished) => {
        if (finished) runOnJS(onDismiss)(toast.id);
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [-120, -40, 0], [0, 0.8, 1]),
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${(1 - progress.value) * 100}%`,
  }));

  return (
    <Animated.View style={[styles.toastWrapper, containerStyle]}>
      <GlassView intensity={80} tint="dark" style={[styles.toast, { borderColor: `${color}33` }]}>
        <View style={styles.toastContent}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
            <Feather name={icon as any} size={16} color={color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color }]} numberOfLines={1}>
              {toast.title}
            </Text>
            {toast.message && (
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
            )}
          </View>
        </View>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { backgroundColor: color }, progressStyle]} />
        </View>
      </GlassView>
    </Animated.View>
  );
}

/** Mount this once at root level (e.g., in AppNavigator or App.tsx) */
export default function ToastNotification() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  let idCounter = 0;

  const handleShow = useCallback((config: ToastConfig) => {
    idCounter += 1;
    const newToast: ToastState = { ...config, id: Date.now() + Math.random() };
    setToasts(prev => [...prev.slice(-2), newToast]); // max 3 visible
  }, []);

  const handleDismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    _listener = handleShow;
    return () => { _listener = null; };
  }, [handleShow]);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <View key={toast.id} style={{ marginTop: index * 4 }} pointerEvents="none">
          <ToastItem toast={toast} onDismiss={handleDismiss} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    alignItems: 'center',
  },
  toastWrapper: {
    width: '92%',
    maxWidth: 400,
  },
  toast: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    lineHeight: 16,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
});
