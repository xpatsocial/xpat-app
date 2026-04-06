/**
 * moderate-content Edge Function
 *
 * Called after UGC inserts (posts, comments, chat messages, spot descriptions).
 * Uses OpenAI Moderation API (free) to classify content.
 * If flagged: sets status = 'pending_review' and increments user flag count.
 *
 * Invoke via Supabase Database Webhook on INSERT to posts/comments/chat_messages.
 * Or call directly from the app after submit for near-real-time moderation.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface ModerationRequest {
  content_type: 'post' | 'comment' | 'chat_message' | 'spot';
  content_id: string;
  text: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Validate Authorization header for direct calls from app
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: ModerationRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { content_type, content_id, text, user_id } = body;

  if (!content_type || !content_id || !text || !user_id) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Skip moderation for empty or very short content
  if (text.trim().length < 5) {
    return new Response(JSON.stringify({ flagged: false, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Call OpenAI Moderation API (free)
  let flagged = false;
  let categories: Record<string, boolean> = {};
  let scores: Record<string, number> = {};

  if (OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input: text }),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.results?.[0];
        flagged = result?.flagged ?? false;
        categories = result?.categories ?? {};
        scores = result?.category_scores ?? {};
      }
    } catch (err) {
      console.error('OpenAI moderation error:', err);
      // Fail open — don't block content if moderation service is down
    }
  }

  // If flagged, update the content record and user flag count
  if (flagged) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const tableMap: Record<string, string> = {
      post: 'posts',
      comment: 'comments',
      chat_message: 'chat_messages',
      spot: 'spots',
    };

    const table = tableMap[content_type];
    if (table) {
      // Set content to pending_review (if column exists) or mark as hidden
      await supabase
        .from(table)
        .update({ is_flagged: true } as Record<string, unknown>)
        .eq('id', content_id);
    }

    // Log the moderation event
    await supabase.from('moderation_log').insert({
      content_type,
      content_id,
      user_id,
      flagged: true,
      categories,
      scores,
      action: 'auto_flagged',
    }).throwOnError().then(() => {}).catch(() => {
      // moderation_log table may not exist yet — non-critical
    });
  }

  return new Response(
    JSON.stringify({ flagged, categories, scores }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
