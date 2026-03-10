import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { CityPresence, PresenceStatus } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Active = last_active within 15 minutes */
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
/** "Just arrived" = arrived_at within 48 hours */
const JUST_ARRIVED_MS = 48 * 60 * 60 * 1000;

export function useCityPresence(city: string | null, country: string | null) {
  const { user } = useAuth();
  const [nomadsInCity, setNomadsInCity] = useState(0);
  const [nearbyNomads, setNearbyNomads] = useState<CityPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /** Compute whether a presence record is "just arrived" */
  const isJustArrived = useCallback((arrivedAt: string): boolean => {
    return Date.now() - new Date(arrivedAt).getTime() < JUST_ARRIVED_MS;
  }, []);

  /** Fetch active nomads in the given city */
  const fetchPresence = useCallback(async () => {
    if (!city) {
      setNomadsInCity(0);
      setNearbyNomads([]);
      setLoading(false);
      return;
    }

    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

    const { data, error } = await supabase
      .from('city_presence')
      .select('*, profiles:user_id(id, display_name, avatar_url, username, bio)')
      .eq('city', city)
      .gte('last_active', cutoff)
      .order('last_active', { ascending: false })
      .limit(100);

    if (!error && data) {
      setNearbyNomads(data as CityPresence[]);
      setNomadsInCity(data.length);
    }
    setLoading(false);
  }, [city]);

  /** Upsert the current user's presence */
  const updatePresence = useCallback(
    async (
      presenceCity: string,
      presenceCountry: string,
      status: PresenceStatus = 'here',
    ) => {
      if (!user) return;

      await supabase.from('city_presence').upsert(
        {
          user_id: user.id,
          city: presenceCity,
          country: presenceCountry,
          status,
          last_active: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    },
    [user],
  );

  /** Heartbeat: refresh last_active when app comes to foreground */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        city &&
        country
      ) {
        updatePresence(city, country);
        fetchPresence();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [city, country, updatePresence, fetchPresence]);

  /** Initial presence update + fetch on city change */
  useEffect(() => {
    if (city && country && user) {
      updatePresence(city, country);
    }
    fetchPresence();
  }, [city, country, user, updatePresence, fetchPresence]);

  /** Realtime subscription for presence changes in current city */
  useEffect(() => {
    if (!city) return;

    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
    }

    const sub = supabase
      .channel(`presence:${city}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'city_presence',
          filter: `city=eq.${city}`,
        },
        () => {
          // Re-fetch on any change (insert, update, delete)
          fetchPresence();
        },
      )
      .subscribe();

    realtimeRef.current = sub;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [city, fetchPresence]);

  return {
    nomadsInCity,
    nearbyNomads,
    loading,
    updatePresence,
    isJustArrived,
    refresh: fetchPresence,
  };
}
