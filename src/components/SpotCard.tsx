import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { Spot } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: '☕',
  eat: '🍽️',
  cowork: '💻',
  colive: '🏠',
  experience: '🎯',
  stay: '🛏️',
  other: '📌',
};

interface SpotCardProps {
  spot: Spot;
  onPress?: () => void;
}

// React.memo: prevents re-render when parent re-renders with same spot/onPress
// Critical for FlashList performance in feeds (RN Performance 2026 research)
const SpotCard = React.memo(function SpotCard({ spot, onPress }: SpotCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[spot.category] || '📌'}</Text>
          <Text style={styles.categoryText}>{spot.category}</Text>
        </View>
        <Text style={styles.votes}>▲ {spot.votes || 0}</Text>
      </View>

      <Text style={styles.name}>{spot.name}</Text>

      <View style={styles.locationRow}>
        <Text style={styles.location}>📍 {spot.city}, {spot.country}</Text>
      </View>

      {spot.note && <Text style={styles.note} numberOfLines={2}>{spot.note}</Text>}

      <View style={styles.footer}>
        <Text style={styles.author}>
          by {spot.profiles?.display_name || 'Anonymous'}
        </Text>
        <Text style={styles.time}>
          {new Date(spot.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default SpotCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg3,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    gap: 4,
  },
  categoryEmoji: { fontSize: 12 },
  categoryText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
  },
  votes: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.teal,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.dark.bg3,
    paddingTop: spacing.sm,
  },
  author: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
});
