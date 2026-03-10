import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Profile, Connection } from '../../types';
import Skeleton from '../../components/Skeleton';
import { usePostHog } from '../../lib/posthog';

interface NearbyProfile extends Profile {
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  connectionId?: string;
}

interface ConnectionWithProfile extends Connection {
  profile: Profile;
}

export default function NearbyTab() {
  const { user, session, profile: myProfile } = useAuth();
  const navigation = useNavigation<any>();
  const posthog = usePostHog();

  const [nearbyProfiles, setNearbyProfiles] = useState<NearbyProfile[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<ConnectionWithProfile[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectingTo, setConnectingTo] = useState<Set<string>>(new Set());
  const [respondingTo, setRespondingTo] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);

    const allConnections: Connection[] = connections || [];
    const connectionByPeer = new Map<string, Connection>();
    const acceptedPeerIds: string[] = [];
    const pendingIncomingPeerIds: string[] = [];

    for (const c of allConnections) {
      const peerId = c.requester_id === user.id ? c.target_id : c.requester_id;
      connectionByPeer.set(peerId, c);
      if (c.status === 'accepted') acceptedPeerIds.push(peerId);
      else if (c.status === 'pending' && c.target_id === user.id) pendingIncomingPeerIds.push(peerId);
    }

    const peerIds = [...new Set([...acceptedPeerIds, ...pendingIncomingPeerIds])];
    let peerProfiles: Profile[] = [];
    if (peerIds.length > 0) {
      const { data } = await supabase.from('profiles').select('*').in('id', peerIds);
      peerProfiles = data || [];
    }

    const profileMap = new Map<string, Profile>();
    for (const p of peerProfiles) profileMap.set(p.id, p);

    const accepted: ConnectionWithProfile[] = acceptedPeerIds
      .map((id) => {
        const conn = connectionByPeer.get(id)!;
        const prof = profileMap.get(id);
        return prof ? { ...conn, profile: prof } : null;
      })
      .filter(Boolean) as ConnectionWithProfile[];

    const incoming: ConnectionWithProfile[] = pendingIncomingPeerIds
      .map((id) => {
        const conn = connectionByPeer.get(id)!;
        const prof = profileMap.get(id);
        return prof ? { ...conn, profile: prof } : null;
      })
      .filter(Boolean) as ConnectionWithProfile[];

    setAcceptedConnections(accepted);
    setPendingIncoming(incoming);

    if (myProfile?.current_city) {
      const { data: nearby } = await supabase
        .from('profiles')
        .select('*')
        .eq('current_city', myProfile.current_city)
        .neq('id', user.id)
        .limit(30);

      const nearbyWithStatus: NearbyProfile[] = (nearby || []).map((p: Profile) => {
        const conn = connectionByPeer.get(p.id);
        let connectionStatus: NearbyProfile['connectionStatus'] = 'none';
        if (conn) {
          if (conn.status === 'accepted') connectionStatus = 'accepted';
          else if (conn.status === 'pending' && conn.requester_id === user.id) connectionStatus = 'pending_sent';
          else if (conn.status === 'pending' && conn.target_id === user.id) connectionStatus = 'pending_received';
        }
        return { ...p, connectionStatus, connectionId: conn?.id };
      });
      setNearbyProfiles(nearbyWithStatus);
    } else {
      setNearbyProfiles([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user, myProfile?.current_city]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!session) {
    return (
      <View style={styles.authGate}>
        <View style={styles.iconCircle}>
          <Feather name="users" size={40} color={colors.teal} />
        </View>
        <Text style={styles.authTitle}>Connect with nomads</Text>
        <Text style={styles.authSubtitle}>Sign in to discover nearby nomads and build your network.</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate('Auth')} activeOpacity={0.8}>
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleConnect(targetId: string) {
    if (!user) return;
    setConnectingTo((prev) => new Set(prev).add(targetId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await supabase.from('connections').insert({
      requester_id: user.id, target_id: targetId, status: 'pending',
    });
    if (error) Alert.alert('Error', error.message);
    else {
      posthog.capture('connection_sent');
      setNearbyProfiles((prev) =>
        prev.map((p) => p.id === targetId ? { ...p, connectionStatus: 'pending_sent' as const } : p)
      );
    }
    setConnectingTo((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
  }

  async function handleRespond(connectionId: string, peerId: string, accept: boolean) {
    setRespondingTo((prev) => new Set(prev).add(connectionId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await supabase.from('connections').update({ status: accept ? 'accepted' : 'declined' }).eq('id', connectionId);
    if (error) Alert.alert('Error', error.message);
    else {
      posthog.capture(accept ? 'connection_accepted' : 'connection_declined');
      Haptics.notificationAsync(accept ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      fetchAll();
    }
    setRespondingTo((prev) => { const next = new Set(prev); next.delete(connectionId); return next; });
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
  }

  const hasContent = nearbyProfiles.length > 0 || acceptedConnections.length > 0 || pendingIncoming.length > 0;

  if (loading) {
    return (
      <View style={{ padding: spacing.lg }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1 }}><Skeleton width="60%" height={14} /><View style={{ height: spacing.xs }} /><Skeleton width="40%" height={10} /></View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!hasContent) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.iconCircle}><Feather name="globe" size={40} color={colors.teal} /></View>
            <Text style={styles.emptyTitle}>No nomads nearby yet</Text>
            <Text style={styles.emptySubtitle}>
              {myProfile?.current_city ? `No one else in ${myProfile.current_city} is on x/pat yet.` : 'Set your current city in your profile to discover nearby nomads.'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.teal} />}
        contentContainerStyle={{ flex: 1 }}
      />
    );
  }

  return (
    <FlatList
      data={[1] as const}
      keyExtractor={() => 'nearby'}
      renderItem={() => (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {pendingIncoming.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="bell" size={16} color={colors.teal} />
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{pendingIncoming.length}</Text></View>
              </View>
              {pendingIncoming.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.avatarSm}><Text style={styles.avatarSmText}>{getInitials(item.profile.display_name)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.profile.display_name || 'Anonymous'}</Text>
                      {item.profile.current_city && <Text style={styles.city}>{item.profile.current_city}</Text>}
                    </View>
                  </View>
                  <View style={styles.respondRow}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(item.id, item.requester_id, true)} disabled={respondingTo.has(item.id)} activeOpacity={0.7}>
                      {respondingTo.has(item.id) ? <ActivityIndicator color={colors.dark.bg} size="small" /> : <><Feather name="check" size={14} color={colors.dark.bg} /><Text style={styles.acceptText}>Accept</Text></>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => handleRespond(item.id, item.requester_id, false)} disabled={respondingTo.has(item.id)} activeOpacity={0.7}>
                      <Feather name="x" size={14} color={colors.dark.text2} /><Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {nearbyProfiles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="map-pin" size={16} color={colors.teal} />
                <Text style={styles.sectionTitle}>{myProfile?.current_city ? `Nomads in ${myProfile.current_city}` : 'Nearby Nomads'}</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{nearbyProfiles.length}</Text></View>
              </View>
              {nearbyProfiles.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(item.display_name)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.display_name || 'Anonymous'}</Text>
                      {item.current_city && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><Feather name="map-pin" size={10} color={colors.teal} /><Text style={styles.locText}>{item.current_city}{item.current_country ? `, ${item.current_country}` : ''}</Text></View>}
                    </View>
                  </View>
                  {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
                  {item.connectionStatus === 'none' && (
                    <TouchableOpacity style={styles.connectBtn} onPress={() => handleConnect(item.id)} disabled={connectingTo.has(item.id)} activeOpacity={0.7}>
                      {connectingTo.has(item.id) ? <ActivityIndicator color={colors.dark.bg} size="small" /> : <><Feather name="user-plus" size={14} color={colors.dark.bg} /><Text style={styles.connectText}>Connect</Text></>}
                    </TouchableOpacity>
                  )}
                  {item.connectionStatus === 'pending_sent' && <View style={styles.statusRow}><Feather name="clock" size={12} color={colors.amber} /><Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.amber }}>Request Sent</Text></View>}
                  {item.connectionStatus === 'accepted' && <View style={styles.statusRow}><Feather name="check-circle" size={12} color={colors.teal} /><Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.teal }}>Connected</Text></View>}
                </View>
              ))}
            </View>
          )}

          {acceptedConnections.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="users" size={16} color={colors.teal} />
                <Text style={styles.sectionTitle}>My Connections</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{acceptedConnections.length}</Text></View>
              </View>
              {acceptedConnections.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.avatarSm, { backgroundColor: colors.teal }]}><Text style={styles.avatarSmText}>{getInitials(item.profile.display_name)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.profile.display_name || 'Anonymous'}</Text>
                      {item.profile.current_city && <Text style={styles.city}>{item.profile.current_city}</Text>}
                    </View>
                    <Feather name="check-circle" size={12} color={colors.teal} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.teal} />}
      contentContainerStyle={{ paddingBottom: 120 }}
    />
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingTop: spacing.sm },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.dark.text, flex: 1 },
  countBadge: { backgroundColor: 'rgba(46,196,160,0.15)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  countText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.teal },
  card: { backgroundColor: colors.dark.bg2, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.dark.border },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.dark.bg },
  avatarSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.bg },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.text },
  city: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, marginTop: 1 },
  locText: { fontFamily: fonts.body, fontSize: 11, color: colors.teal },
  bio: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2, lineHeight: 18, marginTop: spacing.sm },
  connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: spacing.sm, marginTop: spacing.sm },
  connectText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.bg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingVertical: spacing.xs },
  respondRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: spacing.sm },
  acceptText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.dark.bg },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.dark.bg3, borderRadius: radius.md, paddingVertical: spacing.sm },
  declineText: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 100 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.dark.text, marginBottom: spacing.sm },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, textAlign: 'center', lineHeight: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(46,196,160,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(46,196,160,0.2)' },
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 100 },
  authTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.dark.text, marginBottom: spacing.sm },
  authSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  authBtn: { backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: spacing.sm + spacing.xs, paddingHorizontal: spacing.xl + spacing.lg },
  authBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.dark.bg },
  skeletonCard: { backgroundColor: colors.dark.bg2, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.dark.border },
});
