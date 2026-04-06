# Android Social Features & Real-Time Chat Research for x/pat

> Comprehensive research report covering 25 topics on social features, real-time chat, and community mechanics for React Native (Expo) on Android.
> Date: April 2026

---

## Table of Contents

1. [Supabase Realtime on Android](#1-supabase-realtime-on-android)
2. [Real-Time Chat UI Patterns on Android](#2-real-time-chat-ui-patterns-on-android)
3. [Chat Message Bubbles on Android](#3-chat-message-bubbles-on-android)
4. [Android Keyboard Handling for Chat](#4-android-keyboard-handling-for-chat)
5. [Chat Notification Grouping on Android](#5-chat-notification-grouping-on-android)
6. [Android 14+ Conversation Widget](#6-android-14-conversation-widget)
7. [Typing Indicators on Android](#7-typing-indicators-on-android)
8. [Message Reactions / Emoji on Android](#8-message-reactions--emoji-on-android)
9. [Voice Messages on Android](#9-voice-messages-on-android)
10. [Android Share Sheet Integration](#10-android-share-sheet-integration)
11. [Contact List Integration on Android](#11-contact-list-integration-on-android)
12. [Android Direct Share Targets](#12-android-direct-share-targets)
13. [Social Graph Visualization](#13-social-graph-visualization)
14. [Event RSVP UX Patterns](#14-event-rsvp-ux-patterns)
15. [Location Sharing UX on Android](#15-location-sharing-ux-on-android)
16. [User Profile Cards on Android](#16-user-profile-cards-on-android)
17. [Social Feed Infinite Scroll Performance](#17-social-feed-infinite-scroll-performance)
18. [Pull-to-Refresh Behavior: Android vs iOS](#18-pull-to-refresh-behavior-android-vs-ios)
19. [Image Sharing in Chat on Android](#19-image-sharing-in-chat-on-android)
20. [Link Previews in Chat on Android](#20-link-previews-in-chat-on-android)
21. [Android Notification Reply Action](#21-android-notification-reply-action)
22. [Group Chat Management UX](#22-group-chat-management-ux)
23. [User Blocking / Muting UX Patterns](#23-user-blocking--muting-ux-patterns)
24. [Report Content Flow on Android](#24-report-content-flow-on-android)
25. [Social Onboarding on Android](#25-social-onboarding-on-android)

---

## 1. Supabase Realtime on Android

### Current x/pat State
x/pat uses Supabase Realtime `postgres_changes` for DMs (`useDirectMessages.ts`) and city chat (`useCityChat.ts`). Channels are created per conversation/city and cleaned up on unmount.

### WebSocket Behavior on Android
- Android aggressively kills background WebSocket connections via Doze mode and App Standby. When the app goes to background, the OS throttles network access after ~1 minute, eventually cutting WebSocket connections entirely.
- Supabase Realtime relies on periodic heartbeat signals (default every 25 seconds). If the server receives no heartbeat for ~60 seconds, it drops the connection silently.
- Unlike iOS which has background fetch capabilities, Android requires explicit foreground services or WorkManager for persistent connections.

### Reconnection Strategy
- Supabase client has built-in exponential backoff reconnection (1s, 2s, 5s, 10s intervals).
- **Critical fix needed**: Use `heartbeatCallback` in Supabase client config to detect disconnections and trigger reconnection when app returns to foreground.
- Combine with React Native's `AppState` listener to detect foreground/background transitions and manually reconnect channels.

### Battery Optimization
- Exponential backoff for reconnection prevents battery drain (up to 70% reduction vs aggressive reconnection).
- On Android, avoid maintaining WebSocket connections in background -- instead, rely on FCM push notifications for new messages and reconnect only when user opens the app.
- The `worker: true` option in Supabase Realtime offloads heartbeat to a Web Worker (browser context), but on React Native the equivalent is using `AppState` to manage lifecycle.

### Recommended Changes for x/pat
```
// In supabase.ts -- add heartbeat callback
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { ... },
  realtime: {
    heartbeatIntervalMs: 15000,  // More aggressive on mobile
    reconnectAfterMs: (tries) => Math.min(1000 * 2 ** tries, 30000),
  },
});

// In useDirectMessages / useCityChat -- add AppState handling
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      // Reconnect and refresh messages
      fetchMessages();
      realtimeRef.current?.subscribe();
    }
  });
  return () => sub.remove();
}, []);
```

### Priority for x/pat: HIGH
Without AppState-aware reconnection, Android users will miss messages after backgrounding the app.

---

## 2. Real-Time Chat UI Patterns on Android

### Material Design 3 Messaging Conventions
- **Bubble alignment**: Outgoing messages right-aligned, incoming left-aligned (x/pat already follows this).
- **Color differentiation**: Material 3 uses `primaryContainer` for outgoing, `surfaceVariant` for incoming. x/pat uses teal-tinted rgba for outgoing and `bg2` for incoming, which aligns well with the dark Mercury aesthetic.
- **Avatar placement**: Show sender avatars for incoming messages only, positioned at bottom-left of the bubble (x/pat already does this correctly).
- **Timestamp placement**: Inside the bubble at bottom-right. Material 3 recommends smaller type (caption/overline) -- x/pat uses 9px which is correct.

### Modern Chat UI Libraries (2025-2026)
- **react-native-gifted-chat**: Most complete but heavy; opinionated design that's hard to match with Mercury aesthetic. Not recommended for x/pat.
- **@flyerhq/react-native-chat-ui**: Lightweight, actively maintained, Firebase-optional. Good reference for patterns.
- **Custom implementation** (current x/pat approach): Best for brand control. Continue with custom bubbles.

### Material You 3.0 (Android 16, 2026)
- On-device AI for hyper-personalized, context-aware UI.
- Dynamic color theming adapts to wallpaper and user preferences.
- x/pat's dark-first design with glass effects is already ahead of this trend.

### Recommendation for x/pat
Keep the custom implementation. The Mercury aesthetic is a differentiator. Consider adding: sender name colors that vary per user (hash-based palette), message grouping by time (collapse timestamps for messages within 2 minutes), and subtle entrance animations using Reanimated.

---

## 3. Chat Message Bubbles on Android

### Current x/pat Implementation
- Outgoing: `rgba(46,196,160,0.15)` with `borderBottomRightRadius: 4`
- Incoming: `colors.dark.bg2` with `borderBottomLeftRadius: 4`
- Read receipts: Check-circle icon in teal when `read_at` is set (DMs only)
- Timestamps: 9px inside bubble footer

### Android-Specific Bubble Styling Best Practices
- **Tail shape**: The small radius on bottom corners (4px) creates an implicit "tail" pointing to the sender. This is the modern Android pattern (WhatsApp/Google Messages style).
- **Max width**: 75% is standard. x/pat already uses this.
- **Touch feedback**: Android expects ripple feedback on long-press. Current `TouchableOpacity` in ChatTab handles this via `onLongPress` for report/block, but should add ripple via `Pressable` with `android_ripple` prop.
- **Selection state**: Material Design recommends a subtle background color change when a message is selected (for copy/forward/react actions).

### Read Receipts UX (Android Conventions)
- Single check = sent, double check = delivered, blue/colored double check = read (WhatsApp pattern, now universal).
- x/pat currently shows a single `check-circle` for read. Consider: no icon (sending), single check (sent), filled check-circle (read).
- Group chats: Show "Seen by 3" text instead of individual checks.

### Timestamp Grouping
- Messages within 2 minutes of each other from the same sender should be grouped: show avatar and name only on the first message, hide timestamps on intermediate messages, show timestamp only on the last.
- Day separators ("Today", "Yesterday", "Mar 15") between message groups.

### Recommendation for x/pat
Add message grouping by sender + time, day separators, and a two-state delivery indicator (sent/read) for DMs. These are table-stakes for Android chat UX in 2026.

---

## 4. Android Keyboard Handling for Chat

### Current x/pat Problem
`DirectMessageScreen.tsx` uses `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`. This means **Android gets no keyboard handling at all** -- the input bar is hidden behind the keyboard on many Android devices.

`ChatTab.tsx` uses the same pattern with `keyboardVerticalOffset={180}`, which is a hardcoded value that breaks on different screen sizes and nav bar heights.

### The Modern Solution: react-native-keyboard-controller
- **Now an official Expo SDK package** (expo docs include it).
- Works identically on iOS and Android using Android 11+ `WindowInsetsAnimation` API.
- v1.21.0 (March 2026) includes `KeyboardChatScrollView` -- purpose-built for chat screens.

### Key Components
- `KeyboardStickyView`: Keeps the input bar floating above the keyboard. Replaces `KeyboardAvoidingView` entirely.
- `KeyboardAwareScrollView`: Auto-scrolls to focused input.
- `KeyboardChatScrollView`: Full chat-optimized scroll view with sticky input. New in v1.21.

### Implementation for x/pat
```
// Replace KeyboardAvoidingView in DirectMessageScreen.tsx
import { KeyboardStickyView } from 'react-native-keyboard-controller';

// Wrap FlatList normally, then:
<KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
  <View style={styles.inputRow}>
    <TextInput ... />
    <TouchableOpacity ... />
  </View>
</KeyboardStickyView>
```

### Android-Specific Issues Solved
- `windowSoftInputMode="adjustResize"` causes layout jumps on Android. `react-native-keyboard-controller` provides smooth animated transitions.
- No more hardcoded `keyboardVerticalOffset` values.
- Auto-scroll to bottom when keyboard opens (critical for chat).

### Priority for x/pat: CRITICAL
The current Android keyboard handling is broken. This is likely the single most impactful UX fix for Android users.

---

## 5. Chat Notification Grouping on Android

### Android Notification Architecture
- **Channels**: Categories of notifications users can control independently. x/pat has one "default" channel.
- **Groups**: Visual grouping of related notifications (e.g., all DMs together).
- **MessagingStyle**: Special notification layout for conversations showing message history.

### Current x/pat State
`notifications.ts` creates a single "Default" channel with `AndroidImportance.HIGH`. No grouping, no MessagingStyle, no conversation shortcuts.

### Required Android Notification Channels
x/pat should create dedicated channels:
- `messages` -- DMs and chat messages (HIGH importance)
- `connections` -- Connection requests (DEFAULT importance)
- `events` -- Event reminders and updates (DEFAULT importance)
- `community` -- Nearby nomads, feed activity (LOW importance)

### MessagingStyle Implementation
- **expo-notifications limitation**: Does not natively support `MessagingStyle`. The notification body is displayed as plain text.
- **Notifee alternative**: `@notifee/react-native` fully supports `AndroidStyle.MESSAGING` with person objects, message arrays, group conversation flag, and inline reply actions.
- **Trade-off**: Adding Notifee means maintaining two notification libraries (Expo for token management, Notifee for display). However, this is the standard pattern in production React Native apps.

### Conversation Shortcuts (Android 11+)
- Requires publishing `ShortcutInfo` objects for frequent contacts.
- These appear in the share sheet, long-press launcher, and notification shade.
- Not natively supported by Expo -- requires a custom Expo module or Notifee integration.

### Recommendation for x/pat
Phase 1: Add dedicated notification channels (can do with expo-notifications today).
Phase 2: Evaluate Notifee for MessagingStyle support when preparing for public Android launch. This is a differentiator vs. other travel apps.

### Priority for x/pat: MEDIUM (Phase 1 HIGH, Phase 2 can wait)

---

## 6. Android 14+ Conversation Widget

### What It Is
Android 11 introduced Conversation Space in the notification shade. Android 14 extended this with:
- **Conversation widgets**: Users can pin a specific conversation to their home screen as a widget showing the latest message and a quick-reply input.
- **Conversation bubbles**: Floating chat heads (like Facebook Messenger).
- **Priority conversations**: Starred contacts whose messages break through DND.

### Requirements
1. Notifications must use `MessagingStyle`.
2. App must publish `ShortcutInfo` for each conversation partner.
3. `ShortcutInfo` must be marked as `setLongLived(true)` and `setIsConversation()`.
4. The notification must reference the shortcut via `setShortcutId()`.

### React Native Implementation
- **react-native-android-widget** by sAleksovski: Allows building Android widgets with React Native, supports the new architecture.
- Building a conversation widget requires:
  1. Native Android code for the `AppWidgetProvider`
  2. React Native bridge to update widget content
  3. ShortcutManager integration (native module required)

### Recommendation for x/pat
This is a v2+ feature. The prerequisites (MessagingStyle notifications, ShortcutInfo publishing) need to be in place first. Once those are done, conversation widgets become a powerful differentiator for a social travel app -- imagine pinning your travel buddy conversation to your home screen.

### Priority for x/pat: LOW (prerequisite features needed first)

---

## 7. Typing Indicators on Android

### UX Pattern
- Three animated dots in a bubble shape, appearing in the message list where the next message would appear.
- Should appear within 500ms of the other user starting to type.
- Should disappear after 3-5 seconds of inactivity (debounce).
- On Android, the dots animation should follow Material Motion guidelines (ease-in-out, staggered).

### Implementation with Supabase Broadcast
Supabase Broadcast is purpose-built for ephemeral signals like typing indicators:

```typescript
// Send typing event
const channel = supabase.channel(`typing:${conversationId}`);
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { user_id: user.id, timestamp: Date.now() }
});

// Listen for typing events
channel.on('broadcast', { event: 'typing' }, (payload) => {
  setTypingUsers(prev => ({
    ...prev,
    [payload.payload.user_id]: payload.payload.timestamp
  }));
});
```

### Debouncing Strategy
- Send typing event on first keystroke, then throttle to every 2 seconds while typing continues.
- Receiver shows "typing..." for 3 seconds after last received event.
- Use `useRef` for the timeout to avoid re-renders.

### Animation Component
```typescript
// Three dots with staggered animation using Reanimated
const TypingIndicator = () => {
  // Stagger three dots with 150ms delay between each
  // Scale from 0.4 to 1.0, opacity from 0.3 to 1.0
  // Loop with 600ms period
};
```

### React Native Libraries
- `react-native-typing-indicator`: Lightweight, pure Animated API, customizable.
- Or build custom with Reanimated for consistency with x/pat's animation system.

### Recommendation for x/pat
Implement for DMs first (city chat typing indicators would be noisy with many users). Use Supabase Broadcast (no database writes needed). This is a high-impact UX feature that makes conversations feel alive.

### Priority for x/pat: MEDIUM-HIGH

---

## 8. Message Reactions / Emoji on Android

### UX Pattern (Android Convention)
1. **Long press** on a message (400ms delay, matching x/pat's current `delayLongPress={400}`).
2. **Quick reaction bar** appears above/below the message with 6 default emojis (thumbs up, heart, laugh, surprised, sad, angry) + a "+" button for the full picker.
3. **Haptic feedback** on selection (`Haptics.impactAsync`).
4. **Reactions display** below the message bubble as small emoji pills with count.

### React Native Libraries
- **react-native-reactions** (Simform): Animated reaction picker triggered by long press. Provides the floating emoji bar UX.
- **rn-emoji-keyboard**: Full emoji picker with search, categories, skin tone support. Works on both platforms.
- **react-native-emoji-popup** (okwasniewski): Uses native Android emoji picker -- matches system look.

### Database Schema for Reactions
```sql
CREATE TABLE message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
```

### Implementation Notes
- Use Supabase Realtime `postgres_changes` to sync reactions across clients in real-time.
- Store reactions as native emoji characters (not shortcodes) for universal rendering.
- On Android, the native emoji renderer handles all emoji correctly since Android 12+.

### Recommendation for x/pat
Start with the quick reaction bar (6 preset emojis) on long-press. This replaces the current "Message Options" Alert.alert in ChatTab. The long-press context menu should show: reaction bar at top, then "Reply", "Report", "Block" options below.

### Priority for x/pat: MEDIUM

---

## 9. Voice Messages on Android

### Implementation Stack for Expo
- **expo-av** (already in Expo SDK): Recording with metering data (`isMeteringEnabled: true`).
- **expo-audio** (newer API, Expo SDK 55+): Simpler API for recording/playback.
- **react-native-audio-waveform** (Simform): Pre-built waveform visualization component.
- **expo-recorder** (lodev09): Wrapper with animated waveform UI.

### Recording Flow (Android)
1. Request `RECORD_AUDIO` permission (Android runtime permission).
2. Show recording UI: red dot + elapsed time + animated waveform.
3. User releases to send, or slides left to cancel (WhatsApp pattern).
4. Compress audio (m4a format, 64kbps is standard for voice).
5. Upload to Supabase Storage.
6. Insert message with `type: 'voice'` and `media_url`.

### Playback UX
- Inline waveform visualization in the message bubble.
- Play/pause button with scrubber.
- Playback speed toggle (1x, 1.5x, 2x) -- standard in WhatsApp/Telegram.
- Duration shown before playing, elapsed time during playback.
- Blue waveform = unplayed, gray = played (WhatsApp pattern).

### Waveform Visualization
```typescript
// Using expo-av metering
const recording = new Audio.Recording();
await recording.prepareToRecordAsync({
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
});
// Read metering values during recording
const status = await recording.getStatusAsync();
const dB = status.metering; // -160 to 0
// Normalize to 0-1 and push to waveform array
```

### Recommendation for x/pat
Voice messages are a v2 feature. The schema needs a `message_type` column and `media_url` column added to `direct_messages` and `chat_messages`. This is a significant feature that requires both UI and backend changes. However, it's increasingly expected in social apps.

### Priority for x/pat: LOW (v2 feature)

---

## 10. Android Share Sheet Integration

### Current x/pat State
`FeedScreen.tsx` uses React Native's built-in `Share.share()` API for sharing posts. This opens the native Android share sheet with a text message.

### Enhanced Sharing for x/pat
The built-in `Share` API only supports text. For richer sharing:

- **react-native-share**: Opens native share sheet with support for images, files, URLs, and platform-specific options. Supports `shareSingle()` for targeting specific apps (WhatsApp, Telegram, etc.).
- **Sharing spots**: Should include a preview image (spot photo), title, description, and deep link URL.
- **Deep links**: `https://xpat.social/spot/{id}` should be configured as a universal link that opens the app.

### Share Content Types for x/pat
| Content | What to Share | Format |
|---------|--------------|--------|
| Spot | Photo + name + city + deep link | Image + URL |
| Event | Title + date + venue + deep link | Text + URL |
| Profile | Avatar + name + tagline + deep link | Text + URL |
| Post | Content + author + photo if any | Text + Image |
| City Chat message | Quote + city name | Text |

### Android Share Sheet Customization
- Android 14+ shows "Custom Actions" row at the top of the share sheet.
- Deep links with Open Graph tags will show rich previews in WhatsApp/Telegram.
- For Expo projects, `react-native-share` requires a dev build (not compatible with Expo Go).

### Recommendation for x/pat
Upgrade spot sharing to include images and structured deep links. Install `react-native-share` for richer share capabilities. Configure Open Graph tags on `xpat.social` web pages for each spot/event/profile so link previews are beautiful.

### Priority for x/pat: MEDIUM

---

## 11. Contact List Integration on Android

### Libraries
- **expo-contacts**: Official Expo library. `getContactsAsync()` returns all contacts with phone numbers, emails.
- **react-native-contacts**: Alternative for bare RN, but expo-contacts is preferred in managed workflow.

### Permission Handling (Android 2025-2026)
- Requires `android.permission.READ_CONTACTS` -- a "dangerous" permission requiring runtime request.
- Android 14+: More granular permission dialogs. Users can grant limited access.
- **Privacy-first approach**: Hash phone numbers/emails client-side, send hashes to server, match against registered user hashes. Never store raw contact data.

### "Find Friends" Implementation Pattern
1. User taps "Find Friends" button.
2. Show permission explanation dialog (pre-permission prompt).
3. Request `READ_CONTACTS` permission.
4. Read contacts, extract phone numbers and emails.
5. SHA-256 hash each value client-side.
6. Send hashes to Supabase edge function.
7. Server matches against registered user hashes.
8. Return matching profiles.
9. Display "People you may know" with connect buttons.

### Privacy Considerations
- GDPR compliance: Never upload raw contact data. Hash-only matching.
- Show clear explanation of what data is used and how.
- Provide opt-out and data deletion capability.
- Only match, never store the contact list.

### Recommendation for x/pat
This is a growth feature. For the nomad use case, email matching may be more effective than phone numbers (nomads often change SIMs). Implement after the core social features are stable.

### Priority for x/pat: MEDIUM (growth feature)

---

## 12. Android Direct Share Targets

### What It Is
Direct Share allows x/pat to appear in the Android share sheet with specific conversation targets. When a user shares a photo from their gallery, they could see "Send to Sarah (x/pat)" in the top row of the share sheet.

### Technical Requirements (Android 11+)
- ChooserTargetService is deprecated. Must use Sharing Shortcuts API.
- Publish `ShortcutInfoCompat` objects for frequent contacts.
- Define share targets in `res/xml/shortcuts.xml`.
- Shortcuts must be "long-lived" and marked as conversations.

### React Native Implementation
- No existing Expo module supports this.
- Requires a custom native module or Expo config plugin.
- `react-native-receive-sharing-intent` handles the receiving side (when users share content INTO x/pat).

### Recommendation for x/pat
This is a v2+ power-user feature. It requires native Android code and is complex to implement in Expo. Focus on making the in-app sharing experience excellent first.

### Priority for x/pat: LOW

---

## 13. Social Graph Visualization

### Current x/pat State
`useConnections.ts` manages a flat list of connections (requester/target pairs). No visualization, no mutual friends detection.

### Mutual Friends Detection
```sql
-- Supabase RPC function to find mutual connections
CREATE OR REPLACE FUNCTION mutual_connections(uid1 uuid, uid2 uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM profiles p
  WHERE p.id IN (
    SELECT CASE WHEN requester_id = uid1 THEN target_id ELSE requester_id END
    FROM connections WHERE status = 'accepted'
    AND (requester_id = uid1 OR target_id = uid1)
  )
  AND p.id IN (
    SELECT CASE WHEN requester_id = uid2 THEN target_id ELSE requester_id END
    FROM connections WHERE status = 'accepted'
    AND (requester_id = uid2 OR target_id = uid2)
  );
$$ LANGUAGE sql STABLE;
```

### Visualization Approaches
- **Connection count badge**: Simple "12 connections, 3 mutual" on profile cards. Easiest to implement.
- **Mutual friends row**: Show 3 avatar thumbnails + "and 5 others" on UserProfileScreen. Standard LinkedIn/Facebook pattern.
- **Force-directed graph**: Interactive network visualization using D3.js or `react-native-svg`. Beautiful but complex and niche.

### Android UX Pattern
- On user profile cards, show "N mutual connections" with stacked avatar thumbnails.
- Tapping reveals the list of mutual connections.
- Use this as a trust signal: "You and Sarah have 4 mutual connections" on connection request screen.

### Recommendation for x/pat
Add mutual connections count to `UserProfileScreen` and `ConnectionButton`. Skip the graph visualization -- it's visually cool but not useful for the nomad use case where connections are more fluid. The mutual friends count is the high-value, low-effort win.

### Priority for x/pat: MEDIUM

---

## 14. Event RSVP UX Patterns

### Current x/pat State
`useEvents.ts` supports three RSVP states: `going`, `interested`, `cancelled`. EventsTab has a date strip, RSVP toggles, and a FAB for hosting events. Solid implementation.

### Calendar Integration (Android)
- **expo-calendar**: Can create events in the user's system calendar with title, location, start/end time.
- After RSVP "going", offer to add to calendar with a single tap.
- On Android, `Calendar.createEventAsync()` or `Calendar.openEventInCalendar()` to launch the system calendar app.

### Reminder Patterns
- Offer notification reminders: "1 hour before", "1 day before".
- Store reminder preferences in `event_rsvps` table.
- Trigger via Supabase scheduled edge function + push notification.

### Enhanced RSVP UX
- **Animated state transitions**: RSVP button morphs between states with Reanimated.
- **Attendee previews**: Show 3-5 avatar thumbnails of "going" attendees directly on the event card (x/pat's EventCard already supports this via `event_rsvps` join).
- **Waitlist**: When `max_attendees` is reached, offer a "Join Waitlist" option.
- **Invite connections**: "Invite a friend" button that sends a DM with the event card.

### Android-Specific Patterns
- **Calendar intent**: `Calendar.openEventInCalendar(eventId)` opens the native calendar with event details.
- **Google Calendar deep link**: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...` as fallback.
- **Material Design**: RSVP buttons should use `FilledTonalButton` style (filled with secondary color).

### Recommendation for x/pat
Add "Add to Calendar" button after RSVP. Add attendee avatar row to EventCard. These are small UX wins. Waitlist and invite features are v2.

### Priority for x/pat: MEDIUM

---

## 15. Location Sharing UX on Android

### Current x/pat State
x/pat has `expo-location` for user location, presence system (`useCityPresence`, `usePresence`), and availability toggle. Location is used for the map and nearby nomads features.

### Static vs Real-Time Location Sharing
| Type | Use Case | Battery | Privacy |
|------|----------|---------|---------|
| Static | "I'm at this cafe" -- one-time pin drop | None | User chooses when to share |
| Live (timed) | "Follow me for 1 hour" -- real-time tracking | Medium | Auto-expires |
| Continuous | Background location for "nearby" | High | Privacy concern |

### Privacy Controls (Android 14-15)
- Android 14: Users choose "Precise" vs "Approximate" location.
- Android 15: Partial screen sharing, tighter data controls.
- **x/pat already has good privacy settings** in `UserPreferences`: `show_on_map`, `location_precision` (city vs exact), `profile_visibility`.

### Battery-Efficient Location (2026 Best Practices)
- Modern libraries use accelerometer + gyroscope to detect movement, only activating GPS when needed (80%+ battery savings).
- `expo-location` supports `startLocationUpdatesAsync` for background tracking, but this is battery-intensive.
- For x/pat, the "check-in" model (user explicitly shares location at a spot) is more privacy-friendly than continuous tracking.

### Chat Location Sharing
For sharing location in DMs/chat:
1. User taps location icon in chat input.
2. Map picker appears (reuse existing map component).
3. User drops pin or shares current location.
4. Location message sent with lat/lng, rendered as a mini-map in the chat bubble.
5. Tapping the mini-map opens the full map screen.

### Recommendation for x/pat
The current check-in model is ideal for nomads. Add a "Share Location" action in DMs for one-time pin sharing (static). Avoid real-time tracking -- it's a battery drain and privacy concern that doesn't match the nomad use case.

### Priority for x/pat: LOW

---

## 16. User Profile Cards on Android

### Current x/pat State
`UserProfileScreen.tsx` and `PresenceCard.tsx` display user profiles. The profile model includes tagline, travel style, work type, prompt Q&As, countries visited, and custom status.

### Material Design 3 Profile Card Patterns
- **Header section**: Large avatar (80-120px), display name, tagline, location with flag emoji.
- **Stats row**: Connections count, spots shared, countries visited -- horizontal layout with dividers.
- **Action buttons**: Connect / Message / More (three-dot). Primary action gets `FilledButton`, secondary gets `OutlinedButton`.
- **Content sections**: Cards or list items for bio, prompt answers, travel plans.
- **Bottom sheet**: Additional actions (block, report, share profile).

### Android-Specific Considerations
- **Shared element transitions**: Android supports hero animations between profile card thumbnail and full profile screen. Use `react-native-shared-element` or Navigation 7's built-in transition API.
- **Collapsing toolbar**: Avatar and name scroll up and collapse into the app bar. Use `Animated.ScrollView` with interpolated header height.
- **Ripple feedback**: All interactive elements should use `Pressable` with `android_ripple`.

### Profile Completeness Nudge
x/pat already has `profile_completion_score`. Show a progress ring around the avatar when profile is incomplete, with "Complete your profile" CTA.

### Recommendation for x/pat
Add a stats row (connections, spots, countries) to `UserProfileScreen`. Add mutual connections display. Consider collapsible header for a more polished Android feel.

### Priority for x/pat: LOW (polish)

---

## 17. Social Feed Infinite Scroll Performance

### Current x/pat State
`FeedScreen.tsx` uses `FlatList` with `limit(30)`, `RefreshControl`, and basic rendering. No pagination, no infinite scroll, no item layout optimization.

### FlatList Optimization Checklist
| Property | Current | Recommended |
|----------|---------|-------------|
| `windowSize` | default (21) | 7-11 for mobile |
| `maxToRenderPerBatch` | default (10) | 10-15 |
| `initialNumToRender` | default | 8-10 |
| `removeClippedSubviews` | not set | `true` (60% memory reduction) |
| `getItemLayout` | not set | Add if items are fixed height |
| `keyExtractor` | `item.id.toString()` | Good |

### FlashList Migration
FlashList v2 (2025-2026) is rebuilt for React Native's new architecture:
- **5-10x faster** than FlatList on low-end Android devices.
- Cell recycling instead of mount/unmount (like Android RecyclerView).
- JS thread CPU usage drops from 90%+ to under 10%.
- **Migration is simple**: Replace `FlatList` import with `FlashList`, add `estimatedItemSize` prop.

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={posts}
  renderItem={renderPost}
  estimatedItemSize={250}  // Approximate post card height
  // All other FlatList props work the same
/>
```

### Infinite Scroll Implementation
```typescript
const [page, setPage] = useState(0);
const PAGE_SIZE = 20;

const fetchMore = async () => {
  const { data } = await supabase
    .from('posts')
    .select('...')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  setPosts(prev => [...prev, ...(data || [])]);
  setPage(prev => prev + 1);
};

<FlashList
  ...
  onEndReached={fetchMore}
  onEndReachedThreshold={0.5}
/>
```

### Image Optimization
- Replace React Native `Image` with `expo-image` (already in Expo SDK 55): automatic caching, lazy loading, blur placeholder.
- 50-80% memory reduction vs standard Image component.

### Recommendation for x/pat
1. Immediate: Add FlatList optimization props (`removeClippedSubviews`, `windowSize`).
2. Short-term: Add cursor-based pagination with `onEndReached`.
3. Medium-term: Migrate to FlashList for the feed. This is the single biggest Android performance win.

### Priority for x/pat: HIGH

---

## 18. Pull-to-Refresh Behavior: Android vs iOS

### Platform Differences
| Aspect | iOS | Android |
|--------|-----|---------|
| Indicator style | Native spinner (small, gray) | Material circular indicator |
| Color prop | `tintColor` | `colors` (array of colors) |
| Title | `title` + `titleColor` supported | Not supported |
| Position | Pulls down from top | Pulls down from top |
| Component wrapping | Works with JSX wrapper | **Crashes if wrapped in custom component** -- must use function call |

### Current x/pat State
`FeedScreen.tsx` uses `RefreshControl` with `tintColor={colors.teal}`. The `MessagesTab.tsx` uses `onRefresh` + `refreshing` props on FlatList directly.

### Android-Specific Fix
```typescript
<RefreshControl
  refreshing={refreshing}
  onRefresh={handleRefresh}
  // iOS
  tintColor={colors.teal}
  // Android -- accepts array for Material spinner color cycle
  colors={[colors.teal, colors.amber]}
  progressBackgroundColor={colors.dark.bg2}
/>
```

### Recommendation for x/pat
Add `colors` and `progressBackgroundColor` props to all `RefreshControl` instances for proper Android styling. The teal/amber color cycle matches the x/pat brand.

### Priority for x/pat: LOW (cosmetic)

---

## 19. Image Sharing in Chat on Android

### Current State
x/pat chat (both DMs and city chat) is text-only. `FeedScreen.tsx` has image upload for posts using `expo-image-picker` + `expo-image-manipulator` + Supabase Storage.

### Implementation Plan for Chat Images
1. **Picking**: Reuse the `expo-image-picker` pattern from FeedScreen.
2. **Compression**: `expo-image-manipulator` resize to 1200px width, 70% JPEG quality (already done in FeedScreen).
3. **Upload**: Supabase Storage bucket `chat-photos` with path `{channel_id}/{message_id}.jpg`.
4. **Message schema**: Add `message_type` ('text' | 'image' | 'voice' | 'location') and `media_url` columns.
5. **Preview**: Show thumbnail (200px height) in bubble with blur placeholder during load.
6. **Fullscreen**: Tap to open fullscreen with pinch-to-zoom using `@likashefqet/react-native-image-zoom` or `expo-image` built-in zoom.

### Android-Specific Compression
- `react-native-compressor`: More aggressive compression than `expo-image-manipulator`, supports WebP format (smaller files, Android-native).
- WhatsApp compresses chat images to ~100KB. Target similar for bandwidth-sensitive nomads on mobile data.

### Recommendation for x/pat
Extend the message schema to support media types. Reuse the existing image upload pattern from FeedScreen. This is a natural extension of the chat feature.

### Priority for x/pat: MEDIUM

---

## 20. Link Previews in Chat on Android

### Implementation
- **link-preview-js** (OP-Engineering): Extracts OpenGraph metadata (title, description, image, favicon) from URLs. Works in React Native.
- **@flyerhq/react-native-link-preview**: Pre-built component with caching and customizable render.

### How It Works
1. Detect URLs in message text using regex.
2. Fetch the URL's HTML, parse `<meta property="og:...">` tags.
3. Display a card below the message text: thumbnail image, title, description, domain.
4. Cache previews to avoid re-fetching (store in AsyncStorage or Supabase).

### Caching Strategy
```typescript
// Cache OG data in Supabase
// Table: link_previews (url text PK, title, description, image_url, fetched_at)
// Cache for 7 days, then re-fetch
```

### Android Considerations
- Fetch should happen server-side (edge function) to avoid CORS issues and to cache centrally.
- Some Samsung devices have issues with client-side fetch -- server-side is more reliable.
- Rich link previews make the chat feel premium and are standard in all major messaging apps.

### Recommendation for x/pat
Implement server-side OG tag fetching via Supabase Edge Function. Cache results. Render inline cards in chat bubbles. This makes shared spots, events, and external links look professional.

### Priority for x/pat: LOW (polish feature)

---

## 21. Android Notification Reply Action

### What It Is
Users can type and send a reply directly from the notification shade without opening the app. Standard in WhatsApp, Telegram, Google Messages.

### Current x/pat Limitation
`expo-notifications` does not support inline reply actions natively. The notification is displayed as plain text with no actions.

### Implementation Options

**Option A: Notifee**
```typescript
import notifee, { AndroidStyle, AndroidAction } from '@notifee/react-native';

await notifee.displayNotification({
  title: 'Sarah',
  body: 'Hey, are you at the coworking space?',
  android: {
    channelId: 'messages',
    style: { type: AndroidStyle.MESSAGING, ... },
    actions: [{
      title: 'Reply',
      pressAction: { id: 'reply' },
      input: {
        placeholder: 'Type a reply...',
      },
    }],
  },
});

// Handle reply
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (detail.pressAction?.id === 'reply') {
    const replyText = detail.input;
    // Send message via Supabase
  }
});
```

**Option B: Custom Expo Module**
Write a native Android module that creates `RemoteInput` actions on notifications. More work but avoids adding Notifee.

### Recommendation for x/pat
Inline reply is a killer feature for a messaging app. When Notifee is added (for MessagingStyle support), inline reply comes essentially for free. Bundle these together.

### Priority for x/pat: MEDIUM (bundle with Notifee adoption)

---

## 22. Group Chat Management UX

### Current x/pat State
City chat (`useCityChat.ts`) supports `chat_channels` with type 'city', 'dm', or 'group', and `chat_members` with roles 'admin', 'moderator', 'member' and a `muted` flag. The schema supports group chat, but no UI for creating or managing groups.

### Group Chat UX Patterns (Android)
- **Creation flow**: Tap "New Group" > Select members from connections > Name the group > Optional photo > Create.
- **Group info screen**: Member list with roles, mute toggle, leave group, group photo/name editing (admin only).
- **Admin controls**: Promote/demote members, remove members, delete messages.
- **Mute options**: Mute for 1 hour, 8 hours, 1 day, 1 week, forever.

### Member Management UI
- Member list with role badges (Admin, Mod, Member).
- Long-press on member for admin actions (promote, remove).
- "Add Members" button for admins.
- Member count in the chat header.

### Moderation Integration
x/pat already has `useModeration` with `blockUser` and `reportContent`. These should be accessible from the group member list:
- Block a user: Hide their messages across all chats.
- Report a user: Flag for review.
- Admin: Remove from group + optional ban.

### Recommendation for x/pat
The schema supports groups already. Build the UI incrementally:
1. City chat is already a "group" -- add member list view.
2. Add mute toggle per channel (database column exists).
3. Later: Custom group creation for trip groups, coworking pods, etc.

### Priority for x/pat: MEDIUM

---

## 23. User Blocking / Muting UX Patterns

### Current x/pat State
- `BlockedUsersScreen.tsx`: Lists blocked users with unblock option. Clean implementation.
- `useModeration.ts`: `blockUser()` and `reportContent()` functions.
- `ChatTab.tsx`: Filters messages from blocked users via `useBlockedUsers()`.
- Blocking is available via long-press on chat messages.

### Best Practices (2025-2026 Android)

**Blocking:**
- Make the blocked user unaware they've been blocked (standard across all platforms).
- Block should: hide all content from blocked user, prevent DMs, hide from search/nearby, remove from connections.
- Blocked user sees: "This content is no longer available" if they try to view blocker's profile.
- Bidirectional: Neither party sees the other.

**Muting:**
- Mute is softer than block: user's content is deprioritized or hidden from feed, but they can still message.
- Mute options: Mute posts only, mute messages, mute all.
- Muted users should NOT be notified.
- Show a muted indicator on their profile (visible only to the muter).

### Missing from x/pat
- **Mute functionality**: Currently only block exists. Muting is less aggressive and more commonly used.
- **Block propagation**: Need to verify blocks hide users from search, nearby, events, etc., not just chat.
- **Confirmation dialog**: `BlockedUsersScreen` has unblock confirmation. Need same for blocking action.

### Recommendation for x/pat
Add mute as a softer alternative to blocking. Ensure blocks propagate to all surfaces (search, nearby, events, connections). The current blocking infrastructure is solid -- just needs broader propagation.

### Priority for x/pat: MEDIUM

---

## 24. Report Content Flow on Android

### Current x/pat State
- `ReportModal.tsx`: Bottom sheet with 7 reason pills, single-step selection, submit button.
- Reports stored in `reports` table with `reporter_id`, `target_type`, `target_id`, `reason`.
- Available for: posts (FeedScreen), messages (ChatTab), and via types: post, spot, comment, pulse, user.

### Enhanced Report Flow (2025-2026 Best Practices)

**Multi-Step Flow:**
1. **Step 1**: Select category (current implementation -- keep).
2. **Step 2 (new)**: Optional description text input for "Other" or additional context.
3. **Step 3 (new)**: Optional evidence attachment (screenshot from gallery).
4. **Confirmation**: "Report submitted. We'll review within 24 hours."

**Evidence Attachment:**
```typescript
// Add to ReportModal
const [description, setDescription] = useState('');
const [screenshot, setScreenshot] = useState<string | null>(null);

async function attachScreenshot() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.7,
  });
  if (!result.canceled) setScreenshot(result.assets[0].uri);
}
```

**Content Safety Categories (updated):**
Current reasons are good. Consider adding:
- "Underage user" (critical for safety)
- "Impersonation"
- "Commercial spam / solicitation"

### Server-Side Moderation
- Auto-flag reports with 3+ reports on same content.
- Auto-suspend accounts with 5+ upheld reports.
- Supabase Edge Function for processing reports queue.

### Recommendation for x/pat
Add optional description field (one-line addition to ReportModal). Add "Underage user" and "Impersonation" to reason list. Evidence attachment is a v2 feature. The current single-step flow is fast and low-friction -- don't over-complicate it.

### Priority for x/pat: LOW (current implementation is functional)

---

## 25. Social Onboarding on Android

### Current x/pat State
`OnboardingScreen.tsx` handles initial onboarding. The app has auth gate screens across features that direct unauthenticated users to sign in.

### Social Onboarding Best Practices (2026)

**Progressive Disclosure:**
1. **Sign up**: Apple/Google auth (existing).
2. **Profile basics**: Name, photo, current city (existing).
3. **Travel identity**: Travel style, work type, languages (existing via profile prompts).
4. **Find connections**: Three options presented as cards:
   - "Find friends from contacts" (expo-contacts hash matching)
   - "Connect with people in [current city]" (show nearby users)
   - "Skip for now"
5. **Suggested connections**: Based on city, travel style, languages overlap.

**AI-Powered Suggestions (2026 trend):**
- Analyze profile data to suggest connections: same city, same nationality abroad, same work type.
- "People like you" section based on travel style matching.
- This can be done with simple Supabase queries (no ML needed for v1).

**Nomad-Specific Onboarding:**
- Show a world map with pin drops of where other users are.
- "Your city: Bangkok -- 47 nomads here right now" -- immediate value demonstration.
- Prompt to join city chat immediately after onboarding.

### Android-Specific Patterns
- **Pager-style onboarding**: Use `react-native-pager-view` (already in x/pat dependencies) for swipeable onboarding cards.
- **System-native feel**: On Android, bottom sheet dialogs feel more native than full-screen modals for permission requests.
- **Notification permission timing**: Android 13+ requires explicit POST_NOTIFICATIONS permission. Request after the user has experienced value, not during onboarding.

### Recommendation for x/pat
Add a "Find your community" step to onboarding that shows nearby nomads count and suggests joining city chat. This provides immediate social proof and value. Contact-based friend finding is a later optimization.

### Priority for x/pat: MEDIUM

---

## Summary: Priority Matrix

### Critical (Fix Now)
| # | Feature | Impact |
|---|---------|--------|
| 4 | Android keyboard handling (react-native-keyboard-controller) | Chat is broken on Android |
| 1 | Supabase Realtime AppState reconnection | Messages missed on Android |

### High Priority (Next Sprint)
| # | Feature | Impact |
|---|---------|--------|
| 17 | Feed scroll performance (FlashList + pagination) | Android performance |
| 5 | Notification channels (messages/events/community) | User control |

### Medium Priority (Upcoming Sprints)
| # | Feature | Impact |
|---|---------|--------|
| 7 | Typing indicators (Supabase Broadcast) | Chat feels alive |
| 8 | Message reactions (emoji quick bar) | Engagement |
| 10 | Share sheet upgrade (images + deep links) | Growth |
| 11 | Contact list find friends | Growth |
| 13 | Mutual connections display | Trust signal |
| 14 | Calendar integration for events | Event engagement |
| 19 | Image sharing in chat | Feature parity |
| 21 | Notification inline reply (with Notifee) | Retention |
| 22 | Group chat management UI | Community |
| 23 | Mute functionality | Safety |
| 25 | Social onboarding enhancements | Activation |

### Low Priority (v2 / Polish)
| # | Feature | Impact |
|---|---------|--------|
| 2 | Chat UI refinements | Polish |
| 3 | Message bubble grouping + day separators | Polish |
| 6 | Android conversation widget | Power users |
| 9 | Voice messages | Feature parity |
| 12 | Direct share targets | Power users |
| 15 | Location sharing in chat | Niche |
| 16 | Profile card polish | Polish |
| 18 | Pull-to-refresh Android styling | Cosmetic |
| 20 | Link previews in chat | Polish |
| 24 | Enhanced report flow | Safety |

---

## Dependencies & Installation Notes

### New Packages Needed
```bash
# Critical
npx expo install react-native-keyboard-controller

# High priority
npx expo install @shopify/flash-list

# Medium priority (when ready)
npm install react-native-share
npm install @notifee/react-native
npm install react-native-reactions
npm install rn-emoji-keyboard
npm install link-preview-js
```

### Schema Changes Needed
```sql
-- Message types for media support
ALTER TABLE direct_messages ADD COLUMN message_type text DEFAULT 'text';
ALTER TABLE direct_messages ADD COLUMN media_url text;
ALTER TABLE chat_messages ADD COLUMN message_type text DEFAULT 'text';
ALTER TABLE chat_messages ADD COLUMN media_url text;

-- Message reactions
CREATE TABLE message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL,
  message_table text NOT NULL, -- 'direct_messages' or 'chat_messages'
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Link preview cache
CREATE TABLE link_previews (
  url text PRIMARY KEY,
  title text,
  description text,
  image_url text,
  favicon_url text,
  fetched_at timestamptz DEFAULT now()
);

-- Muted users (softer than blocks)
CREATE TABLE mutes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  muter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mute_posts boolean DEFAULT true,
  mute_messages boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(muter_id, muted_id)
);
```

---

## Sources

- [Supabase Realtime: Handling Silent Disconnections](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794)
- [Supabase Realtime: Understanding Heartbeats](https://supabase.com/docs/guides/troubleshooting/realtime-heartbeat-messages)
- [Supabase Presence Docs](https://supabase.com/docs/guides/realtime/presence)
- [Supabase Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast)
- [react-native-keyboard-controller Docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-sticky-view)
- [Expo Keyboard Handling Guide](https://docs.expo.dev/guides/keyboard-handling/)
- [Notifee AndroidMessagingStyle](https://notifee.app/react-native/reference/androidmessagingstyle/)
- [Notifee Notification Styles](https://notifee.app/react-native/docs/android/styles/)
- [Android Conversation Notifications](https://developer.android.com/social-and-messaging/guides/communication/notifications-conversations)
- [Android Direct Share Targets](https://developer.android.com/training/sharing/direct-share-targets)
- [FlashList Performance](https://shopify.github.io/flash-list/)
- [FlashList vs FlatList 2025 Comparison](https://javascript.plainenglish.io/flashlist-vs-flatlist-2025-complete-performance-comparison-guide-for-react-native-developers-f89989547c29)
- [FlatList Optimization Guide](https://oneuptime.com/blog/post/2026-01-15-react-native-flatlist-optimization/view)
- [Expo Contacts Docs](https://docs.expo.dev/versions/latest/sdk/contacts/)
- [Expo Calendar Docs](https://docs.expo.dev/versions/latest/sdk/calendar/)
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Share](https://react-native-share.github.io/react-native-share/docs/share-single)
- [react-native-audio-waveform](https://github.com/SimformSolutionsPvtLtd/react-native-audio-waveform)
- [Building Live Audio Waveform in React Native](https://dev.to/toshiya_matsumoto_ac94abe/building-your-own-live-audio-waveform-in-react-native-4e49)
- [react-native-reactions](https://github.com/SimformSolutionsPvtLtd/react-native-reactions)
- [link-preview-js](https://github.com/OP-Engineering/link-preview-js)
- [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget)
- [Android Permissions 2025](https://medium.com/@reactjsbd/android-permissions-2025-changes-best-practices-and-react-native-alignment-0e9604c4306f)
- [Material You 3.0 for Android Apps](https://www.techqware.com/blog/material-you-30-the-new-ui-era-for-android-apps)
- [React Native Background Geolocation 2026](https://dev.to/sherry_walker_bba406fb339/react-native-background-geolocation-for-mobile-apps-2026-2ibd)
- [Stream Chat Location Sharing](https://getstream.io/chat/docs/sdk/react-native/guides/location-sharing/)
- [Mastering Media Uploads in React Native 2026](https://dev.to/fasthedeveloper/mastering-media-uploads-in-react-native-images-videos-smart-compression-2026-guide-5g2i)
- [How to Block/Mute on Social Platforms](https://www.scottgoci.com/how-should-blocking-and-muting-work-on-social-media-platforms/)
- [Stream Group Chat with Moderation](https://getstream.io/blog/group-chat-moderator/)
- [RefreshControl React Native Docs](https://reactnative.dev/docs/refreshcontrol)
