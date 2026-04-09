/**
 * useTrust — Chesky trust framework hook
 *
 * Provides: vouching, peer reviews (double-blind), trust score display,
 * mutual check-in detection, and progressive trust level helpers.
 */
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { usePostHog } from '../lib/posthog';

// ─── Trust level thresholds (Gebbia: "10+ reviews changes everything") ───

export type TrustTier = 'new' | 'verified' | 'established' | 'trusted' | 'pillar';

export function getTrustTier(score: number): TrustTier {
  if (score >= 80) return 'pillar';
  if (score >= 50) return 'trusted';
  if (score >= 25) return 'established';
  if (score >= 10) return 'verified';
  return 'new';
}

export function getTrustLabel(tier: TrustTier): string {
  switch (tier) {
    case 'pillar': return 'Community Pillar';
    case 'trusted': return 'Trusted Nomad';
    case 'established': return 'Established';
    case 'verified': return 'Verified';
    case 'new': return 'New';
  }
}

export function getTrustColor(tier: TrustTier): string {
  switch (tier) {
    case 'pillar': return '#FFD93D';    // gold
    case 'trusted': return '#2EC4A0';   // brand teal
    case 'established': return '#48CAE4'; // blue
    case 'verified': return '#6C63FF';  // purple
    case 'new': return '#636366';       // grey
  }
}

// ─── Types ───

export interface Vouch {
  id: string;
  voucher_id: string;
  recipient_id: string;
  note: string | null;
  spot_id: number | null;
  spot_name: string | null;
  city: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface PeerReview {
  id: string;
  reviewer_id: string;
  subject_id: string;
  interaction_type: string;
  sentiment: 'positive' | 'neutral';
  review_text: string | null;
  revealed_at: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface MutualCheckIn {
  user_a: string;
  user_b: string;
  spot_id: number;
  spot_name: string;
  city: string;
  met_at: string;
}

// ─── Hook ───

export function useTrust() {
  const { user } = useAuth();
  const posthog = usePostHog();

  // ── Vouching ──

  const fetchVouchesForUser = useCallback(async (userId: string): Promise<Vouch[]> => {
    const { data } = await supabase
      .from('community_vouches')
      .select('*, profiles:voucher_id(display_name, avatar_url)')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    return (data as Vouch[]) ?? [];
  }, []);

  const hasVouched = useCallback(async (recipientId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase
      .from('community_vouches')
      .select('id')
      .eq('voucher_id', user.id)
      .eq('recipient_id', recipientId)
      .maybeSingle();
    return !!data;
  }, [user]);

  const submitVouch = useCallback(async (
    recipientId: string,
    note: string,
    spotId?: number,
    spotName?: string,
    city?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    if (user.id === recipientId) return { success: false, error: 'Cannot vouch for yourself' };

    const { error } = await supabase.from('community_vouches').insert({
      voucher_id: user.id,
      recipient_id: recipientId,
      note,
      spot_id: spotId ?? null,
      spot_name: spotName ?? null,
      city: city ?? null,
    });

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Already vouched' };
      return { success: false, error: error.message };
    }

    // Recalculate trust score for recipient
    await supabase.rpc('recalculate_trust_score', { p_user_id: recipientId });

    posthog?.capture('vouch_given', {
      recipient_id: recipientId,
      has_note: !!note,
      has_spot: !!spotId,
      city: city ?? undefined,
    });

    return { success: true };
  }, [user, posthog]);

  const removeVouch = useCallback(async (recipientId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('community_vouches')
      .delete()
      .eq('voucher_id', user.id)
      .eq('recipient_id', recipientId);
    if (!error) {
      posthog?.capture('vouch_removed', { recipient_id: recipientId });
    }
    return !error;
  }, [user, posthog]);

  // ── Peer Reviews (double-blind) ──

  const fetchReviewsForUser = useCallback(async (userId: string): Promise<PeerReview[]> => {
    const { data } = await supabase
      .from('peer_reviews')
      .select('*, profiles:reviewer_id(display_name, avatar_url)')
      .eq('subject_id', userId)
      .not('revealed_at', 'is', null)
      .order('created_at', { ascending: false });
    return (data as PeerReview[]) ?? [];
  }, []);

  const submitReview = useCallback(async (
    subjectId: string,
    interactionType: 'mutual_checkin' | 'event' | 'direct_message' | 'connection',
    sentiment: 'positive' | 'neutral',
    reviewText?: string,
    interactionRef?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Pair key ensures both parties' reviews are linked
    const sortedIds = [user.id, subjectId].sort();
    const pairKey = `${interactionType}:${sortedIds[0]}:${sortedIds[1]}:${interactionRef ?? 'general'}`;

    const { error } = await supabase.from('peer_reviews').insert({
      reviewer_id: user.id,
      subject_id: subjectId,
      interaction_type: interactionType,
      sentiment,
      review_text: reviewText?.slice(0, 280) ?? null,
      pair_key: pairKey,
      interaction_ref: interactionRef ?? null,
    });

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Already reviewed' };
      return { success: false, error: error.message };
    }

    return { success: true };
  }, [user]);

  const hasPendingReview = useCallback(async (subjectId: string): Promise<boolean> => {
    if (!user) return false;
    // Check if user already submitted a review for this subject recently
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('peer_reviews')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('subject_id', subjectId)
      .gte('created_at', sevenDaysAgo)
      .maybeSingle();
    return !!data;
  }, [user]);

  // ── Mutual Check-Ins ──

  const fetchMutualCheckIns = useCallback(async (userId: string): Promise<MutualCheckIn[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('mutual_checkins')
      .select('*')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('met_at', { ascending: false })
      .limit(10);

    // Filter to only pairs involving both users
    return ((data as MutualCheckIn[]) ?? []).filter(
      (mc) =>
        (mc.user_a === user.id && mc.user_b === userId) ||
        (mc.user_a === userId && mc.user_b === user.id)
    );
  }, [user]);

  // ── Trust Score ──

  const refreshTrustScore = useCallback(async (userId: string): Promise<number> => {
    const { data } = await supabase.rpc('recalculate_trust_score', { p_user_id: userId });
    return (data as number) ?? 0;
  }, []);

  return {
    // Vouching
    fetchVouchesForUser,
    hasVouched,
    submitVouch,
    removeVouch,
    // Reviews
    fetchReviewsForUser,
    submitReview,
    hasPendingReview,
    // Mutual check-ins
    fetchMutualCheckIns,
    // Trust score
    refreshTrustScore,
    // Helpers
    getTrustTier,
    getTrustLabel,
    getTrustColor,
  };
}
