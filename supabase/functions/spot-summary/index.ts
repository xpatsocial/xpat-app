/**
 * spot-summary Edge Function — AI-generated spot summaries
 *
 * Takes community data (notes, tags, votes, check-ins) and generates
 * a compelling 2-sentence summary of what makes this spot special.
 * Results are cached in spot.ai_summary column.
 *
 * Called lazily on first SpotDetail open (if no cached summary).
 * Cost: ~$0.0002/spot (haiku, ~100 tokens output)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

  let body: { spotId: number };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { spotId } = body;
  if (!spotId) {
    return new Response(JSON.stringify({ error: 'spotId required' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch spot data
  const { data: spot, error } = await supabase
    .from('spots')
    .select('id, name, city, country, category, note, tags, votes, ai_summary')
    .eq('id', spotId)
    .single();

  if (error || !spot) {
    return new Response(JSON.stringify({ error: 'Spot not found' }), { status: 404 });
  }

  // Return cached summary if exists
  if (spot.ai_summary) {
    return new Response(JSON.stringify({ summary: spot.ai_summary, cached: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch recent community comments for context
  const { data: comments } = await supabase
    .from('comments')
    .select('content')
    .eq('spot_id', spotId)
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .limit(5);

  const commentTexts = (comments ?? []).map((c: any) => `"${c.content}"`).join(', ');
  const tags = Array.isArray(spot.tags) ? spot.tags.join(', ') : '';

  const prompt = `Write a compelling 2-sentence summary for this spot that digital nomads would find useful.

Spot: ${spot.name}
Type: ${spot.category} in ${spot.city}, ${spot.country}
Community note: ${spot.note ?? 'none'}
Community tags: ${tags || 'none'}
Votes: ${spot.votes ?? 0}
${commentTexts ? `Community comments: ${commentTexts}` : ''}

Requirements:
- Sentence 1: what makes this spot special (atmosphere, practicality)
- Sentence 2: who would love it most (remote workers, socialites, foodies, etc.)
- Max 40 words total
- No marketing fluff, be specific and honest`;

  let summary = spot.note ?? `A ${spot.category} spot in ${spot.city} loved by the x/pat community.`;

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
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (claudeRes.ok) {
        const data = await claudeRes.json();
        summary = data.content?.[0]?.text ?? summary;
      }
    } catch {
      // Use fallback
    }
  }

  // Cache the summary
  await supabase.from('spots').update({ ai_summary: summary }).eq('id', spotId);

  return new Response(
    JSON.stringify({ summary, cached: false }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
