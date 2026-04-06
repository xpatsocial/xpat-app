/**
 * useFeed — React Query hook for the community feed
 *
 * Paginated: 20 posts per page, infinite scroll.
 * Cached to MMKV: last-seen feed visible instantly on reopen.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { qk } from '../lib/queryKeys';

const PAGE_SIZE = 20;

interface FeedPost {
  id: number;
  content: string;
  city: string | null;
  created_at: string;
  user_id: string;
  is_flagged: boolean;
  photo_url?: string | null;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    username: string | null;
    verification_level?: number;
  } | null;
  _likes?: number;
  _comments?: number;
}

export function useFeed(city?: string | null) {
  return useInfiniteQuery({
    queryKey: city ? qk.feed.city(city) : qk.feed.all,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('posts')
        .select(`
          id, content, city, created_at, user_id, is_flagged, photo_url,
          profiles(display_name, avatar_url, username, verification_level)
        `)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (city) query = query.ilike('city', city);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FeedPost[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 2 * 60 * 1000, // 2 min — feed is more dynamic than spots
  });
}

// Optimistic post creation
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      city,
      userId,
      photoUrl,
    }: {
      content: string;
      city?: string | null;
      userId: string;
      photoUrl?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('posts')
        .insert({ content, city, user_id: userId, photo_url: photoUrl ?? null })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all feed queries so new post appears
      queryClient.invalidateQueries({ queryKey: qk.feed.all });
    },
  });
}
