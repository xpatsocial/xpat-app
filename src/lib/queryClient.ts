/**
 * React Query client with MMKV offline persistence
 *
 * Strategy:
 * - MMKV storage: synchronous, 10x faster than AsyncStorage, ~0ms read
 * - 5-min stale time: data stays fresh for UX, refetches in background
 * - 7-day gc time: cached data survives app restarts for offline browsing
 * - Persisted to disk: all 431 spots + feed browsable without connectivity
 */
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — refetch in background, no loading flicker
      gcTime: 24 * 60 * 60 * 1000, // 24h — reduced from 7d to prevent OOM on 2GB devices
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,     // Prevent thundering herd on app foreground
      refetchOnReconnect: 'always',    // Smart refetch on network restore instead
      networkMode: 'offlineFirst',     // Use cache immediately, refetch in background
    },
  },
});

// MMKV instance for query cache persistence
export const mmkv = new MMKV({ id: 'xpat-query-cache' });

/**
 * MMKV storage adapter implementing the persister storage interface.
 * Synchronous read/write — eliminates AsyncStorage's async overhead on cold start.
 */
export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    mmkv.set(key, value);
    return Promise.resolve();
  },
  getItem: (key: string) => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: (key: string) => {
    mmkv.delete(key);
    return Promise.resolve();
  },
};

/**
 * Persister: saves the entire query cache to MMKV on every mutation.
 * Falls back to AsyncStorage if MMKV is unavailable (Expo Go without dev client).
 */
export function createPersister() {
  let storage = mmkvStorage;

  // Graceful fallback: Expo Go doesn't support MMKV native module
  try {
    mmkv.set('__health_check__', '1');
    mmkv.delete('__health_check__');
  } catch {
    storage = {
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      getItem: (key) => AsyncStorage.getItem(key),
      removeItem: (key) => AsyncStorage.removeItem(key),
    };
  }

  return createAsyncStoragePersister({
    storage,
    throttleTime: 1000, // debounce writes to 1s to avoid thrashing
    key: 'XPAT_QUERY_CACHE_V1',
  });
  // Note: persister maxAge is enforced via PersistQueryClientProvider's maxAge prop
  // and/or queryClient's gcTime (24h) — prevents unbounded MMKV growth
}
