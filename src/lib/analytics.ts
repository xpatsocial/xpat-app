/**
 * Centralized analytics & retention tracking for x/pat
 *
 * All events flow through PostHog. MMKV handles persistent local state
 * (session count, install date, streaks). No new dependencies.
 */
import { MMKV } from 'react-native-mmkv';

// Dedicated MMKV instance for analytics state (separate from query cache)
const store = new MMKV({ id: 'xpat-analytics' });

// ---------------------------------------------------------------------------
// Capture function — set by posthog.ts after init to avoid circular imports
// ---------------------------------------------------------------------------
let _capture: (event: string, properties?: Record<string, unknown>) => void = () => {};

/** Called by posthog.ts once the client is ready. */
export function setCaptureFn(fn: (event: string, properties?: Record<string, unknown>) => void): void {
  _capture = fn;
}

function posthogTrack(event: string, properties?: Record<string, unknown>): void {
  _capture(event, properties);
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
const KEY_SESSION_COUNT = 'analytics:session_count';
const KEY_INSTALL_DATE = 'analytics:install_date';
const KEY_STREAK_COUNT = 'analytics:streak_count';
const KEY_LAST_OPEN_DATE = 'analytics:last_open_date';
const KEY_FIRST_SPOT_SAVED = 'analytics:first_spot_saved';
const KEY_FIRST_CONNECTION = 'analytics:first_connection';
const KEY_FIRST_CHAT = 'analytics:first_chat';
const KEY_FIRST_SPOT_ADDED = 'analytics:first_spot_added';

// ---------------------------------------------------------------------------
// Session & Install helpers
// ---------------------------------------------------------------------------

/** Increment and return the current session number (persisted in MMKV). */
export function getSessionNumber(): number {
  const current = store.getNumber(KEY_SESSION_COUNT) ?? 0;
  const next = current + 1;
  store.set(KEY_SESSION_COUNT, next);
  return next;
}

/** Calculate days elapsed since the first recorded app open. */
export function getDaysSinceInstall(): number {
  const installDate = store.getString(KEY_INSTALL_DATE);
  if (!installDate) {
    // First time — record now
    store.set(KEY_INSTALL_DATE, new Date().toISOString());
    return 0;
  }
  const diff = Date.now() - new Date(installDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Streak tracking
// ---------------------------------------------------------------------------

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Call once per app open. Updates the streak counter and fires the
 * appropriate streak event (continued or broken).
 */
export function updateStreak(): void {
  const today = todayDateString();
  const lastOpen = store.getString(KEY_LAST_OPEN_DATE);
  const currentStreak = store.getNumber(KEY_STREAK_COUNT) ?? 0;

  if (!lastOpen) {
    // First open ever
    store.set(KEY_STREAK_COUNT, 1);
    store.set(KEY_LAST_OPEN_DATE, today);
    return;
  }

  if (lastOpen === today) {
    // Already opened today — no change
    return;
  }

  const lastDate = new Date(lastOpen);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day — extend streak
    const newStreak = currentStreak + 1;
    store.set(KEY_STREAK_COUNT, newStreak);
    store.set(KEY_LAST_OPEN_DATE, today);
    posthogTrack('streak_continued', { streak_count: newStreak });
  } else if (diffDays > 1) {
    // Streak broken
    posthogTrack('streak_broken', { previous_streak_count: currentStreak });
    store.set(KEY_STREAK_COUNT, 1);
    store.set(KEY_LAST_OPEN_DATE, today);
  }
}

// ---------------------------------------------------------------------------
// Screen time tracker
// ---------------------------------------------------------------------------

/**
 * Start tracking time on a screen. Returns a cleanup function that
 * fires `screen_viewed` with `time_spent_ms` when called.
 *
 * Usage in useEffect:
 * ```
 * useEffect(() => trackScreenTime('Feed'), []);
 * ```
 */
export function trackScreenTime(screenName: string): () => void {
  const start = Date.now();
  posthogTrack('screen_viewed', { screen_name: screenName });
  return () => {
    const elapsed = Date.now() - start;
    posthogTrack('screen_viewed', {
      screen_name: screenName,
      time_spent_ms: elapsed,
      action: 'leave',
    });
  };
}

// ---------------------------------------------------------------------------
// Identify (PostHog user properties)
// ---------------------------------------------------------------------------

let _identifyFn: ((id: string, props?: Record<string, unknown>) => void) | null = null;

/** Must be called once after PostHog initialises (e.g. in provider). */
export function setIdentifyFn(fn: (id: string, props?: Record<string, unknown>) => void): void {
  _identifyFn = fn;
}

/** Identify the current user with retention-relevant properties. */
export function identifyUser(
  userId: string,
  properties: {
    city?: string;
    signup_date?: string;
    referral_source?: string;
    onboarding_completed?: boolean;
    spots_saved_count?: number;
    connections_count?: number;
  },
): void {
  if (_identifyFn) {
    _identifyFn(userId, properties);
  }
}

// ---------------------------------------------------------------------------
// Activation events (one-time milestones)
// ---------------------------------------------------------------------------

function trackOnce(key: string, event: string, properties?: Record<string, unknown>): void {
  if (store.getBoolean(key)) return;
  store.set(key, true);
  posthogTrack(event, properties);
}

export function trackFirstSpotSaved(properties?: Record<string, unknown>): void {
  trackOnce(KEY_FIRST_SPOT_SAVED, 'first_spot_saved', properties);
}

export function trackFirstConnection(properties?: Record<string, unknown>): void {
  trackOnce(KEY_FIRST_CONNECTION, 'first_connection_made', properties);
}

export function trackFirstChatMessage(properties?: Record<string, unknown>): void {
  trackOnce(KEY_FIRST_CHAT, 'first_chat_message', properties);
}

export function trackFirstSpotAdded(properties?: Record<string, unknown>): void {
  trackOnce(KEY_FIRST_SPOT_ADDED, 'first_spot_added', properties);
}

// ---------------------------------------------------------------------------
// Activation events (always fire)
// ---------------------------------------------------------------------------

export function trackOnboardingStarted(): void {
  posthogTrack('onboarding_started');
}

export function trackOnboardingCompleted(properties?: Record<string, unknown>): void {
  posthogTrack('onboarding_completed', properties);
}

export function trackProfileCompleted(properties?: Record<string, unknown>): void {
  posthogTrack('profile_completed', properties);
}

// ---------------------------------------------------------------------------
// Engagement events
// ---------------------------------------------------------------------------

export function trackSpotViewed(properties: {
  spot_id: number;
  category?: string;
  city?: string;
  source?: 'map' | 'feed' | 'search' | 'discovery' | 'similar';
}): void {
  posthogTrack('spot_viewed', properties);
}

export function trackSpotSaved(properties: {
  spot_id: number;
  category?: string;
  city?: string;
}): void {
  posthogTrack('spot_saved', properties);
}

export function trackSpotUpvoted(properties: { spot_id: number }): void {
  posthogTrack('spot_upvoted', properties);
}

export function trackConnectionSent(properties: {
  source?: 'discovery' | 'profile' | 'chat';
}): void {
  posthogTrack('connection_sent', properties);
}

export function trackChatMessageSent(properties: {
  channel_type?: 'city' | 'dm';
}): void {
  posthogTrack('chat_message_sent', properties);
}

export function trackCheckInCompleted(properties: {
  spot_id: number;
  city?: string;
}): void {
  posthogTrack('check_in_completed', properties);
}

export function trackScreenViewed(properties: {
  screen_name: string;
  time_spent_ms?: number;
}): void {
  posthogTrack('screen_viewed', properties);
}

// ---------------------------------------------------------------------------
// Referral events
// ---------------------------------------------------------------------------

export function trackReferralLinkShared(properties: {
  channel?: 'whatsapp' | 'instagram' | 'copy' | 'other';
}): void {
  posthogTrack('referral_link_shared', properties);
}

export function trackReferralLinkClicked(properties: {
  referrer_id?: string;
}): void {
  posthogTrack('referral_link_clicked', properties);
}

export function trackReferralCompleted(): void {
  posthogTrack('referral_completed');
}

export function trackInviteScreenViewed(): void {
  posthogTrack('invite_screen_viewed');
}

export function trackReferralPromptShown(): void {
  posthogTrack('referral_prompt_shown');
}

export function trackReferralPromptAccepted(): void {
  posthogTrack('referral_prompt_accepted');
}

export function trackReferralPromptDismissed(): void {
  posthogTrack('referral_prompt_dismissed');
}

// ---------------------------------------------------------------------------
// Retention signals
// ---------------------------------------------------------------------------

/** Track app_opened with session context. Call once per cold start. */
export function trackAppOpened(): void {
  const sessionNumber = getSessionNumber();
  const daysSinceInstall = getDaysSinceInstall();
  posthogTrack('app_opened', {
    session_number: sessionNumber,
    days_since_install: daysSinceInstall,
  });
  updateStreak();
}

export function trackPushNotificationOpened(properties: {
  notification_type?: string;
}): void {
  posthogTrack('push_notification_opened', properties);
}

// ---------------------------------------------------------------------------
// Share / Card events
// ---------------------------------------------------------------------------

export function trackCardGenerated(properties: { card_type?: string }): void {
  posthogTrack('card_generated', properties);
}

export function trackCardShared(properties: {
  card_type?: string;
  channel?: string;
}): void {
  posthogTrack('card_shared', properties);
}

export function trackCardSaved(properties: { card_type?: string }): void {
  posthogTrack('card_saved', properties);
}

// ---------------------------------------------------------------------------
// Auth events
// ---------------------------------------------------------------------------

export function trackSignup(properties: {
  method: 'apple' | 'google' | 'email';
}): void {
  posthogTrack('sign_up', properties);
}

export function trackSignin(properties: {
  method: 'apple' | 'google' | 'email';
}): void {
  posthogTrack('sign_in', properties);
}

// ---------------------------------------------------------------------------
// Feature flags (PostHog)
// ---------------------------------------------------------------------------

let _rawPostHogClient: any = null;

/** Call once after PostHog initialises with the raw client reference. */
export function setPostHogClient(client: any): void {
  _rawPostHogClient = client;
}

/**
 * Check a PostHog feature flag synchronously.
 * Returns the flag value (boolean or string variant) or undefined if unavailable.
 *
 * Placeholder flags for A/B testing:
 * - `referral_prompt_timing` — 'after_first_save' | 'after_third_save'
 * - `onboarding_flow` — 'standard' | 'streamlined'
 * - `streak_notifications` — 'enabled' | 'disabled'
 */
export function isFeatureEnabled(flag: string): boolean {
  if (!_rawPostHogClient) return false;
  try {
    return !!_rawPostHogClient.isFeatureEnabled(flag);
  } catch {
    return false;
  }
}

/**
 * Get feature flag variant value (for multivariate flags).
 * Returns the variant string or undefined.
 */
export function getFeatureFlagValue(flag: string): string | undefined {
  if (!_rawPostHogClient) return undefined;
  try {
    const val = _rawPostHogClient.getFeatureFlag(flag);
    return typeof val === 'string' ? val : undefined;
  } catch {
    return undefined;
  }
}
