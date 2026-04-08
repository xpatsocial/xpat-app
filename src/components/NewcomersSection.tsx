/**
 * NewcomersSection — "Nomads who arrived this week"
 *
 * Implements x/pat's equivalent of Airbnb's "Belong Anywhere":
 * "Every City Feels Like Home" — newcomers see their cohort.
 *
 * Shows users who arrived in the same city within the last 7 days,
 * creating instant community for people who just landed.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import Avatar from './Avatar';
import TrustBadge from './TrustBadge';

interface NewcomersSectionProps {
  city: string;
  country: string;
  onPressUser: (userId: string, displayName: string | null) => void;
}

interface Newcomer {
  user_id: string;
  arrived_at: string;
  profiles: Profile;
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default function NewcomersSection({ city, country, onPressUser }: NewcomersSectionProps) {
  const { user } = useAuth();
  const [newcomers, setNewcomers] = useState<Newcomer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNewcomers = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('city_presence')
      .select('user_id, arrived_at, profiles(*)')
      .eq('city', city)
      .eq('country', country)
      .gte('arrived_at', sevenDaysAgo)
      .order('arrived_at', { ascending: false })
      .limit(20);

    if (data) {
      // Exclude self
      const filtered = (data as unknown as Newcomer[]).filter(
        (n) => n.user_id !== user?.id
      );
      setNewcomers(filtered);
    }
    setLoading(false);
  }, [city, country, user]);

  useEffect(() => {
    fetchNewcomers();
  }, [fetchNewcomers]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.teal} />
      </View>
    );
  }

  if (newcomers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="users" size={14} color={colors.teal} />
          <Text style={styles.title}>Nomads who arrived this week</Text>
        </View>
        <Text style={styles.count}>{newcomers.length}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {newcomers.map((newcomer) => {
          const profile = newcomer.profiles;
          return (
            <TouchableOpacity
              key={newcomer.user_id}
              style={styles.card}
              onPress={() => onPressUser(newcomer.user_id, profile?.display_name)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${profile?.display_name || 'Nomad'}, arrived ${daysAgo(newcomer.arrived_at)}`}
            >
              <Avatar
                uri={profile?.avatar_url}
                name={profile?.display_name}
                userId={newcomer.user_id}
                size={44}
                verified={profile?.is_identity_verified}
              />
              <Text style={styles.name} numberOfLines={1}>
                {profile?.display_name || 'Nomad'}
              </Text>
              <Text style={styles.arrived}>Arrived {daysAgo(newcomer.arrived_at)}</Text>
              {(profile?.trust_score ?? 0) > 0 && (
                <TrustBadge trustScore={profile?.trust_score ?? 0} compact />
              )}
              {profile?.tagline && (
                <Text style={styles.tagline} numberOfLines={1}>{profile.tagline}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.dark.text,
  },
  count: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    width: 110,
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 4,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
    textAlign: 'center',
    marginTop: 4,
  },
  arrived: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text3,
    textAlign: 'center',
  },
});
