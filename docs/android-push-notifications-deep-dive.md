# Android Push Notifications Deep Dive for x/pat

Comprehensive technical research on Android notification mechanics for React Native/Expo, covering FCM, channels, styles, actions, permissions, delivery optimization, and re-engagement strategies. Companion to the existing [push-notification-playbook.md](push-notification-playbook.md).

---

## 1. Firebase Cloud Messaging (FCM) v1 API

### Legacy vs HTTP v1

The legacy FCM HTTP and XMPP APIs were **deprecated June 20, 2023** and **shut down July 22, 2024**. All server-side notification sending must now use the HTTP v1 API.

| Feature | Legacy API | HTTP v1 API |
|---|---|---|
| Authentication | Static server key (never expires) | Short-lived OAuth2 access tokens (~1 hour) |
| Endpoint | `https://fcm.googleapis.com/fcm/send` | `https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send` |
| Platform targeting | Single payload, platform overrides | Explicit `android`, `apns`, `webpush` blocks in JSON |
| Security | Key compromise = permanent access | Token compromise = ~1 hour window |
| Topics | Supported | Supported, same syntax |
| Conditions | Supported | Supported |

### Token Management

- Device tokens (registration tokens) from `getExpoPushTokenAsync()` or `getDevicePushTokenAsync()` remain valid across API migration -- no re-registration needed.
- Tokens can become invalid when: user uninstalls, user clears app data, token expires (rare, FCM handles rotation), or app is re-installed.
- **Best practice**: Store tokens in `push_tokens` table with `updated_at` timestamp. On each app open, refresh and upsert. Delete tokens that return `NotRegistered` errors from FCM.
- x/pat currently stores tokens via Supabase with `user_id`, `token`, and `platform` fields.

### Server-Side Sending (Supabase Edge Functions)

x/pat uses Expo Push Service as middleware (sends to `https://exp.host/--/api/v2/push/send`), which handles FCM/APNs routing. For direct FCM v1 access:

```
// Supabase Edge Function pattern
1. Download service account JSON from Firebase Console > Settings > Service Accounts
2. Use googleapis library to generate OAuth2 token with scope:
   https://www.googleapis.com/auth/firebase.messaging
3. POST to https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send
4. Token refreshes automatically; cache for ~55 minutes
```

**x/pat recommendation**: Continue using Expo Push Service for simplicity. Switch to direct FCM v1 only if you need FCM-specific features (topic messaging, conditions, analytics integration) that Expo's service doesn't expose.

### Supabase Integration Pattern

Supabase recommends a database webhook trigger: when a row is inserted into a `notifications` table, it fires a Supabase Edge Function that fetches the user's push token and calls Expo Push API or FCM v1 directly. This is the recommended pattern for x/pat's server-side notification dispatch.

---

## 2. Android Notification Channels

### What They Are

Android 8.0+ (API 26) requires every notification to belong to a channel. Channels determine sound, vibration, importance, badge behavior, and DND override. Users can independently control each channel in system settings.

### Critical Rules

- Once created, a channel's **importance level cannot be changed programmatically** -- only the user can change it via Settings.
- Channel IDs are permanent. Deleting and recreating with a different importance doesn't work reliably.
- **A notification channel must exist before requesting POST_NOTIFICATIONS permission** on Android 13+ -- the permission prompt won't appear without at least one channel.

### x/pat Current State

Currently uses a single `default` channel with `HIGH` importance. The playbook already recommends expanding to 6 purpose-specific channels.

### Recommended Channel Architecture

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Messages - always high priority, direct user communication
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    description: 'Direct messages and chat conversations',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2EC4A0',
    sound: 'default',
    showBadge: true,
  });

  // Social - follows, comments, saves
  await Notifications.setNotificationChannelAsync('social', {
    name: 'Social Activity',
    description: 'Follows, comments, and saves on your content',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150],
    sound: 'default',
    showBadge: true,
  });

  // Events - reminders, RSVPs, nearby events
  await Notifications.setNotificationChannelAsync('events', {
    name: 'Events',
    description: 'Event reminders and nearby happenings',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    showBadge: true,
  });

  // Nearby - spots and nomads nearby (lower priority)
  await Notifications.setNotificationChannelAsync('nearby', {
    name: 'Nearby Activity',
    description: 'New spots and nomads in your area',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0],
    sound: null, // silent
    showBadge: false,
  });

  // Community - digests, trending, highlights
  await Notifications.setNotificationChannelAsync('community', {
    name: 'Community Updates',
    description: 'Trending spots, weekly digests, community highlights',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: false,
  });

  // System - account, safety, app updates
  await Notifications.setNotificationChannelAsync('system', {
    name: 'System',
    description: 'Account updates, safety alerts, app announcements',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    showBadge: true,
  });
}
```

### Importance Levels Reference

| Level | Behavior | x/pat Use Case |
|---|---|---|
| `MAX` | Makes sound, appears as heads-up, full visual interruption | Not recommended -- too aggressive |
| `HIGH` | Makes sound, appears as heads-up notification | Messages, event reminders, system alerts |
| `DEFAULT` | Makes sound, shows in notification shade | Social activity, community updates |
| `LOW` | No sound, shows in shade | Nearby spots, discovery |
| `MIN` | No sound, no visual interruption, shade only | Analytics-only / internal |

### Channel Groups (Expo Limitation)

Expo's `setNotificationChannelGroupAsync` supports channel groups for visual organization in Android Settings. This groups channels under headers like "Social" or "Discovery." However, this has known issues with Expo -- test thoroughly before shipping.

---

## 3. Android Notification Styles

Android supports expandable notification layouts. These require **Notifee** or native modules -- expo-notifications does not expose these styles directly.

### Available Styles

| Style | Description | x/pat Use Case |
|---|---|---|
| **BigTextStyle** | Expands to show long text | Comment previews, event descriptions |
| **BigPictureStyle** | Shows a large image when expanded | Spot photos in "new spot nearby" notifications |
| **InboxStyle** | Multiple short lines (like email inbox) | Batched notifications: "3 new follows", "5 comments" |
| **MessagingStyle** | Conversation bubbles with sender names | Chat messages -- shows message history |
| **MediaStyle** | Playback controls | Not applicable to x/pat |

### MessagingStyle for Chat (Priority for x/pat)

MessagingStyle is the gold standard for chat notifications on Android. It shows the conversation thread directly in the notification with sender avatars and message bubbles. This is what WhatsApp, Telegram, and Instagram use.

**Implementation requires Notifee**:

```typescript
// Notifee MessagingStyle example (requires @notifee/react-native)
import notifee, { AndroidStyle } from '@notifee/react-native';

