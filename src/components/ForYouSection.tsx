/**
 * ForYouSection — AI-powered spot recommendations card row
 *
 * Horizontal scroll of Claude-curated spots with personalized reasons.
 * Appears at the top of FeedScreen when user has a current_city set.
 * Shows "Powered by AI" label for trust transparency.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRecommendations } from '../hooks/useRecommendations';
import { colors, fonts, spacing, radius } from '../theme';

interface ForYouSectionProps {
  city: string;
  workStyle?: string;
  goals?: string[];
}

const CATEGORY_ICONS: Record<string, string> = {
  cafe: 'coffee',
  eat: 'utensils',
  cowork: 'monitor',
  colive: 'home',
  experience: 'star',
  stay: 'moon',
};

export default function ForYouSection({ city, workStyle, goals }: ForYouSectionProps) {
  const navigation = useNavigation<any>();
  const { data: spots, isLoading, isError } = useRecommendations({
    city,
    workStyle,
    goals,
  });

  const handleSpotPress = useCallback((spotId: number) => {
    Haptics.selectionAsync();
    navigation.navigate('SpotDetail', { spotId });
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Feather name="zap" size={14} color={colors.teal} />
          <Text style={styles.title}>Picked for you</Text>
          <Text style={styles.aiLabel}>AI</Text>
        </View>
        <View style={styles.loadingRow} accessibilityLiveRegion="polite" accessibilityLabel="Finding your spots" accessibilityState={{ busy: true }}>
          <ActivityIndicator color={colors.teal} size="small" />
          <Text style={styles.loadingText}>Finding your spots...</Text>
        </View>
      </View>
    );
  }

  if (isError || !spots || spots.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="zap" size={14} color={colors.teal} />
        <Text style={styles.title}>Picked for you in {city}</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiLabel}>AI</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={220}
        snapToAlignment="start"
      >
        {spots.map((spot) => (
          <TouchableOpacity
            key={spot.id}
            style={styles.card}
            onPress={() => handleSpotPress(spot.id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${spot.name}, ${spot.category}. ${spot.reason || ''}. ${spot.votes ?? 0} votes`}
          >
            {/* Spot photo or gradient placeholder */}
            {spot.photo_url ? (
              <Image
                source={{ uri: spot.photo_url }}
                style={styles.photo}
                contentFit="cover"
                recyclingKey={`rec-${spot.id}`}
              />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Feather
                  name={(CATEGORY_ICONS[spot.category] as any) ?? 'map-pin'}
                  size={28}
                  color={colors.teal}
                />
              </View>
            )}

            {/* Category badge */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{spot.category}</Text>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
              <Text style={styles.reason} numberOfLines={2}>{spot.reason}</Text>
              <View style={styles.meta}>
                <Feather name="thumbs-up" size={11} color={colors.dark.text3} />
                <Text style={styles.votes}>{spot.votes ?? 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: colors.teal + '20',
    borderWidth: 1,
    borderColor: colors.teal + '50',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.teal,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 200,
    backgroundColor: colors.dark.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 110,
  },
  photoPlaceholder: {
    backgroundColor: colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.dark.bg + 'CC',
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.teal,
    textTransform: 'uppercase',
  },
  info: {
    padding: spacing.sm,
  },
  spotName: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: 4,
  },
  reason: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    lineHeight: 15,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votes: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
  },
});
