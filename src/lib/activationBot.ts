/**
 * activationBot.ts — Butterfield-inspired bot welcome system for x/pat
 *
 * Modeled on Slack's Slackbot: contextual messages triggered by user actions
 * that teach the app by using the app. Messages are stored in AsyncStorage
 * for offline support and zero-latency delivery.
 *
 * Bot message sequence:
 * 1. Signup → Welcome to [City]
 * 2. First spot viewed → Nudge to save
 * 3. First spot saved → Reward + recommendations
 * 4. 3 spots saved → Bridge to community
 * 5. First chat message → Celebrate full activation
 *
 * Reference: Stewart Butterfield's activation methodology
 * See: research/playbook-stewart-butterfield-product-led.md
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BotMessage {
  id: string;
  content: string;
  triggeredAt: string;
  dismissed: boolean;
}

export type BotTrigger =
  | 'signup_complete'
  | 'first_spot_viewed'
  | 'first_spot_saved'
  | 'three_spots_saved'
  | 'first_chat_message';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEY_BOT_MESSAGES = 'activation_bot:messages';
const KEY_BOT_STATE = 'activation_bot:state';

// ---------------------------------------------------------------------------
// Message templates (city-aware)
// ---------------------------------------------------------------------------

function getMessageContent(trigger: BotTrigger, city: string): string {
  const cityName = city || 'your city';

  switch (trigger) {
    case 'signup_complete':
      return `Welcome to x/pat! I'm your city guide for ${cityName}. Nomads here have mapped out the best spots for working, eating, and connecting. Start exploring — tap any pin on the map to see what the community recommends.`;

    case 'first_spot_viewed':
      return `Nice find! Save spots you love by tapping the bookmark icon. After you save 3, I'll unlock personalized recommendations just for you.`;

    case 'first_spot_saved':
      return `Great taste! You just saved your first spot. Here's a tip: the Discover tab has curated collections from nomads in ${cityName}. Two more saves and you'll unlock your personalized feed.`;

    case 'three_spots_saved':
      return `You're building a real ${cityName} collection! You know what makes this city even better? The people. Head to city chat — nomads are sharing real-time tips, meetup plans, and the WiFi passwords that actually work.`;

    case 'first_chat_message':
      return `You're officially part of the ${cityName} community! The best spots, events, and connections come from this chat. Welcome home, nomad.`;

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

interface BotState {
  triggeredEvents: BotTrigger[];
  city: string;
  userId: string;
}

async function getBotState(): Promise<BotState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BOT_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setBotState(state: BotState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_BOT_STATE, JSON.stringify(state));
  } catch {
    // Non-critical — bot messages are nice-to-have
  }
}

async function getBotMessages(): Promise<BotMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BOT_MESSAGES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveBotMessages(messages: BotMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_BOT_MESSAGES, JSON.stringify(messages));
  } catch {
    // Non-critical
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the bot for a user. Call after auth is confirmed.
 * If already initialized for this user, this is a no-op.
 */
export async function initActivationBot(userId: string, city: string): Promise<void> {
  const existing = await getBotState();
  if (existing && existing.userId === userId) return;

  await setBotState({
    triggeredEvents: [],
    city: city || 'your city',
    userId,
  });
}

/**
 * Trigger a bot message based on a user action.
 * Returns the new message if one was created, or null if this trigger
 * was already fired (each trigger fires exactly once).
 */
export async function triggerBotMessage(trigger: BotTrigger): Promise<BotMessage | null> {
  const state = await getBotState();
  if (!state) return null;

  // Each trigger fires exactly once
  if (state.triggeredEvents.includes(trigger)) return null;

  const content = getMessageContent(trigger, state.city);
  if (!content) return null;

  const message: BotMessage = {
    id: `bot_${trigger}_${Date.now()}`,
    content,
    triggeredAt: new Date().toISOString(),
    dismissed: false,
  };

  // Update state
  state.triggeredEvents.push(trigger);
  await setBotState(state);

  // Append message
  const messages = await getBotMessages();
  messages.push(message);
  await saveBotMessages(messages);

  return message;
}

/**
 * Get all bot messages for display (newest first).
 */
export async function getActivationBotMessages(): Promise<BotMessage[]> {
  const messages = await getBotMessages();
  return messages.filter((m) => !m.dismissed).reverse();
}

/**
 * Get the latest undismissed bot message (for toast/banner display).
 */
export async function getLatestBotMessage(): Promise<BotMessage | null> {
  const messages = await getBotMessages();
  const undismissed = messages.filter((m) => !m.dismissed);
  return undismissed.length > 0 ? undismissed[undismissed.length - 1] : null;
}

/**
 * Dismiss a bot message by ID.
 */
export async function dismissBotMessage(messageId: string): Promise<void> {
  const messages = await getBotMessages();
  const updated = messages.map((m) =>
    m.id === messageId ? { ...m, dismissed: true } : m,
  );
  await saveBotMessages(updated);
}

/**
 * Check if a specific trigger has already been fired.
 */
export async function hasTriggerFired(trigger: BotTrigger): Promise<boolean> {
  const state = await getBotState();
  if (!state) return false;
  return state.triggeredEvents.includes(trigger);
}

/**
 * Update the bot's city context (e.g., when user changes cities).
 */
export async function updateBotCity(city: string): Promise<void> {
  const state = await getBotState();
  if (!state) return;
  state.city = city;
  await setBotState(state);
}

/**
 * Reset bot state entirely. Use for account deletion or testing.
 */
export async function resetActivationBot(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_BOT_MESSAGES, KEY_BOT_STATE]);
}