await notifee.displayNotification({
  title: 'Chat with Sarah',
  body: 'Found an amazing spot!',
  android: {
    channelId: 'messages',
    style: {
      type: AndroidStyle.MESSAGING,
      person: { name: 'Sarah', icon: 'https://...avatar.jpg' },
      messages: [
        { text: 'Hey, are you in Lisbon?', timestamp: Date.now() - 60000 },
        { text: 'Found an amazing spot!', timestamp: Date.now() },
      ],
    },
  },
});
```

### BigPictureStyle for Spots

When a user shares a new spot with a great photo, the notification can show the spot image:

```typescript
await notifee.displayNotification({
  title: 'New spot nearby',
  body: 'Sarah shared Cafe Lisboa near you',
  android: {
    channelId: 'nearby',
    style: {
      type: AndroidStyle.BIGPICTURE,
      picture: 'https://...spot-photo.jpg',
    },
  },
});
```

### InboxStyle for Batched Notifications

When batching multiple follows or comments:

```typescript
await notifee.displayNotification({
  title: '5 new interactions',
  body: 'Sarah, Mike, and 3 others',
  android: {
    channelId: 'social',
    style: {
      type: AndroidStyle.INBOX,
      lines: [
        'Sarah followed you',
        'Mike saved your spot',
        'Emma commented on Cafe Lisboa',
        'James followed you',
        'Lina saved your spot',
      ],
    },
  },
});
```

### Expo-Notifications Limitation

expo-notifications does not support BigTextStyle, BigPictureStyle, InboxStyle, or MessagingStyle. For basic text notifications, expo-notifications is sufficient. For rich Android notification styles, you need Notifee or a custom native module via Expo Modules API.

**x/pat decision point**: For v1, expo-notifications handles basic needs. For v2 when chat and social features mature, evaluate adding Notifee specifically for MessagingStyle chat notifications and BigPictureStyle spot notifications.

---

## 4. Android Notification Actions

Notification actions are buttons that appear on the notification, allowing users to take action without opening the app.

### Action Types

| Action | Description | x/pat Use Case |
|---|---|---|
| **Press action** | Tap button, opens app to specific screen | "View Spot", "Open Chat" |
| **Text input action** | Inline text field for reply | "Reply" to messages, comments |
| **Background action** | Runs code without opening app | "Mark as Read", "Save Spot" |

### Implementation with Notifee

```typescript
await notifee.displayNotification({
  title: 'Sarah',
  body: 'Hey, are you in Lisbon?',
  android: {
    channelId: 'messages',
    actions: [
      {
        title: 'Reply',
        pressAction: { id: 'reply' },
        input: {
          placeholder: 'Type a reply...',
          allowFreeFormInput: true,
        },
      },
      {
        title: 'Mark as Read',
        pressAction: { id: 'mark-read' },
      },
    ],
  },
});

// Handle action responses
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    if (detail.pressAction.id === 'reply') {
      const replyText = detail.input;
      // Send reply via Supabase
      await sendChatMessage(detail.notification.data.chatId, replyText);
    }
    if (detail.pressAction.id === 'mark-read') {
      await markChatAsRead(detail.notification.data.chatId);
      // Remove the notification
      await notifee.cancelNotification(detail.notification.id);
    }
  }
});
```

### Expo-Notifications Action Support

expo-notifications has **limited** action button support on Android. Notification categories with action buttons are primarily an iOS feature in Expo's implementation. For full Android action support, Notifee is required.

### x/pat Priority Actions

| Notification Type | Actions | Phase |
|---|---|---|
| Chat message | Reply (inline), Mark as Read | Phase 2 |
| New follower | Follow Back, View Profile | Phase 2 |
| Spot recommendation | Save, View | Phase 2 |
| Event reminder | RSVP, View Details | Phase 2 |
| Comment on spot | Reply (inline), View | Phase 3 |

---

## 5. Android Notification Grouping and Summary Notifications

### How Grouping Works

Android groups notifications with the same `groupId` under a single expandable stack. A summary notification (with `groupSummary: true`) provides the collapsed view.

### Implementation with Notifee

```typescript
// Create group summary first
await notifee.displayNotification({
  id: 'social-summary',
  title: 'Social Activity',
  body: '5 new interactions',
  android: {
    channelId: 'social',
    groupId: 'social',
    groupSummary: true,
    groupAlertBehavior: GroupAlertBehavior.SUMMARY, // only summary makes sound
  },
});

// Individual notifications in the group
await notifee.displayNotification({
  title: 'New follower',
  body: 'Sarah followed you',
  android: {
    channelId: 'social',
    groupId: 'social',
  },
});
```

### Expo-Notifications Grouping

expo-notifications does not natively expose Android notification grouping APIs. The `threadId` field works for iOS grouping but has no effect on Android. For proper Android grouping, use Notifee or handle grouping server-side (send batched single notifications instead of individual ones).

### x/pat Grouping Strategy

| Group ID | Notifications Included | Summary Text Pattern |
|---|---|---|
| `chat-{chatId}` | Messages from same conversation | "N messages from {name}" |
| `social` | Follows, saves, comments | "N new interactions" |
| `events-{city}` | Events in same city | "N upcoming events in {city}" |
| `nearby` | Nearby spots and nomads | "N new things nearby" |

### Server-Side Batching (Recommended for x/pat)

Since expo-notifications lacks Android grouping, implement batching on the server:

1. When multiple events of the same type occur within 1 hour, queue them.
2. After 1 hour or when count reaches threshold (3-5), send a single batched notification.
3. The notification body summarizes all events: "Sarah, Mike, and 3 others followed you."
4. This approach works with expo-notifications without needing Notifee.

---

## 6. Android Notification Badges

### Badge Types

Android 8.0+ supports notification badges (dots or counts) on app launcher icons.

| Type | Behavior | Control |
|---|---|---|
| **Notification dots** | Small dot appears on app icon | Default on most launchers |
| **Badge counts** | Shows unread count number | Launcher-dependent (Samsung, Huawei, Xiaomi support; Pixel does not) |

### Per-Channel Badge Control

When creating a channel, `showBadge: true/false` controls whether notifications in that channel contribute to the badge.

**x/pat recommendation**:
- `messages`: badge ON (users need to know about unread messages)
- `social`: badge ON (follows, comments worth seeing)
- `events`: badge ON (time-sensitive)
- `nearby`: badge OFF (low priority, informational)
- `community`: badge OFF (digest-style, not urgent)
- `system`: badge ON (account/safety matters)

### Expo Badge Management

```typescript
import * as Notifications from 'expo-notifications';

// Set badge count
await Notifications.setBadgeCountAsync(5);

// Clear badge
await Notifications.setBadgeCountAsync(0);

// Get current badge count
const count = await Notifications.getBadgeCountAsync();
```

### Badge Count Strategy for x/pat

Track unread counts server-side in Supabase:
- On notification tap: decrement badge, mark notification as read
- On app foreground: sync badge count with server-side unread count
- On "Mark all as read": clear badge to 0

---

## 7. Android Do Not Disturb and Notification Filtering

### DND Levels

| Level | What Gets Through | x/pat Impact |
|---|---|---|
| **Total silence** | Nothing | All notifications deferred |
| **Alarms only** | Alarms | All notifications deferred |
| **Priority only** | Configured categories | Depends on user config |

### How DND Interacts with Channels

Users can allow specific notification channels to bypass DND. Channels with `importance: HIGH` or `MAX` can be marked by the user as "Override Do Not Disturb" in system settings.

### Android 15+ Notification Organizer (AI-based)

Google introduced an on-device AI notification organizer on Pixel devices in 2025-2026. It automatically categorizes notifications into:
- **Promotions** (silenced by default)
- **News** (silenced by default)
- **Social** (manual toggle)
- **Suggested** (manual toggle)

**x/pat impact**: If Google's AI categorizes x/pat notifications as "Promotions" or "News," they could be silenced without user action. To avoid this:
- Use clear, personal notification copy (names, not marketing language)
- Avoid promotional-sounding titles like "Check out" or "Discover"
- Keep notifications genuinely social -- "Sarah sent you a message" rather than "New content available"

### Android 17 Notification Rules (Preview)

Android 17 Beta 3 code suggests a new "Notification Rules" system allowing users to define automated conditions for notification behavior (e.g., silence specific apps during work hours). This will further segment when notifications reach users.

**x/pat recommendation**: Ensure all notifications carry high relevance. The trend is toward AI and user-defined filtering that penalizes low-quality notifications. Every notification must justify its existence with personalized, actionable content.

---

## 8. Android 13+ POST_NOTIFICATIONS Permission

### The Change

Starting Android 13 (API 33), apps must request the `POST_NOTIFICATIONS` runtime permission before sending any non-exempt notification. On Android 12 and below, notifications are allowed by default.

### Key Behaviors

- The permission prompt **will not appear** until at least one notification channel is created.
- If the user denies twice, the system won't show the prompt again -- you must direct them to Settings.
- Expo's `Notifications.requestPermissionsAsync()` handles this automatically on Android 13+.
- `Notifications.getPermissionsAsync()` returns `granted`, `denied`, or `undetermined`.

### x/pat Current Implementation

The current `notifications.ts` already handles this correctly:
1. Checks existing permission status
2. Requests if not granted
3. Returns null if denied

### Enhancement: Channel-First Approach

```typescript
export async function registerForPushNotifications(userId?: string) {
  // IMPORTANT: Create channels BEFORE requesting permission on Android 13+
  if (Platform.OS === 'android') {
    await setupNotificationChannels(); // Create all 6 channels
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // Track denial count in AsyncStorage
    // After 2 denials, show in-app banner with Settings link instead
    return null;
  }
  // ... rest of registration
}
```

### Opt-In Rate Impact

- Pre-Android 13: Android opt-in was ~85% (notifications on by default)
- Post-Android 13 (2025-2026): Android opt-in dropped to **67%** (Airship benchmark)
- With pre-permission priming (x/pat's approach): target **90%+**
- The existing `requestNotificationConsent()` pre-primer dialog is correctly implemented

---

## 9. Scheduled/Local Notifications on Android

### Expo Schedule API

```typescript
import * as Notifications from 'expo-notifications';

