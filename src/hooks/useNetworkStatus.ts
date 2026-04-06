/**
 * useNetworkStatus — connectivity awareness for nomads
 *
 * Returns isOnline, isWifi, connectionType.
 * Used to show offline banner and pause background sync.
 */
import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

export interface NetworkStatus {
  isOnline: boolean;
  isWifi: boolean;
  connectionType: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isWifi: false,
    connectionType: null,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;
      const isWifi = state.type === 'wifi';

      setStatus({
        isOnline,
        isWifi,
        connectionType: state.type,
      });

      // Pause React Query background refetches when offline
      if (!isOnline) {
        queryClient.getQueryCache().getAll().forEach((query) => {
          // Mark all active queries as paused — they'll retry when back online
          query.setOptions({ ...query.options, networkMode: 'offlineFirst' });
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return status;
}
