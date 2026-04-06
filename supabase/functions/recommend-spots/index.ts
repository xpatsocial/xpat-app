/**
 * recommend-spots Edge Function — Claude-powered personalized discovery
 *
 * Takes user context (current city, preferences, past check-ins) and returns
 * a curated list of spots with Claude-generated reasons tailored to the user.
 *
 * Example output:
 * { spots: [...], explanations: ["Perfect for you — quiet, great AC, fast wifi"] }
 *
 * Cost: ~$0.001/call (embedding + haiku + 5 spot retrieval)
 * Cache: results per user+city for 30 min on client side
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface UserContext {
  city: string;
  workStyle?: string;    // 'cafe', 'coworking', 'home', 'mixed'
  goals?: string[];      // ['focus work', 'meet people', 'explore local', 'cheap eats']
  checkedInSpotIds?: number[];  // spots already visited — avoid repeating
  preferredCategories?: string[];
}

interface SpotWithReason {
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
  reason: string;  // Claude-generated personalized reason
}

async function getEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  try {
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
    if (!res.ok) return null;
    const data = await res.json();
    return data.data[0].embedding;
  } catch {
    return null;
  }
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

  let context: UserContext;
  try {
    context = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { city, workStyle, goals = [], checkedInSpotIds = [], preferredCategories = [] } = context;

  if (!city) {
    return new Response(JSON.stringify({ spots: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Build a query string that captures the user's preferences for embedding
  const preferenceQuery = [
    workStyle ? `${workStyle} work environment` : 'productive work environment',
    goals.length > 0 ? goals.join(', ') : 'great atmosphere',
    preferredCategories.length > 0 ? preferredCategories.join(' or ') : 'cafe coworking',
  ].join('. ');

  // Generate preference embedding
  const embedding = await getEmbedding(preferenceQuery);

  let candidateSpots: any[] = [];

  if (embedding) {
    // Semantic match to user preferences
    const { data } = await supabase.rpc('hybrid_spot_search', {
      query_text: preferenceQuery,
      query_embedding: embedding,
      match_count: 15,
      city_filter: city,
      category_filter: null,
      weight_vec: 0.75,
    });
    candidateSpots = data ?? [];
  } else {
    // Fallback: top-voted spots in city
    const { data } = await supabase
      .from('spots')
      .select('id, name, category, city, country, note, tags, lat, lng, votes, photo_url')
      .ilike('city', city)
      .eq('is_flagged', false)
      .order('votes', { ascending: false })
      .limit(15);
    candidateSpots = data ?? [];
  }

  // Exclude already visited spots
  const unseenSpots = checkedInSpotIds.length > 0
    ? candidateSpots.filter((s) => !checkedInSpotIds.includes(s.id))
    : candidateSpots;

  // Take top 5 for AI explanation
  const topSpots = unseenSpots.slice(0, 5);

  if (topSpots.length === 0) {
    return new Response(JSON.stringify({ spots: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build spot descriptions for Claude
  const spotDescriptions = topSpots.map((s: any, i: number) => {
    const tags = Array.isArray(s.tags) ? s.tags.join(', ') : 'none';
    return `${i + 1}. ${s.name} (${s.category}) — ${s.note ?? 'No note'} | Tags: ${tags} | Votes: ${s.votes ?? 0}`;
  }).join('\n');

  const userProfile = [
    workStyle ? `Work style: ${workStyle}` : null,
    goals.length > 0 ? `Goals: ${goals.join(', ')}` : null,
    preferredCategories.length > 0 ? `Prefers: ${preferredCategories.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  // Ask Claude to generate personalized reasons
  const prompt = `You are helping a digital nomad discover spots in ${city}.

User profile:
${userProfile || 'No preferences set — give general appeal reasons'}

Here are 5 highly-rated spots:
${spotDescriptions}

For each spot (1-5), write exactly ONE sentence (max 15 words) explaining why this specific user would love it. Be specific about what makes it match their style. No fluff.

Respond with ONLY a JSON array of 5 strings in order:
["reason1", "reason2", "reason3", "reason4", "reason5"]`;

  let reasons: string[] = topSpots.map(() => 'Highly rated by the x/pat community');

  if (ANTHROPIC_API_KEY) {
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        const text = claudeData.content?.[0]?.text ?? '[]';
        // Parse JSON array from response
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length === topSpots.length) {
            reasons = parsed;
          }
        }
      }
    } catch {
      // Use fallback reasons
    }
  }

  const spotsWithReasons: SpotWithReason[] = topSpots.map((s: any, i: number) => ({
    ...s,
    reason: reasons[i] ?? 'Highly rated by the x/pat community',
  }));

  return new Response(
    JSON.stringify({ spots: spotsWithReasons }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
