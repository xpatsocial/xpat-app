/**
 * semantic-search Edge Function
 *
 * Accepts a natural language query and returns semantically relevant spots.
 * Uses hybrid search: 70% vector similarity + 30% full-text search.
 *
 * Example: "quiet cafe with fast wifi near the sea" returns
 * cafes tagged with 'quiet' and 'wifi' even if those exact words aren't in the name.
 *
 * Cost: ~$0.000002 per search (text-embedding-3-small, 256 output dimensions)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface SearchRequest {
  query: string;
  city?: string;
  category?: string;
  limit?: number;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI embedding error: ${res.status}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { query, city, category, limit = 20 } = body;

  if (!query?.trim()) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // If no OpenAI key configured, fall back to text-only search
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (!OPENAI_API_KEY) {
    const { data, error } = await supabase
      .from('spots')
      .select('id, name, city, country, category, note, tags, lat, lng, votes, photo_url')
      .textSearch('search_vector', query, { type: 'plain', config: 'simple' })
      .eq('is_flagged', false)
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ results: data ?? [], semantic: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Generate query embedding
    const embedding = await getEmbedding(query);

    // Hybrid search via RPC
    const { data, error } = await supabase.rpc('hybrid_spot_search', {
      query_text: query,
      query_embedding: embedding,
      match_count: limit,
      city_filter: city ?? null,
      category_filter: category ?? null,
      weight_vec: 0.7,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ results: data ?? [], semantic: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Semantic search error:', err);
    // Fall back to FTS on error
    const { data } = await supabase
      .from('spots')
      .select('id, name, city, country, category, note, tags, lat, lng, votes, photo_url')
      .textSearch('search_vector', query, { type: 'plain', config: 'simple' })
      .eq('is_flagged', false)
      .limit(limit);

    return new Response(
      JSON.stringify({ results: data ?? [], semantic: false, fallback: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
});
