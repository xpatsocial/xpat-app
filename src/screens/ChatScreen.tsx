import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, SectionList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Connection } from '../types';
import BrandHeader from '../components/BrandHeader';
import Skeleton from '../components/Skeleton';
import { usePostHog } from '../lib/posthog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NearbyProfile extends Profile {
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  connectionId?: string;
}

interface ConnectionWithProfile extends Connection {
  profile: Profile;
}

// ---------------------------------------------------------------------------
// ChatScreen — "Community" / Nearby Nomads
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const { user, profile: myProfile } = useAuth();
  const posthog = usePostHog();

  const [nearbyProfiles, setNearbyProfiles] = useState<NearbyProfile[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<ConnectionWithProfile[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectingTo, setConnectingTo] = useState<Set<string>>(new Set());
  const [respondingTo, setRespondingTo] = useState<Set<string>>(new Set());

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchAll = useCallback(async () => {
    if (!user) return;

    // Fetch all connections involving the current user
    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);

    const allConnections: Connection[] = connections || [];

    // Build lookup maps
    const connectionByPeer = new Map<string, Connection>();
    const acceptedPeerIds: string[] = [];
    const pendingIncomingPeerIds: string[] = [];

    for (const c of allConnections) {
      const peerId = c.requester_id === user.id ? c.target_id : c.requester_id;
      connectionByPeer.set(peerId, c);

      if (c.status === 'accepted') {
        acceptedPeerIds.push(peerId);
      } else if (c.status === 'pending' && c.target_id === user.id) {
        pendingIncomingPeerIds.push(peerId);
      }
    }

    // Fetch profiles for accepted + pending incoming
    const peerIds = [...new Set([...acceptedPeerIds, ...pendingIncomingPeerIds])];
    let peerProfiles: Profile[] = [];
    if (peerIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', peerIds);
      peerProfiles = data || [];
    }

    const profileMap = new Map<string, Profile>();
    for (const p of peerProfiles) profileMap.set(p.id, p);

    // Build accepted connections list
    const accepted: ConnectionWithProfile[] = acceptedPeerIds
      .map((id) => {
        const conn = connectionByPeer.get(id)!;
        const prof = profileMap.get(id);
        return prof ? { ...conn, profile: prof } : null;
      })
      .filter(Boolean) as ConnectionWithProfile[];

    // Build pending incoming list
    const incoming: ConnectionWithProfile[] = pendingIncomingPeerIds
      .map((id) => {
        const conn = connectionByPeer.get(id)!;
        const prof = profileMap.get(id);
        return prof ? { ...conn, profile: prof } : null;
      })
      .filter(Boolean) as ConnectionWithProfile[];

    setAcceptedConnections(accepted);
    setPendingIncoming(incoming);

    // Fetch nearby profiles (same current_city)
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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  async function handleConnect(targetId: string) {
    if (!user) return;
    setConnectingTo((prev) => new Set(prev).add(targetId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase.from('connections').insert({
      requester_id: user.id,
      target_id: targetId,
      status: 'pending',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      posthog.capture('connection_sent');
      // Optimistic update
      setNearbyProfiles((prev) =>
        prev.map((p) =>
          p.id === targetId ? { ...p, connectionStatus: 'pending_sent' as const } : p
        )
      );
    }

    setConnectingTo((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
  }

  async function handleRespond(connectionId: string, peerId: string, accept: boolean) {
    setRespondingTo((prev) => new Set(prev).add(connectionId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase
      .from('connections')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', connectionId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      posthog.capture(accept ? 'connection_accepted' : 'connection_declined');
      Haptics.notificationAsync(
        accept
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      fetchAll();
    }

    setRespondingTo((prev) => {
      const next = new Set(prev);
      next.delete(connectionId);
      return next;
    });
  }

  function onRefresh() {
    setRefreshing(true);
    fetchAll();
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function getInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }

  function truncate(text: string | null, len: number): string {
    if (!text) return '';
    return text.length > len ? text.slice(0, len).trimEnd() + '...' : text;
  }

  // -----------------------------------------------------------------------
  // Render: Nearby user card
  // -----------------------------------------------------------------------

  function renderNearbyCard({ item }: { item: NearbyProfile }) {
    const isConnecting = connectingTo.has(item.id);
    const status = item.connectionStatus || 'none';

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.display_name)}</Text>
          </View>
          <View style={styles.userCardInfo}>
            <Text style={styles.displayName} numberOfLines={1}>
              {item.display_name || 'Anonymous'}
            </Text>
            {item.current_city && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={10} color={colors.teal} />
                <Text style={styles.locationText}>
                  {item.current_city}
                  {item.current_country ? `, ${item.current_country}` : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {item.bio ? (
          <Text style={styles.bioPreview} numberOfLines={2}>
            {truncate(item.bio, 100)}
          </Text>
        ) : null}

        {status === 'none' && (
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => handleConnect(item.id)}
            disabled={isConnecting}
            activeOpacity={0.7}
          >
            {isConnecting ? (
              <ActivityIndicator color={colors.dark.bg} size="small" />
            ) : (
              <>
                <Feather name="user-plus" size={14} color={colors.dark.bg} />
                <Text style={styles.connectBtnText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === 'pending_sent' && (
          <View style={styles.statusBadge}>
            <Feather name="clock" size={12} color={colors.amber} />
            <Text style={styles.statusBadgeText}>Request Sent</Text>
          </View>
        )}

        {status === 'pending_received' && (
          <View style={styles.statusBadge}>
            <Feather name="bell" size={12} color={colors.teal} />
            <Text style={[styles.statusBadgeText, { color: colors.teal }]}>Wants to connect</Text>
          </View>
        )}

        {status === 'accepted' && (
          <View style={styles.statusBadge}>
            <Feather name="check-circle" size={12} color={colors.green} />
            <Text style={[styles.statusBadgeText, { color: colors.green }]}>Connected</Text>
          </View>
        )}
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Pending request card
  // -----------------------------------------------------------------------

  function renderPendingCard({ item }: { item: ConnectionWithProfile }) {
    const isResponding = respondingTo.has(item.id);

    return (
      <View style={styles.connectionCard}>
        <View style={styles.connectionRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>{getInitials(item.profile.display_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.connectionName} numberOfLines={1}>
              {item.profile.display_name || 'Anonymous'}
            </Text>
            {item.profile.current_city && (
              <Text style={styles.connectionCity}>{item.profile.current_city}</Text>
            )}
          </View>
        </View>
        <View style={styles.respondRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleRespond(item.id, item.requester_id, true)}
            disabled={isResponding}
            activeOpacity={0.7}
          >
            {isResponding ? (
              <ActivityIndicator color={colors.dark.bg} size="small" />
            ) : (
              <>
                <Feather name="check" size={14} color={colors.dark.bg} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => handleRespond(item.id, item.requester_id, false)}
            disabled={isResponding}
            activeOpacity={0.7}
          >
            <Feather name="x" size={14} color={colors.dark.text2} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Accepted connection row
  // -----------------------------------------------------------------------

  function renderConnectionRow({ item }: { item: ConnectionWithProfile }) {
    return (
      <View style={styles.connectionCard}>
        <View style={styles.connectionRow}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.teal }]}>
            <Text style={styles.avatarSmallText}>{getInitials(item.profile.display_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.connectionName} numberOfLines={1}>
              {item.profile.display_name || 'Anonymous'}
            </Text>
            {item.profile.current_city && (
              <Text style={styles.connectionCity}>{item.profile.current_city}</Text>
            )}
          </View>
          <View style={styles.connectedBadge}>
            <Feather name="check-circle" size={12} color={colors.green} />
          </View>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  function renderSkeletons() {
    return (
      <View style={{ padding: spacing.lg }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1 }}>
                <Skeleton width="60%" height={14} />
                <View style={{ height: spacing.xs }} />
                <Skeleton width="40%" height={10} />
              </View>
            </View>
            <View style={{ height: spacing.sm }} />
            <Skeleton width="90%" height={12} />
            <View style={{ height: spacing.xs }} />
            <Skeleton width="50%" height={32} borderRadius={radius.md} />
          </View>
        ))}
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  function renderEmpty() {
    return (
      <View style={styles.emptyState}>
        <View style={styles.iconCircle}>
          <Feather name="globe" size={40} color={colors.teal} />
        </View>
        <Text style={styles.emptyTitle}>No nomads nearby yet</Text>
        <Text style={styles.emptySubtitle}>
          {myProfile?.current_city
            ? `No one else in ${myProfile.current_city} is on x/pat yet.`
            : 'Set your current city in your profile to discover nearby nomads.'}
        </Text>
        <Text style={styles.emptyHint}>Share x/pat with friends!</Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Section header
  // -----------------------------------------------------------------------

  function renderSectionHeader(title: string, icon: string, count: number) {
    return (
      <View style={styles.sectionHeader}>
        <Feather name={icon as any} size={16} color={colors.teal} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {count > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        )}
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const hasContent = nearbyProfiles.length > 0 || acceptedConnections.length > 0 || pendingIncoming.length > 0;

  return (
    <View style={styles.container}>
      <BrandHeader subtitle="Community" />

      {loading ? (
        renderSkeletons()
      ) : !hasContent ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={renderEmpty()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          contentContainerStyle={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={[1] as const}
          keyExtractor={() => 'community'}
          renderItem={() => (
            <View style={styles.content}>
              {/* Pending incoming requests */}
              {pendingIncoming.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader('Pending Requests', 'bell', pendingIncoming.length)}
                  {pendingIncoming.map((item) => (
                    <View key={item.id}>{renderPendingCard({ item })}</View>
                  ))}
                </View>
              )}

              {/* Nearby nomads */}
              {nearbyProfiles.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader(
                    myProfile?.current_city
                      ? `Nomads in ${myProfile.current_city}`
                      : 'Nearby Nomads',
                    'map-pin',
                    nearbyProfiles.length,
                  )}
                  {nearbyProfiles.map((item) => (
                    <View key={item.id}>{renderNearbyCard({ item })}</View>
                  ))}
                </View>
              )}

              {/* Accepted connections */}
              {acceptedConnections.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader('My Connections', 'users', acceptedConnections.length)}
                  {acceptedConnections.map((item) => (
                    <View key={item.id}>{renderConnectionRow({ item })}</View>
                  ))}
                </View>
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — Mercury dark aesthetic
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(46, 196, 160, 0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.teal,
  },

  // User card (nearby)
  userCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
  userCardInfo: {
    flex: 1,
  },
  displayName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.teal,
  },
  bioPreview: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  // Connect button
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  connectBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },

  // Status badge (on nearby cards)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.amber,
  },

  // Connection card (pending + accepted)
  connectionCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
  connectionName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  connectionCity: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    marginTop: 1,
  },
  connectedBadge: {
    padding: spacing.xs,
  },

  // Accept / Decline
  respondRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  acceptBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.bg,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dark.bg3,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  declineBtnText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 196, 160, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.2)',
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyHint: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.teal,
    marginTop: spacing.md,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
});
