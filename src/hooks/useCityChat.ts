import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatChannel } from '../types';
import { useAuth } from './useAuth';
import { captureException } from '../lib/sentry';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseCityChatOptions {
  city: string;
  country: string;
}

export function useCityChat({ city, country }: UseCityChatOptions) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Join city channel + fetch messages
  const joinAndFetch = useCallback(async () => {
    if (!user || !city || !country) return;

    setLoading(true);

    // Call the server function to get or create + join the city channel
    const { data: channelId, error: joinError } = await supabase
      .rpc('join_city_channel', { p_city: city, p_country: country });

    if (joinError || !channelId) {
      captureException(joinError, { context: 'CityChat join', city, country });
      setLoading(false);
      return;
    }

    // Fetch channel details
    const { data: channelData } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelData) setChannel(channelData);

    // Fetch recent messages with profile info
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*, profiles:sender_id(id, display_name, avatar_url, username)')
      .eq('channel_id', channelId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    setMessages((msgs || []).reverse());
    setLoading(false);

    // Update last_read_at
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    // Subscribe to new messages via Realtime
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
    }

    const sub = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single();

          setMessages((prev) => {
            // Deduplicate (optimistic insert may already be there)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, profiles: profile || undefined }];
          });
        },
      )
      .subscribe();

    realtimeRef.current = sub;
  }, [user, city, country]);

  useEffect(() => {
    joinAndFetch();
    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [joinAndFetch]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !channel || !content.trim()) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;

    // Optimistic insert
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channel_id: channel.id,
      sender_id: user.id,
      content: content.trim(),
      reply_to: null,
      edited: false,
      deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: channel.id,
        sender_id: user.id,
        content: content.trim(),
      })
      .select('*, profiles:sender_id(id, display_name, avatar_url, username)')
      .single();

    if (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      captureException(error, { context: 'CityChat send', channelId: channel?.id });
    } else if (data) {
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
    }

    setSending(false);
  }, [user, channel]);

  return { channel, messages, loading, sending, sendMessage, refresh: joinAndFetch };
}
