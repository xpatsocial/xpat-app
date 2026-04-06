/**
 * useRecommendations — Claude-powered spot recommendations
 *
 * Fetches personalized spots from the recommend-spots Edge Function.
 * Results are cached via React Query for 30 min to avoid repeated AI calls.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface RecommendedSpot {
  id: number;
  name: string;
  category: string;
  city: string;
  country: string;
  note: string | null;
  tags: string[] | null;
  lat: number | null;
  lng: number | null;
  votes: number;
  photo_url: string | null;
  reason: string;
}

interface UseRecommendationsOptions {
  city: string | null;
  workStyle?: string;
  goals?: string[];
  checkedInSpotIds?: number[];
  preferredCategories?: string[];
  enabled?: boolean;
}

export function useRecommendations({
  city,
  workStyle,
  goals,
  checkedInSpotIds,
  preferredCategories,
  enabled = true,
}: UseRecommendationsOptions) {
  return useQuery<RecommendedSpot[]>({
    queryKey: ['recommendations', city, workStyle, goals?.join(',')],
    queryFn: async () => {
      if (!city) return [];
      const { data, error } = await supabase.functions.invoke<{ spots: RecommendedSpot[] }>(
        'recommend-spots',
        {
          body: {
            city,
            workStyle,
            goals,
            checkedInSpotIds,
            preferredCategories,
          },
        },
      );
      if (error) throw error;
      return data?.spots ?? [];
    },
    staleTime: 30 * 60 * 1000, // 30 min — AI calls are cheap but not free
    enabled: enabled && !!city,
  });
}
