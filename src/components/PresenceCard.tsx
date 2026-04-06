import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

interface PresenceCardProps {
  city: string;
  count: number;
}

export default function PresenceCard({ city, count }: PresenceCardProps) {
  if (count <= 0) return null;

  return (
    <View style={styles.wrapper}>
      <GlassView intensity={60} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          <Feather name="users" size={14} color={colors.teal} />
          <Text style={styles.text}>
            {count} x/pat{count !== 1 ? 's' : ''} in {city}
          </Text>
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  blur: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
  },
});
