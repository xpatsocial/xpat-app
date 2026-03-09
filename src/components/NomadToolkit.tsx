import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

interface NomadToolkitProps {
  onPartnerPress: (partner: string, url: string) => void;
}

const TOOLS: {
  icon: string;
  title: string;
  subtitle: string;
  partner: string;
  url: string;
}[] = [
  {
    icon: 'smartphone',
    title: 'eSIM & Data',
    subtitle: 'Stay connected worldwide',
    partner: 'Airalo',
    url: 'https://www.airalo.com/?ref=PLACEHOLDER',
  },
  {
    icon: 'shield',
    title: 'Travel Insurance',
    subtitle: 'Coverage for nomads',
    partner: 'SafetyWing',
    url: 'https://www.safetywing.com/?ref=PLACEHOLDER',
  },
  {
    icon: 'credit-card',
    title: 'Money Transfer',
    subtitle: 'Send money anywhere',
    partner: 'Wise',
    url: 'https://wise.com/?ref=PLACEHOLDER',
  },
  {
    icon: 'home',
    title: 'Accommodation',
    subtitle: 'Find your next stay',
    partner: 'Booking.com',
    url: 'https://www.booking.com/?aid=PLACEHOLDER',
  },
];

export default function NomadToolkit({ onPartnerPress }: NomadToolkitProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nomad Toolkit</Text>

      <View style={styles.list}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.partner}
            style={styles.row}
            onPress={() => onPartnerPress(tool.partner, tool.url)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Feather name={tool.icon as any} size={18} color={colors.teal} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.title}>{tool.title}</Text>
              <Text style={styles.subtitle}>{tool.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.dark.text2} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.partnerBadge}>Partner</Text>
      <Text style={styles.disclosure}>
        Links may earn commission at no cost to you
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  header: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  partnerBadge: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  disclosure: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
    marginTop: 2,
  },
});
