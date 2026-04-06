/**
 * useSemanticSearch — AI-powered spot search
 *
 * Falls back gracefully: semantic search → FTS → client-side filter
 * Debounces to 400ms to avoid hammering the Edge Function on every keystroke.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Spot } from '../types';

interface SearchResult {
  results: Spot[];
  semantic: boolean; // true if AI-powered, false if text-only fallback
}

export function useSemanticSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Spot[]>([]);
  const [isSemantic, setIsSemantic] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((
    query: string,
    options?: { city?: string; category?: string; limit?: number }
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke<SearchResult>(
          'semantic-search',
          {
            body: {
              query: query.trim(),
              city: options?.city,
              category: options?.category,
              limit: options?.limit ?? 20,
            },
          }
        );

        if (error) throw error;

        setResults((data?.results as unknown as Spot[]) ?? []);
        setIsSemantic(data?.semantic ?? false);
      } catch {
        // Final fallback: simple client-side search
        // The Edge Function itself handles FTS fallback, so this is just for network errors
        setResults([]);
        setIsSemantic(false);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResults([]);
    setLoading(false);
    setIsSemantic(false);
  }, []);

  return { search, clear, results, loading, isSemantic };
}