// Schedule a notification for a specific time
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Bangkok Rooftop Meetup',
    body: 'Starts in 1 hour -- head over now!',
    data: { screen: 'EventSwipeScreen', params: { eventId: '123' } },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date('2026-04-07T18:00:00'),
    channelId: 'events', // Android channel
  },
});

// Repeating notification (daily digest)
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Your daily x/pat digest',
    body: 'See what happened in Bangkok today',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: 10,
    minute: 0,
    channelId: 'community',
  },
});
```

### Under the Hood

- Expo uses Android's `AlarmManager` for scheduled notifications.
- **Doze mode impact**: In Doze, `AlarmManager` alarms are deferred to the next maintenance window. This means a notification scheduled for 3:00 AM might not fire until 3:15 AM or later.
- For exact timing (event reminders), use `AlarmManager.setExactAndAllowWhileIdle()` -- Expo handles this for date-triggered notifications.

### WorkManager for Background Sync

For periodic background work (syncing notification preferences, refreshing badge counts):

```
expo-task-manager + expo-background-fetch
- Uses WorkManager on Android
- Minimum interval: ~15 minutes
- Not exact -- Android batches for battery efficiency
- Good for: syncing unread counts, refreshing tokens, sending analytics
- Not good for: time-sensitive notifications (use FCM for those)
```

### x/pat Use Cases

| Feature | Mechanism | Notes |
|---|---|---|
| Event reminders (24h, 1h) | `scheduleNotificationAsync` with date trigger | Schedule when user RSVPs |
| Weekly digest | `scheduleNotificationAsync` with weekly trigger | Sunday 10am local |
| Token refresh | `expo-background-fetch` + WorkManager | Every 15 min background check |
| Re-engagement | Server-side FCM (not local) | Better control, analytics |

---

## 10. Android Notification Sound and Vibration Customization

### Sound Configuration

- Custom sounds must be **local .mp3 or .wav files** bundled in the app's `android/app/src/main/res/raw/` directory.
- Remote sound URLs are **not supported**.
- Sound is set **per channel** and **cannot be changed after channel creation** (Android limitation).
- If a user manually changes a channel's sound in Settings, the app cannot override it.

### Vibration Patterns

```typescript
// Pattern: [delay, vibrate, delay, vibrate, ...]
// Messages: short attention-grab
vibrationPattern: [0, 250, 250, 250]

// Social: gentle single pulse
vibrationPattern: [0, 150]

// Events: urgent double-tap
vibrationPattern: [0, 300, 200, 300]

// Nearby: no vibration (silent)
vibrationPattern: [0]
```

### x/pat Sound Strategy

| Channel | Sound | Vibration | Rationale |
|---|---|---|---|
| Messages | Default system sound | Short pattern | Familiar, expected |
| Social | Soft chime (custom) | Gentle pulse | Noticeable but not intrusive |
| Events | Default system sound | Double-tap | Time-sensitive |
| Nearby | None | None | Discovery, not urgent |
| Community | Soft chime | Gentle pulse | Informational |
| System | Default system sound | Short pattern | Important |

### Custom Sound Implementation

To add a custom "soft chime" sound:

1. Add `soft_chime.wav` to `android/app/src/main/res/raw/soft_chime.wav` (via Expo config plugin or prebuild)
2. Reference in channel creation: `sound: 'soft_chime'`
3. In Expo managed workflow, use the `expo-notifications` plugin config in `app.json` for the notification sound, or create a config plugin that copies the sound file during prebuild.

**Important**: Since channel settings lock after creation, get the sound right on first release. Changing it later requires creating a new channel with a new ID (e.g., `social_v2`).

---

## 11. FCM Topic Messaging

### What Topics Are

Topics are publish/subscribe channels. Instead of sending to individual device tokens, you send to a topic and all subscribed devices receive the message. Max **2000 topic subscriptions per device**.

### x/pat Topic Architecture

| Topic Name Pattern | Purpose | Subscribe When |
|---|---|---|
| `city-{city_slug}` | City-specific updates | User sets current city |
| `city-{city_slug}-events` | Events in city | User enables event notifications for city |
| `city-{city_slug}-spots` | New spots in city | User enables nearby notifications for city |
| `global-announcements` | App-wide announcements | On registration |
| `feature-{feature}` | Feature rollout comms | Based on user segment |

### Implementation

Topics require `@react-native-firebase/messaging` (not expo-notifications alone):

```typescript
import messaging from '@react-native-firebase/messaging';

// Subscribe when user arrives in a city
await messaging().subscribeToTopic('city-bangkok');
await messaging().subscribeToTopic('city-bangkok-events');

// Unsubscribe when user leaves
await messaging().unsubscribeFromTopic('city-bangkok');
await messaging().unsubscribeFromTopic('city-bangkok-events');
```

### Topic Messaging via Expo Push Service

Expo Push Service does **not** support FCM topics. To use topics, you must send directly via FCM v1 API:

```json
POST https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send
{
  "message": {
    "topic": "city-bangkok",
    "notification": {
      "title": "New event in Bangkok",
      "body": "Rooftop Social - Friday 7pm at Cloud 47"
    },
    "android": {
      "notification": {
        "channel_id": "events"
      }
    },
    "data": {
      "screen": "EventSwipeScreen",
      "eventId": "abc123"
    }
  }
}
```

### Rate Limits

- Topic subscription rate is **limited per project** -- don't subscribe/unsubscribe in rapid loops.
- If you exceed limits, FCM returns `429 RESOURCE_EXHAUSTED`.
- Batch subscription changes (e.g., when user moves cities, batch unsubscribe-old + subscribe-new).

### x/pat Recommendation

Topic messaging is ideal for city-based broadcasts (new events, trending spots). For individual social notifications (follows, messages), continue using per-device token delivery. Hybrid approach:
- **Topics**: City events, trending spots, announcements (broadcast)
- **Token-based**: Messages, follows, comments, re-engagement (personal)

---

## 12. FCM Data Messages vs Notification Messages

### The Two Types

| Feature | Notification Message | Data Message |
|---|---|---|
| Auto-displayed | Yes (when app in background) | No -- app must handle |
| Foreground handling | Requires `setNotificationHandler` | App receives in `onMessage` |
| Background handling | System tray auto-display | Headless JS task (Android) |
| Customization | Limited to title/body/image | Full control over display |
| Channel selection | Uses FCM default | App chooses channel |
| Rich styles | Not supported | App can apply any style |

### When to Use Which

| x/pat Scenario | Message Type | Reason |
|---|---|---|
| Chat message | Data message | Need MessagingStyle, inline reply actions |
| New follower | Notification message | Simple display, no custom UI needed |
| Event reminder | Notification message | Reliable auto-display even when killed |
| Spot trending | Data message | Need BigPictureStyle with spot photo |
| Re-engagement | Notification message | Must display even if app is killed |
| Weekly digest | Data message | Need InboxStyle with multiple lines |

### Critical Android Behavior

When the app is in the **background or killed**:
- **Notification messages**: Automatically displayed by the system tray. Your app code does NOT run.
- **Data messages**: Your `setBackgroundMessageHandler` runs, allowing custom display via Notifee.
- **Both (notification + data)**: The notification part auto-displays; the data payload is available when user taps.

### Known Expo Gotcha

expo-notifications handles both types through Expo Push Service, which wraps them as notification messages with optional data payload. If you need pure data-only messages for custom rendering, you must bypass Expo Push Service and send directly via FCM v1 API.

**Background fetch limitation**: On Android, expo-notifications' background task handler (`registerTaskAsync`) has known issues with executing network fetches while the app is in background. The task runs but fetch calls may not execute until the app is foregrounded. This is a documented Expo issue (#41146).

---

## 13. Android Notification Click Handling (Deep Linking)

### Current x/pat Setup

x/pat already has:
- URL scheme: `xpat://`
- Universal links for `xpat.social` (spot, profile, feed paths)
- Android intent filters in app.json
- `addResponseListener` for handling notification taps

