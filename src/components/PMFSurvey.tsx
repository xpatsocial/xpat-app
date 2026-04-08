/**
 * PMF Survey — Rahul Vohra / Sean Ellis product-market fit measurement
 *
 * 4-question survey shown to engaged users (14+ days, 5+ sessions).
 * One question per screen with spring animations and progress dots.
 * Glassmorphism dark theme matching x/pat design system.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, Pressable,
  Dimensions, ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInRight, SlideOutLeft,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { trackPMFSurveyCompleted } from '../lib/analytics';

const TOTAL_QUESTIONS = 4;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DisappointmentLevel = 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed';

interface SurveyData {
  disappointment_level: DisappointmentLevel | null;
  ideal_user_description: string;
  main_benefit: string;
  improvement_suggestion: string;
}

// ---------------------------------------------------------------------------
// AsyncStorage keys for trigger logic
// ---------------------------------------------------------------------------

const KEY_PMF_LAST_SHOWN = 'pmf_survey_last_shown';
const KEY_PMF_COMPLETED_COUNT = 'pmf_survey_completed_count';

/**
 * Check whether the PMF survey should be shown.
 * Criteria: 14+ days since install, 5+ sessions, not shown in last 90 days.
 */
export async function shouldShowPMFSurvey(daysSinceInstall: number, sessionCount: number): Promise<boolean> {
  // Must have been active 14+ days and completed 5+ sessions
  if (daysSinceInstall < 14 || sessionCount < 5) return false;

  const lastShown = await AsyncStorage.getItem(KEY_PMF_LAST_SHOWN);
  if (lastShown) {
    const daysSinceLastShown = Math.floor(
      (Date.now() - new Date(lastShown).getTime()) / (1000 * 60 * 60 * 24),
    );
    // Don't show again within 90 days
    if (daysSinceLastShown < 90) return false;
  }

  return true;
}

