import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, Share, Platform, Alert,
} from 'react-native';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, fonts, spacing, radius, shadows, animation } from '../theme';
import { Spot } from '../types';
import CheckInButton from './CheckInButton';
// AffiliateCard removed pre-launch — re-add when partner agreements signed

const SHEET_HEIGHT = 380;
const DISMISS_THRESHOLD = 80;

const SPRING_CONFIG = animation.springSheet;

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
  const translateY = useSharedValue(SHEET_HEIGHT);
  const context = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (spot) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [spot]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((e) => {
      // Only allow dragging down
      const newY = context.value + e.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 500) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
        opacity.value = withTiming(0, { duration: 150 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.3,
  }));

  if (!spot) return null;

  const isCommunity = !!spot.created_by;

  return (
    <>
      {/* Backdrop dim */}
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, sheetStyle]} accessibilityViewIsModal accessibilityLabel={`Spot details for ${spot.name}`}>
          <GlassView tint="dark" intensity={90} style={styles.blur}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <ContextMenu
                  title={spot.name}
                  items={[
                    {
                      label: 'Share',
                      icon: 'share',
                      onPress: () => {
                        Share.share({
                          message: `Check out ${spot.name} in ${spot.city}, ${spot.country} on x/pat!\n\nhttps://xpat.social/spot/${spot.id}?utm_source=share&utm_medium=app${userId ? `&ref=${userId}` : ''}`,
                          title: spot.name,
                        });
                      },
                    },
                    {
                      label: 'Get Directions',
                      icon: 'navigation',
                      onPress: () => {
                        if (spot.lat && spot.lng) {
                          const url = Platform.select({
                            ios: `maps://app?daddr=${spot.lat},${spot.lng}`,
                            android: `google.navigation:q=${spot.lat},${spot.lng}`,
                            default: `https://maps.apple.com/?daddr=${spot.lat},${spot.lng}`,
                          });
                          Linking.openURL(url);
                        }
                      },
                    },
                    {
                      label: 'Save Spot',
                      icon: 'bookmark',
                      onPress: () => onSave?.(spot),
                    },
                    {
                      label: 'Copy Address',
                      icon: 'copy',
                      onPress: () => {
                        // @ts-ignore
                        const { Clipboard } = require('react-native');
                        if (Clipboard?.setString) Clipboard.setString(`${spot.name}, ${spot.city}, ${spot.country}`);
                        Alert.alert('Copied', 'Address copied to clipboard.');
                      },
                    },
                  ] as ContextMenuItem[]}
                >
                  <View style={styles.closeBtn}>
                    <Feather name="more-horizontal" size={18} color={colors.dark.text2} />
                  </View>
                </ContextMenu>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close spot details">
                  <Feather name="x" size={18} color={colors.dark.text2} />
                </TouchableOpacity>
              </View>
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
              <TouchableOpacity style={styles.actionPrimary} onPress={() => onSave?.(spot)} accessibilityRole="button" accessibilityLabel={`Save ${spot.name}`}>
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
                  message: `Check out ${spot.name} in ${spot.city}, ${spot.country} on x/pat!\n\nhttps://xpat.social/spot/${spot.id}?utm_source=share&utm_medium=app${userId ? `&ref=${userId}` : ''}`,
                  title: spot.name,
                });
              }} accessibilityRole="button" accessibilityLabel={`Share ${spot.name}`}>
                <Feather name="share" size={16} color={colors.dark.text2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon} onPress={() => {
                if (spot.lat && spot.lng) {
                  Linking.openURL(`https://maps.apple.com/?daddr=${spot.lat},${spot.lng}`);
                }
              }} accessibilityRole="button" accessibilityLabel={`Get directions to ${spot.name}`}>
                <Feather name="navigation" size={16} color={colors.dark.text2} />
              </TouchableOpacity>
            </View>

          </GlassView>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
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
    ...shadows.sheet,
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
    width: 44, height: 44, borderRadius: 22,
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
