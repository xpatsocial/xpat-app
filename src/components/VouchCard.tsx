/**
 * VouchCard — Glass morphism card displaying a community vouch
 *
 * Shows: voucher avatar + name, spot where they met, date, and note.
 * Designed for profile screens to display social proof.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import GlassView from './GlassView';
import Avatar from './Avatar';
import type { Vouch } from '../hooks/useTrust';

interface VouchCardProps {
  vouch: Vouch;
  onPressVoucher?: (voucherId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function VouchCard({ vouch, onPressVoucher }: VouchCardProps) {
  const voucherName = vouch.profiles?.display_name || 'Anonymous';

  return (
    <GlassView variant="subtle" style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.voucherRow}
          onPress={() => onPressVoucher?.(vouch.voucher_id)}
          disabled={!onPressVoucher}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${voucherName}'s profile`}
        >
          <Avatar
            uri={vouch.profiles?.avatar_url}
            name={voucherName}
            userId={vouch.voucher_id}
            size={28}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.voucherName}>{voucherName}</Text>
            <Text style={styles.timeAgo}>{timeAgo(vouch.created_at)}</Text>
          </View>
        </TouchableOpacity>
        <Feather name="heart" size={12} color={colors.amber} />
      </View>

      {vouch.note && (
        <Text style={styles.note}>{vouch.note}</Text>
      )}

      {vouch.spot_name && (
        <View style={styles.spotRow}>
          <Feather name="map-pin" size={10} color={colors.teal} />
          <Text style={styles.spotText}>
            Met at {vouch.spot_name}
            {vouch.city ? `, ${vouch.city}` : ''}
          </Text>
        </View>
      )}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  voucherName: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
  },
  timeAgo: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text3,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 18,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.teal,
  },
});
