/**
 * ShareSpotSheet — native share for spot virality
 *
 * Generates a deep link (xpat://spot/:id) + human-readable message.
 * Uses React Native Share API for native share sheet.
 * Deep link opens the spot detail directly in the app.
 */
import React, { useCallback } from 'react';
import {
  Share,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Spot } from '../types';
import { colors, fonts, spacing, radius } from '../theme';

interface ShareSpotSheetProps {
  spot: Spot;
  style?: any;
  variant?: 'icon' | 'pill';
}

function buildShareMessage(spot: Spot): string {
  const category = spot.category?.charAt(0).toUpperCase() + (spot.category?.slice(1) ?? '');
  const tagLine = spot.note ? `"${spot.note}"` : `A great ${category?.toLowerCase()} spot`;
  const votes = spot.votes ? ` · ${spot.votes} votes` : '';
  const deepLink = `https://xpat.social/spot/${spot.id}`;

  return `${spot.name} — ${category} in ${spot.city}, ${spot.country}\n${tagLine}${votes}\n\nDiscover more nomad spots on x/pat 👉 ${deepLink}`;
}

export default function ShareSpotSheet({ spot, style, variant = 'icon' }: ShareSpotSheetProps) {
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const message = buildShareMessage(spot);

      await Share.share(
        {
          message,
          title: `${spot.name} on x/pat`,
          url: `https://xpat.social/spot/${spot.id}`, // iOS only
        },
        {
          dialogTitle: 'Share this spot',
          subject: `Check out ${spot.name} on x/pat`,
        },
      );
    } catch (err: any) {
      // User cancelled — no error needed
      if (err?.message !== 'User did not share') {
        Alert.alert('Could not share', 'Try again in a moment.');
      }
    }
  }, [spot]);

  if (variant === 'pill') {
    return (
      <TouchableOpacity style={[styles.pill, style]} onPress={handleShare} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Share ${spot.name}`}>
        <Feather name="share-2" size={14} color={colors.dark.text2} />
        <Text style={styles.pillText}>Share</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.iconBtn, style]} onPress={handleShare} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Share ${spot.name}`}>
      <Feather name="share-2" size={18} color={colors.dark.text2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
});