### Implementation Pattern with Expo Router

```typescript
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

// Handle notification tap (app in foreground or background)
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (data?.screen) {
    // Delay ensures app is fully mounted (critical for cold starts)
    setTimeout(() => {
      router.push({
        pathname: data.screen,
        params: data.params || {},
      });
    }, 500);
  }
});

// Handle notification tap when app was killed (cold start)
// Check for initial notification on app mount
const lastResponse = await Notifications.getLastNotificationResponseAsync();
if (lastResponse) {
  const data = lastResponse.notification.request.content.data;
  if (data?.screen) {
    router.push({ pathname: data.screen, params: data.params || {} });
  }
}
```

### Android-Specific Click Behavior

The `ACTIVITY_PREVENT_RESTART` behavior (default) means:
- If app is in foreground: reuses existing activity, does not restart
- If app is in background: brings existing instance to foreground
- If app is killed: launches new instance

### Deep Link Map (from notification payload)

Every push notification must include a `data` payload:

```json
{
  "screen": "ChatScreen",
  "params": { "chatId": "abc123", "senderId": "user456" }
}
```

The response listener extracts this and routes accordingly. This is already documented in the playbook's Section 6.

### Cold Start Edge Case

On Android, when the app is killed and a notification is tapped:
1. The app launches fresh
2. React Native mounts the root component
3. Navigation state initializes
4. THEN the notification response listener fires

The 500ms `setTimeout` in the handler is a workaround for this race condition. A more robust approach:

```typescript
// In your root layout, wait for navigation to be ready
const navigationRef = useNavigationContainerRef();

useEffect(() => {
  const checkInitialNotification = async () => {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response && navigationRef.isReady()) {
      const { screen, params } = response.notification.request.content.data;
      router.push({ pathname: screen, params });
    }
  };
  checkInitialNotification();
}, [navigationRef.isReady()]);
```

---

## 14. Rich Media Notifications on Android

### What's Possible

| Feature | expo-notifications | Notifee | Native Module |
|---|---|---|---|
| Title + body text | Yes | Yes | Yes |
| Small icon | Yes (via app.json) | Yes | Yes |
| Large icon (avatar) | No | Yes | Yes |
| Expanded image | No | Yes (BigPictureStyle) | Yes |
| Progress bar | No | Yes | Yes |
| Custom layout | No | No | Yes (RemoteViews) |
| Action buttons | Limited | Yes | Yes |
| Inline reply | No | Yes | Yes |

### Image Notifications

For spot recommendation notifications showing a photo:

```typescript
// Notifee approach
await notifee.displayNotification({
  title: 'Trending in Bangkok',
  body: 'Cloud 47 Rooftop Bar is getting attention',
  android: {
    channelId: 'community',
    largeIcon: 'https://...user-avatar.jpg', // sender's avatar
    style: {
      type: AndroidStyle.BIGPICTURE,
      picture: 'https://...spot-photo.jpg', // spot photo
    },
  },
});
```

### Progress Bar Notifications

For file uploads or long operations (e.g., batch spot import):

```typescript
// Notifee approach -- requires foreground service
await notifee.displayNotification({
  id: 'upload-progress',
  title: 'Uploading photos',
  body: '3 of 8 photos uploaded',
  android: {
    channelId: 'system',
    progress: {
      max: 8,
      current: 3,
    },
    ongoing: true, // can't be dismissed
  },
});
```

### Expo-Notifications Image Support

The expo-notifications plugin config in app.json supports a notification `icon` and `color` but NOT inline images or expanded media. For rich media on Android, Notifee is the path.

### x/pat Priority

1. **Phase 1 (now)**: Text-only with expo-notifications -- already working
2. **Phase 2**: Add Notifee for MessagingStyle (chat) and BigPictureStyle (spots)
3. **Phase 3**: Large icon with sender avatars, inline reply actions

---

## 15. Android Notification History and NotificationListenerService

### Notification History (Android 11+)

Android 11+ provides a device-level notification history (last 24 hours) accessible in Settings > Notifications > Notification History. This is an OS feature -- no app implementation needed.

**Implication for x/pat**: Even if a user dismisses a notification, they can recover it from history for 24 hours. This reduces the cost of "missed" notifications but means notification content should be appropriate even when viewed out of context.

### NotificationListenerService

This is an Android API that allows apps to **read all notifications from all apps** on the device. It requires explicit user permission (not a standard runtime permission -- requires navigating to Settings).

**x/pat should NOT use this.** It's a privacy-sensitive API used by launchers, notification management apps, and accessibility services. Using it would trigger Play Store review scrutiny and user trust concerns.

### In-App Notification History

Instead, build an in-app notification feed:

```
notifications table in Supabase:
  - id, user_id, type, title, body, data (JSON),
    read_at, created_at, delivered_at, clicked_at, dismissed_at
```

This gives x/pat its own notification history that:
- Persists longer than 24 hours
- Allows "mark all as read"
- Powers the notification badge count
- Provides analytics data (delivered vs. clicked vs. dismissed)

---

## 16. Battery-Efficient Notification Delivery

### FCM Priority Levels

| Priority | Behavior | When to Use |
|---|---|---|
| **High** | Wakes device from Doze, immediate delivery | Time-sensitive: messages, event reminders |
| **Normal** | Batched during Doze maintenance windows | Non-urgent: social updates, digests, discovery |

### Critical Rule: High Priority Must Show Notifications

Google monitors high-priority message delivery. If your app consistently sends high-priority messages that **don't result in a visible notification**, Google will **downgrade your messages to normal priority** automatically. This is enforced at the FCM infrastructure level.

**x/pat rule**: Every high-priority FCM message must display a user-visible notification. Never use high priority for background data sync.

### Doze Mode Impact

| Device State | Normal Priority | High Priority |
|---|---|---|
| Screen on | Immediate | Immediate |
| Screen off, not Doze | Immediate | Immediate |
| Light Doze | Deferred to maintenance window | Immediate |
| Deep Doze | Deferred to maintenance window | Immediate (but throttled) |

### x/pat Priority Mapping

