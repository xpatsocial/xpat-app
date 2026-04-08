/**
 * ShareableCard — auto-generated branded cards for Instagram/WhatsApp sharing
 *
 * Card types:
 *   - CityArrival: "[Name] just arrived in [City]"
 *   - Milestone: Nomad journey stats grid
 *   - SpotDiscovery: Spot photo hero with glass overlay
 *   - Streak: Fire emoji with streak count
 *
 * Design: Mercury liquid glass aesthetic, dark (#0F0F11) with teal/amber gradients
 * Aspect ratios: 1080x1920 (story) or 1080x1080 (square)
 */
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import ViewShot from 'react-native-view-shot';
import { colors, fonts, spacing, radius } from '../theme';
import { getInitials, getAvatarColor } from './Avatar';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Types ────────────────────────────────────────────────────────────────

export type CardAspect = 'story' | 'square';

export interface CityArrivalData {
  userName: string;
  userId: string;
  avatarUrl?: string | null;
  city: string;
  country: string;
  cityEmoji?: string;
}

export interface MilestoneData {
  userName: string;
  userId: string;
  avatarUrl?: string | null;
  spotsSaved: number;
  citiesVisited: number;
  connectionsMade: number;
  daysAsNomad: number;
  badgeName?: string | null;
}

export interface SpotDiscoveryData {
  spotName: string;
  spotPhotoUrl?: string | null;
  category: string;
  categoryEmoji: string;
  city: string;
  country: string;
  votes: number;
}

export interface StreakData {
  userName: string;
  streakCount: number;
  streakTier: string;
}

export type ShareableCardType = 'city_arrival' | 'milestone' | 'spot_discovery' | 'streak';

export type ShareableCardData =
  | { type: 'city_arrival'; data: CityArrivalData }
  | { type: 'milestone'; data: MilestoneData }
  | { type: 'spot_discovery'; data: SpotDiscoveryData }
  | { type: 'streak'; data: StreakData };

interface ShareableCardProps {
  card: ShareableCardData;
  aspect?: CardAspect;
}

// ─── City gradients ───────────────────────────────────────────────────────

const CITY_GRADIENTS: Record<string, [string, string, string]> = {
  default: ['#0F0F11', '#162420', '#0F0F11'],
  Bangkok: ['#0F0F11', '#2A1A0F', '#0F0F11'],
  Lisbon: ['#0F0F11', '#1A1A2E', '#0F0F11'],
  'Mexico City': ['#0F0F11', '#1A2A1A', '#0F0F11'],
  Bali: ['#0F0F11', '#0F2A2A', '#0F0F11'],
  Tokyo: ['#0F0F11', '#2A0F1A', '#0F0F11'],
  Berlin: ['#0F0F11', '#1A1A1A', '#0F0F11'],
  Barcelona: ['#0F0F11', '#2A1A10', '#0F0F11'],
};

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  cafe: ['#2C2C2E', '#3A2A1A'],
  eat: ['#2C2C2E', '#3A2A20'],
  cowork: ['#2C2C2E', '#1A2A2E'],
  colive: ['#2C2C2E', '#2A2A1A'],
  experience: ['#2C2C2E', '#2E1A2A'],
  stay: ['#2C2C2E', '#1A2A3A'],
  other: ['#2C2C2E', '#2A2A2A'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getCardDimensions(aspect: CardAspect) {
  // Render at a fixed width and let ViewShot capture at full res
  const cardWidth = SCREEN_WIDTH - 32;
  const cardHeight = aspect === 'story' ? cardWidth * (1920 / 1080) : cardWidth;
  return { cardWidth, cardHeight };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Watermark ────────────────────────────────────────────────────────────

function Watermark() {
  return (
    <View style={watermarkStyles.container}>
      <Text style={watermarkStyles.text}>
        via{' '}
        <Text style={watermarkStyles.brand}>
          <Text style={watermarkStyles.x}>x</Text>
          <Text style={watermarkStyles.slash}>/</Text>
          <Text style={watermarkStyles.pat}>pat</Text>
        </Text>
      </Text>
    </View>
  );
}

const watermarkStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 24,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
  brand: {
    fontFamily: fonts.bodyBold,
  },
  x: {
    color: 'rgba(46,196,160,0.5)',
  },
  slash: {
    color: 'rgba(255,255,255,0.3)',
  },
  pat: {
    color: 'rgba(232,128,58,0.5)',
  },
});

// ─── Avatar Circle ────────────────────────────────────────────────────────

