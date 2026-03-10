# x/pat Push Notification Playbook

Complete strategy for push notifications in a global nomad/expat community app targeting users under 40.

---

## 1. Notification-to-Action Engagement Loops

The core principle: every notification should trigger an action that generates a notification for someone else, creating a self-sustaining engagement flywheel.

### Loop Architecture

```
User A action -> Notification to User B -> User B opens app -> User B takes action -> Notification to User A (or User C)
```

### x/pat Engagement Loops

| Trigger Action | Notification Sent To | Expected Response Action | Resulting Notification |
|---|---|---|---|
| User A posts a spot | Followers of User A | User B saves/comments on spot | "Sarah saved your spot" to User A |
| User A comments on a spot | Spot author | Author replies to comment | "Alex replied to your comment" to User A |
| User A follows User B | User B | User B checks profile, follows back | "Alex followed you back" to User A |
| User A arrives in a city | Users in that city | Locals/residents react or message | "3 nomads welcomed you to Bangkok" to User A |
| User A sends a message | User B | User B replies | "New reply from Sarah" to User A |
| User A RSVPs to an event | Event creator | Creator sees attendance growing | "15 people attending your meetup" to creator |
| User A shares a spot externally | Invited user | Invited user downloads app | "Your invite brought in a new member" to User A |

### Key Patterns from Top Apps

**Duolingo model (streak/commitment):** x/pat equivalent is a "City Explorer" streak -- users who check in or add a spot every day in a new city build a streak. Notifications escalate: Day 1 gentle, Day 3 encouraging, Day 5 warning, Day 7+ loss aversion.

**Instagram model (social proof):** Batch social notifications -- "Sarah, Mike, and 4 others saved your Lisbon coffee spot" creates FOMO and validation simultaneously.

**Bumble model (urgency/expiration):** Event RSVPs with countdowns -- "Bangkok Rooftop Meetup is tomorrow -- 3 spots left" creates scarcity without being manipulative.

---

## 2. Timezone-Aware Delivery Strategy

### The Problem

x/pat users span 24+ timezones. A user in Bangkok (UTC+7) and a user in Mexico City (UTC-6) are 13 hours apart. Sending at a fixed time guarantees half the audience gets woken up.

### Delivery Tiers

| Tier | Method | When to Use |
|---|---|---|
| **Real-time** | Send immediately | Direct messages, follows, comments on your content |
| **Timezone-adjusted** | Send at target hour in user's local time | Daily digests, re-engagement, marketing |
| **Intelligent delivery** | ML-based per-user optimal time | Weekly roundups, feature announcements, win-back |
| **Quiet hours suppressed** | Queue and deliver after quiet hours | Non-urgent social notifications during 10pm-8am local |

### Implementation Plan

**Phase 1 (Launch):** Store user timezone from device locale. All non-real-time notifications respect a 8am-10pm local delivery window. Notifications outside this window queue to 9am local.

**Phase 2 (Growth):** Track per-user engagement times (when they open the app, when they tap notifications). Build a rolling 30-day profile of each user's peak activity hours.

**Phase 3 (Scale):** Integrate OneSignal Intelligent Delivery or build equivalent. Their data shows 23% higher open rates vs fixed-time delivery and 10% higher vs simple timezone scheduling.

### Technical Approach

```
// Server-side send logic
1. Get user's timezone from push_tokens table (store IANA timezone string)
2. For real-time notifications: send immediately
3. For scheduled notifications:
   - Convert target hour to user's local time
   - If current local time is 10pm-8am: queue to 9am local
   - If user has engagement profile: use their peak hour instead
4. For digest notifications:
   - Batch all accumulated notifications
   - Deliver at user's learned optimal time (default: 10am local)
```

### Nomad-Specific Challenge

Users move cities frequently. Timezone must update automatically:
- Update timezone on every app open (from device)
- Update on location permission grant
- Detect timezone change and re-queue any pending scheduled notifications

---

## 3. Notification Fatigue Prevention

### The Data

