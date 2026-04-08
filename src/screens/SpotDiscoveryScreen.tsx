import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import SwipeCardDeck, {
  SwipeCardDeckRef,
  SwipeDirection,
} from '../components/SwipeCardDeck';
import SwipeCardFrame from '../components/SwipeCard';
import { Spot } from '../types';
import { useSpotsByCity, useVoteSpot } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: '\u2615',
  eat: '\uD83C\uDF7D\uFE0F',
  cowork: '\uD83D\uDCBB',
  colive: '\uD83C\uDFE0',
  experience: '\uD83C\uDFAF',
  stay: '\uD83D\uDECF\uFE0F',
  other: '\uD83D\uDCCC',
};

const CATEGORY_GRADIENTS: Record<string, [string, string, string]> = {
  cafe: ['#2a1f14', '#1e1610', '#3a2a1a'],
  eat: ['#2a1a1a', '#1e1010', '#3a1a2a'],
  cowork: ['#141f2a', '#101a1e', '#1a2a3a'],
  colive: ['#1a2a1a', '#102010', '#2a3a1a'],
  experience: ['#2a1a2a', '#201020', '#3a1a3a'],
  stay: ['#1a1a2a', '#10101e', '#1a2a3a'],
  other: ['#1a1a1a', '#151515', '#222222'],
};

// Tag icon mapping
const TAG_ICONS: Record<string, string> = {
  wifi: 'wifi',
  'fast wifi': 'wifi',
  'good wifi': 'wifi',
  quiet: 'volume-x',
  'power outlets': 'battery-charging',
  outlets: 'battery-charging',
  'air conditioning': 'wind',
  'ac': 'wind',
  'outdoor seating': 'sun',
  outdoor: 'sun',
  terrace: 'sun',
  rooftop: 'sunrise',
  'pet friendly': 'heart',
  vegan: 'heart',
  vegetarian: 'heart',
  'late night': 'moon',
  '24/7': 'clock',
  parking: 'truck',
  beer: 'coffee',
  cocktails: 'coffee',
  coffee: 'coffee',
};

