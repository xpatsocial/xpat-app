import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform,
} from 'react-native';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, fonts, spacing, radius, animation } from '../theme';

// EU Digital Services Act Art. 16 — Notice and Action Mechanism
// Reports must capture:
//  • Sufficiently substantiated explanation (description field)
//  • Clear indication of electronic location (auto-captured via targetId)
//  • Good-faith confirmation
//  • Notifier identity (user_id from session)
// Per: Regulation (EU) 2022/2065 Article 16(2)
export interface ReportSubmission {
  reason: string;
  description: string;
  goodFaithConfirmed: boolean;
}

interface ReportModalProps {
  visible: boolean;
  targetType: 'post' | 'spot' | 'comment' | 'pulse' | 'user';
  targetId: string;
  onClose: () => void;
  // Backwards compatible: callers can accept just `reason: string` (legacy)
  // or the new full ReportSubmission shape (DSA-compliant).
  onSubmit: (submission: ReportSubmission | string) => void;
}

const REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Fake Profile', 'Scam', 'Felt unsafe at meetup', 'Other'];
const SHEET_HEIGHT = 540;
const DISMISS_THRESHOLD = 80;

const SPRING_CONFIG = animation.springSheet;

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
  const [description, setDescription] = useState('');
  const [goodFaithConfirmed, setGoodFaithConfirmed] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setDescription('');
      setGoodFaithConfirmed(false);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [visible]);

  const canSubmit = !!selectedReason && description.trim().length >= 10 && goodFaithConfirmed;

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
    if (!canSubmit || !selectedReason) return;
    onSubmit({
      reason: selectedReason,
      description: description.trim(),
      goodFaithConfirmed,
    });
  }

  if (!visible) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, sheetStyle]} accessibilityViewIsModal accessibilityLabel={`Report ${targetType}`}>
        <GlassView tint="dark" intensity={90} style={styles.blur}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Report {targetType}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close report form">
              <Feather name="x" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    accessibilityRole="radio"
                    accessibilityLabel={reason}
                    accessibilityState={{ selected: active }}
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

            <Text style={styles.fieldLabel}>Tell us what happened *</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you saw and why it violates our community guidelines..."
              placeholderTextColor={colors.dark.text3}
              multiline
              numberOfLines={4}
              maxLength={500}
              accessibilityLabel="Report description"
              accessibilityHint="Required, minimum 10 characters"
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/500 (min 10)</Text>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setGoodFaithConfirmed(!goodFaithConfirmed)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityLabel="I confirm this report is accurate and submitted in good faith"
              accessibilityState={{ checked: goodFaithConfirmed }}
            >
              <View style={[styles.checkbox, goodFaithConfirmed && styles.checkboxActive]}>
                {goodFaithConfirmed && <Feather name="check" size={14} color={colors.dark.bg} />}
              </View>
              <Text style={styles.checkboxLabel}>
                I confirm this report is accurate and submitted in good faith.
              </Text>
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !canSubmit && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Submit report"
                accessibilityState={{ disabled: !canSubmit }}
              >
                <Text style={styles.submitText}>Submit Report</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancel report">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </GlassView>
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  descriptionInput: {
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    minHeight: 80,
    marginBottom: spacing.xs,
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text3,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    lineHeight: 17,
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
