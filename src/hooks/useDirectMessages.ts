import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { DirectMessage, DMConversation, Profile } from '../types';
import { useAuth } from './useAuth';
import { checkTextSafety } from '../lib/contentModeration';
import { getRateLimitError } from '../lib/rateLimiter';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Fetch all conversation threads
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get all DMs involving this user, ordered by newest first
    const { data: allMessages, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !allMessages) {
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<
      string,
      { lastMessage: DirectMessage; unreadCount: number }
    >();

    for (const msg of allMessages) {
      const partnerId =
        msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;

      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { lastMessage: msg, unreadCount: 0 });
      }

      // Count unread (messages sent TO me that I haven't read)
      if (msg.recipient_id === user.id && !msg.read_at) {
        const entry = convMap.get(partnerId)!;
        entry.unreadCount += 1;
      }
    }

    // Fetch profiles for all conversation partners
    const partnerIds = Array.from(convMap.keys());
    if (partnerIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username, current_city')
      .in('id', partnerIds);

    const profileMap = new Map<string, Profile>();
    for (const p of profiles || []) {
      profileMap.set(p.id, p as Profile);
    }

    const convList: DMConversation[] = [];
    for (const [partnerId, entry] of convMap.entries()) {
      const profile = profileMap.get(partnerId);
      if (profile) {
        convList.push({
          user_id: partnerId,
          profile,
          last_message: entry.lastMessage,
          unread_count: entry.unreadCount,
        });
      }
    }

    // Sort by last message time (newest first)
    convList.sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() -
        new Date(a.last_message.created_at).getTime(),
    );

    setConversations(convList);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to new DMs via Realtime
  useEffect(() => {
    if (!user) return;

    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
    }

    const sub = supabase
      .channel(`dm:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // Refresh conversations on new incoming message
          fetchConversations();
        },
      )
      .subscribe();

    realtimeRef.current = sub;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    refresh: fetchConversations,
  };
}

/**
 * Hook for a single DM conversation with a specific user.
 */
export function useConversation(partnerId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !partnerId) return;
    setLoading(true);

    const { data } = await supabase
      .from('direct_messages')
      .select('*, profiles:sender_id(id, display_name, avatar_url, username)')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`,
      )
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages(data || []);
    setLoading(false);

    // Mark messages as read
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', partnerId)
      .eq('recipient_id', user.id)
      .is('read_at', null);
  }, [user, partnerId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for this conversation
  useEffect(() => {
    if (!user || !partnerId) return;

    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
    }

    const sub = supabase
      .channel(`dm:${user.id}:${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${partnerId}`,
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage;
          // Only include if it's for this conversation
          if (newMsg.recipient_id !== user.id) return;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, username')
            .eq('id', newMsg.sender_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, profiles: (profile as Profile) || undefined }];
          });

          // Mark as read immediately since we're viewing the conversation
          await supabase
            .from('direct_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', newMsg.id);
        },
      )
      .subscribe();

    realtimeRef.current = sub;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [user, partnerId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !partnerId || !content.trim()) return;

      const rateLimitMsg = getRateLimitError('direct_message');
      if (rateLimitMsg) {
        Alert.alert('Slow down', rateLimitMsg);
        return;
      }

      // Check if users are connected before allowing message
      const { data: connected, error: rpcError } = await supabase.rpc('are_connected', {
        uid1: user.id,
        uid2: partnerId,
      });

      if (rpcError || !connected) {
        Alert.alert(
          'Cannot send message',
          'You need to connect with this person before sending a message.',
        );
        return;
      }

      const safety = await checkTextSafety(content.trim());
      if (!safety.safe) {
        Alert.alert('Message not sent', safety.reason ?? 'Content flagged by moderation.');
        return;
      }

      setSending(true);
      const tempId = `temp-${Date.now()}`;

      // Optimistic insert
      const optimistic: DirectMessage = {
        id: tempId,
        sender_id: user.id,
        recipient_id: partnerId,
        content: content.trim(),
        read_at: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: partnerId,
          content: content.trim(),
        })
        .select('*, profiles:sender_id(id, display_name, avatar_url, username)')
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        console.error('[DM] send error:', error.message);
      } else if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      }

      setSending(false);
    },
    [user, partnerId],
  );

  const markRead = useCallback(async () => {
    if (!user || !partnerId) return;
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', partnerId)
      .eq('recipient_id', user.id)
      .is('read_at', null);
  }, [user, partnerId]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markRead,
    refresh: fetchMessages,
  };
}
