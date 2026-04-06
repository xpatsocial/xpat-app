import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AwardXPParams {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
}

interface CheckBadgeParams {
  userId: string;
}

const BADGE_THRESHOLDS = {
  first_check_in: { table: 'check_ins', field: 'user_id', count: 1 },
  city_explorer_5: { table: 'check_ins', field: 'user_id', count: 5 },
  city_explorer_25: { table: 'check_ins', field: 'user_id', count: 25 },
  city_explorer_100: { table: 'check_ins', field: 'user_id', count: 100 },
  first_post: { table: 'posts', field: 'user_id', count: 1 },
};

export function useGamification() {
  const awardXP = useCallback(async ({ userId, amount, reason, referenceId }: AwardXPParams) => {
    try {
      // Insert XP transaction
      const { error: txError } = await supabase
        .from('xp_transactions')
        .insert({ user_id: userId, amount, reason, reference_id: referenceId ?? null });

      if (txError) return;

      // Update total XP on profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_total')
        .eq('id', userId)
        .single();

      if (profile) {
        const newXP = (profile.xp_total ?? 0) + amount;
        const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

        await supabase
          .from('profiles')
          .update({ xp_total: newXP, xp_level: newLevel })
          .eq('id', userId);
      }
    } catch {
      // Non-critical — don't let gamification crash the app
    }
  }, []);

  const checkAndAwardBadge = useCallback(async (userId: string, badgeId: keyof typeof BADGE_THRESHOLDS) => {
    try {
      const threshold = BADGE_THRESHOLDS[badgeId];

      // Check if already awarded
      const { data: existing } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (existing) return null; // already has it

      // Count qualifying actions
      const { count } = await supabase
        .from(threshold.table)
        .select('id', { count: 'exact', head: true })
        .eq(threshold.field, userId);

      if ((count ?? 0) >= threshold.count) {
        // Award badge
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: userId, badge_id: badgeId });

        if (!error) {
          // Also award XP for the badge
          const { data: badge } = await supabase
            .from('badges')
            .select('xp_reward, name')
            .eq('id', badgeId)
            .single();

          if (badge && badge.xp_reward > 0) {
            await awardXP({ userId, amount: badge.xp_reward, reason: `badge_${badgeId}` });
          }

          return badge?.name ?? badgeId;
        }
      }

      return null;
    } catch {
      return null;
    }
  }, [awardXP]);

  const onCheckIn = useCallback(async (userId: string, spotId: string | number) => {
    // Award XP for check-in
    await awardXP({
      userId,
      amount: 10,
      reason: 'spot_check_in',
      referenceId: String(spotId),
    });

    // Check badge thresholds
    const earned: string[] = [];
    for (const badgeId of ['first_check_in', 'city_explorer_5', 'city_explorer_25', 'city_explorer_100'] as const) {
      const name = await checkAndAwardBadge(userId, badgeId);
      if (name) earned.push(name);
    }
    return earned; // list of newly earned badge names (for toast notification)
  }, [awardXP, checkAndAwardBadge]);

  const onPostCreated = useCallback(async (userId: string, postId: string) => {
    await awardXP({ userId, amount: 15, reason: 'post_created', referenceId: postId });

    const earned: string[] = [];
    const name = await checkAndAwardBadge(userId, 'first_post');
    if (name) earned.push(name);
    return earned;
  }, [awardXP, checkAndAwardBadge]);

  return { awardXP, checkAndAwardBadge, onCheckIn, onPostCreated };
}
