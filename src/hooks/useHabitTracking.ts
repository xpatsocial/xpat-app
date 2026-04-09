/**
 * useHabitTracking — Setup-Aha-Habit Moment Framework (2025)
 *
 * Three distinct activation moments:
 *   Setup = onboarding complete (account created, profile set)
 *   Aha = first time user finds a spot they love (save + positive signal)
 *   Habit = opens app 3+ times per week without external prompt
 *
 * The activation funnel tracks Setup+Aha, but NOT Habit formation.
 * This hook tracks the Habit moment — the hardest and most valuable.
 *
 * Source: patonv.medium.com/designing-for-success-the-set-up-aha-and-habit-moments
 */
import { useCallback, useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';

// Lazy MMKV — avoid TurboModule init at module load on iOS New Architecture
let _store: MMKV | null = null;
function store_(): MMKV {
  if (!_store) _store = new MMKV({ id: 'xpat-habit-tracking' });
  return _store;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEY_WEEKLY_OPENS = 'habit:weekly_opens'; // JSON array of ISO dates
const KEY_HABIT_FORMED = 'habit:formed';
const KEY_HABIT_FORMED_AT = 'habit:formed_at';
const KEY_HABIT_WEEKS_STREAK = 'habit:weeks_streak';
const KEY_LAST_OPEN_DATE = 'habit:last_open_date';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HABIT_THRESHOLD = 3; // 3+ organic opens per week = habit formed
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// PostHog capture (lazy)
// ---------------------------------------------------------------------------

let _capture: (event: string, properties?: Record<string, unknown>) => void = () => {};

export function setHabitCaptureFn(
  fn: (event: string, properties?: Record<string, unknown>) => void,
): void {
  _capture = fn;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHabitTracking(userId?: string | null) {
  /**
   * Record an app open. Call on every foreground event.
   */
  const recordAppOpen = useCallback(() => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastOpen = store_().getString(KEY_LAST_OPEN_DATE);

    // Don't double-count same day
    if (lastOpen === today) return;
    store_().set(KEY_LAST_OPEN_DATE, today);

    // Track weekly opens (rolling 7-day window)
    const weeklyRaw = store_().getString(KEY_WEEKLY_OPENS);
    const weeklyOpens: string[] = weeklyRaw ? JSON.parse(weeklyRaw) : [];

    // Add today
    weeklyOpens.push(today);

    // Trim to last 7 days
    const sevenDaysAgo = new Date(Date.now() - MS_PER_WEEK).toISOString().split('T')[0];
    const recentOpens = weeklyOpens.filter(d => d >= sevenDaysAgo);
    store_().set(KEY_WEEKLY_OPENS, JSON.stringify(recentOpens));

    // Check for habit formation
    const uniqueDays = new Set(recentOpens).size;

    if (uniqueDays >= HABIT_THRESHOLD && !store_().getBoolean(KEY_HABIT_FORMED)) {
      // Habit formed!
      store_().set(KEY_HABIT_FORMED, true);
      store_().set(KEY_HABIT_FORMED_AT, new Date().toISOString());

      _capture('habit_formed', {
        opens_this_week: uniqueDays,
        days_since_signup: Math.floor(
          (Date.now() - new Date(store_().getString('habit:signup_date') ?? Date.now()).getTime()) / (24 * 60 * 60 * 1000)
        ),
      });
    }

    // Track habit streak (consecutive weeks with 3+ opens)
    if (uniqueDays >= HABIT_THRESHOLD) {
      const currentStreak = store_().getNumber(KEY_HABIT_WEEKS_STREAK) ?? 0;
      store_().set(KEY_HABIT_WEEKS_STREAK, currentStreak + 1);
    }

    _capture('app_open_tracked', {
      unique_days_this_week: uniqueDays,
      habit_formed: store_().getBoolean(KEY_HABIT_FORMED) ?? false,
    });
  }, [userId]);

  /**
   * Store signup date for time-to-habit calculation.
   */
  const recordSignup = useCallback(() => {
    if (!store_().getString('habit:signup_date')) {
      store_().set('habit:signup_date', new Date().toISOString());
    }
  }, []);

  /**
   * Get current habit state.
   */
  const getHabitState = useCallback(() => {
    const weeklyRaw = store_().getString(KEY_WEEKLY_OPENS);
    const weeklyOpens: string[] = weeklyRaw ? JSON.parse(weeklyRaw) : [];
    const sevenDaysAgo = new Date(Date.now() - MS_PER_WEEK).toISOString().split('T')[0];
    const recentOpens = weeklyOpens.filter(d => d >= sevenDaysAgo);

    return {
      opensThisWeek: new Set(recentOpens).size,
      habitFormed: store_().getBoolean(KEY_HABIT_FORMED) ?? false,
      habitFormedAt: store_().getString(KEY_HABIT_FORMED_AT) ?? null,
      habitWeeksStreak: store_().getNumber(KEY_HABIT_WEEKS_STREAK) ?? 0,
      opensNeeded: Math.max(0, HABIT_THRESHOLD - new Set(recentOpens).size),
    };
  }, []);

  // Auto-record on mount (app opened)
  useEffect(() => {
    recordAppOpen();
  }, [recordAppOpen]);

  return {
    recordAppOpen,
    recordSignup,
    getHabitState,
  };
}
