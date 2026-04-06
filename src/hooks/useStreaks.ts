/**
 * useStreaks — manages daily login streak tracking
 *
 * The streak fires once per calendar day (user's local date).
 * A streak freeze (Duolingo mechanic) allows missing one day without breaking.
 * Data is server-authoritative: streak state lives in user_streaks table.
 */
import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const LAST_STREAK_DATE_KEY = 'xpat_last_streak_date';

export function useStreaks(userId: string | undefined) {
  const appStateRef = useRef(AppState.currentState);

  const checkAndUpdateStreak = useCallback(async () => {
    if (!userId) return;

    // Use local date string as day key (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // Debounce: only run once per calendar day per session
    const lastDate = await AsyncStorage.getItem(LAST_STREAK_DATE_KEY);
    if (lastDate === today) return;

    try {
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', 'daily_login')
        .maybeSingle();

      const now = new Date();
      const todayDate = new Date(today);

      if (!streakData) {
        // First time — create streak
        await supabase.from('user_streaks').insert({
          user_id: userId,
          streak_type: 'daily_login',
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        });
      } else {
        const lastActivity = streakData.last_activity_date
          ? new Date(streakData.last_activity_date)
          : null;

        if (!lastActivity) {
          // Reset case
          await supabase.from('user_streaks').update({
            current_streak: 1,
            last_activity_date: today,
          }).eq('id', streakData.id);
        } else {
          const daysDiff = Math.floor(
            (todayDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff === 0) {
            // Already updated today — do nothing
            await AsyncStorage.setItem(LAST_STREAK_DATE_KEY, today);
            return;
          } else if (daysDiff === 1) {
            // Consecutive day — extend streak
            const newStreak = streakData.current_streak + 1;
            await supabase.from('user_streaks').update({
              current_streak: newStreak,
              longest_streak: Math.max(streakData.longest_streak, newStreak),
              last_activity_date: today,
            }).eq('id', streakData.id);
          } else if (daysDiff === 2 && streakData.streak_freeze_count > 0) {
            // Missed one day but has a freeze — use freeze
            const newStreak = streakData.current_streak + 1;
            await supabase.from('user_streaks').update({
              current_streak: newStreak,
              longest_streak: Math.max(streakData.longest_streak, newStreak),
              last_activity_date: today,
              streak_freeze_count: streakData.streak_freeze_count - 1,
            }).eq('id', streakData.id);
          } else {
            // Streak broken — reset to 1
            await supabase.from('user_streaks').update({
              current_streak: 1,
              last_activity_date: today,
            }).eq('id', streakData.id);
          }
        }
      }

      // Award daily login XP (fire-and-forget)
      supabase.functions.invoke('award-xp', {
        body: { reason: 'daily_login', reference_id: today },
      }).catch(() => {});

      // Persist local debounce key
      await AsyncStorage.setItem(LAST_STREAK_DATE_KEY, today);
    } catch {
      // Non-critical — don't crash the app for streak errors
    }
  }, [userId]);

  useEffect(() => {
    // Check streak on mount
    checkAndUpdateStreak();

    // Also check when app returns to foreground (midnight edge case)
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current === 'background' && nextState === 'active') {
        checkAndUpdateStreak();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [checkAndUpdateStreak]);
}
