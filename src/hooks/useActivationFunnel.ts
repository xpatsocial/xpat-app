/**
 * useActivationFunnel — Butterfield's activation methodology applied to x/pat
 *
 * Tracks every user's progress toward the activation threshold:
 *   - 3 spots saved + 1 chat message sent = ACTIVATED
 *
 * Inspired by Slack's "2,000 messages" magic number where 93% of teams
 * that crossed the threshold retained long-term.
 *
 * This hook:
 * - Reads/writes activation state from MMKV (consistent with analytics.ts)
 * - Fires PostHog events at each milestone
 * - Triggers bot messages via activationBot
 * - Returns progress data for the ActivationProgress component
 *
 * Reference: research/playbook-stewart-butterfield-product-led.md
 */
import { useCallback, useEffect, useState } from 'react';
import { MMKV } from 'react-native-mmkv';
import { triggerBotMessage, initActivationBot } from '../lib/activationBot';

// Lazy MMKV — avoid TurboModule init at module load on iOS New Architecture
let _store: MMKV | null = null;
function store_(): MMKV {
  if (!_store) _store = new MMKV({ id: 'xpat-analytics' });
  return _store;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEY_SPOTS_SAVED_COUNT = 'activation:spots_saved_count';
const KEY_CHAT_MESSAGES_SENT = 'activation:chat_messages_sent';
const KEY_SPOTS_VIEWED_COUNT = 'activation:spots_viewed_count';
const KEY_ACTIVATED = 'activation:completed';
const KEY_ACTIVATED_AT = 'activation:completed_at';
const KEY_STARTED_AT = 'activation:started_at';

// ---------------------------------------------------------------------------
// 48-hour activation window (Butterfield urgency principle)
// ---------------------------------------------------------------------------

const ACTIVATION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// ---------------------------------------------------------------------------
// Thresholds (Butterfield methodology: find the number where retention changes)
// ---------------------------------------------------------------------------

export const ACTIVATION_SPOTS_THRESHOLD = 3;
export const ACTIVATION_CHAT_THRESHOLD = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivationStep {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
  icon: string; // Feather icon name
}

export interface ActivationState {
  /** 0-1 progress toward full activation */
  progress: number;
  /** Whether user has crossed the activation threshold */
  isActivated: boolean;
  /** Individual step breakdown */
  steps: ActivationStep[];
  /** Total spots saved */
  spotsSaved: number;
  /** Total chat messages sent */
  chatMessagesSent: number;
  /** Whether activation just happened this session (for celebration) */
  justActivated: boolean;
  /** Hours remaining in the 48-hour activation window (null if expired or activated) */
  hoursRemaining: number | null;
  /** Whether the 48-hour window has expired without activation */
  windowExpired: boolean;
}

// ---------------------------------------------------------------------------
// PostHog capture (lazy — set by analytics.ts to avoid circular imports)
// ---------------------------------------------------------------------------

let _capture: (event: string, properties?: Record<string, unknown>) => void = () => {};

export function setActivationCaptureFn(
  fn: (event: string, properties?: Record<string, unknown>) => void,
): void {
  _capture = fn;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivationFunnel(userId?: string | null, city?: string | null) {
  const [state, setState] = useState<ActivationState>({
    progress: 0,
    isActivated: false,
    steps: [],
    spotsSaved: 0,
    chatMessagesSent: 0,
    justActivated: false,
    hoursRemaining: null,
    windowExpired: false,
  });

  // Compute state from MMKV
  const computeState = useCallback((): ActivationState => {
    const spotsSaved = store_().getNumber(KEY_SPOTS_SAVED_COUNT) ?? 0;
    const chatMessagesSent = store_().getNumber(KEY_CHAT_MESSAGES_SENT) ?? 0;
    const isActivated = store_().getBoolean(KEY_ACTIVATED) ?? false;

    // 48-hour window tracking
    const startedAt = store_().getString(KEY_STARTED_AT);
    let hoursRemaining: number | null = null;
    let windowExpired = false;
    if (startedAt && !isActivated) {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      const remaining = ACTIVATION_WINDOW_MS - elapsed;
      if (remaining > 0) {
        hoursRemaining = Math.ceil(remaining / (60 * 60 * 1000));
      } else {
        windowExpired = true;
      }
    }

    const spotsComplete = Math.min(spotsSaved, ACTIVATION_SPOTS_THRESHOLD);
    const chatComplete = Math.min(chatMessagesSent, ACTIVATION_CHAT_THRESHOLD);

    // Weighted progress: spots are 75% of activation, chat is 25%
    const spotsProgress = spotsComplete / ACTIVATION_SPOTS_THRESHOLD;
    const chatProgress = chatComplete / ACTIVATION_CHAT_THRESHOLD;
    const progress = spotsProgress * 0.75 + chatProgress * 0.25;

    const steps: ActivationStep[] = [
      {
        id: 'spot_1',
        label: 'Save your first spot',
        current: Math.min(spotsSaved, 1),
        target: 1,
        completed: spotsSaved >= 1,
        icon: 'bookmark',
      },
      {
        id: 'spot_2',
        label: 'Save a second spot',
        current: Math.min(spotsSaved, 2) - 1 > 0 ? 1 : 0,
        target: 1,
        completed: spotsSaved >= 2,
        icon: 'bookmark',
      },
      {
        id: 'spot_3',
        label: 'Save a third spot',
        current: Math.min(spotsSaved, 3) - 2 > 0 ? 1 : 0,
        target: 1,
        completed: spotsSaved >= 3,
        icon: 'star',
      },
      {
        id: 'chat_1',
        label: 'Say hi in city chat',
        current: Math.min(chatMessagesSent, 1),
        target: 1,
        completed: chatMessagesSent >= 1,
        icon: 'message-circle',
      },
    ];

    return {
      progress: Math.min(progress, 1),
      isActivated,
      steps,
      spotsSaved,
      chatMessagesSent,
      justActivated: false,
      hoursRemaining,
      windowExpired,
    };
  }, []);

  // Initialize on mount — start the 48-hour window on first use
  useEffect(() => {
    if (userId && !store_().getString(KEY_STARTED_AT)) {
      store_().set(KEY_STARTED_AT, new Date().toISOString());
      _capture('activation_window_started', { window_hours: 48 });
    }
    setState(computeState());
    if (userId && city) {
      initActivationBot(userId, city);
    }
  }, [userId, city, computeState]);

  // ----- Action trackers -----

  const trackSpotViewed = useCallback(async () => {
    const current = store_().getNumber(KEY_SPOTS_VIEWED_COUNT) ?? 0;
    const next = current + 1;
    store_().set(KEY_SPOTS_VIEWED_COUNT, next);

    // First spot viewed triggers bot message
    if (next === 1) {
      await triggerBotMessage('first_spot_viewed');
    }
  }, []);

  const trackSpotSaved = useCallback(async () => {
    const current = store_().getNumber(KEY_SPOTS_SAVED_COUNT) ?? 0;
    const next = current + 1;
    store_().set(KEY_SPOTS_SAVED_COUNT, next);

    // Bot messages at milestones
    if (next === 1) {
      await triggerBotMessage('first_spot_saved');
      _capture('activation_milestone', { milestone: 'first_spot_saved', spots_saved: next });
    }
    if (next === 3) {
      await triggerBotMessage('three_spots_saved');
      _capture('activation_milestone', { milestone: 'three_spots_saved', spots_saved: next });
    }

    // Check if this completes activation
    const chatSent = store_().getNumber(KEY_CHAT_MESSAGES_SENT) ?? 0;
    if (next >= ACTIVATION_SPOTS_THRESHOLD && chatSent >= ACTIVATION_CHAT_THRESHOLD) {
      markActivated();
    }

    setState(computeState());
  }, [computeState]);

  const trackChatMessageSent = useCallback(async () => {
    const current = store_().getNumber(KEY_CHAT_MESSAGES_SENT) ?? 0;
    const next = current + 1;
    store_().set(KEY_CHAT_MESSAGES_SENT, next);

    // First chat message triggers bot message
    if (next === 1) {
      await triggerBotMessage('first_chat_message');
      _capture('activation_milestone', { milestone: 'first_chat_message', messages_sent: next });
    }

    // Check if this completes activation
    const spotsSaved = store_().getNumber(KEY_SPOTS_SAVED_COUNT) ?? 0;
    if (spotsSaved >= ACTIVATION_SPOTS_THRESHOLD && next >= ACTIVATION_CHAT_THRESHOLD) {
      markActivated();
    }

    setState(computeState());
  }, [computeState]);

  const markActivated = useCallback(() => {
    if (store_().getBoolean(KEY_ACTIVATED)) return; // already activated

    store_().set(KEY_ACTIVATED, true);
    store_().set(KEY_ACTIVATED_AT, new Date().toISOString());

    _capture('user_activated', {
      spots_saved: store_().getNumber(KEY_SPOTS_SAVED_COUNT) ?? 0,
      chat_messages_sent: store_().getNumber(KEY_CHAT_MESSAGES_SENT) ?? 0,
      spots_viewed: store_().getNumber(KEY_SPOTS_VIEWED_COUNT) ?? 0,
    });

    setState((prev) => ({ ...prev, isActivated: true, justActivated: true }));
  }, []);

  const clearJustActivated = useCallback(() => {
    setState((prev) => ({ ...prev, justActivated: false }));
  }, []);

  return {
    ...state,
    trackSpotViewed,
    trackSpotSaved,
    trackChatMessageSent,
    clearJustActivated,
  };
}
