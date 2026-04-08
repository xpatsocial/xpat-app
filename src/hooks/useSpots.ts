/**
 * useSpots — React Query hooks for spot data with offline persistence
 *
 * All 431 spots are cached to MMKV on first load.
 * Subsequent app opens show cached data instantly, refetch in background.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { qk } from '../lib/queryKeys';
import { Spot } from '../types';

const SPOT_SELECT = 'id, name, city, country, category, note, tags, lat, lng, votes, photo_url, created_at, is_flagged, embedding';

// All spots for a city (main explore/map view)
export function useSpotsByCity(city: string | null) {
  return useQuery({
    queryKey: city ? qk.spots.byCity(city) : qk.spots.all,
    queryFn: async () => {
      let query = supabase
        .from('spots')
        .select(SPOT_SELECT)
        .eq('is_flagged', false)
        .order('votes', { ascending: false });

      if (city) {
        query = query.ilike('city', city);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data ?? []) as Spot[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });
}

// Single spot detail
export function useSpot(id: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.spots.byId(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spots')
        .select(`${SPOT_SELECT}, profiles(display_name, avatar_url)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Spot & { profiles?: { display_name: string; avatar_url: string } };
    },
    // Seed from list cache to avoid flicker on detail open
    initialData: () => {
      const allCaches = queryClient.getQueriesData<Spot[]>({ queryKey: qk.spots.all });
      for (const [, data] of allCaches) {
        const found = data?.find((s) => s.id === id);
        if (found) return found as any;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// "Surprise Me" — Variable Reward (HUNT) from Hook Model
// Returns a random spot from the current city's cache.
// Each call returns a different spot, creating the anticipation that
// drives habit formation (Eyal's variable ratio reinforcement).
export function useSurpriseSpot(city: string | null) {
  const queryClient = useQueryClient();

  const getRandomSpot = (): Spot | null => {
    if (!city) return null;

    // Pull from cached spots to avoid extra network calls
    const allCaches = queryClient.getQueriesData<Spot[]>({ queryKey: qk.spots.all });
    let candidates: Spot[] = [];

    for (const [, data] of allCaches) {
      if (data) {
        const citySpots = data.filter(
          (s) => s.city?.toLowerCase() === city.toLowerCase(),
        );
        candidates = [...candidates, ...citySpots];
      }
    }

    // Also check city-specific cache
    const cityCache = queryClient.getQueryData<Spot[]>(qk.spots.byCity(city));
    if (cityCache && cityCache.length > 0) {
      candidates = cityCache;
    }

    if (candidates.length === 0) return null;

    // True random selection — no weighting by votes, pure discovery
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  };

  return { getRandomSpot };
}

// Upvote mutation with optimistic update
export function useVoteSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spotId, userId }: { spotId: number; userId: string }) => {
      // Check if already voted
      const { data: existing } = await supabase
        .from('spot_votes')
        .select('id')
        .eq('spot_id', spotId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Toggle off
        await supabase.from('spot_votes').delete().eq('spot_id', spotId).eq('user_id', userId);
        return { voted: false };
      } else {
        await supabase.from('spot_votes').insert({ spot_id: spotId, user_id: userId });
        return { voted: true };
      }
    },
    onMutate: async ({ spotId }) => {
      // Optimistic: increment vote count immediately
      await queryClient.cancelQueries({ queryKey: qk.spots.byId(spotId) });
      const prev = queryClient.getQueryData<Spot>(qk.spots.byId(spotId));
      if (prev) {
        queryClient.setQueryData(qk.spots.byId(spotId), {
          ...prev,
          votes: (prev.votes ?? 0) + 1,
        });
      }
      return { prev };
    },
    onError: (_err, { spotId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.spots.byId(spotId), ctx.prev);
    },
    onSettled: (_data, _err, { spotId }) => {
      queryClient.invalidateQueries({ queryKey: qk.spots.byId(spotId) });
    },
  });
}