| Notification Type | FCM Priority | Rationale |
|---|---|---|
| Direct messages | High | Real-time communication |
| Event reminders (1h) | High | Time-sensitive |
| New follower | Normal | Not urgent |
| Spot nearby | Normal | Discovery, not time-critical |
| Weekly digest | Normal | Batch-friendly |
| Re-engagement | Normal | Not urgent, respect battery |
| Comment on spot | Normal | Can wait for maintenance window |
| Event reminder (24h) | Normal | Not immediately urgent |

### WorkManager for Background Tasks

For non-notification background work (token refresh, analytics sync):

```
Use expo-background-fetch which wraps WorkManager:
- Respects battery optimization
- Minimum ~15 minute interval
- OS batches with other apps' work
- No guaranteed exact timing
- Perfect for: unread count sync, token refresh, preference sync
```

---

## 17. Android Auto and Wear OS Notification Bridging

### Default Behavior

By default, Android **automatically bridges** phone notifications to paired Wear OS watches. No additional code needed -- notifications sent to the phone appear on the watch with the same content.

### What Gets Bridged

- Title, body, and small icon
- Action buttons (simplified for watch UI)
- Notification groups
- Inline reply actions (typed on watch keyboard or voice input)

### Controlling Bridging

If you want to prevent certain notifications from appearing on the watch:

```typescript
// Notifee approach
await notifee.displayNotification({
  // ...
  android: {
    localOnly: true, // prevents bridging to Wear OS
  },
});
```

### x/pat Wear OS Strategy

| Notification | Bridge to Watch? | Reason |
|---|---|---|
| Messages | Yes | Quick reply from wrist |
| Event reminders | Yes | Glanceable, time-sensitive |
| New follower | Yes | Simple notification |
| Spot nearby | No (`localOnly: true`) | Requires map/photos -- poor watch UX |
| Weekly digest | No | Too much content for watch |
| Re-engagement | No | Not useful on watch |

### Android Auto

Android Auto bridges notifications similarly. For chat/messaging apps, Android Auto can read messages aloud and accept voice replies. This happens automatically if you use `MessagingStyle` notifications.

**x/pat benefit**: If chat notifications use MessagingStyle (via Notifee), x/pat messages would automatically work with Android Auto voice reading and reply -- a nice UX win for nomads driving.

### Current Expo Limitation

expo-notifications does not expose the `localOnly` flag. All expo-notifications are bridged by default. To control bridging, Notifee is needed.

---

## 18. Notification A/B Testing Frameworks

### Firebase A/B Testing (Built-in)

Firebase offers native A/B testing for push notifications through Firebase Cloud Messaging experiments:

- Test notification **copy** (title, body variants)
- Test **send time** (morning vs. evening)
- Test **targeting** (new users vs. returning)
- Measure: open rate, conversion event, retention
- Uses Firebase Remote Config as the backbone

### Implementation with Firebase

```
1. Firebase Console > Messaging > New Campaign > Experiment
2. Define variants (e.g., Variant A: "New spot nearby", Variant B: "Sarah shared a spot near you")
3. Select target audience (% of users, user properties)
4. Set goal metric (e.g., "app_open" event within 1 hour)
5. Firebase automatically determines winner with statistical significance
```

### Alternative: Custom A/B Testing via Supabase

For x/pat's Supabase-based architecture:

```
1. Create experiment config in Supabase:
   experiments table: { id, name, variants: JSON, active: bool, start_date, end_date }

2. On notification send, assign user to variant:
   - Hash user_id + experiment_id for consistent assignment
   - Store assignment in experiment_assignments table

3. Vary notification content based on variant:
   - Variant A: "Bangkok has 4 new spots"
   - Variant B: "4 nomads shared spots in Bangkok"

4. Track outcomes:
   - notification_events table: { notification_id, event (delivered/clicked/dismissed), timestamp }

5. Analyze: click rate per variant, retention impact per variant
```

### What to A/B Test for x/pat

| Test | Variants | Metric |
|---|---|---|
| Re-engagement copy | City-focused vs. social-focused | Click-through rate |
| Notification timing | 9am local vs. user's peak hour | Open rate |
| Batching threshold | Batch at 3 vs. batch at 5 | Click rate on batched notifications |
| Emoji in title | With vs. without | Open rate |
| Personalization depth | Name only vs. name + specific content | Click rate |
| Channel importance | DEFAULT vs. HIGH for social | Opt-out rate |

### Tools Comparison

| Tool | Cost | Features | x/pat Fit |
|---|---|---|---|
| Firebase A/B Testing | Free | Built-in, limited to FCM notifications | Good for direct FCM sends |
| PostHog | Free tier | Feature flags, analytics, self-hosted option | Good for Supabase integration |
| Statsig | Free tier | Feature flags, experiments | Enterprise-grade |
| Custom (Supabase) | Free | Full control, no vendor lock-in | Best for x/pat's architecture |

---

## 19. Android App Standby Buckets and Notification Delivery Impact

### Bucket Categories (Android 9+)

Android assigns apps to buckets based on usage patterns:

| Bucket | Criteria | Job/Alarm Limits | FCM Impact |
|---|---|---|---|
| **Active** | Currently in use or recently used | No limits | Immediate delivery |
| **Working Set** | Used regularly but not currently | Deferred up to 2 hours | Minor delays possible |
| **Frequent** | Used often but not daily | Deferred up to 8 hours | Normal priority may be delayed |
| **Rare** | Rarely opened | Deferred up to 24 hours | Normal priority significantly delayed |
| **Restricted** (Android 12+) | Barely used, high battery drain | Minimal access | High-priority FCM still works; normal deferred |

### Impact on x/pat Notifications

If a user hasn't opened x/pat in a while, the app moves to lower buckets:
- **High-priority FCM**: Still delivered promptly (messages, event reminders)
- **Normal-priority FCM**: May be delayed hours in rare/restricted buckets
- **Scheduled local notifications**: May be deferred significantly
- **Background tasks**: Severely limited in restricted bucket

### Mitigation Strategies

1. **Use high priority for time-sensitive notifications**: Messages, event reminders
2. **Send re-engagement notifications via FCM (not local)**: FCM high-priority bypasses bucket restrictions
3. **Encourage regular app opens**: Users who open the app stay in Active/Working Set
4. **Don't rely on background tasks for critical notifications**: Use server-side FCM push instead

### OEM-Specific Battery Management (The Real Problem)

Beyond stock Android buckets, OEMs like Samsung, Xiaomi, OnePlus, and Huawei add **additional** aggressive battery management:

| OEM | Behavior | Severity |
|---|---|---|
| **Samsung** | "Sleeping apps" list, auto-optimization | Moderate |
| **Xiaomi (MIUI)** | Auto-start restriction, battery saver kills background | Severe |
| **OnePlus (OxygenOS)** | One of the most aggressive app killers | Severe |
| **Huawei (EMUI)** | Protected apps whitelist required | Severe |
| **Oppo (ColorOS)** | Similar to OnePlus | Severe |
| **Pixel (stock)** | Standard Android buckets only | Mild |

### What x/pat Should Do

1. **Detect OEM**: Check `Device.manufacturer` on first launch
2. **For aggressive OEMs**: Show a one-time guide directing users to whitelist x/pat from battery optimization
3. **Use dontkillmyapp.com API**: Provides per-OEM instructions that can be shown in-app
4. **Notifee helper**: Notifee provides `notifee.openBatteryOptimizationSettings()` to deep-link users directly to the battery settings

```typescript
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// On first launch, check if OEM needs special handling
if (Platform.OS === 'android') {
  const manufacturer = Device.manufacturer?.toLowerCase();
  const aggressiveOEMs = ['xiaomi', 'oneplus', 'huawei', 'oppo', 'vivo', 'samsung'];

  if (aggressiveOEMs.includes(manufacturer)) {
    // Show one-time modal with battery optimization instructions
    // Link to dontkillmyapp.com/{manufacturer} for detailed steps
  }
}
```

