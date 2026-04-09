/**
 * useReferrals — Referral system hook for invite tracking + badge tiers.
 *
 * Provides referral code, stats, share/copy actions, and code application.
 * Badge tiers unlock as completed referrals accumulate.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert, Share, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// ── Badge Tier Definitions ──────────────────────────────────────────────────
export interface BadgeTier {
  tier: number;
  name: string | null;
  minReferrals: number;
  maxReferrals: number | null; // null = unlimited
}

export const BADGE_TIERS: BadgeTier[] = [
  { tier: 0, name: null, minReferrals: 0, maxReferrals: 0 },
  { tier: 1, name: 'Nomad Scout', minReferrals: 1, maxReferrals: 4 },
  { tier: 2, name: 'Verified Nomad', minReferrals: 5, maxReferrals: 9 },
  { tier: 3, name: 'City Ambassador', minReferrals: 10, maxReferrals: 19 },
  { tier: 4, name: 'Founding Explorer', minReferrals: 20, maxReferrals: null },
];

export function getBadgeTier(completed: number): BadgeTier {
  if (completed >= 20) return BADGE_TIERS[4];
  if (completed >= 10) return BADGE_TIERS[3];
  if (completed >= 5) return BADGE_TIERS[2];
  if (completed >= 1) return BADGE_TIERS[1];
  return BADGE_TIERS[0];
}

/** Returns the next tier or null if already at max */
export function getNextTier(current: BadgeTier): BadgeTier | null {
  if (current.tier >= 4) return null;
  return BADGE_TIERS[current.tier + 1];
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface ReferralStats {
  total: number;
  completed: number;
  pending: number;
  badgeTier: number;
  badgeName: string | null;
}

export interface ReferralRecord {
  id: string;
  invitee_id: string;
  status: 'pending' | 'completed';
  created_at: string;
  invitee_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useReferrals() {
  const { user, profile } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats>({
    total: 0, completed: 0, pending: 0, badgeTier: 0, badgeName: null,
  });
  const [recentReferrals, setRecentReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate a referral code from username or user id prefix
  const generateCode = useCallback((userId: string, username?: string | null): string => {
    if (username) return username.toLowerCase().replace(/[^a-z0-9]/g, '');
    return userId.substring(0, 8);
  }, []);

  // Fetch or create referral code + load stats
  const fetchReferralData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get/set referral code from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referral_code, username')
        .eq('id', user.id)
        .single();

      let code = profileData?.referral_code;
      if (!code) {
        code = generateCode(user.id, profileData?.username);
        // Attempt to save — may already exist for another user, so append random suffix if needed
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('id', user.id);

        if (updateError) {
          // Collision — append 4 random chars
          code = `${code}${Math.random().toString(36).substring(2, 6)}`;
          await supabase
            .from('profiles')
            .update({ referral_code: code })
            .eq('id', user.id);
        }
      }
      setReferralCode(code);

      // 2. Fetch referral completions where this user is the referrer
      const { data: referrals } = await supabase
        .from('referral_completions')
        .select('id, invitee_id, status, created_at, profiles:invitee_id(display_name, avatar_url)')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const records = (referrals ?? []) as unknown as ReferralRecord[];
      const completed = records.filter(r => r.status === 'completed').length;
      const pending = records.filter(r => r.status === 'pending').length;
      const badge = getBadgeTier(completed);

      setStats({
        total: records.length,
        completed,
        pending,
        badgeTier: badge.tier,
        badgeName: badge.name,
      });
      setRecentReferrals(records);
    } catch (err) {
      // Silently fail — referral data is non-critical
    } finally {
      setLoading(false);
    }
  }, [user, generateCode]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Share referral link via native Share sheet
  const shareReferralLink = useCallback(async () => {
    if (!referralCode) return;
    const link = `https://xpat.social/invite/${referralCode}`;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: Platform.OS === 'ios'
          ? `Join me on x/pat — the nomad community app. Use my invite link: ${link}`
          : link,
        url: Platform.OS === 'ios' ? link : undefined,
        title: 'Join x/pat',
      });
    } catch {
      // User cancelled share
    }
  }, [referralCode]);

  // Copy referral link to clipboard
  const copyReferralLink = useCallback(async () => {
    if (!referralCode) return;
    const link = `https://xpat.social/invite/${referralCode}`;
    await Clipboard.setStringAsync(link);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [referralCode]);

  // Apply a referral code during onboarding — links invitee to referrer
  const applyReferralCode = useCallback(async (code: string) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    // Look up the referrer by code
    const { data: referrer, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code.toLowerCase().trim())
      .single();

    if (lookupError || !referrer) {
      return { error: { message: 'Invalid referral code' } };
    }

    if (referrer.id === user.id) {
      return { error: { message: 'You cannot refer yourself' } };
    }

    // Check if already referred
    const { data: existing } = await supabase
      .from('referral_completions')
      .select('id')
      .eq('invitee_id', user.id)
      .maybeSingle();

    if (existing) {
      return { error: { message: 'Referral already applied' } };
    }

    // Insert referral record
    const { error: insertError } = await supabase
      .from('referral_completions')
      .insert({
        referrer_id: referrer.id,
        invitee_id: user.id,
        status: 'pending',
      });

    if (insertError) {
      return { error: { message: 'Could not apply referral code' } };
    }

    return { error: null };
  }, [user]);

  return {
    referralCode,
    referralStats: stats,
    recentReferrals,
    loading,
    shareReferralLink,
    copyReferralLink,
    applyReferralCode,
    refresh: fetchReferralData,
  };
}
