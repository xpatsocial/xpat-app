import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import Avatar from '../components/Avatar';

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: Profile | null;
}

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<Set<string>>(new Set());

  const fetchBlocked = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, blocked_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (blocksError) {
      Alert.alert('Error', 'Failed to load blocked users.');
      setLoading(false);
      return;
    }

    if (!blocks || blocks.length === 0) {
      setBlocked([]);
      setLoading(false);
      return;
    }

    const ids = blocks.map((b) => b.blocked_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    setBlocked(
      blocks.map((b) => ({
        ...b,
        profile: profileMap.get(b.blocked_id) || null,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  async function handleUnblock(blockId: string, name: string) {
    Alert.alert('Unblock User', `Unblock ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setUnblocking((prev) => new Set(prev).add(blockId));
          const { error } = await supabase.from('blocks').delete().eq('id', blockId);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setBlocked((prev) => prev.filter((b) => b.id !== blockId));
          }
          setUnblocking((prev) => { const next = new Set(prev); next.delete(blockId); return next; });
        },
      },
    ]);
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="check-circle" size={40} color={colors.teal} />
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptySubtitle}>Users you block will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.profile?.display_name || 'Unknown User';
            return (
              <View style={styles.card}>
                <Avatar
                  uri={item.profile?.avatar_url}
                  name={name}
                  userId={item.blocked_id}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  {item.profile?.username && (
                    <Text style={styles.username}>@{item.profile.username}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.unblockBtn}
                  onPress={() => handleUnblock(item.id, name)}
                  disabled={unblocking.has(item.id)}
                  activeOpacity={0.7}
                >
                  {unblocking.has(item.id) ? (
                    <ActivityIndicator color={colors.dark.text2} size="small" />
                  ) : (
                    <Text style={styles.unblockText}>Unblock</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },
  list: { padding: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.text2 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.text },
  username: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text3 },
  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  unblockText: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: 100 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2 },
});