- 46% of users opt out after receiving 2-5 messages in one week
- 32% opt out after 6-10 messages in one week
- 10% disable the app entirely when overwhelmed
- 6% uninstall

### x/pat Notification Budget

**Daily maximum: 5 notifications per user.** Broken down by priority:

| Priority | Daily Budget | Types |
|---|---|---|
| **P0 - Critical** | Unlimited (but rare) | Direct messages, safety alerts |
| **P1 - Social** | Max 3/day | Follows, comments on your content, event reminders |
| **P2 - Discovery** | Max 2/day | New spots nearby, trending in your city, community highlights |
| **P3 - Growth** | Max 1/day | Streaks, milestones, re-engagement |
| **P4 - Marketing** | Max 1/week | Feature announcements, partnership promos |

If the budget is exceeded, lower-priority notifications get batched into a digest or dropped entirely.

### Fatigue Prevention Mechanisms

**1. Notification Score System**
Each notification type gets a "cost" score. Daily budget is 10 points.

| Notification | Cost |
|---|---|
| Direct message | 1 point (always sent) |
| Comment on your spot | 2 points |
| New follower | 1 point |
| Spot trending | 3 points |
| Re-engagement nudge | 4 points |
| Weekly digest | 0 points (always sent) |

**2. Batching Rules**
- 3+ follows in 1 hour -> batch to "Sarah, Mike, and 2 others followed you"
- 3+ comments on same spot in 1 hour -> batch to "5 new comments on your Lisbon cafe spot"
- 5+ saves on your spot in 1 day -> single "Your spot is trending" notification

**3. Decay Rules**
- If user hasn't tapped a notification type in 14 days, reduce frequency by 50%
- If user hasn't tapped any notification in 7 days, switch to digest-only mode
- If user taps "Don't send these" on any notification, permanently suppress that type

**4. User Controls (Settings Screen)**

```
Notification Preferences:
  Messages            [Always] [Smart] [Off]
  Social Activity     [Always] [Smart] [Off]
  Nearby Spots        [Always] [Smart] [Off]
  Events              [Always] [Smart] [Off]
  Community Updates   [Always] [Smart] [Off]

Quiet Hours:         [10:00 PM] to [8:00 AM]
Digest Mode:         [Off] (consolidate into daily summary)
```

"Smart" mode = system decides frequency based on engagement patterns.

---

## 4. Re-Engagement Notifications

### What the Data Shows

- 65% of users with push enabled return within 30 days
- Notifications sent at wrong time have 3x higher opt-out rates
- 10-word notifications have 2x the CTR of longer ones
- Emojis increase open rates by 85%

### Re-Engagement Drip Sequence

