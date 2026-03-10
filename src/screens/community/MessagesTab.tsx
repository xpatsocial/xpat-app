import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../../theme';

export default function MessagesTab() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="mail" size={40} color={colors.teal} />
      </View>
      <Text style={styles.title}>Direct Messages</Text>
      <Text style={styles.subtitle}>
        Private conversations with your connections are coming soon.
      </Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Coming Soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
    backgroundColor: colors.dark.bg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.2)',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: 'rgba(46,196,160,0.1)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.2)',
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.teal,
    letterSpacing: 0.5,
  },
});
