/**
 * useOnboardingFunnel — Gold Standard Onboarding Analytics
 *
 * Framework: Delayed Registration + Progressive Value
 * - Duolingo: moving signup back = +20% DAU (Appcues)
 * - TikTok: zero-signup browsing → highest retention
 * - Pre-permission priming: 65% opt-in vs 25% baseline (Appcues)
 *
 * Tracks every onboarding step for funnel optimization.
 * Optimal flow: Map preview → value moment → soft signup wall
 *
 * Sources:
 * - goodux.appcues.com/blog/duolingo-user-onboarding
 * - userguiding.com/blog/duolingo-onboarding-ux
 * - appcues.com/blog/mobile-permission-priming
 */
import { useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';

// Lazy MMKV — avoid TurboModule init at module load on iOS New Architecture
let _store: MMKV | null = null;
function store_(): MMKV {
  if (!_store) _store = new MMKV({ id: 'xpat-onboarding' });
  return _store;
}

// ---------------------------------------------------------------------------
// Onboarding steps (ordered by optimal flow)
// ---------------------------------------------------------------------------

export type OnboardingStep =
  | 'app_opened'          // First app launch
  | 'map_previewed'       // Saw map with real spots (value-first)
  | 'spot_tapped'         // Tapped a spot on map (engagement signal)
  | 'signup_prompted'     // Soft wall shown (tried to save/message)
  | 'signup_completed'    // Auth completed
  | 'vibes_selected'      // Profile: vibes/interests
  | 'city_selected'       // Profile: current city
  | 'profile_completed'   // Display name + avatar set
  | 'first_spot_saved'    // Core action completed
  | 'notifications_opted' // Push notification consent
  | 'location_granted';   // Location permission

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEY_ANONYMOUS_ID = 'onboarding:anonymous_id';
const KEY_STARTED_AT = 'onboarding:started_at';
const KEY_COMPLETED_STEPS = 'onboarding:completed_steps';
const KEY_STEP_TIMESTAMPS = 'onboarding:step_timestamps';

// ---------------------------------------------------------------------------
// PostHog capture (lazy)
// ---------------------------------------------------------------------------

let _capture: (event: string, properties?: Record<string, unknown>) => void = () => {};

export function setOnboardingCaptureFn(
  fn: (event: string, properties?: Record<string, unknown>) => void,
): void {
  _capture = fn;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnboardingFunnel() {
  /**
   * Initialize onboarding tracking on first app launch.
   */
  const initOnboarding = useCallback(() => {
    if (!store_().getString(KEY_STARTED_AT)) {
      store_().set(KEY_STARTED_AT, new Date().toISOString());
      store_().set(KEY_COMPLETED_STEPS, JSON.stringify([]));
      store_().set(KEY_STEP_TIMESTAMPS, JSON.stringify({}));

      // Generate anonymous ID for pre-signup tracking
      const anonId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      store_().set(KEY_ANONYMOUS_ID, anonId);

      _capture('onboarding_started', { anonymous_id: anonId });
    }
  }, []);

  /**
   * Record completion of an onboarding step.
   */
  const completeStep = useCallback((step: OnboardingStep) => {
    const completedRaw = store_().getString(KEY_COMPLETED_STEPS);
    const completed: OnboardingStep[] = completedRaw ? JSON.parse(completedRaw) : [];

    if (completed.includes(step)) return; // Already recorded

    completed.push(step);
    store_().set(KEY_COMPLETED_STEPS, JSON.stringify(completed));

    // Record timestamp
    const timestampsRaw = store_().getString(KEY_STEP_TIMESTAMPS);
    const timestamps: Record<string, string> = timestampsRaw ? JSON.parse(timestampsRaw) : {};
    timestamps[step] = new Date().toISOString();
    store_().set(KEY_STEP_TIMESTAMPS, JSON.stringify(timestamps));

    // Calculate time from start
    const startedAt = store_().getString(KEY_STARTED_AT);
    const elapsedMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;

    _capture('onboarding_step_completed', {
      step,
      step_index: completed.length,
      elapsed_ms: elapsedMs,
      elapsed_seconds: Math.round(elapsedMs / 1000),
      anonymous_id: store_().getString(KEY_ANONYMOUS_ID),
    });

    // Key milestones
    if (step === 'signup_completed') {
      _capture('onboarding_signup_converted', {
        steps_before_signup: completed.indexOf('signup_completed'),
        time_to_signup_ms: elapsedMs,
        saw_map_first: completed.includes('map_previewed'),
        tapped_spot_before_signup: completed.includes('spot_tapped'),
      });
    }

    if (step === 'first_spot_saved') {
      _capture('onboarding_first_value', {
        time_to_value_ms: elapsedMs,
        steps_to_value: completed.length,
      });
    }
  }, []);

  /**
   * Record that a step was skipped.
   */
  const skipStep = useCallback((step: OnboardingStep) => {
    _capture('onboarding_step_skipped', {
      step,
      anonymous_id: store_().getString(KEY_ANONYMOUS_ID),
    });
  }, []);

  /**
   * Get current onboarding state.
   */
  const getOnboardingState = useCallback(() => {
    const completedRaw = store_().getString(KEY_COMPLETED_STEPS);
    const completed: OnboardingStep[] = completedRaw ? JSON.parse(completedRaw) : [];
    const startedAt = store_().getString(KEY_STARTED_AT);

    return {
      completed,
      isComplete: completed.includes('first_spot_saved'),
      stepCount: completed.length,
      startedAt,
      anonymousId: store_().getString(KEY_ANONYMOUS_ID),
    };
  }, []);

  return {
    initOnboarding,
    completeStep,
    skipStep,
    getOnboardingState,
  };
}
