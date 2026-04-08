import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import { supabase } from '../lib/supabase';
import { usePostHog } from '../lib/posthog';
import { useGamification } from '../hooks/useGamification';
import CelebrationOverlay, { CelebrationOverlayRef } from './CelebrationOverlay';

type NoiseLevel = 'silent' | 'quiet' | 'moderate' | 'loud';

interface CheckInButtonProps {
  spotId: number;
  spotName: string;
  userId: string | undefined;
  onCheckIn: () => void;
}

const NOISE_OPTIONS: { value: NoiseLevel; label: string; icon: string }[] = [
  { value: 'silent', label: 'Silent', icon: '🤫' },
  { value: 'quiet', label: 'Quiet', icon: '🔕' },
  { value: 'moderate', label: 'Moderate', icon: '🔊' },
  { value: 'loud', label: 'Loud', icon: '📢' },
];

export default function CheckInButton({
  spotId,
  spotName,
  userId,
  onCheckIn,
}: CheckInButtonProps) {
  const posthog = usePostHog();
  const { onCheckIn: awardCheckIn } = useGamification();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const [count, setCount] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedNoise, setSelectedNoise] = useState<NoiseLevel | null>(null);
  const [badgeEarned, setBadgeEarned] = useState<string | null>(null);

  const fetchCheckIns = useCallback(async () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('check_ins')
      .select('id, user_id')
      .eq('spot_id', spotId)
      .gte('created_at', fourHoursAgo);

    if (!error && data) {
      setCount(data.length);
      if (userId) {
        setCheckedIn(data.some((row) => row.user_id === userId));
      }
    }
  }, [spotId, userId]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const handleCheckIn = async () => {
    if (!userId || checkedIn || loading) return;
    setShowFeedback(true);
  };

  const submitCheckIn = async (noise: NoiseLevel | null) => {
    if (!userId || loading) return;

    setShowFeedback(false);
    setLoading(true);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const { error } = await supabase.from('check_ins').insert({
        spot_id: spotId,
        user_id: userId,
        method: 'manual',
        noise_level: noise,
      });

      if (!error) {
        posthog.capture('check_in', {
          spot_id: spotId,
          spot_name: spotName,
          noise_level: noise,
        });
        setCheckedIn(true);
        setCount((prev) => prev + 1);

        // Teal particle celebration on check-in
        celebrationRef.current?.particles();

        // Award XP + badges
        const earned = await awardCheckIn(userId, spotId);
        if (earned.length > 0) {
          setBadgeEarned(earned[0]);
          setTimeout(() => setBadgeEarned(null), 4000);
          // Badge earned — trigger confetti
          setTimeout(() => celebrationRef.current?.confetti(), 300);
        }

        onCheckIn();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            checkedIn && styles.buttonChecked,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleCheckIn}
          disabled={checkedIn || loading || !userId}
          android_ripple={{ color: colors.tealDark, borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={checkedIn ? `Checked in at ${spotName}` : `Check in at ${spotName}`}
          accessibilityState={{ disabled: checkedIn || loading || !userId }}
        >
          {checkedIn ? (
            <Text style={styles.checkedText}>Checked in ✓</Text>
          ) : (
            <>
              <Feather name="log-in" size={16} color={colors.dark.bg} />
              <Text style={styles.buttonText}>Check in</Text>
            </>
          )}
        </Pressable>

        {count > 0 && (
          <Text style={styles.countText}>{count} here now</Text>
        )}
      </View>

      {/* Badge earned toast */}
      {badgeEarned && (
        <View style={styles.badgeToast} pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert" accessibilityLabel={`Badge unlocked: ${badgeEarned}`}>
          <Ionicons name="medal-sharp" size={18} color={colors.amber} />
          <Text style={styles.badgeText}>Badge unlocked: {badgeEarned}!</Text>
        </View>
      )}

      {/* Noise level feedback sheet */}
      <Modal
        visible={showFeedback}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedback(false)}
      >
        <Pressable style={styles.overlay} onPress={() => submitCheckIn(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>How's the noise level?</Text>
            <Text style={styles.sheetSubtitle}>Help the community — takes 1 tap</Text>

            <View style={styles.noiseRow}>
              {NOISE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.noiseOption,
                    selectedNoise === opt.value && styles.noiseSelected,
                  ]}
                  onPress={() => setSelectedNoise(opt.value)}
                  android_ripple={{ color: colors.teal, borderless: false }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${opt.label} noise level`}
                  accessibilityState={{ selected: selectedNoise === opt.value }}
                >
                  <Text style={styles.noiseEmoji}>{opt.icon}</Text>
                  <Text style={styles.noiseLabel}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.85 }]}
              onPress={() => submitCheckIn(selectedNoise)}
              android_ripple={{ color: colors.tealDark, borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={selectedNoise ? 'Check in and report noise level' : 'Check in and skip noise report'}
            >
              <Text style={styles.confirmText}>
                {selectedNoise ? 'Check in & report' : 'Check in (skip)'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <CelebrationOverlay ref={celebrationRef} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  buttonChecked: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },
  checkedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.teal,
  },
  countText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  badgeToast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.amber,
  },
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
    gap: spacing.md,
    ...shadows.sheet,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
  },
  noiseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.md,
  },
  noiseOption: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    minWidth: 68,
  },
  noiseSelected: {
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}22`,
  },
  noiseEmoji: {
    fontSize: 24,
  },
  noiseLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  confirmButton: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.bg,
  },
});
