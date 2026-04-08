/**
 * useHookCycle — React hook that ties Nir Eyal's Hook Model phases
 * into the x/pat app lifecycle.
 *
 * Usage:
 * ```tsx
 * function ExploreScreen() {
 *   const { triggerProfile, investment, suggestedAction } = useHookCycle('Explore');
 *   // Use suggestedAction to show contextual prompts
 *   // Use investment.investmentScore for retention analysis
 * }
 * ```
 *
 * What it does on mount:
 * 1. TRIGGER: Records the app open + first screen (builds trigger profile)
 * 2. INVESTMENT: Measures stored value asynchronously
 * 3. Schedules next external trigger (rate-limited to 1/day)
 * 4. Reports investment score to PostHog for cohort analysis
 */
import { useEffect, useState, useRef } from 'react';
import { recordAppOpen, getTriggerProfile, scheduleNextTrigger, type HookCycle } from '../lib/triggers';
import {
  measureInvestment,
  getNextInvestmentAction,
  getInvestmentTier,
  invalidateInvestmentCache,
  type InvestmentSnapshot,
  type InvestmentTier,
} from '../lib/investmentTracker';
import { useAuth } from './useAuth';

// Lazy import to avoid circular dependency — posthog capture set via analytics.ts
let _capture: ((event: string, props?: Record<string, unknown>) => void) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const analytics = require('../lib/analytics');
  if (analytics.setCaptureFn) {
    // Already configured by posthog.ts — we just need the track function
  }
} catch {
  // Analytics not available — non-critical
}

interface HookCycleResult {
  /** User's trigger profile (null if < 5 sessions recorded) */
  triggerProfile: ReturnType<typeof getTriggerProfile>;
  /** Current investment snapshot (null while loading) */
  investment: InvestmentSnapshot | null;
  /** Investment tier label */
  investmentTier: InvestmentTier;
  /** Suggested next action to deepen investment */
  suggestedAction: {
    action: string;
    dimension: string;
    message: string;
  } | null;
  /** Whether investment data is still loading */
  loading: boolean;
  /** Force refresh investment data (call after save/connect/check-in) */
  refreshInvestment: () => void;
}

/**
 * Hook that manages the full habit loop for a given screen.
 *
 * @param screenName - Current screen name (used for trigger profiling)
 * @param options.city - User's current city (for notification templates)
 * @param options.skipTriggerSchedule - Set true on screens where scheduling doesn't make sense
 */
export function useHookCycle(
  screenName: string,
  options?: { city?: string; skipTriggerSchedule?: boolean },
): HookCycleResult {
  const { user } = useAuth();
  const [investment, setInvestment] = useState<InvestmentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRecorded = useRef(false);

  // Phase 1: TRIGGER — record this app open for pattern learning
  useEffect(() => {
    if (hasRecorded.current) return;
    hasRecorded.current = true;
    recordAppOpen(screenName);
  }, [screenName]);

  // Phase 4: INVESTMENT — measure stored value
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const snapshot = await measureInvestment(user.id);
      if (!cancelled) {
        setInvestment(snapshot);
        setLoading(false);

        // Report to PostHog for retention cohort analysis
        if (snapshot) {
          try {
            const analytics = require('../lib/analytics');
            // Use the posthog track function if available
            if (typeof analytics.trackScreenViewed === 'function') {
              // Piggyback investment data onto the existing tracking
              analytics.trackScreenViewed({
                screen_name: screenName,
                investment_score: snapshot.investmentScore,
                investment_tier: getInvestmentTier(snapshot.investmentScore),
                saved_spots: snapshot.savedSpots,
                connections: snapshot.connections,
                streak_length: snapshot.streakLength,
                profile_completeness: snapshot.profileCompleteness,
              });
            }
          } catch {
            // Non-critical
          }
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, screenName]);

  // Schedule next external trigger (rate-limited, fire-and-forget)
  useEffect(() => {
    if (options?.skipTriggerSchedule) return;
    if (!options?.city) return;

    scheduleNextTrigger({ city: options.city }).catch(() => {
      // Non-critical — notification scheduling failure shouldn't crash anything
    });
  }, [options?.city, options?.skipTriggerSchedule]);

  // Computed values
  const triggerProfile = getTriggerProfile();
  const investmentTier = getInvestmentTier(investment?.investmentScore ?? 0);
  const suggestedAction = investment ? getNextInvestmentAction(investment) : null;

  const refreshInvestment = () => {
    if (!user?.id) return;
    invalidateInvestmentCache(user.id);
    setLoading(true);
    measureInvestment(user.id).then((snapshot) => {
      setInvestment(snapshot);
      setLoading(false);
    });
  };

  return {
    triggerProfile,
    investment,
    investmentTier,
    suggestedAction,
    loading,
    refreshInvestment,
  };
}
