import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { UserPreferences } from '../types';

const DEFAULTS: Omit<UserPreferences, 'user_id'> = {
  show_on_map: true,
  profile_visibility: 'public',
  notify_connections: true,
  notify_messages: true,
  notify_nearby: true,
  notify_events: true,
  notify_email: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  distance_unit: 'km',
  auto_join_city_chat: true,
  auto_load_images: true,
  preferred_language: 'en',
  location_precision: 'city',
};

const LOCAL_KEY = 'user_preferences_local';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Omit<UserPreferences, 'user_id'>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  // Load: try Supabase first, fallback to AsyncStorage
  useEffect(() => {
    async function load() {
      setLoading(true);

      // Try local cache first for instant display
      const cached = await AsyncStorage.getItem(LOCAL_KEY);
      if (cached) {
        try {
          setPreferences({ ...DEFAULTS, ...JSON.parse(cached) });
        } catch {}
      }

      // If signed in, sync from server
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          const { user_id, ...prefs } = data;
          setPreferences({ ...DEFAULTS, ...prefs });
          await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
        } else {
          // Create default row if missing
          await supabase.from('user_preferences').insert({ user_id: user.id });
        }
      }

      setLoading(false);
    }
    load();
  }, [user]);

  // Update a single preference
  const updatePreference = useCallback(
    async <K extends keyof Omit<UserPreferences, 'user_id'>>(
      key: K,
      value: Omit<UserPreferences, 'user_id'>[K],
    ) => {
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);

      // Save locally immediately
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(updated));

      // Sync to server if signed in
      if (user) {
        await supabase
          .from('user_preferences')
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    },
    [preferences, user],
  );

  // Batch update
  const updatePreferences = useCallback(
    async (updates: Partial<Omit<UserPreferences, 'user_id'>>) => {
      const updated = { ...preferences, ...updates };
      setPreferences(updated);
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(updated));

      if (user) {
        await supabase
          .from('user_preferences')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    },
    [preferences, user],
  );

  return { preferences, loading, updatePreference, updatePreferences };
}
