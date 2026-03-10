import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Connection, ConnectionStatus, Profile } from '../types';
import { useAuth } from './useAuth';
import { getRateLimitError } from '../lib/rateLimiter';

export function useConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([]);
  const [pendingSent, setPendingSent] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [acceptedRes, incomingRes, outgoingRes] = await Promise.all([
      // Accepted connections
      supabase
        .from('connections')
        .select('*, profiles:target_id(id, display_name, avatar_url, username, current_city)')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`),
      // Incoming pending
      supabase
        .from('connections')
        .select('*, profiles:requester_id(id, display_name, avatar_url, username, current_city)')
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      // Outgoing pending
      supabase
        .from('connections')
        .select('*, profiles:target_id(id, display_name, avatar_url, username, current_city)')
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    // For accepted connections, re-fetch with the OTHER user's profile
    if (acceptedRes.data) {
      const enriched = await Promise.all(
        acceptedRes.data.map(async (c: Connection) => {
          const otherId = c.requester_id === user.id ? c.target_id : c.requester_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, username, current_city')
            .eq('id', otherId)
            .single();
          return { ...c, profiles: (profile as Profile) || undefined };
        }),
      );
      setConnections(enriched);
    }

    if (incomingRes.data) setPendingReceived(incomingRes.data);
    if (outgoingRes.data) setPendingSent(outgoingRes.data);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sendRequest = useCallback(
    async (targetId: string, message?: string) => {
      if (!user) return { error: { message: 'Not authenticated' } };

      const rateLimitMsg = getRateLimitError('connection_request');
      if (rateLimitMsg) {
        Alert.alert('Slow down', rateLimitMsg);
        return { error: { message: rateLimitMsg } };
      }

      const { data, error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          target_id: targetId,
          message: message || null,
        })
        .select('*, profiles:target_id(id, display_name, avatar_url, username, current_city)')
        .single();

      if (!error && data) {
        setPendingSent((prev) => [data, ...prev]);
      }
      return { data, error };
    },
    [user],
  );

  const acceptRequest = useCallback(
    async (connectionId: string) => {
      const { data, error } = await supabase
        .from('connections')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', connectionId)
        .select()
        .single();

      if (!error) {
        await fetchAll(); // Refresh all lists
      }
      return { data, error };
    },
    [fetchAll],
  );

  const declineRequest = useCallback(
    async (connectionId: string) => {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (!error) {
        setPendingReceived((prev) => prev.filter((c) => c.id !== connectionId));
      }
      return { error };
    },
    [],
  );

  const isConnected = useCallback(
    (targetId: string): boolean => {
      return connections.some(
        (c) => c.requester_id === targetId || c.target_id === targetId,
      );
    },
    [connections],
  );

  const connectionStatus = useCallback(
    (targetId: string): ConnectionStatus => {
      if (!user) return 'none';

      // Check accepted
      const accepted = connections.find(
        (c) => c.requester_id === targetId || c.target_id === targetId,
      );
      if (accepted) return 'connected';

      // Check pending sent
      const sent = pendingSent.find((c) => c.target_id === targetId);
      if (sent) return 'pending_sent';

      // Check pending received
      const received = pendingReceived.find((c) => c.requester_id === targetId);
      if (received) return 'pending_received';

      return 'none';
    },
    [user, connections, pendingSent, pendingReceived],
  );

  const getConnectionWith = useCallback(
    (targetId: string): Connection | undefined => {
      return (
        connections.find(
          (c) => c.requester_id === targetId || c.target_id === targetId,
        ) ||
        pendingSent.find((c) => c.target_id === targetId) ||
        pendingReceived.find((c) => c.requester_id === targetId)
      );
    },
    [connections, pendingSent, pendingReceived],
  );

  return {
    connections,
    pendingReceived,
    pendingSent,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    isConnected,
    connectionStatus,
    getConnectionWith,
    refresh: fetchAll,
  };
}
