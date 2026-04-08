import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import SwipeCardDeck, {
  SwipeCardDeckRef,
  SwipeDirection,
} from '../components/SwipeCardDeck';
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
// Card content
// ---------------------------------------------------------------------------

function SpotSwipeCard({ spot }: { spot: Spot & { distance_km?: number; rating?: number } }) {
  const emoji = CATEGORY_EMOJI[spot.category] || CATEGORY_EMOJI.other;

  return (
    <View style={cardStyles.card}>
      {/* Hero area */}
      <View style={cardStyles.hero}>
        {spot.photo_url ? (
          <Image source={{ uri: spot.photo_url }} style={cardStyles.heroImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        ) : (
          <View style={cardStyles.heroPlaceholder}>
            <Text style={cardStyles.heroEmoji}>{emoji}</Text>
          </View>
        )}
        {/* Category pill floating */}
        <View style={cardStyles.categoryFloating}>
          <Text style={cardStyles.categoryEmojiText}>{emoji}</Text>
          <Text style={cardStyles.categoryLabel}>{spot.category}</Text>
        </View>
        {/* Vote count */}
        <View style={cardStyles.voteBadge}>
          <Feather name="arrow-up" size={12} color={colors.teal} />
          <Text style={cardStyles.voteText}>{spot.votes}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{spot.name}</Text>

        <View style={cardStyles.metaRow}>
          <Feather name="map-pin" size={13} color={colors.amber} />
          <Text style={cardStyles.location}>
            {spot.city}, {spot.country}
          </Text>
          {spot.distance_km !== undefined && (
            <Text style={cardStyles.distance}>{spot.distance_km} km</Text>
          )}
        </View>

        {spot.rating !== undefined && <StarRating rating={spot.rating} />}

        {spot.note && (
          <Text style={cardStyles.note} numberOfLines={2}>
            {spot.note}
          </Text>
        )}

        {/* Tags */}
        {spot.tags.length > 0 && (
          <View style={cardStyles.tagsRow}>
            {spot.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={cardStyles.tagPill}>
                <Text style={cardStyles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
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
  card: {
    flex: 1,
  },
  hero: {
    flex: 1,
    backgroundColor: colors.dark.bg3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    // contentFit="cover" is set as a prop on expo-image
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg3,
  },
  heroEmoji: {
    fontSize: 64,
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
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.amber,
  },
  distance: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text3,
    marginLeft: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  ratingNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.amber,
    marginLeft: spacing.xs,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tagPill: {
    backgroundColor: colors.glass.medium,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.tealLight,
  },
});
