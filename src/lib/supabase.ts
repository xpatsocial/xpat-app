import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://diiqponrvrcpwoerenwz.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaXFwb25ydnJjcHdvZXJlbnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODI4ODMsImV4cCI6MjA4ODU1ODg4M30.3rkaz6nZC_2_3UsHQNd07PnFoBkypBwstBeH7lr6wPQ';

// Secure storage adapter using Android Keystore / iOS Keychain
// instead of unencrypted AsyncStorage (OWASP M1/M9 fix).
// Falls back to AsyncStorage for values exceeding SecureStore's 2048-byte limit
// so we don't silently lose auth sessions on some platforms.
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;
      return await AsyncStorage.getItem(`__securestore_fallback_${key}`);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      try {
        await AsyncStorage.setItem(`__securestore_fallback_${key}`, value);
      } catch {
        // Last resort: session lost on restart
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore removal errors
    }
    try {
      await AsyncStorage.removeItem(`__securestore_fallback_${key}`);
    } catch {
      // Ignore fallback removal errors
    }
  },
};

// Custom fetch with 15s timeout — prevents infinite hangs on 3G connections
// common in digital nomad travel hubs. Only applies to non-realtime requests;
// Supabase Realtime uses its own WebSocket transport.
const fetchWithTimeout: typeof fetch = (input, init) => {
  // Preserve caller's signal if provided — don't override Supabase's own AbortController
  if (init?.signal) return fetch(input, init);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
