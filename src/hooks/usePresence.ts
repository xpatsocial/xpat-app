import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { PresenceDisplay } from '../types';

const HEARTBEAT_INTERVAL = 120_000; // 120 seconds — battery-friendly for dual-phone nomads
const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const RECENTLY_ACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Manages the current user's online presence with heartbeat.
 * Call this once at the app root level.
 */
export function usePresenceHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePresence = useCallback(
    async (status: 'online' | 'away' | 'offline') => {
      if (!user) return;

      await supabase.from('user_presence').upsert(
        {
          user_id: user.id,
          last_seen: new Date().toISOString(),
          status,
        },
        { onConflict: 'user_id' },
      );
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;

    // Set online immediately
    updatePresence('online');

    // Heartbeat every 30 seconds
    intervalRef.current = setInterval(() => {
      updatePresence('online');
    }, HEARTBEAT_INTERVAL);

    // Listen for app state changes
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        updatePresence('online');
        // Restart heartbeat
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          updatePresence('online');
        }, HEARTBEAT_INTERVAL);
      } else {
        // App going to background
        updatePresence('away');
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      updatePresence('offline');
      subscription.remove();
    };
  }, [user, updatePresence]);
}

/**
 * Get presence display info for a specific user.
 */
export function getPresenceDisplay(
  lastSeen: string | null,
  status?: string,
): PresenceDisplay {
  if (!lastSeen) {
    return { status: 'offline', label: null };
  }

  const now = Date.now();
  const seenAt = new Date(lastSeen).getTime();
  const diff = now - seenAt;

  if (status === 'online' || diff < ONLINE_THRESHOLD) {
    return { status: 'online', label: null };
  }

  if (diff < RECENTLY_ACTIVE_THRESHOLD) {
    // Format relative time
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) {
      return { status: 'recently_active', label: `${minutes}m ago` };
    }
    const hours = Math.floor(minutes / 60);
    return { status: 'recently_active', label: `${hours}h ago` };
  }

  return { status: 'offline', label: null };
}

/**
 * Hook to fetch presence for a single user.
 */
export function useUserPresence(userId: string | undefined) {
  const fetchPresence = useCallback(async (): Promise<PresenceDisplay> => {
    if (!userId) return { status: 'offline', label: null };

    const { data } = await supabase
      .from('user_presence')
      .select('last_seen, status')
      .eq('user_id', userId)
      .single();

    if (!data) return { status: 'offline', label: null };
    return getPresenceDisplay(data.last_seen, data.status);
  }, [userId]);

  return { fetchPresence };
}
