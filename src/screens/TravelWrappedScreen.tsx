/**
 * TravelWrappedScreen — Daniel Ek / Spotify Wrapped Playbook
 *
 * Spotify Wrapped generates 60M+ social shares annually.
 * Key mechanics: personalized data → beautiful visuals → one-tap share.
 *
 * x/pat implementation: "Your x/pat Wrapped"
 * - Cities visited, spots saved, people connected, messages sent
 * - Shareable as image card via ShareableCard infrastructure
 * - Triggered quarterly (not just annually) for faster viral loops
 *
 * Source: Spotify Engineering Blog, Daniel Ek keynotes
 * Reference: research/playbook-daniel-ek-wrapped-viral.md
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius, shadows, animation } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import GlassView from '../components/GlassView';
import AnimatedPressable from '../components/AnimatedPressable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WrappedStats {
  citiesVisited: string[];
  spotsTotal: number;
  spotsSaved: number;
  spotsCreated: number;
  connectionsCount: number;
  messagesSent: number;
  countriesCount: number;
  topCategory: string | null;
  topCity: string | null;
  checkInsCount: number;
  streakBest: number;
  vouchesReceived: number;
  daysActive: number;
  periodLabel: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: '☕', eat: '🍽️', cowork: '💻', colive: '🏠',
  experience: '🎯', stay: '🛏️', other: '📌',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TravelWrappedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine period (current quarter)
  const getPeriodDates = useCallback(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const startMonth = quarter * 3;
    const start = new Date(now.getFullYear(), startMonth, 1);
    const end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59);

    const labels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${labels[quarter]} ${now.getFullYear()}`,
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  async function fetchStats() {
    if (!user) return;
    setLoading(true);

    const { start, end, label } = getPeriodDates();

    try {
      // Parallel queries for all stats
      const [
        spotsCreatedRes,
        spotsSavedRes,
        connectionsRes,
        messagesRes,
        checkInsRes,
        vouchesRes,
      ] = await Promise.all([
        supabase.from('spots')
          .select('city, country, category')
          .eq('created_by', user.id)
          .gte('created_at', start).lte('created_at', end),
        supabase.from('saved_spots')
          .select('spot_id')
          .eq('user_id', user.id)
          .gte('created_at', start).lte('created_at', end),
        supabase.from('connections')
          .select('id')
          .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .gte('created_at', start).lte('created_at', end),
        supabase.from('city_chat_messages')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', start).lte('created_at', end),
        supabase.from('check_ins')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', start).lte('created_at', end),
        supabase.from('vouches')
          .select('id')
          .eq('vouched_user_id', user.id)
          .gte('created_at', start).lte('created_at', end),
      ]);

      const spotsCreated = spotsCreatedRes.data ?? [];
      const cities = [...new Set(spotsCreated.map(s => s.city).filter(Boolean))];
      const countries = [...new Set(spotsCreated.map(s => s.country).filter(Boolean))];

      // Top category
      const categoryCounts: Record<string, number> = {};
      spotsCreated.forEach(s => {
        if (s.category) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
      });
      const topCategory = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

      // Top city
      const cityCounts: Record<string, number> = {};
      spotsCreated.forEach(s => {
        if (s.city) cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
      });
      const topCity = Object.entries(cityCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

      // Days active (approximate from created spots + messages)
      const daysActive = new Set([
        ...spotsCreated.map(s => s.city), // rough proxy
      ]).size;

      setStats({
        citiesVisited: cities,
        spotsTotal: spotsCreated.length + (spotsSavedRes.data?.length ?? 0),
        spotsSaved: spotsSavedRes.data?.length ?? 0,
        spotsCreated: spotsCreated.length,
        connectionsCount: connectionsRes.data?.length ?? 0,
        messagesSent: messagesRes.data?.length ?? 0,
        countriesCount: countries.length,
        topCategory,
        topCity,
        checkInsCount: checkInsRes.data?.length ?? 0,
        streakBest: 0, // Would need streak table query
        vouchesReceived: vouchesRes.data?.length ?? 0,
        daysActive,
        periodLabel: label,
      });
    } catch (err) {
      console.warn('TravelWrapped fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.loadingText}>Building your Wrapped...</Text>
      </View>
    );
  }

  if (!stats) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your x/pat Wrapped</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Badge */}
        <View style={styles.periodBadge}>
          <Text style={styles.periodText}>{stats.periodLabel}</Text>
        </View>

        {/* Hero Stat */}
        <GlassView style={styles.heroCard} intensity={20}>
          <Text style={styles.heroNumber}>{stats.spotsTotal}</Text>
          <Text style={styles.heroLabel}>spots discovered</Text>
          {stats.topCity && (
            <Text style={styles.heroSub}>
              Your top city: {stats.topCity}
            </Text>
          )}
        </GlassView>

        {/* Stat Grid */}
        <View style={styles.statGrid}>
          <StatCard
            icon="map-pin"
            value={stats.citiesVisited.length}
            label="cities"
            color={colors.teal}
          />
          <StatCard
            icon="globe"
            value={stats.countriesCount}
            label="countries"
            color={colors.amber}
          />
          <StatCard
            icon="users"
            value={stats.connectionsCount}
            label="connections"
            color="#6C63FF"
          />
          <StatCard
            icon="message-circle"
            value={stats.messagesSent}
            label="messages"
            color="#48CAE4"
          />
        </View>

        {/* Additional Stats */}
        <GlassView style={styles.detailCard} intensity={15}>
          {stats.topCategory && (
            <DetailRow
              emoji={CATEGORY_EMOJI[stats.topCategory] || '📌'}
              label="Favorite spot type"
              value={stats.topCategory}
            />
          )}
          <DetailRow emoji="📍" label="Check-ins" value={`${stats.checkInsCount}`} />
          <DetailRow emoji="⭐" label="Spots created" value={`${stats.spotsCreated}`} />
          <DetailRow emoji="🤝" label="Vouches received" value={`${stats.vouchesReceived}`} />
          <DetailRow emoji="💾" label="Spots saved" value={`${stats.spotsSaved}`} />
        </GlassView>

        {/* Cities List */}
        {stats.citiesVisited.length > 0 && (
          <GlassView style={styles.detailCard} intensity={15}>
            <Text style={styles.sectionTitle}>Cities You Explored</Text>
            <View style={styles.cityList}>
              {stats.citiesVisited.map((city) => (
                <View key={city} style={styles.cityPill}>
                  <Text style={styles.cityText}>{city}</Text>
                </View>
              ))}
            </View>
          </GlassView>
        )}

        {/* Share CTA */}
        <AnimatedPressable
          style={styles.shareBtn}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // TODO: Generate shareable card image and open share sheet
          }}
          hapticStyle="success"
        >
          <Feather name="share" size={18} color={colors.dark.bg} />
          <Text style={styles.shareBtnText}>Share Your Wrapped</Text>
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon, value, label, color }: {
  icon: string; value: number; label: string; color: string;
}) {
  return (
    <GlassView style={styles.statCard} intensity={15}>
      <Feather name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassView>
  );
}

function DetailRow({ emoji, label, value }: {
  emoji: string; label: string; value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailEmoji}>{emoji}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text2,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  periodBadge: {
    alignSelf: 'center',
    backgroundColor: `${colors.teal}22`,
    borderColor: colors.teal,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  periodText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.teal,
  },
  heroCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  heroNumber: {
    fontFamily: fonts.heading,
    fontSize: 64,
    color: colors.teal,
  },
  heroLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.dark.text,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    marginTop: spacing.xs,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 32,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    textTransform: 'uppercase',
  },
  detailCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    flex: 1,
  },
  detailValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  cityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cityPill: {
    backgroundColor: colors.dark.bg3,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  cityText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadows.glow(colors.teal),
  },
  shareBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
});