| Day Inactive | Notification | Deep Link | Tone |
|---|---|---|---|
| **Day 3** | "[City] has 4 new spots since you left" | Explore screen (user's last city) | Curiosity |
| **Day 5** | "Sarah posted a spot near you" | Spot detail (personalized) | Social proof |
| **Day 7** | "12 nomads arrived in [City] this week" | Nearby tab | FOMO |
| **Day 14** | "Your saved spots are waiting" | Saved spots list | Ownership |
| **Day 21** | "The community misses your spots" | Add spot screen | Flattery |
| **Day 30** | "Quick update: here's what's new" | Feed screen | Low-pressure |
| **Day 45+** | STOP sending. Move to email-only. | -- | -- |

### Rules for Re-Engagement

1. **Never guilt-trip.** "You haven't opened the app in 3 days" is passive-aggressive. Instead, lead with value: what they're missing.
2. **Personalize with real data.** Use their actual city, actual connections, actual saved spots.
3. **One shot per tier.** If the Day 3 notification doesn't work, don't send another until Day 5. Never double-tap.
4. **Exit gracefully.** After Day 45 with no engagement, stop push entirely. Attempting further contact via push drives uninstalls.
5. **Reset on return.** If a user comes back at any point, the drip sequence resets completely.

### Copy Templates

```
Day 3:  "Bangkok has 4 new spots since Tuesday"
Day 5:  "Sarah just shared a hidden rooftop bar near Thonglor"
Day 7:  "12 nomads arrived in Bangkok this week -- see who's nearby"
Day 14: "Your 8 saved spots are waiting for you"
Day 21: "Nomads are loving your Cafe Amazon spot -- add another?"
Day 30: "New: event discovery + improved chat. Take a look?"
```

---

## 5. Rich Notification Design

### What's Possible in Expo/React Native

**expo-notifications supports:**
- Title + body text
- Custom notification icon (Android) -- already configured in app.json
- Notification sound customization
- Badge count management
- Data payload for deep linking
- Android notification channels
- iOS notification categories with action buttons

**Requires native module / EAS Build:**
- Rich media attachments (images in notifications) -- via notification service extension
- iOS Live Activities -- requires Swift widget extension, possible with EAS Build
- Android expanded notification layouts

### Android Notification Channels for x/pat

Replace the single "default" channel with purpose-specific channels:

| Channel ID | Name | Importance | Sound | Description |
|---|---|---|---|---|
| `messages` | Messages | HIGH | Default | Direct messages and chat |
| `social` | Social Activity | DEFAULT | Soft chime | Follows, likes, comments |
| `events` | Events | HIGH | Default | Event reminders, RSVPs |
| `nearby` | Nearby Activity | LOW | None | New spots and nomads nearby |
| `community` | Community Updates | DEFAULT | Soft chime | Trending, digests, highlights |
| `system` | System | HIGH | Default | Account, safety, app updates |

This gives Android users granular control. A user who wants messages but not nearby alerts can configure that at the OS level.

### iOS Notification Categories

Define action buttons for key notification types:

| Category | Actions | Use Case |
|---|---|---|
| `MESSAGE` | Reply (text input), Mute | Inline reply to DMs |
| `FOLLOW` | Follow Back, View Profile | Quick reciprocal follow |
| `SPOT` | Save, View | Quick save without opening app |
| `EVENT` | RSVP, View Details | One-tap event signup |
| `COMMENT` | Reply (text input), View | Inline comment reply |

### Rich Media Priority

Phase 1: Text-only notifications with deep links (current capability).
Phase 2: Add notification service extension for image attachments -- spot photos in notifications.
Phase 3: Evaluate iOS Live Activities for real-time event countdowns ("Bangkok Meetup starts in 45 min").

---

## 6. Deep Linking from Notifications

### Current State

x/pat already has:
- URL scheme: `xpat://`
- Universal links configured for `xpat.social` (spot, profile, feed paths)
- Associated domains entitlement
- Android intent filters for `xpat.social/spot`, `/profile`, `/feed`

### Notification Deep Link Map

Every notification must include a `data` payload with a `screen` path and `params`:

| Notification Type | Deep Link Target | Screen | Params |
|---|---|---|---|
| New message | Chat conversation | `ChatScreen` | `{ chatId, senderId }` |
| New follower | Follower's profile | `UserProfileScreen` | `{ userId }` |
| Comment on your spot | Spot detail, scrolled to comments | `SpotDetailScreen` | `{ spotId, scrollTo: 'comments' }` |
| Spot saved by someone | Spot detail | `SpotDetailScreen` | `{ spotId }` |
| Event reminder | Event detail | `EventSwipeScreen` | `{ eventId }` |
| New spot nearby | Spot detail | `SpotDetailScreen` | `{ spotId }` |
| Trending in your city | Explore screen | `ExploreScreen` | `{ city, filter: 'trending' }` |
| Nomads nearby | Nearby tab | `CommunityScreen` | `{ tab: 'nearby' }` |
| Re-engagement (city update) | Explore screen | `ExploreScreen` | `{ city }` |
| Re-engagement (saved spots) | Profile saved tab | `ProfileScreen` | `{ tab: 'saved' }` |
| Weekly digest | Feed screen | `FeedScreen` | `{}` |

### Implementation Pattern

```typescript
// In notification response handler
import { router } from 'expo-router';

addResponseListener((response) => {
  const data = response.notification.request.content.data;

  if (data?.screen) {
    // Small delay to ensure app is fully mounted
    setTimeout(() => {
      router.push({
        pathname: data.screen,
        params: data.params || {},
      });
    }, 500);
  }
});
```

### Firebase Dynamic Links Replacement

Firebase Dynamic Links shut down August 25, 2025. x/pat should use:

**Recommended: Expo Linking + Universal Links (already configured)**
- iOS: Apple App Site Association on xpat.social handles `applinks:xpat.social`
- Android: Intent filters already configured for `xpat.social/spot`, `/profile`, `/feed`
- No third-party dependency required

**For deferred deep linking (user doesn't have app):**
- Expo's built-in linking handles installed case
- For not-installed: Universal link falls through to xpat.social web page with smart app banner directing to App Store/Play Store
- Store intended destination in URL params; on first app open after install, read the referral link

No need for Branch.io or similar -- the existing universal links setup is sufficient for x/pat's scale.

---

## 7. Permission Priming Strategy

### The Benchmarks

- iOS average opt-in: 43.9% (social apps: 30-75% depending on execution)
- Android average opt-in: 81.5% (social apps: 55-97%)
- Pre-permission priming increases opt-in by up to 40%

### x/pat Permission Flow

**Step 1: Delay the ask.** Never ask on first launch. The user hasn't experienced value yet.

**Step 2: Trigger after "aha moment."** For x/pat, the aha moments are:
- After saving their first spot
- After following their first user
- After sending their first message
- After completing onboarding and viewing the explore screen

**Step 3: Pre-permission primer screen.** Before the OS prompt, show a custom modal:

```
---------------------------------------------
|                                           |
|  Stay in the loop                         |
|                                           |
|  Get notified when:                       |
|  * Someone messages you                   |
|  * A friend posts a spot nearby           |
|  * Events happen in your city             |
|                                           |
|  [Enable Notifications]  [Not Now]        |
|                                           |
---------------------------------------------
```

**Step 4: If "Enable" -> show OS prompt. If "Not Now" -> respect it.** Ask again after 7 days, max 2 more attempts total.

**Step 5: If denied at OS level -> show in-app banner (once):**
"You're missing messages! Enable notifications in Settings."
With a direct link to iOS/Android notification settings.

### Optimal Timing Matrix

| Trigger Event | Days Since Install | Show Primer? |
|---|---|---|
| First spot saved | Any | Yes |
| First follow | Day 1+ | Yes |
| First message sent | Any | Yes |
| Completed onboarding | Day 0 | No (too early) |
| Day 3 of use without opt-in | Day 3 | Yes (gentle) |
| Day 7 of use without opt-in | Day 7 | Final attempt |

### Target: 65%+ iOS opt-in, 90%+ Android opt-in

Achievable with pre-permission priming + value-first timing. The social app iOS median is 48%; reaching 65% puts x/pat in the top quartile.

---

## 8. Notification Grouping and Threading

### iOS Grouping Strategy

Use `threadId` in notification payloads to group related notifications:

| Thread ID Pattern | Groups Together | Summary Text |
|---|---|---|
| `chat-{chatId}` | Messages from same conversation | "5 messages from Sarah" |
| `spot-{spotId}` | All activity on one spot | "8 interactions on your Lisbon cafe" |
| `follows` | All new followers | "Sarah, Mike, and 3 others followed you" |
| `events-{city}` | Events in same city | "3 upcoming events in Bangkok" |
| `nearby-{city}` | Nearby activity | "6 new spots in your area" |
| `digest` | Weekly digest items | "Your weekly x/pat roundup" |

### Android Channel + Group Strategy

Android uses both channels (user-controllable categories) and groups (visual bundling):

```
Channel: messages
  Group: chat-abc123
    - "Sarah: Hey, are you in Lisbon?"
    - "Sarah: Found an amazing spot"
    - "Sarah: Check it out!"
  Summary: "3 messages from Sarah"

Channel: social
  Group: followers
    - "Mike followed you"
    - "Emma followed you"
  Summary: "2 new followers"
```

### Batching vs Individual Decision Tree

```
Is it a direct message?
  YES -> Individual notification (always)
  NO -> Is there already an unread notification of this type?
    NO -> Individual notification
    YES -> Has it been < 1 hour since last notification of this type?
      YES -> Batch into group summary
      NO -> Individual notification (enough time has passed)
```

### Server-Side Batching

For high-volume events (a spot goes viral, getting 50 saves in an hour):

1. First save: send individual notification "Sarah saved your spot"
2. Saves 2-4 within next hour: queue, don't send
3. At hour mark (or at 5 saves, whichever first): send batched "Sarah, Mike, and 3 others saved your Lisbon cafe"
4. After 10 saves: switch to milestone notifications only -- "Your spot hit 25 saves!"

---

## 9. Complete Notification Catalog

### Every notification x/pat will send:

#### Social Notifications

| ID | Trigger | Title | Body Template | Deep Link | Priority | Budget Cost |
|---|---|---|---|---|---|---|
| `follow.new` | User gains a follower | "New follower" | "{name} followed you" | UserProfileScreen | P1 | 1 |
| `follow.back` | Someone you follow follows back | "Follow back" | "{name} followed you back" | UserProfileScreen | P1 | 1 |
| `comment.new` | Comment on your spot | "{spot_name}" | "{name}: {comment_preview}" | SpotDetailScreen | P1 | 2 |
| `comment.reply` | Reply to your comment | "{spot_name}" | "{name} replied: {preview}" | SpotDetailScreen | P1 | 2 |
| `spot.save` | Someone saves your spot | "Spot saved" | "{name} saved your {spot_name}" | SpotDetailScreen | P2 | 1 |
| `spot.trending` | Your spot hits trending | "Your spot is trending" | "{spot_name} is trending in {city}" | SpotDetailScreen | P2 | 3 |

#### Messaging Notifications

| ID | Trigger | Title | Body Template | Deep Link | Priority | Budget Cost |
|---|---|---|---|---|---|---|
| `message.new` | New direct message | "{sender_name}" | "{message_preview}" | ChatScreen | P0 | 1 |
| `message.group` | New group message | "{group_name}" | "{sender}: {preview}" | ChatScreen | P0 | 1 |

#### Event Notifications

| ID | Trigger | Title | Body Template | Deep Link | Priority | Budget Cost |
|---|---|---|---|---|---|---|
| `event.new_nearby` | New event in user's city | "New event nearby" | "{event_name} -- {date}" | EventSwipeScreen | P2 | 2 |
| `event.reminder_24h` | 24h before RSVP'd event | "Tomorrow" | "{event_name} starts tomorrow at {time}" | EventSwipeScreen | P1 | 2 |
| `event.reminder_1h` | 1h before RSVP'd event | "Starting soon" | "{event_name} starts in 1 hour" | EventSwipeScreen | P1 | 2 |
| `event.attendee_milestone` | Event hits attendance milestone | "Getting popular" | "{event_name} now has {count} attendees" | EventSwipeScreen | P2 | 2 |

#### Discovery Notifications

| ID | Trigger | Title | Body Template | Deep Link | Priority | Budget Cost |
|---|---|---|---|---|---|---|
| `nearby.new_spot` | New spot posted within 2km | "New spot nearby" | "{name} shared {spot_name} near you" | SpotDetailScreen | P2 | 2 |
| `nearby.nomad_arrived` | Connection arrives in your city | "In your city" | "{name} just arrived in {city}" | UserProfileScreen | P1 | 2 |
| `city.weekly_roundup` | Weekly digest (Sunday) | "Your week in {city}" | "{count} new spots, {events} events" | FeedScreen | P3 | 0 |
| `city.trending_spot` | Spot trending in user's city | "Trending in {city}" | "{spot_name} is getting attention" | SpotDetailScreen | P2 | 3 |

#### Re-Engagement Notifications

| ID | Trigger | Title | Body Template | Deep Link | Priority | Budget Cost |
|---|---|---|---|---|---|---|
| `reengage.day3` | 3 days inactive | "{city} update" | "{city} has {count} new spots since {day}" | ExploreScreen | P3 | 4 |
| `reengage.day5` | 5 days inactive | "From {name}" | "{name} posted a spot near you" | SpotDetailScreen | P3 | 4 |
| `reengage.day7` | 7 days inactive | "Nomads in {city}" | "{count} nomads arrived in {city} this week" | CommunityScreen (nearby) | P3 | 4 |
| `reengage.day14` | 14 days inactive | "Your saved spots" | "Your {count} saved spots are waiting" | ProfileScreen (saved) | P3 | 4 |
| `reengage.day21` | 21 days inactive | "Your spots are loved" | "Nomads are saving your {spot_name}" | SpotDetailScreen | P3 | 4 |
| `reengage.day30` | 30 days inactive | "What's new" | "New features: {feature}. Take a look?" | FeedScreen | P3 | 4 |

#### System Notifications

| ID | Trigger | Title | Body Template | Deep Link | Priority | Budget Cost |
|---|---|---|---|---|---|---|
| `system.welcome` | Account created (post opt-in) | "Welcome to x/pat" | "Start exploring spots shared by nomads" | ExploreScreen | P1 | 0 |
| `system.streak` | Explorer streak milestone | "Streak!" | "{count}-day explorer streak. Keep it up!" | ProfileScreen | P3 | 2 |
| `system.milestone` | Profile milestone | "Milestone" | "You've saved {count} spots!" | ProfileScreen | P3 | 2 |

---

## 10. Send-Time Logic Matrix

| Notification Category | Send Timing | Quiet Hours Behavior |
|---|---|---|
| Direct messages | Immediate | Deliver anyway (P0) |
| Comments/follows | Immediate, batch if >3/hr | Queue to morning |
| Event reminders (24h/1h) | Scheduled relative to event | Deliver anyway (time-sensitive) |
| New spot nearby | Within 30 min, respect budget | Queue to morning |
| Re-engagement | User's peak engagement hour (default 10am local) | Always respect quiet hours |
| Weekly digest | Sunday 10am local | Sunday 11am if in quiet hours |
| Feature announcements | Tuesday 2pm local (highest engagement day) | Queue to next day |
| Trending/milestone | Batch to next engagement window | Queue to morning |

---

## 11. Implementation Phases

### Phase 1: Foundation (Current Sprint)

- Expand Android notification channels (replace single "default" with 6 purpose channels)
- Add deep link routing in notification response handler
- Implement pre-permission primer modal
- Store user timezone in push_tokens table
- Ship: message, follow, comment, event reminder notifications

### Phase 2: Intelligence (Next Sprint)

- Implement notification budget system (server-side)
- Add batching logic for high-volume notifications
- Build notification preferences screen in Settings
- Track notification tap rates per type per user
- Ship: nearby, trending, discovery notifications
- Ship: re-engagement drip sequence

### Phase 3: Optimization (Following Sprint)

- Build per-user engagement time profiles
- Implement intelligent delivery (send at user's peak time)
- Add rich media (spot photos in notifications)
- iOS notification categories with action buttons
- A/B test notification copy variants

### Phase 4: Advanced (Future)

- iOS Live Activities for event countdowns
- Notification score decay system
- ML-based send-time optimization
- Cross-device notification sync

---

## 12. Key Metrics to Track

| Metric | Target | Red Flag |
|---|---|---|
| iOS opt-in rate | 65%+ | Below 40% |
| Android opt-in rate | 90%+ | Below 70% |
| Overall notification CTR | 8%+ | Below 3% |
| Message notification CTR | 25%+ | Below 15% |
| Social notification CTR | 10%+ | Below 5% |
| Re-engagement Day 3 CTR | 12%+ | Below 5% |
| Opt-out rate per week | Below 2% | Above 5% |
| Notifications per DAU per day | 2-4 average | Above 6 |
| Time from notification to action | Under 5 min | Over 30 min |
| Uninstalls attributed to push | Below 1% | Above 3% |

---

## Sources

- [How Duolingo Perfected Push Notifications](https://tinomwadeyi.substack.com/p/how-duolingo-perfected-the-art-of)
- [Duolingo Customer Retention Strategy 2026](https://www.trypropel.ai/resources/duolingo-customer-retention-strategy)
- [Duolingo Push Notification Drip Campaign Playbook](https://www.laudspeaker.com/post/duolingos-push-notification-drip-campaign-playbook-with-lots-of-examples)
- [Duolingo High-Scale Notification System (InfoQ)](https://www.infoq.com/presentations/duolingo-high-scale-notification/)
- [OneSignal: Scheduling by User Time Zone](https://onesignal.com/blog/deliver-by-timezone-push-notification/)
- [OneSignal: Intelligent Delivery (+23% Open Rates)](https://onesignal.com/blog/increase-open-rates-by-up-to-23-percent-with-intelligent-delivery/)
- [Push Notification Statistics 2025 (MobiLoud)](https://www.mobiloud.com/blog/push-notification-statistics)
- [Push Notification Benchmarks 2025 (Pushwoosh)](https://www.pushwoosh.com/blog/push-notification-benchmarks/)
- [Airship: Mobile Push Notification Benchmarks 2025](https://www.airship.com/resources/benchmark-report/mobile-app-push-notification-benchmarks-for-2025/)
- [Notification Fatigue Is Real and Getting Worse (Courier, 2026)](https://courier-com.medium.com/notification-fatigue-is-real-and-getting-worse-e4fc248dc29f)
- [Instagram Notification Ranking Framework (Meta Engineering)](https://engineering.fb.com/2025/09/02/ml-applications/a-new-ranking-framework-for-better-notification-quality-on-instagram/)
- [Instagram Reduces Notification Fatigue (InfoQ)](https://www.infoq.com/news/2025/09/instagram-notification-ranking/)
- [Push Notification Best Practices 2026 (Reteno)](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026)
- [Best Time to Send Push Notifications (Pushwoosh)](https://www.pushwoosh.com/blog/best-time-to-send-push-notifications/)
- [Re-engagement Push Notifications: 8 Dos and Don'ts (Smart Insights)](https://www.smartinsights.com/digital-marketing-strategy/push-notifications-reengagement/)
- [Push Notifications in Chat Apps (ConnectyCube)](https://connectycube.com/2025/12/18/push-notifications-in-chat-apps-best-practices-for-android-ios/)
- [Firebase Dynamic Links Shut Down: Alternatives for 2026](https://chottulink.com/blog/firebase-dynamic-links-shut-down-5-best-alternatives-for-2026/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Using Live Activities in React Native](https://addjam.com/blog/2025-02-04/using-live-activities-react-native-app/)
- [Android Notification Channels (Android Developers)](https://developer.android.com/develop/ui/views/notifications/channels)
- [iOS Notification Grouping (Apple Developer)](https://developer.apple.com/documentation/watchos-apps/grouping-notifications)
- [Deep Linking with Expo Router](https://www.zignuts.com/blog/deep-linking-react-native-expo-router)
- [Bumble Notification Strategy](https://www.oreateai.com/blog/beyond-the-buzz-what-bumble-notifications-really-tell-you/237a829640619b68fc58b3392957953d)
- [How to Increase Push Notification Opt-In Rate (Pushwoosh)](https://www.pushwoosh.com/blog/increase-push-notifications-opt-in/)
- [Viral Engagement Loops (Growth Machine)](https://www.growthmachine.com/blog/create-viral-engagement-loops-to-drive-customer-retention)
- [Push Notification Examples by Industry (Pushwoosh)](https://www.pushwoosh.com/blog/push-notification-examples/)
- [Android Notification Groups (Android Developers)](https://developer.android.com/develop/ui/views/notifications/group)