function CardAvatar({
  uri,
  name,
  userId,
  size = 64,
}: {
  uri?: string | null;
  name: string;
  userId: string;
  size?: number;
}) {
  const borderRadius = size / 2;
  const bgColor = getAvatarColor(userId);

  if (uri) {
    return (
      <View style={[avatarStyles.ring, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius }}
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  return (
    <View style={[avatarStyles.ring, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}>
      <View style={[avatarStyles.fallback, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
        <Text style={[avatarStyles.initials, { fontSize: size * 0.38 }]}>
          {getInitials(name)}
        </Text>
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: 'rgba(46,196,160,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bodyBold,
    color: '#1C1C1E',
  },
});

// ─── Glass Card Overlay ───────────────────────────────────────────────────

function GlassOverlay({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[glassStyles.overlay, style]}>
      {children}
    </View>
  );
}

const glassStyles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});

// ─── City Arrival Card ────────────────────────────────────────────────────

function CityArrivalCard({ data, aspect }: { data: CityArrivalData; aspect: CardAspect }) {
  const { cardWidth, cardHeight } = getCardDimensions(aspect);
  const gradient = CITY_GRADIENTS[data.city] || CITY_GRADIENTS.default;

  return (
    <View style={[cardStyles.root, { width: cardWidth, height: cardHeight }]}>
      <LinearGradient
        colors={gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Subtle teal accent glow */}
      <View style={[cardStyles.glowCircle, { top: '15%', left: '10%' }]} />
      <View style={[cardStyles.glowCircleAmber, { bottom: '20%', right: '10%' }]} />

      <View style={cardStyles.centerContent}>
        <CardAvatar
          uri={data.avatarUrl}
          name={data.userName}
          userId={data.userId}
          size={aspect === 'story' ? 80 : 64}
        />

        <View style={cardStyles.spacerMd} />

        <Text style={[cardStyles.arrivalCity, aspect === 'square' && { fontSize: 28 }]}>
          {data.cityEmoji ? `${data.cityEmoji} ` : ''}{data.city}
        </Text>

        <Text style={[cardStyles.arrivalHeading, aspect === 'square' && { fontSize: 22 }]}>
          {data.userName} just arrived
        </Text>

        <View style={cardStyles.spacerSm} />

        <View style={cardStyles.locationPill}>
          <Text style={cardStyles.locationPillText}>
            {data.city}, {data.country}
          </Text>
        </View>

        <View style={cardStyles.spacerMd} />

        <Text style={cardStyles.tagline}>Exploring with x/pat</Text>

        <View style={cardStyles.spacerSm} />

        <Text style={cardStyles.dateStamp}>{formatDate()}</Text>
      </View>

      <Watermark />
    </View>
  );
}

// ─── Milestone Card ───────────────────────────────────────────────────────

function MilestoneCard({ data, aspect }: { data: MilestoneData; aspect: CardAspect }) {
  const { cardWidth, cardHeight } = getCardDimensions(aspect);

  const stats = [
    { value: data.spotsSaved, label: 'Spots Saved' },
    { value: data.citiesVisited, label: 'Cities' },
    { value: data.connectionsMade, label: 'Connections' },
    { value: data.daysAsNomad, label: 'Days Nomad' },
  ];

  return (
    <View style={[cardStyles.root, { width: cardWidth, height: cardHeight }]}>
      <LinearGradient
        colors={['#0F0F11', '#1A1F1D', '#0F0F11']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[cardStyles.glowCircle, { top: '8%', right: '15%' }]} />

      <View style={cardStyles.centerContent}>
        <CardAvatar
          uri={data.avatarUrl}
          name={data.userName}
          userId={data.userId}
          size={aspect === 'story' ? 72 : 56}
        />

        <View style={cardStyles.spacerMd} />

        <Text style={[cardStyles.milestoneHeader, aspect === 'square' && { fontSize: 22 }]}>
          {data.userName}'s nomad journey
        </Text>

        {data.badgeName && (
          <View style={cardStyles.badgePill}>
            <Text style={cardStyles.badgePillText}>{data.badgeName}</Text>
          </View>
        )}

        <View style={cardStyles.spacerLg} />

        <GlassOverlay style={cardStyles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={cardStyles.statCell}>
              <Text style={cardStyles.statValue}>{stat.value}</Text>
              <Text style={cardStyles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </GlassOverlay>
      </View>

      <Watermark />
    </View>
  );
}

// ─── Spot Discovery Card ─────────────────────────────────────────────────

function SpotDiscoveryCard({ data, aspect }: { data: SpotDiscoveryData; aspect: CardAspect }) {
  const { cardWidth, cardHeight } = getCardDimensions(aspect);
  const catGradient = CATEGORY_GRADIENTS[data.category] || CATEGORY_GRADIENTS.other;

  return (
    <View style={[cardStyles.root, { width: cardWidth, height: cardHeight }]}>
      {/* Hero background */}
      {data.spotPhotoUrl ? (
        <>
          <Image
            source={{ uri: data.spotPhotoUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* Dark gradient overlay for text readability */}
          <LinearGradient
            colors={['rgba(15,15,17,0.3)', 'rgba(15,15,17,0.7)', 'rgba(15,15,17,0.95)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </>
      ) : (
        <LinearGradient
          colors={[catGradient[0], catGradient[1], '#0F0F11']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      <View style={[cardStyles.centerContent, { justifyContent: 'flex-end', paddingBottom: 60 }]}>
        <GlassOverlay style={cardStyles.spotGlass}>
          <View style={cardStyles.spotCategoryRow}>
            <Text style={cardStyles.spotCategoryEmoji}>{data.categoryEmoji}</Text>
            <Text style={cardStyles.spotCategoryText}>
              {data.category.toUpperCase()}
            </Text>
          </View>

          <Text style={[cardStyles.spotName, aspect === 'square' && { fontSize: 24 }]}>
            {data.spotName}
          </Text>

          <Text style={cardStyles.spotLocation}>
            {data.city}, {data.country}
          </Text>

          {data.votes > 0 && (
            <View style={cardStyles.spotVoteRow}>
              <View style={cardStyles.spotVoteDot} />
              <Text style={cardStyles.spotVoteText}>
                {data.votes} nomad{data.votes !== 1 ? 's' : ''} recommend this
              </Text>
            </View>
          )}
        </GlassOverlay>

        <View style={cardStyles.spacerMd} />

        <Text style={cardStyles.discoveredOn}>Discovered on x/pat</Text>
      </View>

      <Watermark />
    </View>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────

function StreakCard({ data, aspect }: { data: StreakData; aspect: CardAspect }) {
  const { cardWidth, cardHeight } = getCardDimensions(aspect);

  return (
    <View style={[cardStyles.root, { width: cardWidth, height: cardHeight }]}>
      <LinearGradient
        colors={['#0F0F11', '#2A1A0F', '#0F0F11']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={[cardStyles.glowCircleAmber, { top: '30%', left: '30%', width: 200, height: 200 }]} />

      <View style={cardStyles.centerContent}>
        <Text style={cardStyles.streakFire}>
          {data.streakCount >= 30 ? '🔥🔥🔥' : data.streakCount >= 7 ? '🔥🔥' : '🔥'}
        </Text>

        <Text style={[cardStyles.streakCount, aspect === 'square' && { fontSize: 72 }]}>
          {data.streakCount}
        </Text>

        <Text style={cardStyles.streakDays}>day streak</Text>

        <View style={cardStyles.spacerMd} />

        <Text style={[cardStyles.streakMessage, aspect === 'square' && { fontSize: 18 }]}>
          {data.userName} is on a {data.streakCount}-day streak
        </Text>

        <View style={cardStyles.spacerSm} />

        <View style={cardStyles.streakTierPill}>
          <Text style={cardStyles.streakTierText}>{data.streakTier}</Text>
        </View>
      </View>

      <Watermark />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

const ShareableCard = forwardRef<ViewShot, ShareableCardProps>(
  function ShareableCard({ card, aspect = 'story' }, ref) {
    return (
      <ViewShot
        ref={ref}
        options={{ format: 'png', quality: 1.0 }}
        style={{ alignSelf: 'center' }}
      >
        {card.type === 'city_arrival' && (
          <CityArrivalCard data={card.data} aspect={aspect} />
        )}
        {card.type === 'milestone' && (
          <MilestoneCard data={card.data} aspect={aspect} />
        )}
        {card.type === 'spot_discovery' && (
          <SpotDiscoveryCard data={card.data} aspect={aspect} />
        )}
        {card.type === 'streak' && (
          <StreakCard data={card.data} aspect={aspect} />
        )}
      </ViewShot>
    );
  },
);

export default ShareableCard;

// ─── Shared Card Styles ───────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  root: {
    backgroundColor: colors.dark.bg0,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  glowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(46,196,160,0.06)',
  },
  glowCircleAmber: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(232,128,58,0.06)',
  },
  spacerSm: { height: spacing.sm },
  spacerMd: { height: spacing.lg },
  spacerLg: { height: spacing.xl },

  // City Arrival
  arrivalCity: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.dark.text,
    textAlign: 'center',
  },
  arrivalHeading: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.teal,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  locationPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  locationPillText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.amber,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dateStamp: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
  },

  // Milestone
  milestoneHeader: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.dark.text,
    textAlign: 'center',
  },
  badgePill: {
    backgroundColor: 'rgba(232,128,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232,128,58,0.25)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  badgePillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  statCell: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.teal,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Spot Discovery
  spotGlass: {
    width: '100%',
  },
  spotCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  spotCategoryEmoji: {
    fontSize: 16,
  },
  spotCategoryText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    letterSpacing: 1,
  },
  spotName: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  spotLocation: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.amber,
    marginBottom: spacing.sm,
  },
  spotVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  spotVoteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  spotVoteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  discoveredOn: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text3,
    letterSpacing: 0.5,
  },

  // Streak
  streakFire: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  streakCount: {
    fontFamily: fonts.heading,
    fontSize: 96,
    color: colors.amber,
    lineHeight: 100,
  },
  streakDays: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  streakMessage: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
    textAlign: 'center',
  },
  streakTierPill: {
    backgroundColor: 'rgba(232,128,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,128,58,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  streakTierText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
