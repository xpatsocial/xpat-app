import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, fonts, spacing, radius } from '../theme';

interface ReportModalProps {
  visible: boolean;
  targetType: 'post' | 'spot' | 'comment' | 'pulse' | 'user';
  targetId: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Fake Profile', 'Scam', 'Felt unsafe at meetup', 'Other'];
const SHEET_HEIGHT = 380;
const DISMISS_THRESHOLD = 80;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

export default function ReportModal({
  visible,
  targetType,
  targetId,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const context = useSharedValue(0);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((e) => {
      const newY = context.value + e.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 500) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function handleSubmit() {
    if (!selectedReason) return;
    onSubmit(selectedReason);
  }

  if (!visible) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, sheetStyle]}>
        <BlurView tint="dark" intensity={90} style={styles.blur}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Report {targetType}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Why are you reporting this {targetType}?
          </Text>

          <View style={styles.reasonGrid}>
            {REASONS.map((reason) => {
              const active = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonPill, active && styles.reasonPillActive]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      active && styles.reasonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !selectedReason && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason}
            >
              <Text style={styles.submitText}>Submit Report</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
  },
  blur: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderColor: colors.dark.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.bg3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginBottom: spacing.lg,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reasonPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.bg2,
  },
  reasonPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  reasonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
  reasonTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },
  actions: {
    gap: spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: colors.dark.bg3,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
});
