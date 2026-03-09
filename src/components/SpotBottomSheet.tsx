import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, Linking, Share,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { Spot } from '../types';
import CheckInButton from './CheckInButton';
import AffiliateCard from './AffiliateCard';

const SHEET_HEIGHT = 380;

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: '☕',
  eat: '🍽️',
  cowork: '💻',
  colive: '🏠',
  experience: '🎯',
  stay: '🛏️',
  other: '📌',
};

interface SpotBottomSheetProps {
  spot: Spot | null;
  onClose: () => void;
  onSave?: (spot: Spot) => void;
  onAddNote?: (spot: Spot) => void;
  distanceKm?: number | null;
  userId?: string;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  if (km < 10) return `${km.toFixed(1)}km away`;
  return `${Math.round(km)}km away`;
}

export default function SpotBottomSheet({ spot, onClose, onSave, onAddNote, distanceKm, userId }: SpotBottomSheetProps) {
  const translateY = React.useRef(new Animated.Value(SHEET_HEIGHT)).current;

  React.useEffect(() => {
    if (spot) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [spot]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  if (!spot) return null;

  const isCommunity = !!spot.created_by;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <BlurView tint="dark" intensity={90} style={styles.blur}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{spot.name}</Text>
              {isCommunity && (
                <View style={styles.communityBadge}>
                  <Feather name="users" size={10} color={colors.teal} />
                  <Text style={styles.badgeText}>community</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.category}>
                {CATEGORY_EMOJI[spot.category]} {spot.category}
              </Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.location}>{spot.city}, {spot.country}</Text>
              {distanceKm != null && (
                <>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.distance}>{formatDistance(distanceKm)}</Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={18} color={colors.dark.text2} />
          </TouchableOpacity>
        </View>

        {spot.note && (
          <View style={styles.noteSection}>
            <Feather name="message-circle" size={12} color={colors.teal} />
            <Text style={styles.noteText}>"{spot.note}"</Text>
          </View>
        )}

        {spot.profiles?.display_name && (
          <View style={styles.sharedBy}>
            <View style={styles.miniAvatar}>
              <Text style={styles.miniAvatarText}>
                {spot.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.sharedText}>
              Shared by <Text style={{ color: colors.dark.text }}>{spot.profiles.display_name}</Text>
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionPrimary} onPress={() => onSave?.(spot)}>
            <Feather name="bookmark" size={16} color={colors.dark.bg} />
            <Text style={styles.actionPrimaryText}>Save</Text>
          </TouchableOpacity>
          <CheckInButton
            spotId={spot.id}
            spotName={spot.name}
            userId={userId}
            onCheckIn={() => {}}
          />
          <TouchableOpacity style={styles.actionIcon} onPress={() => {
            Share.share({
              message: `Check out ${spot.name} in ${spot.city}, ${spot.country} on x/pat!`,
              title: spot.name,
            });
          }}>
            <Feather name="share" size={16} color={colors.dark.text2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon} onPress={() => {
            if (spot.lat && spot.lng) {
              Linking.openURL(`https://maps.apple.com/?daddr=${spot.lat},${spot.lng}`);
            }
          }}>
            <Feather name="navigation" size={16} color={colors.dark.text2} />
          </TouchableOpacity>
        </View>

        <AffiliateCard
          category={spot.category}
          city={spot.city}
          country={spot.country}
          onPress={(_partner, url) => Linking.openURL(url)}
        />
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
  },
  blur: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderColor: colors.dark.border,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.dark.bg3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(46,196,160,0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.3)',
  },
  badgeText: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  category: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
    textTransform: 'capitalize',
  },
  dot: { color: colors.dark.text2, fontSize: 12 },
  location: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  distance: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(46,196,160,0.08)',
    borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  sharedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  miniAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.dark.bg },
  sharedText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  actionPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.bg },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  actionSecondaryText: { fontFamily: fonts.body, fontSize: 13, color: colors.teal },
  actionIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
});
