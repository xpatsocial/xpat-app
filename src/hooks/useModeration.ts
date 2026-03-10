import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { ReportCategory } from '../types';

export function useModeration() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  // Load blocked users on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .then(({ data }) => {
        if (data) setBlockedIds(new Set(data.map((b) => b.blocked_id)));
      });
  }, [user]);

  const isBlocked = useCallback(
    (userId: string) => blockedIds.has(userId),
    [blockedIds],
  );

  const blockUser = useCallback(
    async (targetId: string, targetName?: string) => {
      if (!user) return;

      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'Block User',
          `Block ${targetName || 'this user'}? They won't be able to see your profile or send you messages.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('blocks')
                  .insert({ blocker_id: user.id, blocked_id: targetId });

                if (error) {
                  Alert.alert('Error', error.message);
                  resolve(false);
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setBlockedIds((prev) => new Set(prev).add(targetId));
                  resolve(true);
                }
              },
            },
          ],
        );
      });
    },
    [user],
  );

  const unblockUser = useCallback(
    async (targetId: string) => {
      if (!user) return false;

      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetId);

      if (error) {
        Alert.alert('Error', error.message);
        return false;
      }

      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      return true;
    },
    [user],
  );

  const reportContent = useCallback(
    async (opts: {
      contentType: 'profile' | 'message' | 'post' | 'spot' | 'event';
      contentId?: string;
      reportedUserId?: string;
      category: ReportCategory;
      description?: string;
    }) => {
      if (!user) return false;

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: opts.reportedUserId || null,
        target_type: opts.contentType,
        target_id: opts.contentId ? Number(opts.contentId) : null,
        reason: opts.category,
        description: opts.description || null,
        status: 'pending',
      });

      if (error) {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
        return false;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Report Submitted', 'Thank you. Our team will review this within 24 hours.');
      return true;
    },
    [user],
  );

  return { blockedIds, isBlocked, blockUser, unblockUser, reportContent };
}

/**
 * Lightweight hook that returns only the Set of blocked user IDs.
 * Use this in feeds, nearby, and chat to filter out blocked users
 * without pulling in the full moderation API.
 */
export function useBlockedUsers(): Set<string> {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .then(({ data }) => {
        if (data) setBlockedIds(new Set(data.map((b) => b.blocked_id)));
      });
  }, [user]);

  return blockedIds;
}
