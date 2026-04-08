import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay,
  FadeInDown, FadeInUp,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, shadows, animation } from '../theme';
import GlassView from '../components/GlassView';
import AnimatedPressable from '../components/AnimatedPressable';
import Avatar from '../components/Avatar';
import CelebrationOverlay, { CelebrationOverlayRef } from '../components/CelebrationOverlay';
import { useReferrals, getBadgeTier, getNextTier, BADGE_TIERS } from '../hooks/useReferrals';

// ── Badge Icon Mapping ──────────────────────────────────────────────────────
const BADGE_ICONS: Record<number, { icon: string; color: string }> = {
  0: { icon: 'user', color: colors.dark.text3 },
  1: { icon: 'compass', color: colors.teal },
  2: { icon: 'check-circle', color: colors.tealLight },
  3: { icon: 'flag', color: colors.amber },
  4: { icon: 'award', color: colors.amberLight },
};

export default function InviteNomadsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const {
    referralCode, referralStats, recentReferrals, loading,
    shareReferralLink, copyReferralLink,
  } = useReferrals();
  const [copied, setCopied] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const prevTier = useRef(referralStats.badgeTier);

  // Celebration trigger on tier change
  useEffect(() => {
    if (referralStats.badgeTier > prevTier.current) {
      celebrationRef.current?.confetti();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevTier.current = referralStats.badgeTier;
  }, [referralStats.badgeTier]);

  const handleCopy = async () => {
    await copyReferralLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = async () => {
    if (!referralCode) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = `https://xpat.social/invite/${referralCode}`;
    const msg = encodeURIComponent(`Join me on x/pat — the nomad community app!\n${link}`);
    const url = `whatsapp://send?text=${msg}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else shareReferralLink(); // Fallback to native share
    });
  };

  const handleShareInstagram = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Instagram DM doesn't support pre-filled text; open stories or fallback to share
    shareReferralLink();
  };

  // Progress calculations
  const badge = getBadgeTier(referralStats.completed);
  const nextTier = getNextTier(badge);
  const progressToNext = nextTier
    ? (referralStats.completed - badge.minReferrals) / (nextTier.minReferrals - badge.minReferrals)
    : 1;
  const progressLabel = nextTier
    ? `${referralStats.completed}/${nextTier.minReferrals} to ${nextTier.name}`
    : 'Max tier reached!';

  const badgeConfig = BADGE_ICONS[badge.tier] ?? BADGE_ICONS[0];
  const referralLink = referralCode ? `xpat.social/invite/${referralCode}` : '...';

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Nomads</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <GlassView variant="medium" style={styles.badgeCard}>
            <View style={[styles.badgeIconCircle, { borderColor: badgeConfig.color }]}>
              <Feather name={badgeConfig.icon as any} size={28} color={badgeConfig.color} />
            </View>
            <Text style={styles.badgeName}>
              {badge.name ?? 'No Badge Yet'}
            </Text>
            {badge.tier > 0 && (
              <Text style={styles.badgeTierLabel}>Tier {badge.tier}</Text>
            )}

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(progressToNext * 100, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{progressLabel}</Text>
            </View>
          </GlassView>
        </Animated.View>

        {/* Referral Link Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <GlassView variant="subtle" style={styles.linkCard}>
            <Text style={styles.linkCardTitle}>Your referral link</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                {referralLink}
              </Text>
            </View>
            <View style={styles.linkActions}>
              <AnimatedPressable
                style={[styles.actionBtn, styles.copyBtn]}
                onPress={handleCopy}
                hapticStyle="success"
                accessibilityLabel="Copy referral link"
              >
                <Feather name={copied ? 'check' : 'copy'} size={16} color={colors.dark.bg} />
                <Text style={styles.actionBtnText}>{copied ? 'Copied!' : 'Copy Link'}</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionBtn, styles.shareBtn]}
                onPress={shareReferralLink}
                hapticStyle="medium"
                accessibilityLabel="Share referral link"
              >
                <Feather name="share" size={16} color={colors.teal} />
                <Text style={styles.shareBtnText}>Share</Text>
              </AnimatedPressable>
            </View>
          </GlassView>
        </Animated.View>

        {/* Share Buttons Row */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.shareRow}>
          <AnimatedPressable style={styles.shareIcon} onPress={handleShareWhatsApp} accessibilityLabel="Share via WhatsApp">
            <View style={[styles.shareIconCircle, { backgroundColor: 'rgba(37, 211, 102, 0.15)' }]}>
              <Feather name="message-circle" size={20} color="#25D366" />
            </View>
            <Text style={styles.shareIconLabel}>WhatsApp</Text>
          </AnimatedPressable>

          <AnimatedPressable style={styles.shareIcon} onPress={handleShareInstagram} accessibilityLabel="Share via Instagram">
            <View style={[styles.shareIconCircle, { backgroundColor: 'rgba(225, 48, 108, 0.15)' }]}>
              <Feather name="instagram" size={20} color="#E1306C" />
            </View>
            <Text style={styles.shareIconLabel}>Instagram</Text>
          </AnimatedPressable>

          <AnimatedPressable style={styles.shareIcon} onPress={handleCopy} accessibilityLabel="Copy link">
            <View style={[styles.shareIconCircle, { backgroundColor: 'rgba(46, 196, 160, 0.15)' }]}>
              <Feather name="copy" size={20} color={colors.teal} />
            </View>
            <Text style={styles.shareIconLabel}>Copy Link</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{referralStats.total}</Text>
              <Text style={styles.statLabel}>Total Invited</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxBorder]}>
              <Text style={[styles.statValue, { color: colors.teal }]}>{referralStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.amber }]}>{referralStats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </Animated.View>

        {/* How it works — Collapsible */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <TouchableOpacity
            style={styles.howItWorksHeader}
            onPress={() => setHowItWorksOpen(!howItWorksOpen)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="How it works"
            accessibilityState={{ expanded: howItWorksOpen }}
          >
            <Feather name="info" size={16} color={colors.teal} />
            <Text style={styles.howItWorksTitle}>How it works</Text>
            <Feather
              name={howItWorksOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.dark.text2}
            />
          </TouchableOpacity>

          {howItWorksOpen && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <GlassView variant="subtle" style={styles.howItWorksBody}>
                {[
                  { icon: 'send', text: 'Share your link with fellow nomads' },
                  { icon: 'map-pin', text: 'They join and save 3 spots' },
                  { icon: 'star', text: 'You both earn XP + unlock badges' },
                ].map((step, idx) => (
                  <View key={idx} style={styles.howItWorksStep}>
                    <View style={styles.howItWorksStepCircle}>
                      <Feather name={step.icon as any} size={14} color={colors.teal} />
                    </View>
                    <Text style={styles.howItWorksStepText}>{step.text}</Text>
                  </View>
                ))}
              </GlassView>
            </Animated.View>
          )}
        </Animated.View>

        {/* Recent Referrals */}
        {recentReferrals.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Referrals</Text>
              <Text style={styles.sectionCount}>{recentReferrals.length}</Text>
            </View>

            {recentReferrals.slice(0, 10).map((ref) => (
              <View key={ref.id} style={styles.referralRow}>
                <Avatar
                  uri={ref.invitee_profile?.avatar_url}
                  name={ref.invitee_profile?.display_name}
                  userId={ref.invitee_id}
                  size={36}
                />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.referralName}>
                    {ref.invitee_profile?.display_name ?? 'Nomad'}
                  </Text>
                  <Text style={styles.referralDate}>
                    {new Date(ref.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.statusPill,
                  ref.status === 'completed' ? styles.statusCompleted : styles.statusPending,
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: ref.status === 'completed' ? colors.teal : colors.amber },
                  ]}>
                    {ref.status === 'completed' ? 'Completed' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Empty state */}
        {recentReferrals.length === 0 && (
          <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.emptyState}>
            <Feather name="users" size={32} color={colors.dark.text3} />
            <Text style={styles.emptyTitle}>No referrals yet</Text>
            <Text style={styles.emptySubtitle}>
              Share your link to start inviting nomads and unlock badges!
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <CelebrationOverlay ref={celebrationRef} />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },

  content: { paddingHorizontal: spacing.lg, gap: spacing.md },

  // Badge Card
  badgeCard: {
    alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.glass.border,
  },
  badgeIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(46, 196, 160, 0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: spacing.sm,
  },
  badgeName: {
    fontFamily: fonts.heading, fontSize: 22, color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  badgeTierLabel: {
    fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md,
  },
  progressContainer: { width: '100%', gap: spacing.xs },
  progressBarBg: {
    height: 6, backgroundColor: colors.dark.bg3, borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill: {
    height: 6, backgroundColor: colors.teal, borderRadius: 3,
  },
  progressLabel: {
    fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2, textAlign: 'center',
  },

  // Link Card
  linkCard: {
    padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.glass.border,
  },
  linkCardTitle: {
    fontFamily: fonts.bodyBold, fontSize: 12, color: colors.dark.text2,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  linkRow: {
    backgroundColor: colors.dark.bg2, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + spacing.xs,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.dark.border,
  },
  linkText: {
    fontFamily: fonts.body, fontSize: 14, color: colors.teal,
  },
  linkActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.md,
  },
  copyBtn: { backgroundColor: colors.teal },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.bg },
  shareBtn: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.teal,
  },
  shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.teal },

  // Share row
  shareRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.xl,
  },
  shareIcon: { alignItems: 'center', gap: spacing.xs },
  shareIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  shareIconLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.dark.bg2,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.dark.border,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statBoxBorder: {
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.dark.border,
  },
  statValue: { fontFamily: fonts.heading, fontSize: 26, color: colors.dark.text },
  statLabel: {
    fontFamily: fonts.body, fontSize: 9, color: colors.dark.text2,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 2,
  },

  // How it works
  howItWorksHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  howItWorksTitle: {
    fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.text, flex: 1,
  },
  howItWorksBody: {
    padding: spacing.md, borderRadius: radius.md, gap: spacing.md,
    borderWidth: 1, borderColor: colors.glass.border,
  },
  howItWorksStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  howItWorksStepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(46, 196, 160, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  howItWorksStepText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, flex: 1 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.dark.text },
  sectionCount: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },

  // Referral row
  referralRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.dark.bg2, borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs, borderWidth: 1, borderColor: colors.dark.border,
  },
  referralName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  referralDate: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, marginTop: 1 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusCompleted: { backgroundColor: 'rgba(46, 196, 160, 0.12)' },
  statusPending: { backgroundColor: 'rgba(232, 128, 58, 0.12)' },
  statusText: { fontFamily: fonts.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.dark.text },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2,
    textAlign: 'center', paddingHorizontal: spacing.lg,
  },
});
