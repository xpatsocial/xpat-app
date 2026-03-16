import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/Avatar';

interface NomadProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_city: string | null;
  current_country: string | null;
  interests: string[];
}

export default function NomadDiscoveryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NomadProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const term = q.trim();
    // Use textSearch or fetch all and filter client-side to avoid PostgREST
    // .or() parsing issues with commas/special chars in search values.
    // Fetching a bounded set and filtering client-side is safest.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, bio, current_city, current_country, interests')
      .neq('id', user?.id ?? '')
      .limit(100);

    if (error) {
      console.error('[NomadDiscovery] search error:', error);
    }

    const lowerTerm = term.toLowerCase();
    const filtered = (data ?? []).filter((p: any) =>
      p.display_name?.toLowerCase().includes(lowerTerm) ||
      p.username?.toLowerCase().includes(lowerTerm) ||
      p.current_city?.toLowerCase().includes(lowerTerm)
    );

    if (!error) {
      setResults(filtered as NomadProfile[]);
    }
    setLoading(false);
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 400);
    return () => clearTimeout(timer);
  }, [query, search]);

  function renderNomad({ item }: { item: NomadProfile }) {
    const location = [item.current_city, item.current_country].filter(Boolean).join(', ');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      >
        <Avatar
          uri={item.avatar_url}
          name={item.display_name}
          userId={item.id}
          size={48}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.display_name}</Text>
          {item.username && (
            <Text style={styles.cardUsername}>@{item.username}</Text>
          )}
          {location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color={colors.amber} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          ) : null}
          {item.bio ? (
            <Text style={styles.cardBio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color={colors.dark.text3} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Find People</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.dark.text3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, username, or city..."
            placeholderTextColor={colors.dark.text3}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => { setQuery(''); Keyboard.dismiss(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x-circle" size={16} color={colors.dark.text3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Feather name="users" size={48} color={colors.dark.text3} />
          <Text style={styles.hintTitle}>Discover Nomads</Text>
          <Text style={styles.hintText}>Search for people by name, username, or city</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Feather name="user-x" size={40} color={colors.dark.text3} />
          <Text style={styles.hintTitle}>No results</Text>
          <Text style={styles.hintText}>Try a different name or city</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderNomad}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 22,
    color: colors.dark.text,
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.text,
  },
  cardUsername: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },
  cardBio: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  hintTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
  },
});
