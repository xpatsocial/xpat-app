/**
 * embed-spots Edge Function
 *
 * One-time batch job to generate embeddings for all spots without embeddings.
 * Also handles new spot embedding on creation.
 *
 * Usage:
 *   POST /functions/v1/embed-spots
 *   Authorization: Bearer <SERVICE_ROLE_KEY>
 *   Body: { "batch_size": 50 } (optional, default 50)
 *
 * Cost: 431 spots × ~500 tokens avg = ~215,000 tokens = ~$0.003 total
 * Run once to seed, then call for each new spot created.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function buildSpotText(spot: {
  name: string;
  city: string;
  country: string;
  category: string;
  note?: string | null;
  tags?: string[] | null;
  description?: string | null;
}): string {
  const parts = [
    spot.name,
    `${spot.category} in ${spot.city}, ${spot.country}`,
    spot.description ?? '',
    spot.note ?? '',
    (spot.tags ?? []).join(', '),
  ].filter(Boolean);

  return parts.join('. ').slice(0, 8192); // OpenAI token limit buffer
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Require service role key
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.includes(SUPABASE_SERVICE_KEY.slice(-20))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let batchSize = 50;
  try {
    const body = await req.json();
    if (body.batch_size) batchSize = Math.min(100, body.batch_size);
  } catch { /* use default */ }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch spots without embeddings
  const { data: spots, error } = await supabase
    .from('spots')
    .select('id, name, city, country, category, note, tags, description')
    .is('embedding', null)
    .limit(batchSize);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!spots || spots.length === 0) {
    return new Response(JSON.stringify({ message: 'All spots already embedded', count: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate embeddings in batch
  const texts = spots.map(buildSpotText);
  const embeddings = await getEmbeddings(texts);

  // Update spots with their embeddings
  const updates = spots.map((spot, i) => ({
    id: spot.id,
    embedding: embeddings[i],
  }));

  let successCount = 0;
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('spots')
      .update({ embedding: update.embedding })
      .eq('id', update.id);

    if (!updateError) successCount++;
  }

  return new Response(
    JSON.stringify({
      embedded: successCount,
      attempted: spots.length,
      remaining_message: 'Call again to embed next batch',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
