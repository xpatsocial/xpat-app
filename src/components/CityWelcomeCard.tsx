import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

interface CityWelcomeCardProps {
  city: string;
  country: string;
  onDismiss: () => void;
  onPartnerPress: (partner: string) => void;
}

const TILES: { partner: string; icon: string; label: string }[] = [
  { partner: 'Airalo', icon: 'smartphone', label: 'eSIM' },
  { partner: 'SafetyWing', icon: 'shield', label: 'Insurance' },
  { partner: 'Wise', icon: 'credit-card', label: 'Banking' },
];

const CARD_HEIGHT = 200;

export default function CityWelcomeCard({
  city,
  country,
  onDismiss,
  onPartnerPress,
}: CityWelcomeCardProps) {
  const translateY = React.useRef(new Animated.Value(CARD_HEIGHT)).current;

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  function handleDismiss() {
    Animated.timing(translateY, {
      toValue: CARD_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      <GlassView tint="dark" intensity={90} style={styles.blur}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
          <Feather name="x" size={16} color={colors.dark.text2} />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome to {city}!</Text>
        <Text style={styles.subtitle}>{country}</Text>

        <View style={styles.tilesRow}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.partner}
              style={styles.tile}
              onPress={() => onPartnerPress(tile.partner)}
              activeOpacity={0.7}
            >
              <View style={styles.tileIcon}>
                <Feather
                  name={tile.icon as any}
                  size={20}
                  color={colors.teal}
                />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.disclosure}>Partner links</Text>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: spacing.md,
    right: spacing.md,
  },
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginBottom: spacing.lg,
  },
  tilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.dark.text,
  },
  disclosure: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
    textAlign: 'center',
  },
});
