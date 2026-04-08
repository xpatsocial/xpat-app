/**
 * PeerReviewPrompt — "How was meeting [Name]?"
 *
 * Implements Airbnb's double-blind review system for x/pat.
 * Shows after mutual check-in / event attendance / connection.
 * Reviews are hidden until both parties submit (prevents retaliation).
 *
 * Sentiment options: positive or neutral (no negative -- report system handles bad actors).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import { useTrust } from '../hooks/useTrust';
import Avatar from './Avatar';

type InteractionType = 'mutual_checkin' | 'event' | 'direct_message' | 'connection';

interface PeerReviewPromptProps {
  visible: boolean;
  subjectId: string;
  subjectName: string;
  subjectAvatarUrl?: string | null;
  interactionType: InteractionType;
  interactionRef?: string;
  /** Context string like "at Punspace, Chiang Mai" */
  contextLabel?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const INTERACTION_LABELS: Record<InteractionType, string> = {
  mutual_checkin: 'checking in together',
  event: 'attending an event together',
  direct_message: 'chatting',
  connection: 'connecting',
};

export default function PeerReviewPrompt({
  visible,
  subjectId,
  subjectName,
  subjectAvatarUrl,
  interactionType,
  interactionRef,
  contextLabel,
  onClose,
  onSubmitted,
}: PeerReviewPromptProps) {
  const { submitReview } = useTrust();
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!sentiment) return;
    setLoading(true);

    const result = await submitReview(
      subjectId,
      interactionType,
      sentiment,
      reviewText || undefined,
      interactionRef,
    );

    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      onSubmitted?.();
      // Auto-close after showing confirmation
      setTimeout(() => {
        onClose();
        // Reset state for next use
        setSentiment(null);
        setReviewText('');
        setSubmitted(false);
      }, 2000);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  const handleDismiss = () => {
    onClose();
    setSentiment(null);
    setReviewText('');
    setSubmitted(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          {submitted ? (
            /* Success state */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Feather name="check" size={24} color={colors.teal} />
              </View>
              <Text style={styles.successTitle}>Review submitted</Text>
              <Text style={styles.successSubtitle}>
                It will be visible once {subjectName} also leaves a review
              </Text>
            </View>
          ) : (
            /* Review form */
            <>
              <View style={styles.subjectRow}>
                <Avatar
                  uri={subjectAvatarUrl}
                  name={subjectName}
                  userId={subjectId}
                  size={48}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>
                    How was meeting {subjectName}?
                  </Text>
                  <Text style={styles.contextText}>
                    After {INTERACTION_LABELS[interactionType]}
                    {contextLabel ? ` ${contextLabel}` : ''}
                  </Text>
                </View>
              </View>

              {/* Sentiment selection */}
              <View style={styles.sentimentRow}>
                <TouchableOpacity
                  style={[
                    styles.sentimentOption,
                    sentiment === 'positive' && styles.sentimentSelected,
                    sentiment === 'positive' && { borderColor: colors.teal },
                  ]}
                  onPress={() => {
                    setSentiment('positive');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel="Positive experience"
                  accessibilityState={{ selected: sentiment === 'positive' }}
                >
                  <Feather
                    name="thumbs-up"
                    size={20}
                    color={sentiment === 'positive' ? colors.teal : colors.dark.text2}
                  />
                  <Text style={[
                    styles.sentimentLabel,
                    sentiment === 'positive' && { color: colors.teal },
                  ]}>
                    Great
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sentimentOption,
                    sentiment === 'neutral' && styles.sentimentSelected,
                    sentiment === 'neutral' && { borderColor: colors.dark.text2 },
                  ]}
                  onPress={() => {
                    setSentiment('neutral');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel="Neutral experience"
                  accessibilityState={{ selected: sentiment === 'neutral' }}
                >
                  <Feather
                    name="minus-circle"
                    size={20}
                    color={sentiment === 'neutral' ? colors.dark.text : colors.dark.text2}
                  />
                  <Text style={[
                    styles.sentimentLabel,
                    sentiment === 'neutral' && { color: colors.dark.text },
                  ]}>
                    Okay
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Optional text */}
              {sentiment && (
                <View style={styles.textSection}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Add a note (optional)"
                    placeholderTextColor={colors.dark.text3}
                    value={reviewText}
                    onChangeText={setReviewText}
                    maxLength={280}
                    multiline
                    numberOfLines={2}
                    accessibilityLabel="Review note"
                  />
                  <Text style={styles.charCount}>{reviewText.length}/280</Text>
                </View>
              )}

              {/* Double-blind explainer */}
              <View style={styles.explainerRow}>
                <Feather name="eye-off" size={12} color={colors.dark.text3} />
                <Text style={styles.explainerText}>
                  Reviews are hidden until both people submit
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !sentiment && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!sentiment || loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Submitting review' : 'Submit review'}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.dark.bg} />
                ) : (
                  <Text style={styles.submitText}>Submit Review</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.bg2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    ...shadows.sheet,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.bg4,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  contextText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginTop: 2,
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sentimentOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  sentimentSelected: {
    backgroundColor: 'rgba(46,196,160,0.06)',
  },
  sentimentLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text2,
  },
  textSection: {
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.dark.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text3,
    textAlign: 'right',
    marginTop: 4,
  },
  explainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  explainerText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
  },
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.bg,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
  },
  // Success state
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  successSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    maxWidth: 260,
  },
});
