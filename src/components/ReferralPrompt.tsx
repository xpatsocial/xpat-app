/**
 * ReferralPrompt — Dismissible card shown once after user saves their first spot.
 *
 * Stored in AsyncStorage so it only appears a single time.
 * Spring entrance animation with glass morphism styling.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import GlassView from './GlassView';
import AnimatedPressable from './AnimatedPressable';

const STORAGE_KEY = 'referral_prompt_dismissed';

interface ReferralPromptProps {
  /** Only show after first spot is saved — pass true when conditions are met */
  visible?: boolean;
}

export default function ReferralPrompt({ visible = false }: ReferralPromptProps) {
  const navigation = useNavigation<any>();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val !== 'true') {
        setDismissed(false);
      }
    }).catch(() => {
      // Treat as dismissed on error
    });
  }, []);

  useEffect(() => {
    if (visible && !dismissed) {
      setShow(true);
    }
  }, [visible, dismissed]);

  const handleDismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
    setShow(false);
  };

  const handleInvite = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
    navigation.navigate('InviteNomads');
  };

  if (!show) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(14).stiffness(120).delay(500)}
      exiting={FadeOutUp.duration(200)}
      style={styles.wrapper}
    >
      <GlassView variant="medium" style={styles.card}>
        {/* Dismiss X */}
        <AnimatedPressable
          style={styles.dismissBtn}
          onPress={handleDismiss}
          hapticStyle="light"
          accessibilityLabel="Dismiss referral prompt"
        >
          <Feather name="x" size={14} color={colors.dark.text3} />
        </AnimatedPressable>

        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Feather name="users" size={18} color={colors.teal} />
          </View>
        </View>

        <Text style={styles.title}>You found a great spot!</Text>
        <Text style={styles.subtitle}>
          Know a nomad who'd love this? Invite them and unlock Verified Nomad status.
        </Text>

        <View style={styles.actions}>
          <AnimatedPressable
            style={styles.inviteBtn}
            onPress={handleInvite}
            hapticStyle="medium"
            accessibilityLabel="Invite nomads"
          >
            <Feather name="send" size={14} color={colors.dark.bg} />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.notNowBtn}
            onPress={handleDismiss}
            hapticStyle="light"
            accessibilityLabel="Not now"
          >
            <Text style={styles.notNowText}>Not now</Text>
          </AnimatedPressable>
        </View>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.2)',
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  iconRow: { alignItems: 'center', marginBottom: spacing.sm },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 196, 160, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading, fontSize: 16, color: colors.dark.text,
    textAlign: 'center', marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2,
    textAlign: 'center', lineHeight: 18, marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row', gap: spacing.sm, justifyContent: 'center',
  },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.teal, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
  },
  inviteBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.bg },
  notNowBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.dark.border,
  },
  notNowText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2 },
});
