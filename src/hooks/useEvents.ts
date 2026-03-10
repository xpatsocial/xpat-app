import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { AppEvent, EventRsvp, Profile, EventCategory } from '../types';

export interface CreateEventInput {
  title: string;
  description?: string;
  spot_id?: string;
  city: string;
  country: string;
  venue_name?: string;
  venue_address?: string;
  lat?: number;
  lng?: number;
  starts_at: string; // ISO string
  ends_at?: string;
  max_attendees?: number;
  category?: EventCategory;
}

export function useEvents() {
  const { user } = useAuth();

  // -----------------------------------------------------------------------
  // City events — sorted by starts_at ascending (upcoming first)
  // -----------------------------------------------------------------------
  const cityEvents = useCallback(async (city: string): Promise<AppEvent[]> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:creator_id ( id, display_name, avatar_url, username ),
        event_rsvps ( id, user_id, status, created_at, profiles:user_id ( id, display_name, avatar_url, username ) )
      `)
      .eq('city', city)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true });

    if (error) {
      console.error('[useEvents] cityEvents error:', error.message);
      return [];
    }
    return (data ?? []) as unknown as AppEvent[];
  }, []);

  // -----------------------------------------------------------------------
  // All upcoming events (no city filter) — for explore / global feed
  // -----------------------------------------------------------------------
  const upcomingEvents = useCallback(async (limit = 50): Promise<AppEvent[]> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:creator_id ( id, display_name, avatar_url, username ),
        event_rsvps ( id, user_id, status, created_at, profiles:user_id ( id, display_name, avatar_url, username ) )
      `)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[useEvents] upcomingEvents error:', error.message);
      return [];
    }
    return (data ?? []) as unknown as AppEvent[];
  }, []);

  // -----------------------------------------------------------------------
  // My events — created or RSVP'd to
  // -----------------------------------------------------------------------
  const myEvents = useCallback(async (): Promise<AppEvent[]> => {
    if (!user) return [];

    // Events I created
    const { data: created } = await supabase
      .from('events')
      .select(`
        *,
        profiles:creator_id ( id, display_name, avatar_url, username ),
        event_rsvps ( id, user_id, status, created_at, profiles:user_id ( id, display_name, avatar_url, username ) )
      `)
      .eq('creator_id', user.id)
      .order('starts_at', { ascending: true });

    // Events I RSVP'd to
    const { data: rsvpRows } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id)
      .in('status', ['going', 'interested']);

    const rsvpEventIds = (rsvpRows ?? []).map((r: any) => r.event_id);

    let rsvpEvents: AppEvent[] = [];
    if (rsvpEventIds.length > 0) {
      const { data } = await supabase
        .from('events')
        .select(`
          *,
          profiles:creator_id ( id, display_name, avatar_url, username ),
          event_rsvps ( id, user_id, status, created_at, profiles:user_id ( id, display_name, avatar_url, username ) )
        `)
        .in('id', rsvpEventIds)
        .order('starts_at', { ascending: true });
      rsvpEvents = (data ?? []) as unknown as AppEvent[];
    }

    // Merge and deduplicate
    const map = new Map<string, AppEvent>();
    for (const e of [...(created ?? []), ...rsvpEvents] as unknown as AppEvent[]) {
      if (!map.has(e.id)) map.set(e.id, e);
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [user]);

  // -----------------------------------------------------------------------
  // Create event
  // -----------------------------------------------------------------------
  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<{ data: AppEvent | null; error: string | null }> => {
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('events')
        .insert({
          creator_id: user.id,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          spot_id: input.spot_id || null,
          city: input.city.trim(),
          country: input.country.trim(),
          venue_name: input.venue_name?.trim() || null,
          venue_address: input.venue_address?.trim() || null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          starts_at: input.starts_at,
          ends_at: input.ends_at || null,
          max_attendees: input.max_attendees || null,
          category: input.category || 'meetup',
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as unknown as AppEvent, error: null };
    },
    [user],
  );

  // -----------------------------------------------------------------------
  // RSVP — upsert (going / interested / cancelled)
  // -----------------------------------------------------------------------
  const rsvp = useCallback(
    async (
      eventId: string,
      status: 'going' | 'interested' | 'cancelled',
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
        .from('event_rsvps')
        .upsert(
          { event_id: eventId, user_id: user.id, status },
          { onConflict: 'event_id,user_id' },
        );

      if (error) return { error: error.message };
      return { error: null };
    },
    [user],
  );

  // -----------------------------------------------------------------------
  // Attendees for an event (going + interested)
  // -----------------------------------------------------------------------
  const attendees = useCallback(
    async (eventId: string): Promise<EventRsvp[]> => {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
          *,
          profiles:user_id ( id, display_name, avatar_url, username )
        `)
        .eq('event_id', eventId)
        .in('status', ['going', 'interested'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useEvents] attendees error:', error.message);
        return [];
      }
      return (data ?? []) as unknown as EventRsvp[];
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Attendee count helper
  // -----------------------------------------------------------------------
  const attendeeCount = useCallback(
    async (eventId: string): Promise<number> => {
      const { count, error } = await supabase
        .from('event_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'going');

      if (error) return 0;
      return count ?? 0;
    },
    [],
  );

  return {
    cityEvents,
    upcomingEvents,
    myEvents,
    createEvent,
    rsvp,
    attendees,
    attendeeCount,
  };
}
