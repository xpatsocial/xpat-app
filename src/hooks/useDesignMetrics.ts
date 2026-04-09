/**
 * useDesignMetrics — Julie Zhuo's Design Excellence Framework
 *
 * Zhuo's thesis: great design is measurable. Track these UX quality signals:
 *   - Task completion rate (can users finish core flows?)
 *   - Time-to-value (how fast do users reach the "aha" moment?)
 *   - Error rate (how often do users hit dead ends?)
 *   - Tap efficiency (how many taps to reach core actions?)
 *
 * Source: Julie Zhuo "The Making of a Manager" + Facebook Design Team talks
 *
 * Reference: research/playbook-julie-zhuo-design-excellence.md
 */
import { useCallback, useRef } from 'react';
import { MMKV } from 'react-native-mmkv';

// Lazy MMKV — avoid TurboModule init at module load on iOS New Architecture
let _store: MMKV | null = null;
function store_(): MMKV {
  if (!_store) _store = new MMKV({ id: 'xpat-design-metrics' });
  return _store;
}

// ---------------------------------------------------------------------------
// Core flow definitions (Zhuo: measure the flows that matter most)
// ---------------------------------------------------------------------------

export type CoreFlow =
  | 'save_spot'       // Discover → tap spot → save
  | 'send_message'    // Community → chat → type → send
  | 'view_profile'    // Tap avatar → see profile
  | 'add_spot'        // Add tab → fill form → submit
  | 'vouch_user'      // Profile → vouch button → confirm
  | 'share_card'      // Achievement → share → export
  | 'create_event'    // Events → create → fill → submit
  | 'connect_user';   // Profile → connect → confirm

interface FlowMetric {
  flow: CoreFlow;
  startedAt: number;
  tapCount: number;
  completed: boolean;
  errorCount: number;
}

// ---------------------------------------------------------------------------
// Aggregate keys
// ---------------------------------------------------------------------------

const KEY_FLOW_COMPLETIONS = 'design:flow_completions';
const KEY_FLOW_ABANDONS = 'design:flow_abandons';
const KEY_FLOW_AVG_TAPS = 'design:flow_avg_taps';
const KEY_FLOW_AVG_TIME = 'design:flow_avg_time_ms';
const KEY_FLOW_ERRORS = 'design:flow_errors';

// ---------------------------------------------------------------------------
// PostHog capture (lazy — set externally to avoid circular imports)
// ---------------------------------------------------------------------------

let _capture: (event: string, properties?: Record<string, unknown>) => void = () => {};

export function setDesignMetricsCaptureFn(
  fn: (event: string, properties?: Record<string, unknown>) => void,
): void {
  _capture = fn;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDesignMetrics() {
  const activeFlow = useRef<FlowMetric | null>(null);

  /**
   * Start tracking a core flow. Call when user begins a task.
   */
  const startFlow = useCallback((flow: CoreFlow) => {
    activeFlow.current = {
      flow,
      startedAt: Date.now(),
      tapCount: 0,
      completed: false,
      errorCount: 0,
    };
  }, []);

  /**
   * Record a tap within the active flow.
   */
  const recordTap = useCallback(() => {
    if (activeFlow.current) {
      activeFlow.current.tapCount++;
    }
  }, []);

  /**
   * Record an error within the active flow (validation failure, network error shown to user).
   */
  const recordError = useCallback(() => {
    if (activeFlow.current) {
      activeFlow.current.errorCount++;

      // Persist error count
      const key = `${KEY_FLOW_ERRORS}:${activeFlow.current.flow}`;
      const current = store_().getNumber(key) ?? 0;
      store_().set(key, current + 1);
    }
  }, []);

  /**
   * Mark the active flow as completed. Fires analytics and persists metrics.
   */
  const completeFlow = useCallback(() => {
    const flow = activeFlow.current;
    if (!flow) return;

    flow.completed = true;
    const durationMs = Date.now() - flow.startedAt;

    // Persist completion
    const completionKey = `${KEY_FLOW_COMPLETIONS}:${flow.flow}`;
    const completions = store_().getNumber(completionKey) ?? 0;
    store_().set(completionKey, completions + 1);

    // Running average taps
    const tapKey = `${KEY_FLOW_AVG_TAPS}:${flow.flow}`;
    const prevAvgTaps = store_().getNumber(tapKey) ?? flow.tapCount;
    const newAvgTaps = (prevAvgTaps * completions + flow.tapCount) / (completions + 1);
    store_().set(tapKey, newAvgTaps);

    // Running average time
    const timeKey = `${KEY_FLOW_AVG_TIME}:${flow.flow}`;
    const prevAvgTime = store_().getNumber(timeKey) ?? durationMs;
    const newAvgTime = (prevAvgTime * completions + durationMs) / (completions + 1);
    store_().set(timeKey, newAvgTime);

    // Fire to PostHog
    _capture('design_flow_completed', {
      flow: flow.flow,
      duration_ms: durationMs,
      tap_count: flow.tapCount,
      error_count: flow.errorCount,
      avg_taps: Math.round(newAvgTaps * 10) / 10,
      avg_time_ms: Math.round(newAvgTime),
    });

    activeFlow.current = null;
  }, []);

  /**
   * Mark the active flow as abandoned (user navigated away without completing).
   */
  const abandonFlow = useCallback(() => {
    const flow = activeFlow.current;
    if (!flow) return;

    const durationMs = Date.now() - flow.startedAt;

    const abandonKey = `${KEY_FLOW_ABANDONS}:${flow.flow}`;
    const abandons = store_().getNumber(abandonKey) ?? 0;
    store_().set(abandonKey, abandons + 1);

    _capture('design_flow_abandoned', {
      flow: flow.flow,
      duration_ms: durationMs,
      tap_count: flow.tapCount,
      error_count: flow.errorCount,
    });

    activeFlow.current = null;
  }, []);

  /**
   * Get aggregated design metrics for all flows.
   */
  const getFlowMetrics = useCallback(() => {
    const flows: CoreFlow[] = [
      'save_spot', 'send_message', 'view_profile', 'add_spot',
      'vouch_user', 'share_card', 'create_event', 'connect_user',
    ];

    return flows.map((flow) => {
      const completions = store_().getNumber(`${KEY_FLOW_COMPLETIONS}:${flow}`) ?? 0;
      const abandons = store_().getNumber(`${KEY_FLOW_ABANDONS}:${flow}`) ?? 0;
      const avgTaps = store_().getNumber(`${KEY_FLOW_AVG_TAPS}:${flow}`) ?? 0;
      const avgTimeMs = store_().getNumber(`${KEY_FLOW_AVG_TIME}:${flow}`) ?? 0;
      const errors = store_().getNumber(`${KEY_FLOW_ERRORS}:${flow}`) ?? 0;

      return {
        flow,
        completions,
        abandons,
        completionRate: completions + abandons > 0
          ? Math.round(100 * completions / (completions + abandons))
          : null,
        avgTaps: Math.round(avgTaps * 10) / 10,
        avgTimeMs: Math.round(avgTimeMs),
        errors,
        // Zhuo quality score: high completion + low taps + low errors = excellent
        qualityScore: completions > 0
          ? Math.round(
              (completions / Math.max(completions + abandons, 1)) * 50 +
              Math.max(0, 30 - avgTaps * 3) +
              Math.max(0, 20 - errors * 2)
            )
          : null,
      };
    });
  }, []);

  return {
    startFlow,
    recordTap,
    recordError,
    completeFlow,
    abandonFlow,
    getFlowMetrics,
  };
}
