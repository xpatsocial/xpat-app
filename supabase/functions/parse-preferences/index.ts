/**
 * parse-preferences Edge Function — AI preference extraction from natural language
 *
 * User types: "I'm a designer who loves quiet cafes for deep work and
 * good coffee. I'm in Bangkok and heading to Lisbon next month."
 *
 * Claude extracts structured profile fields.
 * Called during onboarding step 2 (optional natural language input).
 *
 * Cost: ~$0.0002/call (haiku, single extraction)
 */

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

interface ExtractedPreferences {
  work_type?: string;
  current_city?: string;
  next_destination?: string;
  preferred_categories?: string[];
  work_style?: string;  // 'cafe', 'coworking', 'mixed'
  bio?: string;
  skills?: string[];
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

  let body: { text: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { text } = body;
  if (!text?.trim()) {
    return new Response(JSON.stringify({ preferences: {} }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ preferences: {} }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = `Extract structured preferences from this nomad's self-description.

Input: "${text.slice(0, 500)}"

Return ONLY a valid JSON object with these optional fields (omit if not mentioned):
{
  "work_type": "string (e.g. designer, developer, writer, consultant)",
  "current_city": "string (city name only)",
  "next_destination": "string (city name only)",
  "preferred_categories": ["array of: cafe, eat, cowork, colive, experience, stay"],
  "work_style": "cafe OR coworking OR mixed OR home",
  "bio": "string (clean 1-sentence bio, 15 words max)",
  "skills": ["array of professional skills, max 5"]
}

Only include fields you're confident about. Return {} if nothing extractable.`;

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      return new Response(JSON.stringify({ preferences: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await claudeRes.json();
    const responseText = data.content?.[0]?.text ?? '{}';

    // Extract JSON from response
    const match = responseText.match(/\{[\s\S]*\}/);
    const preferences: ExtractedPreferences = match ? JSON.parse(match[0]) : {};

    return new Response(
      JSON.stringify({ preferences }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(JSON.stringify({ preferences: {} }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