---

## 20. Push Notification Delivery Rates: Android vs iOS (2025-2026 Benchmarks)

### Opt-In Rates

| Platform | 2024 | 2025-2026 | Trend |
|---|---|---|---|
| Android | 85% | **67%** | Sharp decline (Android 13 permission change) |
| iOS | 58% | **56%** | Slight decline |
| Overall average | -- | **61%** | -- |

The Android opt-in rate dropped dramatically because Android 13 aligned with iOS's opt-in model (ask first, not enabled by default).

### Click-Through Rates (CTR)

| Category | Android CTR | iOS CTR |
|---|---|---|
| Overall average | **10.7%** reaction rate | **4.9%** reaction rate |
| E-commerce | 3.78% | 3.05% |
| Fintech | 2.84% | 2.09% |
| Social apps | ~5-8% | ~3-5% |
| Travel apps | ~4-6% | ~3-4% |

Android consistently outperforms iOS on engagement, likely because Android users who opt in are more intentional (post-Android 13).

### Delivery Rates

| Metric | Android | iOS |
|---|---|---|
| Delivery rate | 85-95% | 95-99% |
| Delivery failure reasons | OEM battery kill, Doze, bucket restrictions | Token expiration, APNs throttling |

Android delivery is less reliable due to OEM fragmentation. iOS delivery is near-perfect when tokens are valid.

### x/pat Targets (Based on Social App Benchmarks)

| Metric | Target | Industry Median |
|---|---|---|
| Android opt-in | 90%+ (with priming) | 67% |
| iOS opt-in | 65%+ (with priming) | 56% |
| Message notification CTR | 25%+ | 15-20% |
| Social notification CTR | 10%+ | 5-8% |
| Overall CTR | 8%+ | 4-5% |
| Weekly opt-out rate | <2% | 3-5% |

---

## 21. Android Notification Analytics

### What to Track

| Event | When Logged | How to Track |
|---|---|---|
| **Sent** | Server sends to FCM/Expo | Server-side log |
| **Delivered** | Device receives notification | FCM delivery reports / Expo receipts |
| **Displayed** | Notification appears in tray | Notifee `DISPLAYED` event |
| **Clicked** | User taps notification | `addNotificationResponseReceivedListener` |
| **Dismissed** | User swipes away | Notifee `DISMISSED` event |
| **Action taken** | User taps action button | Notifee `ACTION_PRESS` event |

### Expo Push Receipts

Expo provides delivery receipts:

```typescript
// After sending via Expo Push API, get receipt IDs
const tickets = await sendPushNotifications(messages);

// Later, check receipts
const receiptIds = tickets.map(t => t.id);
const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);

for (const [id, receipt] of Object.entries(receipts)) {
  if (receipt.status === 'ok') { /* delivered */ }
  if (receipt.status === 'error') {
    if (receipt.details?.error === 'DeviceNotRegistered') {
      // Token is invalid -- remove from push_tokens table
    }
  }
}
```

### Notifee Event Tracking (More Granular)

```typescript
import notifee, { EventType } from '@notifee/react-native';

// Foreground events
notifee.onForegroundEvent(({ type, detail }) => {
  switch (type) {
    case EventType.DISMISSED:
      logNotificationEvent(detail.notification.id, 'dismissed');
      break;
    case EventType.PRESS:
      logNotificationEvent(detail.notification.id, 'clicked');
      break;
    case EventType.ACTION_PRESS:
      logNotificationEvent(detail.notification.id, 'action', detail.pressAction.id);
      break;
  }
});

// Background events
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Same handling as foreground
});
```

### Analytics Schema for Supabase

```sql
CREATE TABLE notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id),
  user_id uuid REFERENCES profiles(id),
  event_type text NOT NULL, -- 'sent', 'delivered', 'displayed', 'clicked', 'dismissed', 'action'
  action_id text, -- for action button presses
  created_at timestamptz DEFAULT now()
);

-- Useful queries:
-- CTR by notification type: clicked / delivered per type
-- Dismiss rate by type: dismissed / displayed per type
-- Time to click: avg(clicked_at - delivered_at) per type
-- Funnel: sent -> delivered -> displayed -> clicked per type
```

### Key Expo Limitation

expo-notifications does **not** provide `DISPLAYED` or `DISMISSED` events. You get:
- `addNotificationReceivedListener` -- fires when notification arrives (foreground only)
- `addNotificationResponseReceivedListener` -- fires when user taps

You do NOT get: dismissed events, displayed confirmation, or action button events without Notifee.

**x/pat Phase 1**: Track sent (server), delivered (Expo receipts), and clicked (response listener). This covers the critical funnel.
**x/pat Phase 2**: Add Notifee for dismissed tracking and action button analytics.

---

## 22. Expo Notifications Android-Specific Configuration and Gotchas

### Known Issues (2025-2026)

| Issue | Description | Workaround |
|---|---|---|
| **Channel ignored in background** | When app is in background, FCM auto-displays notifications on the "default" channel, ignoring the specified channel | Send channel_id in the FCM `android.notification` block, not just in data payload |
| **Background fetch fails** | `registerTaskAsync` background handler can't execute network requests until app is foregrounded | Use FCM data messages + Notifee for background processing instead |
| **Sound not playing** | Custom sounds may not work on some Android versions | Ensure sound file is in `res/raw/`, use channel-level sound, test on real devices |
| **Notification not showing on Android 13+** | No channel created before permission request | Always call `setNotificationChannelAsync` before `requestPermissionsAsync` |
| **Dev build splash screen bug** | ~70% of the time, notification tap in dev build gets stuck on splash | Test notification launches in release/preview builds |
| **Action buttons missing in background** | Notification category actions don't appear when app is killed | Known Expo issue (#36282) -- use Notifee for reliable actions |
| **Badge count incorrect** | Badge count drifts on some OEMs | Sync badge count on every app foreground event |

### Critical Configuration Checklist

1. **app.json plugin config**: Already configured with icon and color
2. **google-services.json**: Required for FCM -- add to project root, reference in app.json
3. **Notification channels**: Must be created before requesting permissions
4. **projectId**: Must match EAS project ID in `getExpoPushTokenAsync()` -- already correct
5. **expo-dev-client**: Required for testing notifications in development (Expo Go has limitations)

### expo-notifications vs Notifee Decision Matrix

| Feature | expo-notifications | Notifee | Verdict for x/pat |
|---|---|---|---|
| Basic push display | Yes | Yes | expo-notifications sufficient |
| Notification channels | Yes | Yes | Both work |
| Permission handling | Yes | Via react-native-permissions | expo-notifications simpler |
| Notification styles | No | Yes | Need Notifee for Phase 2 |
| Action buttons (Android) | Limited/buggy | Full support | Need Notifee for Phase 2 |
| Notification grouping | No (Android) | Yes | Need Notifee for Phase 2 |
| Dismissed event | No | Yes | Need Notifee for analytics |
| Foreground service | No | Yes | Need Notifee if needed |
| Maintenance status | Active (Expo team) | **Barely maintained** (last release Dec 2024) | Risk factor |

### Notifee Maintenance Warning

As of 2025-2026, Notifee's maintainers have stated the library is "only barely" maintained, and they recommend expo-notifications as an alternative. However, expo-notifications lacks many Android-specific features that Notifee provides.

**x/pat strategy**: Use expo-notifications for Phase 1 (basic notifications). Monitor the Notifee maintenance situation. If Notifee becomes truly unmaintained, evaluate:
- Building custom native modules via Expo Modules API for specific features
- Using `@react-native-firebase/messaging` + custom Kotlin notification display code
- Waiting for expo-notifications to add missing Android features

---

## 23. Android Foreground Service Notifications

### What They Are

