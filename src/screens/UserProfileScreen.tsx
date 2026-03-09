import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Profile, Spot, Post, Connection } from '../types';

type UserProfileParams = {
  UserProfile: { userId: string };
};

type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export default function UserProfileScreen() {
  const route = useRoute<RouteProp<UserProfileParams, 'UserProfile'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { userId } = route.params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [mutualCount, setMutualCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!userId || !user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profileData) setProfile(profileData);

    // Fetch their public spots
    const { data: spotsData } = await supabase
      .from('spots')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (spotsData) setSpots(spotsData);

    // Fetch their recent posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(display_name, avatar_url), spots(name, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (postsData) setPosts(postsData);

    // Check connection status
    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${user.id},target_id.eq.${userId}),and(requester_id.eq.${userId},target_id.eq.${user.id})`
      );

    if (connections && connections.length > 0) {
      const conn = connections[0] as Connection;
      setConnectionId(conn.id);
      if (conn.status === 'accepted') {
        setConnectionStatus('accepted');
      } else if (conn.status === 'pending') {
        setConnectionStatus(
          conn.requester_id === user.id ? 'pending_sent' : 'pending_received'
        );
      }
    } else {
      setConnectionStatus('none');
      setConnectionId(null);
    }

    // Count mutual connections
    // My accepted connections
    const { data: myConns } = await supabase
      .from('connections')
      .select('requester_id, target_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);

    // Their accepted connections
    const { data: theirConns } = await supabase
      .from('connections')
      .select('requester_id, target_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`);

    if (myConns && theirConns) {
      const myFriends = new Set(
        myConns.map((c) =>
          c.requester_id === user.id ? c.target_id : c.requester_id
        )
      );
      const theirFriends = new Set(
        theirConns.map((c) =>
          c.requester_id === userId ? c.target_id : c.requester_id
        )
      );
      let mutual = 0;
      myFriends.forEach((id) => {
        if (theirFriends.has(id)) mutual++;
      });
      setMutualCount(mutual);
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleConnect() {
    if (!user || connecting) return;
    setConnecting(true);

    if (connectionStatus === 'none') {
      const { error } = await supabase.from('connections').insert({
        requester_id: user.id,
        target_id: userId,
        status: 'pending',
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setConnectionStatus('pending_sent');
      }
    } else if (connectionStatus === 'pending_received' && connectionId) {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setConnectionStatus('accepted');
      }
    }

    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!connectionId) return;
    Alert.alert(
      'Remove Connection',
      `Disconnect from ${profile?.display_name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('connections').delete().eq('id', connectionId);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setConnectionStatus('none');
            setConnectionId(null);
          },
        },
      ]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    fetchAll();
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={22} color={colors.dark.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Feather name="user-x" size={32} color={colors.dark.text2} />
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </View>
    );
  }

  const initials = (profile.display_name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const countries = new Set(spots.map((s) => s.country)).size;
  const cities = new Set(spots.map((s) => s.city)).size;

  function renderConnectionButton() {
    switch (connectionStatus) {
      case 'none':
        return (
          <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} disabled={connecting}>
            {connecting ? (
              <ActivityIndicator size="small" color={colors.dark.bg} />
            ) : (
              <>
                <Feather name="user-plus" size={14} color={colors.dark.bg} />
                <Text style={styles.connectBtnText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        );
      case 'pending_sent':
        return (
          <View style={styles.pendingBtn}>
            <Feather name="clock" size={14} color={colors.amber} />
            <Text style={styles.pendingBtnText}>Pending</Text>
          </View>
        );
      case 'pending_received':
        return (
          <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} disabled={connecting}>
            {connecting ? (
              <ActivityIndicator size="small" color={colors.dark.bg} />
            ) : (
              <>
                <Feather name="check" size={14} color={colors.dark.bg} />
                <Text style={styles.connectBtnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        );
      case 'accepted':
        return (
          <TouchableOpacity style={styles.connectedBtn} onPress={handleDisconnect}>
            <Feather name="check-circle" size={14} color={colors.teal} />
            <Text style={styles.connectedBtnText}>Connected</Text>
          </TouchableOpacity>
        );
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header bar with back button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
        }
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          <Text style={styles.name}>{profile.display_name || 'Anonymous'}</Text>

          {profile.current_city && (
            <View style={styles.cityRow}>
              <Feather name="map-pin" size={12} color={colors.amber} />
              <Text style={styles.city}>{profile.current_city}</Text>
            </View>
          )}

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Connection button + mutual connections */}
        <View style={styles.actionRow}>
          {renderConnectionButton()}
        </View>

        {mutualCount > 0 && (
          <View style={styles.mutualRow}>
            <Feather name="users" size={12} color={colors.dark.text2} />
            <Text style={styles.mutualText}>
              {mutualCount} mutual connection{mutualCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{spots.length}</Text>
            <Text style={styles.statLabel}>Spots</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={[styles.statValue, { color: colors.amber }]}>{countries}</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cities}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
        </View>

        {/* Their Spots */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spots</Text>
          <Text style={styles.sectionCount}>{spots.length}</Text>
        </View>

        {spots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="map-pin" size={24} color={colors.dark.text2} />
            <Text style={styles.emptyText}>No spots shared yet</Text>
          </View>
        ) : (
          spots.map((spot) => (
            <View key={spot.id} style={styles.spotRow}>
              <View
                style={[
                  styles.spotDot,
                  {
                    backgroundColor:
                      spot.category === 'cafe' || spot.category === 'experience'
                        ? colors.amber
                        : colors.teal,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.spotName}>{spot.name}</Text>
                <Text style={styles.spotCity}>
                  {spot.city}, {spot.country}
                </Text>
              </View>
              <Text style={styles.spotCat}>{spot.category}</Text>
            </View>
          ))
        )}

        {/* Their Posts */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Recent Posts</Text>
          <Text style={styles.sectionCount}>{posts.length}</Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="message-circle" size={24} color={colors.dark.text2} />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Text style={styles.postContent}>{post.content}</Text>
              </View>
              <View style={styles.postFooter}>
                {post.spots && (
                  <View style={styles.postSpotTag}>
                    <Feather name="map-pin" size={10} color={colors.teal} />
                    <Text style={styles.postSpotName}>
                      {post.spots.name}, {post.spots.city}
                    </Text>
                  </View>
                )}
                <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.teal,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.teal,
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.dark.bg,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  city: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.amber,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    maxWidth: 280,
  },
  // Action row
  actionRow: {
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  connectBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
  pendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  pendingBtnText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.amber,
  },
  connectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  connectedBtnText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.teal,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  mutualText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.dark.border,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.teal,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },
  sectionCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  emptyCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
  // Spots
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs,
    width: '100%',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  spotDot: { width: 8, height: 8, borderRadius: 4 },
  spotName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  spotCity: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    marginTop: 1,
  },
  spotCat: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
  },
  // Posts
  postCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs,
    width: '100%',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  postHeader: {
    marginBottom: spacing.xs,
  },
  postContent: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    lineHeight: 20,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  postSpotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postSpotName: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.teal,
  },
  postTime: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
  },
});
