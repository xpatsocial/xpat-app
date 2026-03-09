import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

interface BrandHeaderProps {
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export default function BrandHeader({ subtitle, rightAction }: BrandHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <Text style={styles.wordmark}>
          <Text style={styles.x}>x</Text>
          <Text style={styles.slash}>/</Text>
          <Text style={styles.pat}>pat</Text>
        </Text>
        {rightAction}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56, // overridden by inline style with insets
    paddingBottom: spacing.sm,
    backgroundColor: colors.dark.bg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 32,
  },
  x: {
    color: colors.amber,
  },
  slash: {
    color: colors.teal,
  },
  pat: {
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginTop: 2,
  },
});