Foreground services perform operations noticeable to the user (music playback, location tracking, file upload). Android **requires** a persistent notification while a foreground service is running.

### When x/pat Might Need Them

| Use Case | Foreground Service? | Alternative |
|---|---|---|
| Background location tracking | Yes (if tracking movement between cities) | Use significant location changes instead |
| Photo upload (multiple) | Maybe | WorkManager for background upload |
| Real-time chat sync | No | FCM push is sufficient |
| Music/audio playback | N/A | x/pat doesn't play media |

### Android 14+ Requirements

- Must declare foreground service type in AndroidManifest (location, dataSync, etc.)
- Must request `FOREGROUND_SERVICE_*` permission (e.g., `FOREGROUND_SERVICE_LOCATION`)
- Users see a persistent notification they cannot dismiss
- Users can stop the foreground service from the notification

### Implementation with Notifee

```typescript
// Notifee foreground service for batch photo upload
notifee.registerForegroundService((notification) => {
  return new Promise(async (resolve) => {
    // Upload photos with progress updates
    for (let i = 0; i < totalPhotos; i++) {
      await uploadPhoto(photos[i]);
      await notifee.displayNotification({
        id: notification.id,
        title: 'Uploading photos',
        body: `${i + 1} of ${totalPhotos}`,
        android: {
          channelId: 'system',
          progress: { max: totalPhotos, current: i + 1 },
          ongoing: true,
          asForegroundService: true,
        },
      });
    }
    resolve();
  });
});
```

### x/pat Recommendation

Avoid foreground services unless absolutely necessary. They create persistent notifications that annoy users. For x/pat:
- Photo uploads: Use background upload via WorkManager (no persistent notification needed for small uploads)
- Location: Use `expo-location` background location with appropriate permissions
- Chat: FCM push is sufficient -- no need for persistent connection

---

## 24. Android 14/15 Notification Changes

### Android 14 (API 34) Changes

| Change | Impact on x/pat | Action Required |
|---|---|---|
| **Full-screen intent restriction** | Only calling/alarm apps get FSI by default | Don't use full-screen intents -- use high-priority heads-up instead |
| **Foreground service type required** | Must declare service type in manifest | Add type declaration if using foreground services |
| **Custom notification visuals** | Standard templates only for most apps | Use Android's built-in styles (BigText, BigPicture, etc.) |
| **Dismiss notification from FGS** | Users can dismiss FGS notifications (except a few types) | Handle gracefully -- service continues but notification gone |

### Android 15 (API 35) Changes

| Change | Impact on x/pat | Action Required |
|---|---|---|
| **Background activity launch restrictions** | Apps targeting API 35 get SecurityException when launching activities from background | Don't launch activities from notification handlers in background -- use PendingIntent |
| **Tighter foreground service rules** | More restrictions on when FGS can start | Minimize FGS usage |
| **Edge-to-edge enforcement** | UI changes but doesn't affect notifications | N/A |

### Full-Screen Intent (FSI) Detail

FSI was previously used by apps to show full-screen notifications (like incoming calls). Starting Android 14:
- Only apps with `USE_FULL_SCREEN_INTENT` permission can use FSI
- This permission is **only auto-granted** to calling and alarm apps
- Other apps must request user permission via `ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`
- **x/pat should NOT use FSI** -- use `HIGH` importance channel for heads-up notifications instead

### Android 16/17 Preview Changes (2026)

- AI-based notification filtering becoming more prevalent
- Notification Rules system for user-defined automation
- Continued tightening of background restrictions

### x/pat Compatibility

The current expo-notifications setup is compatible with Android 14/15. Key things to verify:
- `targetSdkVersion` in EAS build config targets API 34+
- No full-screen intents are used
- No background activity launches from notification handlers
- PendingIntents used for notification tap actions (Expo handles this)

---

## 25. Re-Engagement Strategies on Android

### Timing Optimization

| Strategy | Implementation | Expected Lift |
|---|---|---|
| **User-specific optimal time** | Track when each user opens the app; send re-engagement at their median open time | +23% open rate vs. fixed time |
| **Day-of-week optimization** | Tuesday-Thursday see highest engagement | +10-15% vs. weekend sends |
| **Timezone-aware delivery** | Store IANA timezone; deliver at 9-10am local | +20% vs. UTC-based |
| **Post-session triggers** | Send within 2 hours of last session end | +35% vs. next-day |

### Personalization Depth

| Level | Example | CTR Lift |
|---|---|---|
| Generic | "Check out new spots" | Baseline |
| Name personalized | "Alex, check out new spots" | +15% |
| Behavior personalized | "Alex, 3 new spots near Thonglor" | +45% |
| Social personalized | "Sarah shared a spot 500m from you" | +74% |

AI-driven hyper-personalized notifications outperformed generic pushes by **74% in 2026** (up from 59% in 2025).

### Frequency Caps

| Rule | Implementation | Purpose |
|---|---|---|
| Max 5 notifications/day | Server-side counter per user per day | Prevent fatigue |
| Max 1 re-engagement/day | Drip sequence enforces this | Prevent annoyance |
| 14-day decay | If notification type untapped for 14 days, reduce by 50% | Adapt to user preferences |
| 45-day hard stop | After 45 days inactive, stop push entirely | Prevent uninstalls |
| Cool-down after dismiss | If user dismisses same type 3x, pause that type for 7 days | Respect implicit feedback |

### Android-Specific Re-Engagement Advantages

1. **Widget re-engagement**: Android supports home screen widgets -- a "Nearby Nomads" widget keeps x/pat visible without notifications
2. **Notification channels give users control**: Users can keep "Messages" on but turn off "Discovery" -- better than all-or-nothing
3. **Higher engagement rates**: Android users who opt in show 10.7% reaction rate vs. 4.9% on iOS
4. **Topic-based broadcasts**: Use FCM topics for city-specific re-engagement without managing individual tokens

### Re-Engagement Drip Sequence (Android-Optimized)

```
Day 0:    User goes inactive (last_active tracked in Supabase)
Day 3:    "{city} has {count} new spots since {day}"
          -> FCM normal priority, channel: community
          -> Deep link: ExploreScreen with city filter

Day 5:    "{name} posted a spot near you"
          -> FCM normal priority, channel: social
          -> Deep link: SpotDetailScreen (real personalized spot)

Day 7:    "{count} nomads arrived in {city} this week"
          -> FCM normal priority, channel: community
          -> Deep link: CommunityScreen nearby tab

Day 14:   "Your {count} saved spots are waiting"
          -> FCM normal priority, channel: community
          -> Deep link: ProfileScreen saved tab

Day 21:   "Nomads are saving your {spot_name}"
          -> FCM normal priority, channel: social
          -> Deep link: SpotDetailScreen (their actual spot with real saves)

Day 30:   "Quick update: here's what's new in x/pat"
          -> FCM normal priority, channel: system
          -> Deep link: FeedScreen

Day 45+:  STOP all push. Move to email-only.
          -> Remove from active push segments
          -> Flag user as "push-dormant" in Supabase
```

### Measuring Re-Engagement Success

| Metric | How to Track | Target |
|---|---|---|
| Reactivation rate | Users who open app within 24h of re-engagement push | 12%+ for Day 3, declining to 5% for Day 30 |
| Push-attributed DAU | DAU from notification clicks / total DAU | 15-25% |
| Opt-out rate from drip | Users who disable notifications during drip | <3% per step |
| 30-day retention lift | Retained users from re-engagement vs. control (no push) | +25-35% |

---

## Summary: Implementation Priority for x/pat

### Phase 1: Foundation (Current -- expo-notifications only)

