/**
 * award-xp Edge Function
 *
 * Server-authoritative XP and badge awarding.
 * Client calls this after completing actions — server validates and awards.
 * This prevents client-side XP manipulation.
 *
 * Actions:
 *  - spot_check_in   → 10 XP
 *  - post_created    → 15 XP
 *  - spot_added      → 25 XP
 *  - first_review    → 20 XP
 *  - connection_made → 5 XP
 *  - wifi_reported   → 8 XP
 *  - daily_login     → 3 XP
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const XP_REWARDS: Record<string, number> = {
  spot_check_in: 10,
  post_created: 15,
  spot_added: 25,
  first_review: 20,
  connection_made: 5,
  wifi_reported: 8,
  daily_login: 3,
  badge_earned: 0, // variable — passed in amount
};

const BADGE_THRESHOLDS: Array<{
  badge_id: string;
  table: string;
  user_field: string;
  count: number;
}> = [
  { badge_id: 'first_check_in', table: 'check_ins', user_field: 'user_id', count: 1 },
  { badge_id: 'city_explorer_5', table: 'check_ins', user_field: 'user_id', count: 5 },
  { badge_id: 'city_explorer_25', table: 'check_ins', user_field: 'user_id', count: 25 },
  { badge_id: 'city_explorer_100', table: 'check_ins', user_field: 'user_id', count: 100 },
  { badge_id: 'first_post', table: 'posts', user_field: 'user_id', count: 1 },
  { badge_id: 'first_spot', table: 'spots', user_field: 'created_by', count: 1 },
  { badge_id: 'connector_5', table: 'connections', user_field: 'requester_id', count: 5 },
];

interface AwardRequest {
  reason: string;
  reference_id?: string;
  amount?: number; // override for variable-reward actions
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  // Create client with user's JWT to get their ID
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get user from JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: AwardRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { reason, reference_id, amount: overrideAmount } = body;
  const xpAmount = overrideAmount ?? XP_REWARDS[reason] ?? 0;

  if (xpAmount === 0 && !overrideAmount) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unknown reason' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 },
    );
  }

  // Rate limit: prevent duplicate XP for same action+reference in 1 hour
  if (reference_id) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await serviceClient
      .from('xp_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reason', reason)
      .eq('reference_id', reference_id)
      .gte('created_at', oneHourAgo);

    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Duplicate action' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Insert XP transaction
  await serviceClient.from('xp_transactions').insert({
    user_id: user.id,
    amount: xpAmount,
    reason,
    reference_id: reference_id ?? null,
  });

  // Update profile XP total and level
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('xp_total')
    .eq('id', user.id)
    .single();

  const newXP = (profile?.xp_total ?? 0) + xpAmount;
  const newLevel = Math.min(10, Math.floor(Math.sqrt(newXP / 100)) + 1);

  await serviceClient
    .from('profiles')
    .update({ xp_total: newXP, xp_level: newLevel })
    .eq('id', user.id);

  // Check badge thresholds
  const newBadges: string[] = [];
  for (const threshold of BADGE_THRESHOLDS) {
    // Skip if already awarded
    const { count: alreadyHas } = await serviceClient
      .from('user_badges')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('badge_id', threshold.badge_id);

    if ((alreadyHas ?? 0) > 0) continue;

    // Count qualifying actions
    const { count: actionCount } = await serviceClient
      .from(threshold.table)
      .select('id', { count: 'exact', head: true })
      .eq(threshold.user_field, user.id);

    if ((actionCount ?? 0) >= threshold.count) {
      const { error: badgeError } = await serviceClient
        .from('user_badges')
        .insert({ user_id: user.id, badge_id: threshold.badge_id });

      if (!badgeError) {
        // Award badge XP
        const { data: badge } = await serviceClient
          .from('badges')
          .select('xp_reward, name')
          .eq('id', threshold.badge_id)
          .single();

        if (badge && badge.xp_reward > 0) {
          await serviceClient.from('xp_transactions').insert({
            user_id: user.id,
            amount: badge.xp_reward,
            reason: `badge_${threshold.badge_id}`,
          });
          await serviceClient
            .from('profiles')
            .update({ xp_total: newXP + badge.xp_reward })
            .eq('id', user.id);
        }

        newBadges.push(badge?.name ?? threshold.badge_id);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      xp_awarded: xpAmount,
      new_xp_total: newXP,
      new_level: newLevel,
      badges_earned: newBadges,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