function getTagIcon(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [keyword, icon] of Object.entries(TAG_ICONS)) {
    if (lower.includes(keyword)) return icon;
  }
  return 'tag';
}

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={cardStyles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Feather
          key={i}
          name="star"
          size={13}
          color={
            i < full
              ? colors.amber
              : i === full && half
              ? colors.amberLight
              : colors.dark.bg4
          }
        />
      ))}
      <Text style={cardStyles.ratingNum}>{rating.toFixed(1)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Social proof avatar stack
// ---------------------------------------------------------------------------

function AvatarStack({ count }: { count: number }) {
  // Show 3 overlapping circles + count
  const displayCount = Math.min(count, 3);
  const stackColors = [colors.teal, colors.amber, colors.tealLight];

  return (
    <View style={cardStyles.socialRow}>
      <View style={cardStyles.avatarStack}>
        {Array.from({ length: displayCount }).map((_, i) => (
          <View
            key={i}
            style={[
              cardStyles.stackCircle,
              {
                backgroundColor: stackColors[i % stackColors.length],
                marginLeft: i === 0 ? 0 : -8,
                zIndex: displayCount - i,
              },
            ]}
          >
            <Feather name="user" size={8} color="#fff" />
          </View>
        ))}
      </View>
      <Text style={cardStyles.socialText}>
        {count} nomad{count !== 1 ? 's' : ''} upvoted
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card content
// ---------------------------------------------------------------------------

function SpotSwipeCard({ spot }: { spot: Spot & { distance_km?: number; rating?: number; ai_summary?: string } }) {
  const emoji = CATEGORY_EMOJI[spot.category] || CATEGORY_EMOJI.other;
  const categoryGradient = CATEGORY_GRADIENTS[spot.category] || CATEGORY_GRADIENTS.other;

  return (
    <SwipeCardFrame>
      {/* Hero area */}
      <View style={cardStyles.hero}>
        {spot.photo_url ? (
          <>
            <Image
              source={{ uri: spot.photo_url }}
              style={cardStyles.heroImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {/* Gradient overlay on photo */}
            <LinearGradient
              colors={['transparent', 'rgba(15,15,17,0.5)', 'rgba(15,15,17,0.92)']}
              locations={[0, 0.5, 1]}
              style={cardStyles.heroPhotoOverlay}
            />
          </>
        ) : (
          <LinearGradient
            colors={categoryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cardStyles.heroPlaceholder}
          >
            <Text style={cardStyles.heroEmoji}>{emoji}</Text>
          </LinearGradient>
        )}

        {/* Category pill floating — top left */}
        <View style={cardStyles.categoryFloating}>
          <Text style={cardStyles.categoryEmojiText}>{emoji}</Text>
          <Text style={cardStyles.categoryLabel}>{spot.category}</Text>
        </View>

        {/* Vote count — top right */}
        <View style={cardStyles.voteBadge}>
          <Feather name="arrow-up" size={12} color={colors.teal} />
          <Text style={cardStyles.voteText}>{spot.votes}</Text>
        </View>

        {/* Distance badge — floating pill top right below vote */}
        {spot.distance_km !== undefined && (
          <View style={cardStyles.distanceBadge}>
            <Feather name="navigation" size={10} color={colors.dark.text2} />
            <Text style={cardStyles.distanceText}>{spot.distance_km} km</Text>
          </View>
        )}

        {/* Name overlaid at bottom of hero */}
        <View style={cardStyles.heroBottom}>
          <Text style={cardStyles.heroName}>{spot.name}</Text>
          <View style={cardStyles.metaRow}>
            <Feather name="map-pin" size={12} color={colors.amber} />
            <Text style={cardStyles.location}>
              {spot.city}, {spot.country}
            </Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={cardStyles.info}>
        {spot.rating !== undefined && <StarRating rating={spot.rating} />}

        {/* AI Summary as highlighted quote */}
        {(spot as any).ai_summary ? (
          <View style={cardStyles.aiSummaryCard}>
            <Text style={cardStyles.aiQuoteMark}>{'\u201C'}</Text>
            <Text style={cardStyles.aiSummaryText} numberOfLines={2}>
              {(spot as any).ai_summary}
            </Text>
          </View>
        ) : spot.note ? (
          <Text style={cardStyles.note} numberOfLines={2}>
            {spot.note}
          </Text>
        ) : null}

        {/* Social proof */}
        {spot.votes > 0 && <AvatarStack count={spot.votes} />}

        {/* Tags with glass morphism */}
        {spot.tags.length > 0 && (
          <View style={cardStyles.tagsRow}>
            {spot.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={cardStyles.tagPill}>
                <Feather name={getTagIcon(tag) as any} size={10} color={colors.tealLight} style={{ opacity: 0.7 }} />
                <Text style={cardStyles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SwipeCardFrame>
  );
}

// ---------------------------------------------------------------------------
// Custom overlays
// ---------------------------------------------------------------------------

function SaveOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.teal }]}>
      <Feather name="bookmark" size={32} color={colors.teal} />
      <Text style={[overlayLabel, { color: colors.teal }]}>SAVE</Text>
    </View>
  );
}

function NahOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.red }]}>
      <Feather name="x" size={32} color={colors.red} />
      <Text style={[overlayLabel, { color: colors.red }]}>NAH</Text>
    </View>
  );
}

function MustGoOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.amber }]}>
      <Feather name="navigation" size={32} color={colors.amber} />
      <Text style={[overlayLabel, { color: colors.amber }]}>MUST GO</Text>
    </View>
  );
}

const overlayBadge: any = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.lg,
  borderRadius: radius.lg,
  borderWidth: 3,
  gap: spacing.xs,
};

