/**
 * Client-side sliding-window rate limiter.
 * Prevents spam by tracking action timestamps in memory.
 * Resets on app restart (intentional — server-side RLS is the real guard).
 */

interface RateLimitConfig {
  /** Max allowed actions within the window */
  maxActions: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/** Preset limits per action type */
const LIMITS: Record<string, RateLimitConfig> = {
  chat_message:       { maxActions: 10, windowMs: 60_000 },    // 10 msgs / min
  direct_message:     { maxActions: 10, windowMs: 60_000 },    // 10 DMs / min
  post:               { maxActions: 3,  windowMs: 60_000 },    // 3 posts / min
  comment:            { maxActions: 10, windowMs: 60_000 },    // 10 comments / min
  spot:               { maxActions: 3,  windowMs: 300_000 },   // 3 spots / 5 min
  event:              { maxActions: 2,  windowMs: 300_000 },   // 2 events / 5 min
  report:             { maxActions: 5,  windowMs: 300_000 },   // 5 reports / 5 min
  connection_request: { maxActions: 20, windowMs: 300_000 },   // 20 requests / 5 min
  like:               { maxActions: 30, windowMs: 60_000 },    // 30 likes / min
  rsvp:               { maxActions: 10, windowMs: 60_000 },    // 10 RSVPs / min
};

/** In-memory store: action type → array of timestamps */
const store: Record<string, number[]> = {};

/**
 * Check whether an action is allowed under the rate limit.
 * If allowed, records the action. If denied, returns false.
 */
export function checkRateLimit(action: string): { allowed: boolean; retryAfterMs?: number } {
  const config = LIMITS[action];
  if (!config) return { allowed: true }; // Unknown action = no limit

  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Prune expired timestamps
  store[action] = (store[action] || []).filter((t) => t > cutoff);

  if (store[action].length >= config.maxActions) {
    const oldestInWindow = store[action][0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  // Record this action
  store[action].push(now);
  return { allowed: true };
}

/**
 * Helper that checks rate limit and returns a user-friendly message if denied.
 * Returns null if allowed, or an error string if rate-limited.
 */
export function getRateLimitError(action: string): string | null {
  const { allowed, retryAfterMs } = checkRateLimit(action);
  if (allowed) return null;

  const seconds = Math.ceil((retryAfterMs || 0) / 1000);
  return `You're doing that too fast. Try again in ${seconds}s.`;
}
