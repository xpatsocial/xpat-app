import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';

const LEVEL_COLORS: Record<number, string> = {
  1: '#636366',  // grey — newcomer
  2: '#4ECDC4',  // teal
  3: '#2EC4A0',  // brand teal
  4: '#48CAE4',  // blue
  5: '#6C63FF',  // purple
  6: '#E8803A',  // amber
  7: '#FF6B6B',  // red
  8: '#C77DFF',  // violet
  9: '#FFD93D',  // gold
  10: '#F07167', // coral — legendary
};

const LEVEL_TITLES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Explorer',
  3: 'Nomad',
  4: 'Wanderer',
  5: 'Globetrotter',
  6: 'Trailblazer',
  7: 'Pathfinder',
  8: 'Navigator',
  9: 'Legendary',
  10: 'x/pat Legend',
};

interface XPBadgeProps {
  level: number;
  xp?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export default function XPBadge({ level, xp, showTitle = false, compact = false }: XPBadgeProps) {
  const cappedLevel = Math.min(Math.max(1, level), 10);
  const color = LEVEL_COLORS[cappedLevel] ?? LEVEL_COLORS[1];
  const title = LEVEL_TITLES[cappedLevel];

  if (compact) {
    return (
      <View style={[styles.compact, { borderColor: color }]} accessible accessibilityLabel={`Level ${cappedLevel} ${title}`}>
        <Text style={[styles.compactText, { color }]}>Lv.{cappedLevel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} accessible accessibilityLabel={`Level ${cappedLevel} ${title}${xp !== undefined ? `, ${xp.toLocaleString()} XP` : ''}`}>
      <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
        <Text style={[styles.levelText, { color }]}>Lv.{cappedLevel}</Text>
        {showTitle && <Text style={[styles.titleText, { color }]}>{title}</Text>}
      </View>
      {xp !== undefined && (
        <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  levelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  titleText: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  xpText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
  },
  compact: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  compactText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
});
