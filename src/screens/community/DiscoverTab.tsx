import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, shadows } from '../../theme';
import SwipeCardDeck, { SwipeCardDeckRef, SwipeDirection } from '../../components/SwipeCardDeck';
import SwipeCardFrame from '../../components/SwipeCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useConnections } from '../../hooks/useConnections';
import { Profile } from '../../types';

// ---------------------------------------------------------------------------
// Gradient presets for avatar-less cards (hashed by name)
// ---------------------------------------------------------------------------

const AVATAR_GRADIENTS: [string, string, string][] = [
  ['#1a3a4a', '#0d2b3e', '#162d3a'],  // deep ocean
  ['#2a1a3a', '#1e1040', '#2d1845'],  // midnight purple
  ['#1a3a2a', '#0d3e2b', '#16403a'],  // emerald dark
  ['#3a2a1a', '#40301e', '#453518'],  // warm bronze
  ['#1a2a3a', '#102040', '#182d45'],  // steel blue
];

function nameToGradientIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_GRADIENTS.length;
}

// ---------------------------------------------------------------------------
// Interest pill color by category type
// ---------------------------------------------------------------------------

const INTEREST_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  travel: { bg: 'rgba(232,128,58,0.12)', border: 'rgba(232,128,58,0.25)', text: colors.amber },
  work: { bg: 'rgba(46,196,160,0.12)', border: 'rgba(46,196,160,0.25)', text: colors.teal },
  lifestyle: { bg: 'rgba(160,120,220,0.12)', border: 'rgba(160,120,220,0.25)', text: '#B89AE8' },
};

const TRAVEL_KEYWORDS = ['travel', 'explore', 'adventure', 'nomad', 'backpack', 'surf', 'hike', 'dive', 'beach', 'mountain'];
const WORK_KEYWORDS = ['remote', 'freelance', 'dev', 'design', 'write', 'code', 'startup', 'marketing', 'product', 'tech', 'engineer', 'cowork'];

function categorizeInterest(interest: string): 'travel' | 'work' | 'lifestyle' {
  const lower = interest.toLowerCase();
  if (TRAVEL_KEYWORDS.some((kw) => lower.includes(kw))) return 'travel';
  if (WORK_KEYWORDS.some((kw) => lower.includes(kw))) return 'work';
  return 'lifestyle';
}

// ---------------------------------------------------------------------------
// Country to flag emoji
// ---------------------------------------------------------------------------

function countryToFlag(countryCode: string | null): string {
  if (!countryCode) return '';
  // If it's already a 2-letter code, convert to flag emoji
  const code = countryCode.toUpperCase().slice(0, 2);
  if (code.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset);
}

// ---------------------------------------------------------------------------
// Extended nomad type for enriched card
// ---------------------------------------------------------------------------

interface NomadProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_city: string | null;
  current_country: string | null;
  interests: string[];
  // Enrichment fields
  tagline: string | null;
  prompt_1_question: string | null;
  prompt_1_answer: string | null;
  custom_status: string | null;
  custom_status_emoji: string | null;
  verification_level: number;
  nationality: string | null;
}

function profileToNomad(p: Profile): NomadProfile {
  return {
    id: p.id,
    display_name: p.display_name ?? 'Nomad',
    username: p.username,
    avatar_url: p.avatar_url,
    bio: p.bio,
    current_city: p.current_city,
    current_country: p.current_country ?? null,
    interests: (p.skills ?? p.open_to ?? p.travel_style ?? []).slice(0, 5),
    tagline: p.tagline ?? null,
    prompt_1_question: p.prompt_1_question ?? null,
    prompt_1_answer: p.prompt_1_answer ?? null,
    custom_status: p.custom_status ?? null,
    custom_status_emoji: p.custom_status_emoji ?? null,
    verification_level: p.verification_level ?? 0,
    nationality: p.nationality ?? null,
  };
}

// ---------------------------------------------------------------------------
// NomadCard — Premium Hinge/Bumble-quality card
// ---------------------------------------------------------------------------

