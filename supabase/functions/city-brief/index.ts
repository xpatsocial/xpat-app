/**
 * city-brief Edge Function — AI arrival brief
 *
 * Triggered when a user updates their current_city.
 * Claude generates a personalized "Welcome to {city}" brief with:
 * - Top 3 spots to check out first (from pgvector)
 * - Quick practical tips (SIM, currency, safety note)
 * - Nomad community count in that city
 *
 * Sends via Expo Push if user has push token.
 * Brief stored in notifications table for in-app access.
 *
 * Cost: ~$0.001/arrival (haiku + embedding)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface BriefRequest {
  userId: string;
  city: string;
  country?: string;
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

  let body: BriefRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { userId, city, country } = body;
  if (!userId || !city) {
    return new Response(JSON.stringify({ error: 'userId and city required' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get top spots in this city via semantic search
  const embedding = await getEmbedding(`best spots coworking cafes ${city}`);
  let topSpots: any[] = [];

  if (embedding) {
    const { data } = await supabase.rpc('hybrid_spot_search', {
      query_text: `best spots ${city}`,
      query_embedding: embedding,
      match_count: 5,
      city_filter: city,
      category_filter: null,
      weight_vec: 0.6,
    });
    topSpots = data ?? [];
  } else {
    const { data } = await supabase
      .from('spots')
      .select('name, category, note, votes')
      .ilike('city', city)
      .eq('is_flagged', false)
      .order('votes', { ascending: false })
      .limit(5);
    topSpots = data ?? [];
  }

  // Count nomads in city
  const { count: nomadCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('current_city', city);

  // Get user profile for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, xp_level')
    .eq('id', userId)
    .single();

  const firstName = profile?.display_name?.split(' ')[0] ?? 'Nomad';
  const spotList = topSpots.slice(0, 3)
    .map((s: any) => `• ${s.name} (${s.category})`)
    .join('\n');

  // Generate brief with Claude
  let briefContent = `Welcome to ${city}! Here are the top spots to check out first:\n${spotList}`;

  if (ANTHROPIC_API_KEY && topSpots.length > 0) {
    try {
      const prompt = `Write a friendly, concise arrival brief for ${firstName} who just arrived in ${city}${country ? `, ${country}` : ''}.

Top community-rated spots:
${topSpots.slice(0, 3).map((s: any) => `- ${s.name} (${s.category}): ${s.note ?? 'Community favorite'}`).join('\n')}

${nomadCount ? `There are currently ${nomadCount} x/pat members in ${city}.` : ''}

Write 3 short paragraphs (2-3 sentences each):
1. Warm welcome with top spot pick
2. One practical arrival tip (SIM card, transport, or local currency)
3. Community tip (how to connect with other nomads)

Keep it friendly, specific to ${city}, and under 150 words total.`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        briefContent = claudeData.content?.[0]?.text ?? briefContent;
      }
    } catch {
      // Use default brief
    }
  }

  // Store notification in DB
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'city_brief',
    title: `Welcome to ${city}! 🌍`,
    body: briefContent,
    data: { city, type: 'city_brief' },
  });

  // Send push notification (short version)
  const { data: pushTokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle();

  if (pushTokenRow?.token) {
    const shortBody = `${topSpots[0]?.name ?? city} is calling. Tap to see your personalized city brief.`;
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushTokenRow.token,
        title: `Welcome to ${city}! 🌍`,
        body: shortBody,
        data: { type: 'city_brief', city },
        sound: 'default',
        priority: 'normal',
      }),
    });
  }

  return new Response(
    JSON.stringify({ success: true, city, nomadCount: nomadCount ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
