import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { NeighborhoodTag, SAFETY_TAGS } from '../types';

interface TagCount {
  tag: NeighborhoodTag;
  count: number;
}

interface NeighborhoodPulseCardProps {
  tagCounts: TagCount[];
  totalResponses: number;
}

function getSafetySentiment(tagCounts: TagCount[]): {
  color: string;
  label: string;
  icon: string;
} {
  const safetyTags = tagCounts.filter((tc) =>
    (SAFETY_TAGS as string[]).includes(tc.tag)
  );
  if (safetyTags.length === 0) return { color: colors.dark.text2, label: 'No safety data', icon: 'help-circle' };

  const positive = safetyTags
    .filter((tc) => tc.tag === 'feels safe' || tc.tag === 'well-lit' || tc.tag === 'tourist-friendly')
    .reduce((sum, tc) => sum + tc.count, 0);
  const negative = safetyTags
    .filter((tc) => tc.tag === 'stay alert' || tc.tag === 'avoid at night')
    .reduce((sum, tc) => sum + tc.count, 0);

  if (positive > negative * 2) return { color: colors.green, label: 'Feels safe', icon: 'shield' };
  if (negative > positive) return { color: colors.amber, label: 'Stay alert', icon: 'alert-triangle' };
  return { color: colors.teal, label: 'Mixed reviews', icon: 'info' };
}

export default function NeighborhoodPulseCard({
  tagCounts,
  totalResponses,
}: NeighborhoodPulseCardProps) {
  if (tagCounts.length === 0) return null;

  const safety = getSafetySentiment(tagCounts);
  const topVibes = tagCounts
    .filter((tc) => !(SAFETY_TAGS as string[]).includes(tc.tag))
    .slice(0, 3);

  return (
    <View style={styles.container} accessible accessibilityLabel={`Neighborhood safety: ${safety.label}. ${totalResponses} pulse${totalResponses !== 1 ? 's' : ''}`}>
      <GlassView tint="dark" intensity={80} style={styles.blur}>
        <View style={styles.row}>
          <View style={[styles.safetyDot, { backgroundColor: safety.color }]} />
          <Feather name={safety.icon as any} size={12} color={safety.color} />
          <Text style={[styles.safetyLabel, { color: safety.color }]}>
            {safety.label}
          </Text>
          <Text style={styles.responses}>{totalResponses} pulse{totalResponses !== 1 ? 's' : ''}</Text>
        </View>
        {topVibes.length > 0 && (
          <View style={styles.vibesRow}>
            {topVibes.map((tc) => (
              <View key={tc.tag} style={styles.vibePill}>
                <Text style={styles.vibeText}>{tc.tag}</Text>
                <Text style={styles.vibeCount}>{tc.count}</Text>
              </View>
            ))}
          </View>
        )}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
  },
  blur: {
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  safetyLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    flex: 1,
  },
  responses: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
  },
  vibesRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232,128,58,0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: 'rgba(232,128,58,0.2)',
  },
  vibeText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.amber,
  },
  vibeCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.dark.text2,
  },
});