function NomadCard({ nomad }: { nomad: NomadProfile }) {
  const initial = nomad.display_name.charAt(0).toUpperCase();
  const gradientIdx = nameToGradientIndex(nomad.display_name);
  const gradientColors = AVATAR_GRADIENTS[gradientIdx];
  const hasAvatar = !!nomad.avatar_url;

  return (
    <SwipeCardFrame>
      {/* ---- Hero Section ---- */}
      <View style={cardStyles.hero}>
        {hasAvatar ? (
          <Image
            source={{ uri: nomad.avatar_url! }}
            style={cardStyles.heroImage}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cardStyles.heroGradient}
          >
            <Text style={cardStyles.heroInitial}>{initial}</Text>
          </LinearGradient>
        )}

        {/* Bottom gradient overlay for text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(15,15,17,0.6)', 'rgba(15,15,17,0.95)']}
          locations={[0, 0.5, 1]}
          style={cardStyles.heroOverlay}
        />

        {/* Name + verification overlaid on hero bottom */}
        <View style={cardStyles.heroBottom}>
          <View style={cardStyles.nameRow}>
            <Text style={cardStyles.heroName}>{nomad.display_name}</Text>
            {nomad.verification_level > 0 && (
              <View style={cardStyles.verifiedBadge}>
                <Feather name="check" size={10} color="#fff" />
              </View>
            )}
          </View>
          {nomad.tagline && (
            <Text style={cardStyles.tagline} numberOfLines={1}>{nomad.tagline}</Text>
          )}
        </View>

        {/* Status pill — top right */}
        {nomad.custom_status && (
          <View style={cardStyles.statusPill}>
            {nomad.custom_status_emoji && (
              <Text style={cardStyles.statusEmoji}>{nomad.custom_status_emoji}</Text>
            )}
            <Text style={cardStyles.statusText}>{nomad.custom_status}</Text>
          </View>
        )}
      </View>

      {/* ---- Info Section ---- */}
      <View style={cardStyles.info}>
        {/* Location row */}
        <View style={cardStyles.locRow}>
          <Feather name="map-pin" size={12} color={colors.amber} />
          <Text style={cardStyles.locText}>
            {nomad.current_city ?? 'Somewhere'}
            {nomad.current_country ? `, ${nomad.current_country}` : ''}
          </Text>
          {nomad.nationality ? (
            <Text style={cardStyles.flagEmoji}>{countryToFlag(nomad.nationality)}</Text>
          ) : null}
        </View>

        {/* Profile prompt — conversation starter */}
        {nomad.prompt_1_question && nomad.prompt_1_answer && (
          <View style={cardStyles.promptCard}>
            <Text style={cardStyles.promptQuestion}>{nomad.prompt_1_question}</Text>
            <Text style={cardStyles.promptAnswer}>{nomad.prompt_1_answer}</Text>
          </View>
        )}

        {/* Bio fallback when no prompt */}
        {(!nomad.prompt_1_answer && nomad.bio) && (
          <Text style={cardStyles.bio} numberOfLines={2}>{nomad.bio}</Text>
        )}

        {/* Interest pills with category colors */}
        {nomad.interests.length > 0 && (
          <View style={cardStyles.pills}>
            {nomad.interests.slice(0, 4).map((interest) => {
              const category = categorizeInterest(interest);
              const colorSet = INTEREST_COLORS[category];
              return (
                <View
                  key={interest}
                  style={[
                    cardStyles.pill,
                    { backgroundColor: colorSet.bg, borderColor: colorSet.border },
                  ]}
                >
                  <Text style={[cardStyles.pillText, { color: colorSet.text }]}>{interest}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </SwipeCardFrame>
  );
}

// ---------------------------------------------------------------------------
// Overlay badges
// ---------------------------------------------------------------------------

function OverlayBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[overlayBadge, { borderColor: color }]}>
      <Feather name={icon as any} size={28} color={color} />
      <Text style={[overlayLabel, { color }]}>{label}</Text>
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
const overlayLabel: any = { fontFamily: fonts.bodyBold, fontSize: 20, letterSpacing: 3 };

// ---------------------------------------------------------------------------
// DiscoverTab screen
// ---------------------------------------------------------------------------

export default function DiscoverTab() {
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const [nomads, setNomads] = useState<NomadProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { sendRequest } = useConnections();

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, current_city, current_country, skills, open_to, travel_style, tagline, prompt_1_question, prompt_1_answer, custom_status, custom_status_emoji, verification_level, nationality')
      .neq('id', user?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setNomads((data ?? []).map((p) => profileToNomad(p as Profile)));
        setLoading(false);
      });
  }, [user?.id]);

  const handleSwipe = useCallback(
    (nomad: NomadProfile, direction: SwipeDirection) => {
      switch (direction) {
        case 'right':
        case 'up':
          sendRequest(nomad.id);
          break;
        case 'left':
          break;
      }
    },
    [sendRequest],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  if (nomads.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="users" size={48} color={colors.dark.text3} />
        <Text style={styles.emptyText}>No nomads nearby yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SwipeCardDeck
        ref={deckRef}
        data={nomads}
        keyExtractor={(n) => n.id}
        renderCard={(nomad) => <NomadCard nomad={nomad} />}
        onSwipe={handleSwipe}
        renderRightOverlay={() => <OverlayBadge icon="user-plus" label="CONNECT" color={colors.teal} />}
        renderLeftOverlay={() => <OverlayBadge icon="x" label="SKIP" color={colors.red} />}
        renderUpOverlay={() => <OverlayBadge icon="star" label="SUPER" color={colors.amber} />}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.red }]} onPress={() => deckRef.current?.swipeLeft()} activeOpacity={0.7}>
          <Feather name="x" size={24} color={colors.red} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSm, { borderColor: colors.amber }]} onPress={() => deckRef.current?.swipeUp()} activeOpacity={0.7}>
          <Feather name="star" size={20} color={colors.amber} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.teal }]} onPress={() => deckRef.current?.swipeRight()} activeOpacity={0.7}>
          <Feather name="user-plus" size={24} color={colors.teal} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.dark.bg },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.dark.text3 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg },
  btn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: colors.dark.bg2, ...shadows.sm },
  btnSm: { width: 46, height: 46, borderRadius: 23 },
});

// ---------------------------------------------------------------------------
// Card styles
// ---------------------------------------------------------------------------

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
  heroGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: {
    fontFamily: fonts.heading,
    fontSize: 72,
    color: 'rgba(255,255,255,0.25)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroBottom: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroName: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statusPill: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
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
  statusEmoji: {
    fontSize: 12,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
  },

  // Info section
  info: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },
  flagEmoji: {
    fontSize: 14,
    marginLeft: 2,
  },

  // Prompt card
  promptCard: {
    backgroundColor: colors.glass.light,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  promptQuestion: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.dark.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  promptAnswer: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    lineHeight: 19,
  },

  // Bio
  bio: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    lineHeight: 18,
  },

  // Interest pills
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 10,
  },
});
