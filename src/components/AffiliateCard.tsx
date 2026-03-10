import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

interface AffiliateCardProps {
  category: string;
  city?: string;
  country?: string;
  onPress: (partner: string, url: string) => void;
}

const CATEGORY_PARTNERS: Record<string, { label: string; partner: string; url: string }> = {
  stay: {
    label: 'Find accommodation',
    partner: 'Booking.com',
    url: 'https://www.booking.com/?aid=PLACEHOLDER',
  },
  cowork: {
    label: 'Day pass available',
    partner: 'Coworker',
    url: 'https://www.coworker.com/?ref=PLACEHOLDER',
  },
  cafe: {
    label: 'Find accommodation nearby',
    partner: 'Booking.com',
    url: 'https://www.booking.com/?aid=PLACEHOLDER',
  },
  eat: {
    label: 'Find accommodation nearby',
    partner: 'Booking.com',
    url: 'https://www.booking.com/?aid=PLACEHOLDER',
  },
};

const ESIM_PARTNER = {
  label: 'Get eSIM',
  partner: 'Airalo',
  url: 'https://www.airalo.com/?ref=PLACEHOLDER',
};

export default function AffiliateCard({
  category,
  city,
  country,
  onPress,
}: AffiliateCardProps) {
  const primary = CATEGORY_PARTNERS[category];

  return (
    <BlurView tint="dark" intensity={60} style={styles.container}>
      <Text style={styles.badge}>Sponsored</Text>

      {primary && (
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.label}>{primary.label}</Text>
            <Text style={styles.partnerName}>
              {primary.partner}
              {city ? ` in ${city}` : ''}
            </Text>
          </View>
          <View style={styles.primaryAction}>
            <Text style={styles.comingSoon}>Soon</Text>
          </View>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.rowContent}>
          <Text style={styles.label}>{ESIM_PARTNER.label}</Text>
          <Text style={styles.partnerName}>
            {ESIM_PARTNER.partner}
            {country ? ` for ${country}` : ''}
          </Text>
        </View>
        <View style={styles.secondaryAction}>
          <Text style={styles.comingSoon}>Soon</Text>
        </View>
      </View>

      <Text style={styles.disclosure}>
        x/pat earns a commission at no extra cost to you
      </Text>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(44,44,46,0.5)',
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  partnerName: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  primaryAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoon: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: colors.dark.bg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disclosure: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text3,
  },
});
