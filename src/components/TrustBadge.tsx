/**
 * TrustBadge — Subtle trust level indicator for profile cards
 *
 * Based on Chesky's insight: "10+ reviews changes everything."
 * Shows progressive trust tiers with color-coded pill badges.
 * Subtle enough to not feel creepy, clear enough to build confidence.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { getTrustTier, getTrustLabel, getTrustColor, type TrustTier } from '../hooks/useTrust';

const TIER_ICONS: Record<TrustTier, string> = {
  pillar: 'shield-checkmark',
  trusted: 'shield-checkmark-outline',
  established: 'checkmark-circle',
  verified: 'checkmark-circle-outline',
  new: 'person-outline',
};

interface TrustBadgeProps {
  trustScore: number;
  /** Compact mode for list items (icon only) */
  compact?: boolean;
  /** Show the numeric score alongside the label */
  showScore?: boolean;
}

export default function TrustBadge({ trustScore, compact = false, showScore = false }: TrustBadgeProps) {
  const tier = getTrustTier(trustScore);
  const label = getTrustLabel(tier);
  const color = getTrustColor(tier);
  const iconName = TIER_ICONS[tier];

  // Don't show badge for brand new users (avoids "New" label feeling negative)
  if (tier === 'new' && !showScore) return null;

  if (compact) {
    return (
      <View
        style={[styles.compact, { borderColor: `${color}40` }]}
        accessible
        accessibilityLabel={`Trust level: ${label}`}
      >
        <Ionicons name={iconName as any} size={10} color={color} />
      </View>
    );
  }

  return (
    <View
      style={[styles.badge, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}
      accessible
      accessibilityLabel={`Trust level: ${label}${showScore ? `, score ${trustScore}` : ''}`}
    >
      <Ionicons name={iconName as any} size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
      {showScore && (
        <Text style={[styles.score, { color }]}>{trustScore}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  compact: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  score: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    marginLeft: 2,
  },
});