const overlayLabel: any = {
  fontFamily: fonts.bodyBold,
  fontSize: 22,
  letterSpacing: 3,
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SpotDiscoveryScreen() {
  const navigation = useNavigation();
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const { user } = useAuth();
  const { data: spots = [], isLoading } = useSpotsByCity(null);
  const voteSpot = useVoteSpot();

  const handleSwipe = useCallback(
    (spot: Spot, direction: SwipeDirection) => {
      switch (direction) {
        case 'right':
          if (user) voteSpot.mutate({ spotId: spot.id, userId: user.id });
          break;
        case 'left':
          break;
        case 'up':
          (navigation as any).navigate('SpotDetail', { spot });
          break;
      }
    },
    [user, voteSpot, navigation],
  );

  return (
    <SafeAreaView style={screenStyles.root} edges={['top']}>
      {/* Header */}
      <View style={screenStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={screenStyles.title}>Discover Spots</Text>
        <TouchableOpacity
          style={screenStyles.undoBtn}
          onPress={() => deckRef.current?.undo()}
          activeOpacity={0.7}
        >
          <Feather name="rotate-ccw" size={20} color={colors.dark.text2} />
        </TouchableOpacity>
      </View>

      {/* Card deck */}
      {isLoading ? (
        <View style={screenStyles.center}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      ) : spots.length === 0 ? (
        <View style={screenStyles.center}>
          <Feather name="map-pin" size={48} color={colors.dark.text3} />
          <Text style={screenStyles.emptyText}>No spots yet</Text>
        </View>
      ) : (
        <SwipeCardDeck
          ref={deckRef}
          data={spots}
          keyExtractor={(s) => String(s.id)}
          renderCard={(spot) => <SpotSwipeCard spot={spot} />}
          onSwipe={handleSwipe}
          renderRightOverlay={() => <SaveOverlay />}
          renderLeftOverlay={() => <NahOverlay />}
          renderUpOverlay={() => <MustGoOverlay />}
        />
      )}

      {/* Action buttons */}
      <View style={screenStyles.actions}>
        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionSkip]}
          onPress={() => deckRef.current?.swipeLeft()}
          activeOpacity={0.7}
        >
          <Feather name="x" size={28} color={colors.red} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionSuper]}
          onPress={() => deckRef.current?.swipeUp()}
          activeOpacity={0.7}
        >
          <Feather name="navigation" size={22} color={colors.amber} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionSave]}
          onPress={() => deckRef.current?.swipeRight()}
          activeOpacity={0.7}
        >
          <Feather name="bookmark" size={28} color={colors.teal} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.dark.text,
  },
  undoBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...shadows.sm,
  },
  actionSkip: {
    backgroundColor: colors.dark.bg2,
    borderColor: colors.red,
  },
  actionSuper: {
    width: 50,
    height: 50,
    backgroundColor: colors.dark.bg2,
    borderColor: colors.amber,
  },
  actionSave: {
    backgroundColor: colors.dark.bg2,
    borderColor: colors.teal,
  },
});

const cardStyles = StyleSheet.create({
  // Hero
  hero: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.dark.bg3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 72,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  heroBottom: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  heroName: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  categoryFloating: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  categoryEmojiText: {
    fontSize: 13,
  },
  categoryLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
  },
  voteBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  voteText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.teal,
  },
  distanceBadge: {
    position: 'absolute',
    top: spacing.md + 30,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  distanceText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
  },
  info: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.amber,
    marginLeft: spacing.xs,
  },

  // AI Summary
  aiSummaryCard: {
    backgroundColor: colors.glass.light,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.glass.border,
    flexDirection: 'row',
    gap: 2,
  },
  aiQuoteMark: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.teal,
    lineHeight: 24,
    opacity: 0.6,
  },
  aiSummaryText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
    lineHeight: 18,
  },

  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 19,
  },

  // Social proof
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.dark.bg2,
  },
  socialText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glass.medium,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.tealLight,
  },
});
