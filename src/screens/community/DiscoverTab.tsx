import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, shadows } from '../../theme';
import SwipeCardDeck, { SwipeCardDeckRef, SwipeDirection } from '../../components/SwipeCardDeck';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useConnections } from '../../hooks/useConnections';
import { Profile } from '../../types';

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
  };
}

function NomadCard({ nomad }: { nomad: NomadProfile }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.avatarArea}>
        <View style={cardStyles.placeholder}><Text style={cardStyles.initial}>{nomad.display_name.charAt(0).toUpperCase()}</Text></View>
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{nomad.display_name}</Text>
        {nomad.username && <Text style={cardStyles.username}>@{nomad.username}</Text>}
        <View style={cardStyles.locRow}><Feather name="map-pin" size={12} color={colors.amber} /><Text style={cardStyles.loc}>{nomad.current_city}{nomad.current_country ? `, ${nomad.current_country}` : ''}</Text></View>
        {nomad.bio && <Text style={cardStyles.bio} numberOfLines={2}>{nomad.bio}</Text>}
        <View style={cardStyles.pills}>
          {nomad.interests.slice(0, 3).map((i) => <View key={i} style={cardStyles.pill}><Text style={cardStyles.pillText}>{i}</Text></View>)}
        </View>
      </View>
    </View>
  );
}

function OverlayBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[overlayBadge, { borderColor: color }]}>
      <Feather name={icon as any} size={28} color={color} />
      <Text style={[overlayLabel, { color }]}>{label}</Text>
    </View>
  );
}

const overlayBadge: any = { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 3, gap: spacing.xs };
const overlayLabel: any = { fontFamily: fonts.bodyBold, fontSize: 20, letterSpacing: 3 };

export default function DiscoverTab() {
  const deckRef = useRef<SwipeCardDeckRef>(null);
  const [nomads, setNomads] = useState<NomadProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { sendRequest } = useConnections();

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, current_city, current_country, skills, open_to, travel_style')
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
        <TouchableOpacity style={[styles.btn, { borderColor: colors.red }]} onPress={() => deckRef.current?.swipeLeft()} activeOpacity={0.7}><Feather name="x" size={24} color={colors.red} /></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSm, { borderColor: colors.amber }]} onPress={() => deckRef.current?.swipeUp()} activeOpacity={0.7}><Feather name="star" size={20} color={colors.amber} /></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.teal }]} onPress={() => deckRef.current?.swipeRight()} activeOpacity={0.7}><Feather name="user-plus" size={24} color={colors.teal} /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.dark.bg },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.dark.text3 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg },
  btn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: colors.dark.bg2, ...shadows.sm },
  btnSm: { width: 46, height: 46, borderRadius: 23 },
});

const cardStyles = StyleSheet.create({
  card: { flex: 1 },
  avatarArea: { flex: 1, backgroundColor: colors.dark.bg3, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.dark.bg4, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.heading, fontSize: 38, color: colors.teal },
  info: { padding: spacing.md, gap: spacing.xs },
  name: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },
  username: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text3 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  loc: { fontFamily: fonts.body, fontSize: 12, color: colors.amber },
  bio: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2, lineHeight: 18, marginTop: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  pill: { backgroundColor: 'rgba(46,196,160,0.1)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46,196,160,0.2)' },
  pillText: { fontFamily: fonts.body, fontSize: 10, color: colors.teal },
});