- [ ] Expand from 1 channel to 6 purpose-specific channels
- [ ] Create channels BEFORE requesting permissions
- [ ] Implement deep link routing from notification tap
- [ ] Add Expo Push receipt checking for token cleanup
- [ ] Store user timezone in push_tokens table
- [ ] Implement server-side notification dispatch via Supabase Edge Functions
- [ ] Add OEM battery optimization detection and user guidance
- [ ] Track: sent, delivered (receipts), clicked (response listener)

### Phase 2: Rich Notifications (Evaluate Notifee vs. alternatives)

- [ ] MessagingStyle for chat notifications
- [ ] BigPictureStyle for spot recommendations
- [ ] InboxStyle for batched social notifications
- [ ] Inline reply actions for chat
- [ ] Android notification grouping
- [ ] Dismissed event tracking
- [ ] Server-side notification batching and budget system

### Phase 3: Intelligence

- [ ] FCM topic messaging for city-based broadcasts
- [ ] Per-user optimal send time calculation
- [ ] A/B testing framework for notification copy
- [ ] Notification score decay system
- [ ] Re-engagement drip sequence automation
- [ ] Frequency cap enforcement
- [ ] Wear OS bridging control (localOnly for non-essential)

### Phase 4: Advanced

- [ ] Custom notification sounds per channel
- [ ] Widget for home screen presence
- [ ] Cross-device notification sync
- [ ] AI-based send-time optimization
- [ ] Notification content personalization engine

---

## Sources

- [Firebase: Migrate from legacy FCM APIs to HTTP v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Firebase: Set and manage Android message priority](https://firebase.google.com/docs/cloud-messaging/android-message-priority)
- [Firebase: Send a message using FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [Firebase: Ensure your FCM notifications reach users on Android](https://firebase.blog/posts/2025/04/fcm-on-android/)
- [Firebase: Set the priority of a message](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority)
- [Android Developers: Notification channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [Android Developers: Notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- [Android Developers: Create an expandable notification](https://developer.android.com/develop/ui/views/notifications/expanded)
- [Android Developers: Group notifications](https://developer.android.com/develop/ui/views/notifications/group)
- [Android Developers: Modify a notification badge](https://developer.android.com/develop/ui/views/notifications/badges)
- [Android Developers: App Standby Buckets](https://developer.android.com/topic/performance/appstandby)
- [Android Developers: Optimize for Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [Android Developers: Power management resource limits](https://developer.android.com/topic/performance/power/power-details)
- [Android Developers: Full-screen intent limits](https://source.android.com/docs/core/permissions/fsi-limits)
- [Android Developers: Behavior changes for apps targeting Android 14](https://developer.android.com/about/versions/14/behavior-changes-14)
- [Android Developers: Behavior changes for apps targeting Android 15](https://developer.android.com/about/versions/15/behavior-changes-15)
- [Android Developers: Wear OS notification bridging options](https://developer.android.com/training/wearables/notifications/bridger)
- [Android Developers: NotificationListenerService reference](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- [Android Developers: Notification history](https://source.android.com/docs/core/display/notification-history)
- [Expo Documentation: Notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Documentation: What you need to know about notifications](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
- [Expo Documentation: Push notifications troubleshooting and FAQ](https://docs.expo.dev/push-notifications/faq/)
- [Expo Documentation: Send notifications with FCM and APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom/)
- [Expo Documentation: Linking into your app](https://docs.expo.dev/linking/into-your-app/)
- [Supabase: Sending Push Notifications with Edge Functions](https://supabase.com/docs/guides/functions/examples/push-notifications)
- [Notifee: Android Styles](https://notifee.app/react-native/docs/android/styles/)
- [Notifee: Android Interaction (Actions)](https://notifee.app/react-native/docs/android/interaction/)
- [Notifee: Android Grouping and Sorting](https://notifee.app/react-native/docs/android/grouping-and-sorting/)
- [Notifee: Android Appearance (Badges)](https://notifee.app/react-native/docs/android/appearance/)
- [Notifee: Android Behaviour (Sound/Vibration)](https://notifee.app/react-native/docs/android/behaviour/)
- [Notifee: Android Foreground Service](https://notifee.app/react-native/docs/android/foreground-service/)
- [Notifee: Android Background Restrictions](https://notifee.app/react-native/docs/android/background-restrictions/)
- [Notifee: Events](https://notifee.app/react-native/docs/events/)
- [Notifee: Firebase Cloud Messaging Integration](https://notifee.app/react-native/docs/integrations/fcm/)
- [Notifee maintenance status (GitHub issue #1254)](https://github.com/invertase/notifee/issues/1254)
- [Notifee vs expo-notifications gap analysis (GitHub issue #1266)](https://github.com/invertase/notifee/issues/1266)
- [React Native Firebase: Cloud Messaging](https://rnfirebase.io/messaging/usage)
- [React Native Firebase: Notifications](https://rnfirebase.io/messaging/notifications)
- [Expo issue #30762: Channel ignored in background](https://github.com/expo/expo/issues/30762)
- [Expo issue #41146: Background fetch limitation](https://github.com/expo/expo/issues/41146)
- [Expo issue #36282: Action buttons missing in background](https://github.com/expo/expo/issues/36282)
- [Airship: Mobile App Push Notification Benchmarks 2025](https://www.airship.com/resources/mobile-app-push-notification-benchmarks-for-2025/)
- [Airship: Mobile App Push Notification Benchmarks 2026](https://www.airship.com/resources/mobile-app-push-notification-benchmarks-2026/)
- [Pushwoosh: Push Notification Benchmarks 2025](https://www.pushwoosh.com/blog/push-notification-benchmarks/)
- [MobiLoud: 50+ Push Notification Statistics 2025](https://www.mobiloud.com/blog/push-notification-statistics)
- [AMRA & ELMA: Push Notification Marketing Statistics 2026](https://www.amraandelma.com/push-notification-marketing-statistics/)
- [CleverTap: 25 Effective Push Notification Strategies](https://clevertap.com/blog/push-notification-strategy/)
- [Pushwoosh: Best Push Notification Strategies 2025](https://www.pushwoosh.com/blog/push-notification-best-practices/)
- [Customer.io: Push Notification Psychology](https://customer.io/learn/mobile-marketing/push-notification-psychology)
- [Don't Kill My App: OEM background restrictions](https://dontkillmyapp.com/)
- [DroidCon: Full-Screen Intent Notifications in Android 14 & 15](https://www.droidcon.com/2025/09/02/full-screen-intent-fsi-notifications-in-android-14-15/)
- [Making Expo Notifications Actually Work (Android 12+ and iOS)](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845)
- [FCM No-Fail Guide: Push Notifications in React Native 2025](https://medium.com/@rafizimraanarjunawijaya/fcm-no-fail-guide-mastering-push-notifications-in-react-native-foreground-background-killed-43d119e01bb8)
- [React Native Push Notifications Complete Guide 2026](https://devcom.com/tech-blog/react-native-push-notifications/)
- [Mastering Push Notifications in React Native: The 2026 Guide](https://reactnativecoders.com/latest-article/push-notifications-in-react-native/)
- [Expo Local Notifications in 2026](https://www.codesofphoenix.com/articles/expo/local-notifications-expo)
- [Push Notification Status Tracking in React Native](https://www.fullstack.com/labs/resources/blog/tracking-push-notification-status-in-react-native)
- [App Background Activity 2026: OS Restrictions Guide](https://alexrooter.com/os-background-limits/)
- [React Native Wear OS Connectivity](https://github.com/fabOnReact/react-native-wear-connectivity)
- [Firebase A/B Testing for Mobile Apps](https://www.tatvic.com/blog/firebase-learn-a-b-testing-in-mobile-apps/)
- [PostHog: Best Mobile App A/B Testing Tools](https://posthog.com/blog/best-mobile-app-ab-testing-tools)
- [Notificare: Background Limitations in Android](https://notificare.com/blog/2024/12/13/android-background-limitations/)