/** Mark the survey as shown right now. */
export async function markPMFSurveyShown(): Promise<void> {
  await AsyncStorage.setItem(KEY_PMF_LAST_SHOWN, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PMFSurveyProps {
  visible: boolean;
  onClose: () => void;
}

export default function PMFSurvey({ visible, onClose }: PMFSurveyProps) {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<SurveyData>({
    disappointment_level: null,
    ideal_user_description: '',
    main_benefit: '',
    improvement_suggestion: '',
  });

  // Track direction for animations
  const directionRef = useRef<'forward' | 'back'>('forward');

  const resetAndClose = useCallback(() => {
    setStep(0);
    setData({
      disappointment_level: null,
      ideal_user_description: '',
      main_benefit: '',
      improvement_suggestion: '',
    });
    onClose();
  }, [onClose]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return data.disappointment_level !== null;
      case 1: return data.ideal_user_description.trim().length > 0;
      case 2: return data.main_benefit.trim().length > 0;
      case 3: return true; // Q4 is optional
      default: return false;
    }
  }, [step, data]);

  const handleNext = useCallback(async () => {
    if (step < TOTAL_QUESTIONS - 1) {
      directionRef.current = 'forward';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s + 1);
      return;
    }

    // Submit
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('pmf_surveys').insert({
        user_id: user.id,
        disappointment_level: data.disappointment_level,
        ideal_user_description: data.ideal_user_description.trim(),
        main_benefit: data.main_benefit.trim(),
        improvement_suggestion: data.improvement_suggestion.trim() || null,
      });

      if (error) {
        console.warn('PMF survey insert error:', error.message);
      }

      // Track completion in analytics
      trackPMFSurveyCompleted({
        disappointment_level: data.disappointment_level!,
        has_ideal_user: data.ideal_user_description.trim().length > 0,
        has_main_benefit: data.main_benefit.trim().length > 0,
        has_improvement: data.improvement_suggestion.trim().length > 0,
      });

      // Increment completed count
      const prevCount = await AsyncStorage.getItem(KEY_PMF_COMPLETED_COUNT);
      await AsyncStorage.setItem(
        KEY_PMF_COMPLETED_COUNT,
        String((parseInt(prevCount || '0', 10) || 0) + 1),
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn('PMF survey submission error:', err);
    } finally {
      setSubmitting(false);
      resetAndClose();
    }
  }, [step, data, user, resetAndClose]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      directionRef.current = 'back';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s - 1);
    }
  }, [step]);

  const selectDisappointment = useCallback((level: DisappointmentLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setData((d) => ({ ...d, disappointment_level: level }));
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function ProgressDots() {
    return (
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
              i < step && styles.dotComplete,
            ]}
          />
        ))}
      </View>
    );
  }

  function DisappointmentOption({
    level, label, sublabel,
  }: {
    level: DisappointmentLevel; label: string; sublabel: string;
  }) {
    const selected = data.disappointment_level === level;
    return (
      <TouchableOpacity
        style={[styles.optionCard, selected && styles.optionCardSelected]}
        onPress={() => selectDisappointment(level)}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
      >
        <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
          {selected && <View style={styles.optionRadioInner} />}
        </View>
        <View style={styles.optionContent}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
            {label}
          </Text>
          <Text style={styles.optionSublabel}>{sublabel}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderQuestion() {
    switch (step) {
      case 0:
        return (
          <Animated.View
            key="q1"
            entering={SlideInRight.duration(300).springify().damping(20).stiffness(200)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.questionContainer}
          >
            <Text style={styles.questionNumber}>Question 1 of 4</Text>
            <Text style={styles.questionText}>
              How would you feel if you could no longer use x/pat?
            </Text>
            <View style={styles.optionsContainer}>
              <DisappointmentOption
                level="very_disappointed"
                label="Very disappointed"
                sublabel="I rely on x/pat regularly"
              />
              <DisappointmentOption
                level="somewhat_disappointed"
                label="Somewhat disappointed"
                sublabel="It's useful but I could manage"
              />
              <DisappointmentOption
                level="not_disappointed"
                label="Not disappointed"
                sublabel="It wouldn't affect me much"
              />
            </View>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View
            key="q2"
            entering={SlideInRight.duration(300).springify().damping(20).stiffness(200)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.questionContainer}
          >
            <Text style={styles.questionNumber}>Question 2 of 4</Text>
            <Text style={styles.questionText}>
              What type of people do you think would benefit most from x/pat?
            </Text>
            <Text style={styles.questionHint}>
              Describe them in your own words
            </Text>
            <TextInput
              style={styles.textArea}
              value={data.ideal_user_description}
              onChangeText={(v) => setData((d) => ({ ...d, ideal_user_description: v }))}
              placeholder="e.g. Remote workers who just moved to a new city and want to find good cafes and meet people..."
              placeholderTextColor={colors.dark.text3}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>
              {data.ideal_user_description.length}/500
            </Text>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View
            key="q3"
            entering={SlideInRight.duration(300).springify().damping(20).stiffness(200)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.questionContainer}
          >
            <Text style={styles.questionNumber}>Question 3 of 4</Text>
            <Text style={styles.questionText}>
              What is the main benefit you get from x/pat?
            </Text>
            <Text style={styles.questionHint}>
              What keeps you coming back?
            </Text>
            <TextInput
              style={styles.textArea}
              value={data.main_benefit}
              onChangeText={(v) => setData((d) => ({ ...d, main_benefit: v }))}
              placeholder="e.g. Finding coworking spots that other nomads actually recommend, not just Google results..."
              placeholderTextColor={colors.dark.text3}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>
              {data.main_benefit.length}/500
            </Text>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View
            key="q4"
            entering={SlideInRight.duration(300).springify().damping(20).stiffness(200)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.questionContainer}
          >
            <Text style={styles.questionNumber}>Question 4 of 4</Text>
            <Text style={styles.questionText}>
              How can we improve x/pat for you?
            </Text>
            <Text style={styles.questionHint}>
              Optional — anything you wish was different
            </Text>
            <TextInput
              style={styles.textArea}
              value={data.improvement_suggestion}
              onChangeText={(v) => setData((d) => ({ ...d, improvement_suggestion: v }))}
              placeholder="e.g. I wish there were more spots in my city, or better filtering by category..."
              placeholderTextColor={colors.dark.text3}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>
              {data.improvement_suggestion.length}/500
            </Text>
          </Animated.View>
        );

      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.overlayBg} onPress={resetAndClose} />

        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: Dimensions.get('window').height * 0.85,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step > 0 ? (
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Feather name="arrow-left" size={18} color={colors.dark.text} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )}
            </View>

            <View style={styles.headerCenter}>
              <Feather name="bar-chart-2" size={16} color={colors.teal} />
              <Text style={styles.headerTitle}>Quick Survey</Text>
            </View>

            <TouchableOpacity
              onPress={resetAndClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close survey"
            >
              <Feather name="x" size={18} color={colors.dark.text3} />
            </TouchableOpacity>
          </View>

          <ProgressDots />

          {/* Question content */}
          <View style={styles.contentArea}>
            {renderQuestion()}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.nextBtn,
                !canProceed() && styles.nextBtnDisabled,
                step === TOTAL_QUESTIONS - 1 && styles.submitBtn,
              ]}
              onPress={handleNext}
              disabled={!canProceed() || submitting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={step === TOTAL_QUESTIONS - 1 ? 'Submit survey' : 'Next question'}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.dark.bg} />
              ) : (
                <>
                  <Text style={[
                    styles.nextBtnText,
                    !canProceed() && styles.nextBtnTextDisabled,
                  ]}>
                    {step === TOTAL_QUESTIONS - 1 ? 'Submit' : 'Continue'}
                  </Text>
                  {step < TOTAL_QUESTIONS - 1 && (
                    <Feather
                      name="arrow-right"
                      size={16}
                      color={canProceed() ? colors.dark.bg : colors.dark.text3}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>

            {step === 0 && (
              <Text style={styles.footerNote}>
                Takes about 60 seconds. Your answers help us build a better x/pat.
              </Text>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.sheet,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: { width: 40 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.light,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress dots
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.bg3,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.teal,
  },
  dotComplete: {
    backgroundColor: colors.tealDark,
  },

  // Question content
  contentArea: {
    minHeight: 300,
  },
  questionContainer: {
    flex: 1,
  },
  questionNumber: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  questionText: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  questionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
    marginBottom: spacing.lg,
  },

  // Disappointment options (Q1)
  optionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.md,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(46, 196, 160, 0.08)',
    borderColor: 'rgba(46, 196, 160, 0.3)',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.dark.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: colors.teal,
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.text,
  },
  optionLabelSelected: {
    color: colors.teal,
  },
  optionSublabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text3,
    marginTop: 2,
  },

  // Text input (Q2-Q4)
  textArea: {
    backgroundColor: colors.glass.light,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Footer
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    width: '100%',
    ...shadows.sm,
  },
  nextBtnDisabled: {
    backgroundColor: colors.dark.bg3,
  },
  submitBtn: {
    backgroundColor: colors.teal,
  },
  nextBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.bg,
  },
  nextBtnTextDisabled: {
    color: colors.dark.text3,
  },
  footerNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text3,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
