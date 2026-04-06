/**
 * ask-ai Edge Function — RAG-powered city assistant
 *
 * Architecture:
 * 1. Generate embedding for the user's question
 * 2. Retrieve top-5 semantically relevant spots from pgvector
 * 3. Feed spots as context to Claude (claude-haiku-4-5) for fast, cheap responses
 * 4. Claude answers with spot-grounded knowledge + general nomad expertise
 *
 * Falls back to general Claude response if no spots are relevant.
 * Cost: ~$0.0003/message (embedding + haiku tokens)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  history?: ChatMessage[];
  city?: string;
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

async function retrieveRelevantSpots(
  query: string,
  embedding: number[] | null,
  city: string | null,
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  let spots: any[] = [];

  if (embedding) {
    // Vector search for semantically relevant spots
    const { data } = await supabase.rpc('hybrid_spot_search', {
      query_text: query,
      query_embedding: embedding,
      match_count: 5,
      city_filter: city ?? null,
      category_filter: null,
      weight_vec: 0.7,
    });
    spots = data ?? [];
  }

  // Fallback: FTS if no embedding
  if (spots.length === 0) {
    const { data } = await supabase
      .from('spots')
      .select('name, city, country, category, note, tags, votes')
      .textSearch('search_vector', query, { type: 'plain', config: 'simple' })
      .eq('is_flagged', false)
      .limit(5);
    spots = data ?? [];
  }

  if (spots.length === 0) return '';

  const spotList = spots
    .map((s: any, i: number) => {
      const tags = Array.isArray(s.tags) ? s.tags.join(', ') : '';
      return `${i + 1}. **${s.name}** (${s.category}, ${s.city}, ${s.country})${s.note ? ` — ${s.note}` : ''}${tags ? ` [${tags}]` : ''} ⭐ ${s.votes ?? 0} votes`;
    })
    .join('\n');

  return `\nRelevant spots from the x/pat community database:\n${spotList}\n`;
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { message, history = [], city } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ reply: '' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Retrieve context from pgvector
  const embedding = await getEmbedding(message);
  const spotContext = await retrieveRelevantSpots(message, embedding, city ?? null, supabase);

  // Build system prompt with RAG context
  const systemPrompt = `You are x/pat AI, a knowledgeable assistant for digital nomads. You help people find great spots to work, eat, and explore — and advise on visas, safety, cost of living, and nomad life.

You have access to community-curated data from x/pat users.${spotContext ? `\n${spotContext}` : ''}

Guidelines:
- Be concise and actionable. Nomads are busy.
- If the question is about specific spots or places, reference the community data above when relevant.
- For visa questions, always recommend verifying with official sources.
- Tone: friendly, knowledgeable, direct. No corporate fluff.
- If asked about x/pat the app: it's a free social app for digital nomads — no subscription, ever.`;

  // Build message history (last 10 for context window efficiency)
  const recentHistory = history.slice(-10);
  const messages = [
    ...recentHistory,
    { role: 'user' as const, content: message },
  ];

  // Call Claude API
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    console.error('Claude API error:', err);
    return new Response(
      JSON.stringify({ reply: "I'm having trouble connecting. Please try again." }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const claudeData = await claudeRes.json();
  const reply = claudeData.content?.[0]?.text ?? "I'm having trouble right now. Try again.";

  return new Response(
    JSON.stringify({ reply }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
