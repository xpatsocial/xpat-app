/**
 * Investment Tracker — Nir Eyal Hook Model Phase 4
 *
 * Measures each user's "stored value" in x/pat. The more value stored,
 * the higher the switching cost and the stronger the habit loop.
 *
 * Tracked dimensions:
 *   - Saved spots count
 *   - Connections count
 *   - Messages sent
 *   - Check-ins recorded
 *   - Profile completeness (0-100%)
 *   - Streak length (current daily login streak)
 *
 * The composite "investment score" correlates with retention — users with
 * higher scores are less likely to churn. Track this in PostHog for
 * cohort analysis.
 */
import { supabase } from './supabase';
import { MMKV } from 'react-native-mmkv';

const store = new MMKV({ id: 'xpat-investment' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvestmentSnapshot {
  savedSpots: number;
  connections: number;
  messagesSent: number;
  checkIns: number;
  profileCompleteness: number; // 0-100
  streakLength: number;
  /** Composite score: weighted sum of all dimensions (0-100 scale) */
  investmentScore: number;
  /** ISO timestamp of when this snapshot was taken */
  measuredAt: string;
}

// ---------------------------------------------------------------------------
// Weights for composite score
// ---------------------------------------------------------------------------

/**
 * These weights reflect which investments create the most switching cost.
 * Social graph (connections) and content (saved spots, messages) weigh
 * highest because they represent irreplaceable user-generated value.
 *
 * Max raw points before normalization:
 *   savedSpots: 50 spots * 3 = 150
 *   connections: 30 connections * 5 = 150
 *   messagesSent: 200 messages * 0.5 = 100
 *   checkIns: 50 check-ins * 2 = 100
 *   profileCompleteness: 100% * 1 = 100
 *   streakLength: 30 days * 3 = 90
 *   Total max ≈ 690 -> normalized to 100
 */
const WEIGHTS = {
  savedSpots: 3,
  connections: 5,
  messagesSent: 0.5,
  checkIns: 2,
  profileCompleteness: 1,
  streakLength: 3,
};

// Caps prevent any single dimension from dominating
const CAPS = {
  savedSpots: 50,
  connections: 30,
  messagesSent: 200,
  checkIns: 50,
  profileCompleteness: 100,
  streakLength: 30,
};

const MAX_RAW_SCORE =
  CAPS.savedSpots * WEIGHTS.savedSpots +
  CAPS.connections * WEIGHTS.connections +
  CAPS.messagesSent * WEIGHTS.messagesSent +
  CAPS.checkIns * WEIGHTS.checkIns +
  CAPS.profileCompleteness * WEIGHTS.profileCompleteness +
  CAPS.streakLength * WEIGHTS.streakLength;

// ---------------------------------------------------------------------------
// Profile Completeness Calculator
// ---------------------------------------------------------------------------

interface ProfileFields {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  nationality?: string | null;
  current_city?: string | null;
  travel_style?: string | null;
  interests?: string[] | null;
  languages?: string[] | null;
  occupation?: string | null;
  instagram_handle?: string | null;
}

function calculateProfileCompleteness(profile: ProfileFields): number {
  const fields: Array<keyof ProfileFields> = [
    'display_name',
    'bio',
    'avatar_url',
    'nationality',
    'current_city',
    'travel_style',
    'interests',
    'languages',
    'occupation',
    'instagram_handle',
  ];

  let filled = 0;
  for (const field of fields) {
    const val = profile[field];
    if (val && (typeof val !== 'object' || (Array.isArray(val) && val.length > 0))) {
      filled++;
    }
  }

  return Math.round((filled / fields.length) * 100);
}

// ---------------------------------------------------------------------------
// Fetch Investment Data from Supabase
// ---------------------------------------------------------------------------

/**
 * Measure the user's current investment in x/pat.
 *
 * Makes parallel queries to Supabase for each dimension, computes the
 * composite score, caches locally, and returns the snapshot.
 *
 * Call this:
 * - On app open (cached result is fine for same-day repeated calls)
 * - After major actions (saving a spot, making a connection)
 * - For retention analytics (pipe to PostHog)
 */
export async function measureInvestment(userId: string): Promise<InvestmentSnapshot | null> {
  // Check cache: only re-measure once per day at most
  const cacheKey = `investment:${userId}`;
  const today = new Date().toISOString().split('T')[0];
  const cached = store.getString(cacheKey);

  if (cached) {
    try {
      const parsed: InvestmentSnapshot = JSON.parse(cached);
      if (parsed.measuredAt.startsWith(today)) {
        return parsed;
      }
    } catch {
      // Stale/corrupt cache — re-measure
    }
  }

  try {
    // Parallel queries for all dimensions
    const [
      savedSpotsResult,
      connectionsResult,
      messagesResult,
      checkInsResult,
      profileResult,
      streakResult,
    ] = await Promise.all([
      supabase
        .from('saved_spots')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted'),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId),
      supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, nationality, current_city, travel_style, interests, languages, occupation, instagram_handle')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .eq('streak_type', 'daily_login')
        .maybeSingle(),
    ]);

    const savedSpots = savedSpotsResult.count ?? 0;
    const connections = connectionsResult.count ?? 0;
    const messagesSent = messagesResult.count ?? 0;
    const checkIns = checkInsResult.count ?? 0;
    const profileCompleteness = profileResult.data
      ? calculateProfileCompleteness(profileResult.data)
      : 0;
    const streakLength = streakResult.data?.current_streak ?? 0;

    // Calculate composite investment score (0-100)
    const rawScore =
      Math.min(savedSpots, CAPS.savedSpots) * WEIGHTS.savedSpots +
      Math.min(connections, CAPS.connections) * WEIGHTS.connections +
      Math.min(messagesSent, CAPS.messagesSent) * WEIGHTS.messagesSent +
      Math.min(checkIns, CAPS.checkIns) * WEIGHTS.checkIns +
      Math.min(profileCompleteness, CAPS.profileCompleteness) * WEIGHTS.profileCompleteness +
      Math.min(streakLength, CAPS.streakLength) * WEIGHTS.streakLength;

    const investmentScore = Math.round((rawScore / MAX_RAW_SCORE) * 100);

    const snapshot: InvestmentSnapshot = {
      savedSpots,
      connections,
      messagesSent,
      checkIns,
      profileCompleteness,
      streakLength,
      investmentScore,
      measuredAt: new Date().toISOString(),
    };

    // Cache locally
    store.set(cacheKey, JSON.stringify(snapshot));

    return snapshot;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Investment Tier (for UI and engagement prompts)
// ---------------------------------------------------------------------------

export type InvestmentTier = 'newcomer' | 'explorer' | 'regular' | 'local' | 'veteran';

/**
 * Map investment score to a human-readable tier.
 * Useful for showing progress and triggering appropriate prompts.
 */
export function getInvestmentTier(score: number): InvestmentTier {
  if (score >= 80) return 'veteran';
  if (score >= 55) return 'local';
  if (score >= 30) return 'regular';
  if (score >= 10) return 'explorer';
  return 'newcomer';
}

/**
 * Get the next meaningful investment action to suggest.
 * Returns the dimension where the user has the most room to grow,
 * weighted by impact on retention.
 */
export function getNextInvestmentAction(snapshot: InvestmentSnapshot): {
  action: string;
  dimension: keyof typeof WEIGHTS;
  message: string;
} {
  const gaps = [
    {
      dimension: 'connections' as const,
      gap: (CAPS.connections - Math.min(snapshot.connections, CAPS.connections)) * WEIGHTS.connections,
      action: 'connect',
      message: 'Connect with a nomad nearby — your network is your superpower',
    },
    {
      dimension: 'savedSpots' as const,
      gap: (CAPS.savedSpots - Math.min(snapshot.savedSpots, CAPS.savedSpots)) * WEIGHTS.savedSpots,
      action: 'save_spot',
      message: 'Save a spot you love — build your personal city guide',
    },
    {
      dimension: 'profileCompleteness' as const,
      gap: (CAPS.profileCompleteness - snapshot.profileCompleteness) * WEIGHTS.profileCompleteness,
      action: 'complete_profile',
      message: 'Complete your profile — nomads with full profiles get 3x more connections',
    },
    {
      dimension: 'checkIns' as const,
      gap: (CAPS.checkIns - Math.min(snapshot.checkIns, CAPS.checkIns)) * WEIGHTS.checkIns,
      action: 'check_in',
      message: 'Check in at a spot — let others know where the vibe is',
    },
    {
      dimension: 'messagesSent' as const,
      gap: (CAPS.messagesSent - Math.min(snapshot.messagesSent, CAPS.messagesSent)) * WEIGHTS.messagesSent,
      action: 'send_message',
      message: 'Say hi in city chat — the best connections start with a message',
    },
    {
      dimension: 'streakLength' as const,
      gap: (CAPS.streakLength - Math.min(snapshot.streakLength, CAPS.streakLength)) * WEIGHTS.streakLength,
      action: 'maintain_streak',
      message: 'Open the app tomorrow to keep your streak alive',
    },
  ];

  // Sort by largest gap (most room to grow, weighted by importance)
  gaps.sort((a, b) => b.gap - a.gap);

  return gaps[0];
}

// ---------------------------------------------------------------------------
// Invalidate Cache (call after investment-changing actions)
// ---------------------------------------------------------------------------

/**
 * Clear the cached investment snapshot so the next call to
 * measureInvestment() fetches fresh data.
 */
export function invalidateInvestmentCache(userId: string): void {
  store.delete(`investment:${userId}`);
}

// ---------------------------------------------------------------------------
// Reset (for testing / account deletion)
// ---------------------------------------------------------------------------

export function resetInvestmentData(): void {
  store.clearAll();
}
