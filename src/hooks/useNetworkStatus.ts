/**
 * useNetworkStatus — connectivity awareness for nomads
 *
 * Returns isOnline, isWifi, connectionType.
 * Used to show offline banner and pause background sync.
 */
import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;
      const isWifi = state.type === 'wifi';

      setStatus({
        isOnline,
        isWifi,
        connectionType: state.type,
      });
      // networkMode: 'offlineFirst' is set globally in queryClient.ts —
      // React Query handles pause/resume automatically, no per-query patching needed
    });

    return unsubscribe;
  }, []);

  return status;
}
