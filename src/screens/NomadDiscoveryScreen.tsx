import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import SwipeCardDeck, {
  SwipeCardDeckRef,
  SwipeDirection,
} from '../components/SwipeCardDeck';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// ---------------------------------------------------------------------------
// Types
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
  mutual_connections: number;
}

// ---------------------------------------------------------------------------
// Mock data (replace with real query when backend wired)
// ---------------------------------------------------------------------------

const MOCK_NOMADS: NomadProfile[] = [
  {
    id: '1',
    display_name: 'Sofia Martinez',
    username: 'sofiamar',
    avatar_url: null,
    bio: 'Full-stack dev exploring Southeast Asia. Coffee addict.',
    current_city: 'Chiang Mai',
    current_country: 'Thailand',
    interests: ['coworking', 'hiking', 'specialty coffee'],
    mutual_connections: 3,
  },
  {
    id: '2',
    display_name: 'Liam Chen',
    username: 'liamdigital',
    avatar_url: null,
    bio: 'Product designer chasing surf and sunsets.',
    current_city: 'Bali',
    current_country: 'Indonesia',
    interests: ['surfing', 'design', 'street food'],
    mutual_connections: 1,
  },
  {
    id: '3',
    display_name: 'Amara Osei',
    username: 'amarawanders',
    avatar_url: null,
    bio: 'Content creator | 42 countries | Plant mom',
    current_city: 'Lisbon',
    current_country: 'Portugal',
    interests: ['photography', 'coworking', 'vegan food'],
    mutual_connections: 5,
  },
  {
    id: '4',
    display_name: 'Jonas Eriksson',
    username: 'jonasnomad',
    avatar_url: null,
    bio: 'Backend engineer from Stockholm. Love a good co-live.',
    current_city: 'Mexico City',
    current_country: 'Mexico',
    interests: ['co-living', 'mezcal', 'running'],
    mutual_connections: 0,
  },
  {
    id: '5',
    display_name: 'Priya Patel',
    username: 'priyaontheroad',
    avatar_url: null,
    bio: 'Yoga teacher & UX writer bouncing between cities.',
    current_city: 'Medellín',
    current_country: 'Colombia',
    interests: ['yoga', 'writing', 'cafe culture'],
    mutual_connections: 2,
  },
];

// ---------------------------------------------------------------------------
// Helper: avatar placeholder
// ---------------------------------------------------------------------------

function AvatarPlaceholder({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={cardStyles.avatarPlaceholder}>
      <Text style={cardStyles.avatarInitial}>{initial}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card content
// ---------------------------------------------------------------------------

function NomadCard({ nomad }: { nomad: NomadProfile }) {
  return (
    <View style={cardStyles.card}>
      {/* Top: large avatar area */}
      <View style={cardStyles.avatarArea}>
        {nomad.avatar_url ? (
          <Image source={{ uri: nomad.avatar_url }} style={cardStyles.avatar} />
        ) : (
          <AvatarPlaceholder name={nomad.display_name} />
        )}
      </View>

      {/* Info section */}
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{nomad.display_name}</Text>
        {nomad.username && (
          <Text style={cardStyles.username}>@{nomad.username}</Text>
        )}

        {/* Location pill */}
        <View style={cardStyles.locationRow}>
          <Feather name="map-pin" size={13} color={colors.amber} />
          <Text style={cardStyles.location}>
            {nomad.current_city}
            {nomad.current_country ? `, ${nomad.current_country}` : ''}
          </Text>
        </View>

        {/* Bio */}
        {nomad.bio && (
          <Text style={cardStyles.bio} numberOfLines={2}>
            {nomad.bio}
          </Text>
        )}

        {/* Shared interests */}
        <View style={cardStyles.interestsRow}>
          {nomad.interests.slice(0, 3).map((interest) => (
            <View key={interest} style={cardStyles.interestPill}>
              <Text style={cardStyles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>

        {/* Mutual connections */}
        {nomad.mutual_connections > 0 && (
          <View style={cardStyles.mutualRow}>
            <Feather name="users" size={12} color={colors.teal} />
            <Text style={cardStyles.mutualText}>
              {nomad.mutual_connections} mutual connection
              {nomad.mutual_connections !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Custom overlays
// ---------------------------------------------------------------------------

function ConnectOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.teal }]}>
      <Feather name="user-plus" size={32} color={colors.teal} />
      <Text style={[overlayLabel, { color: colors.teal }]}>CONNECT</Text>
    </View>
  );
}

function SkipOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.red }]}>
      <Feather name="x" size={32} color={colors.red} />
      <Text style={[overlayLabel, { color: colors.red }]}>SKIP</Text>
    </View>
  );
}

function SuperLikeOverlay() {
  return (
    <View style={[overlayBadge, { borderColor: colors.amber }]}>
      <Feather name="star" size={32} color={colors.amber} />
      <Text style={[overlayLabel, { color: colors.amber }]}>SUPER</Text>
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

export default function NomadDiscoveryScreen() {
  const navigation = useNavigation();
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const [nomads] = useState<NomadProfile[]>(MOCK_NOMADS);

  const handleSwipe = useCallback((nomad: NomadProfile, direction: SwipeDirection) => {
    switch (direction) {
      case 'right':
        // TODO: send connection request via supabase
        console.log(`[NomadDiscovery] Connect request -> ${nomad.display_name}`);
        break;
      case 'left':
        console.log(`[NomadDiscovery] Skipped ${nomad.display_name}`);
        break;
      case 'up':
        // TODO: send connection request with message prompt
        console.log(`[NomadDiscovery] Super-like -> ${nomad.display_name}`);
        break;
    }
  }, []);

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
        <Text style={screenStyles.title}>Discover Nomads</Text>
        <TouchableOpacity
          style={screenStyles.undoBtn}
          onPress={() => deckRef.current?.undo()}
          activeOpacity={0.7}
        >
          <Feather name="rotate-ccw" size={20} color={colors.dark.text2} />
        </TouchableOpacity>
      </View>

      {/* Card deck */}
      <SwipeCardDeck
        ref={deckRef}
        data={nomads}
        keyExtractor={(n) => n.id}
        renderCard={(nomad) => <NomadCard nomad={nomad} />}
        onSwipe={handleSwipe}
        renderRightOverlay={() => <ConnectOverlay />}
        renderLeftOverlay={() => <SkipOverlay />}
        renderUpOverlay={() => <SuperLikeOverlay />}
      />

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
          <Feather name="star" size={24} color={colors.amber} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[screenStyles.actionBtn, screenStyles.actionConnect]}
          onPress={() => deckRef.current?.swipeRight()}
          activeOpacity={0.7}
        >
          <Feather name="user-plus" size={28} color={colors.teal} />
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
  actionConnect: {
    backgroundColor: colors.dark.bg2,
    borderColor: colors.teal,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
  },
  avatarArea: {
    flex: 1,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    backgroundColor: colors.dark.bg4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 42,
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
  username: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.amber,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  interestPill: {
    backgroundColor: colors.glass.medium,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  interestText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.teal,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mutualText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
  },
});
