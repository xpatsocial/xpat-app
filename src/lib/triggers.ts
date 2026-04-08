/**
 * Trigger Management System — Nir Eyal Hook Model implementation
 *
 * Tracks user's internal trigger moments (when they naturally open the app,
 * which screens they visit first) and schedules external triggers (push
 * notifications) to align with those patterns.
 *
 * Rate limit: maximum 1 external trigger per calendar day.
 *
 * Three hook cycles:
 *   1. Spot Discovery (HUNT) — "3 new spots in [City] this week"
 *   2. Social Connection (TRIBE) — "Someone in [City] wants to connect"
 *   3. City Pulse (TRIBE) — "[City] chat is active"
 */
import { MMKV } from 'react-native-mmkv';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Dedicated MMKV instance for trigger/habit data
const store = new MMKV({ id: 'xpat-triggers' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HookCycle = 'spot_discovery' | 'social_connection' | 'city_pulse';

interface UsageRecord {
  /** Hour of day (0-23) when the user opened the app */
  hour: number;
  /** First screen navigated to after opening */
  firstScreen: string;
  /** Which hook cycle this maps to */
  hookCycle: HookCycle;
  /** ISO date string */
  date: string;
}

interface TriggerProfile {
  /** Most common hour the user opens the app */
  peakHour: number;
  /** Second most common hour (for variety) */
  secondaryHour: number;
  /** Which hook cycle the user engages with most */
  dominantCycle: HookCycle;
  /** Engagement counts per cycle */
  cycleCounts: Record<HookCycle, number>;
  /** Total recorded sessions */
  totalSessions: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_USAGE_HISTORY = 'triggers:usage_history';
const KEY_LAST_TRIGGER_DATE = 'triggers:last_trigger_date';
const KEY_TRIGGER_PROFILE = 'triggers:profile';
const MAX_HISTORY_SIZE = 90; // Keep 90 days of usage data
const MIN_SESSIONS_FOR_PERSONALIZATION = 5;

// Screen -> Hook Cycle mapping
const SCREEN_TO_CYCLE: Record<string, HookCycle> = {
  Explore: 'spot_discovery',
  SpotDiscovery: 'spot_discovery',
  SpotDetail: 'spot_discovery',
  Places: 'spot_discovery',
  AddSpot: 'spot_discovery',
  Community: 'city_pulse',
  ChatTab: 'city_pulse',
  Chat: 'city_pulse',
  FeedTab: 'city_pulse',
  NomadDiscovery: 'social_connection',
  People: 'social_connection',
  DirectMessage: 'social_connection',
  NearbyTab: 'social_connection',
  DiscoverTab: 'social_connection',
  EventSwipe: 'social_connection',
};

// ---------------------------------------------------------------------------
// Record Usage Patterns
// ---------------------------------------------------------------------------

/**
 * Record an app-open event with the user's first screen.
 * Call this once per cold start after navigation is ready.
 */
export function recordAppOpen(firstScreen: string): void {
  const now = new Date();
  const hour = now.getHours();
  const hookCycle = SCREEN_TO_CYCLE[firstScreen] ?? 'spot_discovery';
  const date = now.toISOString().split('T')[0];

  const record: UsageRecord = { hour, firstScreen, hookCycle, date };

  // Load existing history
  const raw = store.getString(KEY_USAGE_HISTORY);
  let history: UsageRecord[] = [];
  try {
    history = raw ? JSON.parse(raw) : [];
  } catch {
    history = [];
  }

  // Deduplicate: only one record per calendar day
  if (history.length > 0 && history[history.length - 1].date === date) {
    return;
  }

  history.push(record);

  // Trim to max size
  if (history.length > MAX_HISTORY_SIZE) {
    history = history.slice(-MAX_HISTORY_SIZE);
  }

  store.set(KEY_USAGE_HISTORY, JSON.stringify(history));

  // Rebuild profile after each new data point
  rebuildTriggerProfile(history);
}

// ---------------------------------------------------------------------------
// Build Trigger Profile
// ---------------------------------------------------------------------------

function rebuildTriggerProfile(history: UsageRecord[]): void {
  if (history.length === 0) return;

  // Count hours
  const hourCounts: Record<number, number> = {};
  const cycleCounts: Record<HookCycle, number> = {
    spot_discovery: 0,
    social_connection: 0,
    city_pulse: 0,
  };

  for (const record of history) {
    hourCounts[record.hour] = (hourCounts[record.hour] ?? 0) + 1;
    cycleCounts[record.hookCycle]++;
  }

  // Find peak and secondary hours
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([hour]) => parseInt(hour, 10));

  const peakHour = sortedHours[0] ?? 9;
  const secondaryHour = sortedHours[1] ?? (peakHour + 6) % 24;

  // Find dominant cycle
  const dominantCycle = (Object.entries(cycleCounts) as [HookCycle, number][])
    .sort(([, a], [, b]) => b - a)[0][0];

  const profile: TriggerProfile = {
    peakHour,
    secondaryHour,
    dominantCycle,
    cycleCounts,
    totalSessions: history.length,
  };

  store.set(KEY_TRIGGER_PROFILE, JSON.stringify(profile));
}

/**
 * Get the current trigger profile. Returns null if insufficient data.
 */
export function getTriggerProfile(): TriggerProfile | null {
  const raw = store.getString(KEY_TRIGGER_PROFILE);
  if (!raw) return null;

  try {
    const profile: TriggerProfile = JSON.parse(raw);
    if (profile.totalSessions < MIN_SESSIONS_FOR_PERSONALIZATION) return null;
    return profile;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Schedule External Triggers (Push Notifications)
// ---------------------------------------------------------------------------

/**
 * Notification templates for each hook cycle.
 * Each array contains variants to keep notifications feeling fresh (variable!).
 */
const NOTIFICATION_TEMPLATES: Record<HookCycle, Array<{ title: string; body: string }>> = {
  spot_discovery: [
    { title: 'New spots nearby', body: '3 new spots were added in {city} this week' },
    { title: 'Hidden gem alert', body: 'Nomads are raving about a new spot in {city}' },
    { title: 'Your next workspace?', body: 'A highly-rated cowork spot just opened in {city}' },
    { title: 'Fresh finds in {city}', body: 'The map has new spots you haven\'t seen yet' },
  ],
  social_connection: [
    { title: 'New nomad nearby', body: 'Someone in {city} shares your interests' },
    { title: 'Connection request', body: 'A nomad in {city} wants to connect' },
    { title: 'You\'re not alone', body: '{count} nomads are in {city} right now' },
    { title: 'Who\'s around?', body: 'New nomads just arrived in {city}' },
  ],
  city_pulse: [
    { title: '{city} is buzzing', body: 'City chat is active — nomads are making plans' },
    { title: 'Tonight in {city}', body: 'Nomads are organizing something in city chat' },
    { title: 'What\'s happening?', body: '{count} messages in {city} chat today' },
    { title: '{city} pulse', body: 'Your city\'s nomad scene is active today' },
  ],
};

interface ScheduleTriggerParams {
  /** User's current city name */
  city: string;
  /** Optional: number of active nomads/messages for template interpolation */
  count?: number;
}

/**
 * Schedule the next external trigger notification.
 *
 * Rate limit: only one trigger per calendar day. If a trigger was already
 * sent today, this is a no-op.
 *
 * The notification is personalized based on the user's trigger profile:
 * - Scheduled for their peak usage hour (or a sensible default)
 * - Content matches their dominant hook cycle
 *
 * Call this once per app open (it self-debounces).
 */
export async function scheduleNextTrigger(params: ScheduleTriggerParams): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const lastTriggerDate = store.getString(KEY_LAST_TRIGGER_DATE);

  // Rate limit: max 1 per day
  if (lastTriggerDate === today) return;

  const profile = getTriggerProfile();
  const cycle = profile?.dominantCycle ?? 'spot_discovery';

  // Pick a random template for variable reward (even the notification itself is variable)
  const templates = NOTIFICATION_TEMPLATES[cycle];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Interpolate city and count
  const title = template.title
    .replace('{city}', params.city)
    .replace('{count}', String(params.count ?? 5));
  const body = template.body
    .replace('{city}', params.city)
    .replace('{count}', String(params.count ?? 5));

  // Calculate trigger time: schedule for tomorrow at the user's peak hour
  // (scheduling for today would be too aggressive if they just opened the app)
  const targetHour = profile?.peakHour ?? 10; // default 10 AM
  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() + 1);
  triggerDate.setHours(targetHour, 0, 0, 0);

  // Cancel any existing scheduled triggers before adding new one
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Determine the correct Android channel
  const channelId = cycle === 'spot_discovery'
    ? 'spots'
    : cycle === 'social_connection'
      ? 'social'
      : 'chat';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { hookCycle: cycle, type: 'trigger' },
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  // Record that we scheduled a trigger today
  store.set(KEY_LAST_TRIGGER_DATE, today);
}

// ---------------------------------------------------------------------------
// Track Notification Opens (close the loop)
// ---------------------------------------------------------------------------

/**
 * Record which hook cycle a notification open corresponds to.
 * Call this from the notification response handler.
 */
export function recordTriggerOpened(hookCycle: HookCycle): void {
  const key = `triggers:opens:${hookCycle}`;
  const current = store.getNumber(key) ?? 0;
  store.set(key, current + 1);
}

/**
 * Get counts of trigger opens per cycle (for analytics).
 */
export function getTriggerOpenCounts(): Record<HookCycle, number> {
  return {
    spot_discovery: store.getNumber('triggers:opens:spot_discovery') ?? 0,
    social_connection: store.getNumber('triggers:opens:social_connection') ?? 0,
    city_pulse: store.getNumber('triggers:opens:city_pulse') ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Reset (for testing / account deletion)
// ---------------------------------------------------------------------------

export function resetTriggerData(): void {
  store.delete(KEY_USAGE_HISTORY);
  store.delete(KEY_LAST_TRIGGER_DATE);
  store.delete(KEY_TRIGGER_PROFILE);
  store.delete('triggers:opens:spot_discovery');
  store.delete('triggers:opens:social_connection');
  store.delete('triggers:opens:city_pulse');
}
