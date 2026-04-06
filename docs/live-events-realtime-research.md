# Live Events, Real-Time Social Features & Community Meetups Research
**x/pat CTO Research Report | April 2026**

---

## Overview

This report covers 30 research topics across five domains critical to x/pat's next growth phase: in-app events, real-time presence, spontaneous meetups, city channels, live travel intelligence, and coworking availability. Each section includes industry benchmarks, engagement data, and a concrete implementation path using x/pat's stack (React Native/Expo + Supabase Realtime + PostgreSQL/PostGIS).

---

## Domain 1: In-App Events System (Topics 1–5)

### Topic 1: Event Creation UX — Best Practices and Conversion

**Industry Benchmarks**
- Mobile event apps increase attendee satisfaction by 67% and generate 234% more social media mentions compared to external event tools.
- Events using in-app creation tools see 43% higher sponsorship/host renewal rates and 78% of attendees more likely to return for future events.
- The global event ticketing market is growing from $85.35B (2025) to $102.79B by 2030, driven by smart digital-first event flows.

**Key Design Principles**
- Minimize friction: event creation should complete in under 90 seconds. Ask for title, location (map pin or spot), date/time, and capacity. Everything else is optional.
- Embed event creation within the SpotCard context — users creating an event at a coworking space or cafe already have the location resolved.
- Show a live preview of how the event card will appear before publishing. Reduces abandonment.
- Offer recurring event templates (weekly language exchange, monthly nomad dinner) to reward repeat hosts.
- Apple App Store In-App Events feature can surface events in search/editorial — use structured metadata (what, why now, CTA) to qualify.

**Implementation Path — Supabase + React Native**
```sql
CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by   uuid REFERENCES profiles(id),
  spot_id      uuid REFERENCES spots(id),
  title        text NOT NULL,
  description  text,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  capacity     int,
  is_public    boolean DEFAULT true,
  city         text,
  location     geography(Point, 4326),  -- PostGIS
  cover_image  text,
  created_at   timestamptz DEFAULT now()
);

-- RLS: public events visible to all, private to invitees
CREATE POLICY "Public events are visible"
  ON events FOR SELECT USING (is_public = true);
CREATE POLICY "Host can edit own events"
  ON events FOR ALL USING (created_by = auth.uid());
```

React Native component: multi-step bottom sheet (via `@gorhom/bottom-sheet`) with steps: Location → Title/Description → Date/Time → Capacity → Publish. Use `expo-image-picker` for cover image.

---

### Topic 2: Event Discovery — Geolocation Radius and Personalization

**Industry Benchmarks**
- AI-powered recommendations drive 80%+ of content discovery. Facebook's 2025 algorithm explicitly re-prioritized Groups and Events for local discovery.
- Apps that personalize event discovery based on interest signals and social graph see measurably higher RSVP rates than chronological feeds.
- Location-based social networks that surface events within a configurable radius (5–25 km default) outperform city-wide flat feeds on click-through.

**Key Design Principles**
- Default to a 10 km radius from the user's current location; allow manual adjustment via slider.
- Layer two signals: proximity (PostGIS `ST_DWithin`) and social graph (events attended by people the user follows).
- Offer a "Happening Today," "This Week," and "Upcoming" tab pattern — reduces decision paralysis.
- Display events on the existing map view as distinct pins (different icon from spots) — events are time-bounded, spots are persistent.
- Map clustering (`react-native-map-clustering` / `supercluster`) is essential when >20 events exist in a viewport to maintain render performance.

**Implementation Path — Supabase + React Native**
```sql
-- Nearby events RPC
CREATE OR REPLACE FUNCTION nearby_events(
  lat float, lng float, radius_km float, user_id uuid
)
RETURNS SETOF events AS $$
  SELECT * FROM events
  WHERE ST_DWithin(
    location,
    ST_MakePoint(lng, lat)::geography,
    radius_km * 1000
  )
  AND starts_at > now()
  AND is_public = true
  ORDER BY starts_at ASC;
$$ LANGUAGE sql STABLE;
```

React Native: Use the existing map infrastructure with a new event marker layer. `EventDiscoveryScreen` with a `MapView` + clustered `EventMarker` components, with a bottom-sheet list (`BottomSheetFlatList`) that syncs to the map viewport.

---

### Topic 3: RSVP System — Mechanics, Conversion, and Social Proof

**Industry Benchmarks**
- RSVP-to-attendance conversion: ~40–50% for free events, 70–85% when any nominal fee is involved (Meetup platform data).
- Events showing current RSVP count as social proof ("12 people going") increase subsequent RSVPs by an estimated 30%+ (social validation heuristic).
- Meetup's 2025 progress report: AI-personalized search recommendation clicks up 10%, group joins from search up 9%.
- NomadList meetups: 5,000+ attendees in last 12 months, ~9 meetups/week globally. Self-organizing tools caused meetup volume to skyrocket — the platform scales without human involvement.

**Key Design Principles**
- Three RSVP states: `going`, `interested`, `not_going`. Show "going" count publicly; hide "not going."
- Surface mutual connections RSVPing ("3 people you follow are going") — drives conversion.
- Allow retroactive "I was there" post-event check-in (NomadList pattern) for historical social graph value.
- Send a push reminder 24h and 1h before the event starts.
- For events with capacity limits, show a waitlist option when full.

**Implementation Path — Supabase + React Native**
```sql
CREATE TABLE event_rsvps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id),
  status     text CHECK (status IN ('going','interested','not_going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Realtime subscription on RSVP count changes
-- Client subscribes to INSERT/UPDATE/DELETE on event_rsvps
-- filtered by event_id to update the going count live
```

Supabase Realtime Postgres Changes subscription on `event_rsvps` table filtered by `event_id` updates the RSVP counter in real time for all attendees viewing the event detail screen.

---

### Topic 4: Event Check-In — QR, Geofence, and NFC Flows

**Industry Benchmarks**
- QR code, NFC, and geofence check-in adoption is accelerating; the contactless event entry market is projected to grow as part of the $102.79B ticketing market.
- Geofence auto-check-in (triggered when user enters a defined radius of the event location) reduces check-in abandonment to near zero — no user action required.
- NFC tap check-in is used by enterprise event apps (Noodle Live, InEvent); for a consumer social app, QR + geofence covers 99% of use cases.
- GivePulse's geofence check-in shows that a 100–300m radius around the event address is the sweet spot — tight enough to be meaningful, loose enough to account for GPS drift.

**Key Design Principles**
- Primary flow: Geofence auto-check-in. When the user enters the event's 200m radius after the event start time, prompt a one-tap confirm ("You're at [Event Name] — check in?").
- Secondary flow: QR code generated per event that hosts can display; attendees scan from the event detail screen.
- Post-check-in: surface the live attendee list (Presence-powered) so checked-in users see who else is there.
- Reward check-in with a profile badge (e.g., "Local Explorer," "Event Veteran") — feeds into gamification layer.

**Implementation Path — Supabase + React Native**
```sql
CREATE TABLE event_checkins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid REFERENCES events(id),
  user_id    uuid REFERENCES profiles(id),
  method     text CHECK (method IN ('geofence','qr','manual')),
  checked_in_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
```

React Native: Use `expo-location` with `Location.startGeofencingAsync` to register a geofence task for RSVPed events. On `ENTER` event within time window, trigger local notification with check-in CTA. QR scanning via `expo-camera` with `BarCodeScanner`.

---

### Topic 5: Event Gamification — Streaks, Badges, and Leaderboards

**Industry Benchmarks**
- Global gamification market: $29.11B (2025), growing to $36.46B by 2026.
- Apps combining streaks and milestone mechanics see 40–60% higher DAU vs. single-feature implementations.
- Users who build a 7+ day streak are 2.3x more likely to engage daily (Duolingo internal data).
- Dual streak + milestone systems reduce 30-day churn by 35% (Forrester 2024).
- Leaderboards drive up to 60% higher session stickiness; social/communal gamification outperforms solo gamification in 2025 benchmarks.

**Key Design Principles**
- Event Attendance Streak: attend events in consecutive weeks → streak counter on profile.
- City Explorer Badge: attend events in 3+ distinct cities.
- Host Badge: create 5+ events with average 5+ attendees.
- Leaderboard: "Most Events This Month" per city — drives local competitive engagement.
- Keep gamification visible but non-intrusive — profile card shows badge count, dedicated tab for streaks.
- Avoid pay-to-win patterns; all gamification is purely social/attendance-based.

**Implementation Path — Supabase + React Native**
```sql
CREATE TABLE user_badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),
  badge_type  text NOT NULL,
  earned_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_type)
);

-- Trigger or Edge Function evaluates badge criteria
-- on event_checkins INSERT
```

Supabase Edge Function (triggered via database webhook on `event_checkins` INSERT) evaluates badge criteria and issues badges. Supabase Cron (`pg_cron`) runs weekly streak calculations.

---

## Domain 2: Real-Time "Who's Here Now" Presence (Topics 6–10)

### Topic 6: Supabase Presence — Core Architecture

**Industry Benchmarks**
- Discord's presence system (online/idle/DND + Rich Presence) is the gold standard for real-time status. Updates propagate within seconds via WebSocket Gateway.
- Swarm (Foursquare) pioneered "who's here now" at venues — leaderboards, mayorships, and nearby-friend alerts drove its peak engagement. The app still operates with a leaderboard-centric model.
- Foursquare Swarm data: users earn points for check-in diversity; the more varied the locations, the higher the score — a model directly applicable to x/pat spots.

**Core Architecture**
Supabase Realtime Presence uses a CRDT (Conflict-free Replicated Data Type) for consistency across clients. Each client tracks its own state; the server merges all states and broadcasts the full presence map to all channel subscribers.

Three events: `sync` (full state snapshot), `join` (new user enters channel), `leave` (user disconnects).

**Implementation Path**
```typescript
// Join presence channel for a spot
const channel = supabase.channel(`spot:${spotId}`)

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setUsersHere(Object.values(state).flat())
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => {
    // animate new arrival indicator
  })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => {
    // remove avatar from stack
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: session.user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        online_at: new Date().toISOString()
      })
    }
  })

// Cleanup on unmount
return () => { supabase.removeChannel(channel) }
```

React Native UI: "Avatar Stack" (row of circular avatars, +N overflow) at the top of SpotDetail screen. This is a high-trust social signal — seeing real people at a location in real time is x/pat's core differentiator.

---

### Topic 7: Spot-Level Presence — "Who's Working Here Now"

**Industry Benchmarks**
- NomadList's "Nomads Online Now" counter on city pages is a high-engagement element — users check it repeatedly throughout the day.
- WorkFrom (coworking discovery) never implemented live presence, which is a gap x/pat can own.
- Swarm's "nearby friends" alert drove spontaneous co-location for the 2014–2017 peak user cohort.

**Design Principles**
- Show presence at the spot level: "4 nomads working here now" on the SpotCard and SpotDetail.
- Presence expires automatically when user navigates away from the screen (Supabase `untrack`) or after 4 hours with no activity.
- Opt-in privacy control: "Share my presence at spots" toggle in settings. Default ON for social discovery value.
- Show only username and avatar — no exact location within the spot.
- "Working Buddies" feature: if two users are present at the same spot and mutually follow each other, surface a subtle notification ("@alex is also here").

**Implementation Path — Supabase**
```sql
-- Persist presence snapshots for analytics (separate from ephemeral Realtime state)
CREATE TABLE spot_presence_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id    uuid REFERENCES spots(id),
  user_id    uuid REFERENCES profiles(id),
  started_at timestamptz DEFAULT now(),
  ended_at   timestamptz
);
```

Ephemeral presence via Supabase Realtime Presence channel (no DB write per heartbeat). Persist only on `leave` event for analytics. Cron job marks stale presence records (>4h no update) as ended.

---

### Topic 8: City-Level Presence — "Who's in Bangkok This Week"

**Industry Benchmarks**
- NomadList's "Current Nomads" city page is one of its stickiest features — members update their current city regularly, driving repeat visits.
- Remote Year and WiFi Tribe programs create strong city-cohort bonds by surfacing "who's here with you."
- Presence at city scale (vs. spot scale) is more privacy-comfortable for users who don't want to share exact location.

**Design Principles**
- City presence is user-declared (profile field: "Currently in: [City]"), not GPS-derived. Lower friction, higher comfort.
- Show a "Nomads in Bangkok now" count and avatar stack on the city hub screen.
- Allow users to set a "here until [date]" field — drives meetup coordination ("leaving Thursday, let's meet before then").
- City presence feeds into the meetup suggestion engine (Domain 3).

**Implementation Path — Supabase**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_until date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_city_presence boolean DEFAULT true;

-- Index for city presence queries
CREATE INDEX ON profiles (current_city) WHERE share_city_presence = true;
```

Supabase Realtime Postgres Changes subscription on `profiles` table filtered by `current_city` updates the city hub presence count in real time.

---

### Topic 9: Discord-Style Status — Custom Status for Nomads

**Industry Benchmarks**
- Discord Rich Presence allows apps to display detailed in-game/in-app state: location, activity, party size, and custom artwork. This pattern is directly applicable to x/pat's "work mode" concept.
- Discord's status system (online/idle/DND/offline + custom text) is used by 150M+ monthly users — the pattern is universally understood.
- Custom status drives self-expression and re-engagement; users set status more often than they post content.

**Design Principles for x/pat**
- Status options: "Open to chat," "Heads down — working," "Exploring," "At [Spot Name]," "In transit."
- Status visible on profile card in feed, event attendee lists, and presence stacks.
- Status expires after 8 hours or on app backgrounding.
- Integration: if user RSVPs to an event, auto-suggest status "Going to [Event] tonight" (overridable).

**Implementation Path — Supabase**
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status_text text,
  ADD COLUMN IF NOT EXISTS status_emoji text,
  ADD COLUMN IF NOT EXISTS status_expires_at timestamptz;

-- Supabase Realtime Postgres Changes on profiles
-- broadcasts status updates to followers' feeds
```

Supabase Cron clears expired statuses hourly. React Native: status selector as a bottom-sheet emoji picker with preset options.

---

### Topic 10: Presence Privacy — Controls and Trust Architecture

**Industry Benchmarks**
- Telegram removed its "People Nearby" feature in late 2024 due to safety/privacy concerns and <0.1% usage — a cautionary tale for location exposure without granular controls.
- Citizen app (safety alerts, 100M+ users) never implemented social presence for privacy reasons — hyper-local presence requires trust architecture to avoid stalking/harassment vectors.
- Best-in-class apps (Find My, Life360) use explicit mutual consent for real-time location sharing.

**Design Principles for x/pat**
- Three presence visibility levels: `everyone`, `followers`, `nobody`.
- Default: `followers` for spot presence, `everyone` for city presence.
- No GPS coordinates ever exposed via presence — only spot name and city.
- "Ghost mode": one-tap disable of all presence signals from the profile screen.
- Report/block immediately removes another user from all your presence channels.
- Presence history not accessible to other users — only aggregated counts.

**Implementation Path — Supabase**
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS presence_visibility text
    DEFAULT 'followers'
    CHECK (presence_visibility IN ('everyone','followers','nobody'));
```

RLS on Supabase Realtime Presence channels: check `presence_visibility` before broadcasting. Realtime Authorization (JWT-based channel access) ensures only permitted users receive presence events.

---

## Domain 3: Spontaneous Meetup Coordination (Topics 11–15)

### Topic 11: NomadList Meetups Model — Self-Organizing Architecture

**Industry Benchmarks**
- NomadList (nomads.com) meetups: 4+ per week, 195+ per year, 56,818 total attendees. Meetups became the #1 used feature on the platform.
- Key insight: enabling self-organizing (members create meetups themselves) caused volume to skyrocket without scaling human effort. The platform is infrastructure, not a curator.
- 368 meetups/year across 100+ cities for a ~37,000 user base = ~1 meetup per 100 active users per year. At x/pat scale, this is achievable quickly with the right infrastructure.
- "Meetups attended" on user profiles (recently shipped by NomadList) drives retroactive engagement and profile richness.

**Design Principles for x/pat**
- Any user can create a meetup (same as event creation — no approval required).
- Meetup types: casual hangout, language exchange, skill share, co-working session, city walk.
- Quick meetup flow: "I'm at [Spot] — anyone want to join in 30 min?" — a lightweight spontaneous invite distinct from the full event creation flow.
- Meetup history on profile: "attended 12 meetups in 4 cities." Drives retention and profile value.

**Implementation Path — Supabase**
Meetups reuse the `events` table with `type = 'meetup'` and `is_spontaneous = true`. Spontaneous meetups auto-expire 4 hours after `starts_at`. Realtime Broadcast channel sends a city-scoped notification to all users with `current_city = event.city` when a spontaneous meetup is created.

---

### Topic 12: Bumble BFF / Moves Pattern — In-App Meetup Planning

**Industry Benchmarks**
- Bumble BFF revamp (September 2025): added Groups tab (chat rooms + hangout planning), in-app Plan tool with RSVP, and an in-app calendar. Positioned around communities and local connection.
- 47% of young adults want more friends to do activities with; similar % want an online platform to build local community (Bumble internal survey).
- The in-app Plan tool converts 1:1 connections into group hangouts — the "group expansion" mechanic is a proven retention driver.

**Design Principles for x/pat**
- "Let's Meet" button on user profiles: suggests a time and nearby spot to meet. Sends a meetup invite to that user.
- Group expansion: a 1:1 meetup invite can be "opened up" to mutual connections, turning private into semi-public.
- In-app calendar view: upcoming meetups + events the user is attending, in chronological order.
- "Suggest a spot" feature in meetup planning: AI or curated suggestion of a nearby x/pat spot that fits the meetup type (coffee = cafe, work session = coworking space).

**Implementation Path — Supabase + React Native**
```sql
CREATE TABLE meetup_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid REFERENCES events(id),
  inviter_id  uuid REFERENCES profiles(id),
  invitee_id  uuid REFERENCES profiles(id),
  status      text DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined')),
  created_at  timestamptz DEFAULT now()
);
```

Supabase Realtime Broadcast on `meetup_invites` channel delivers the invite to the recipient's device in real time without polling.

---

### Topic 13: Spontaneous "I'm Here" Broadcast — City-Scoped Social Posts

**Industry Benchmarks**
- Swarm's "plan" feature allowed posting a future check-in ("I'll be at X on Friday") — historically one of its highest-engagement post types.
- BeReal's time-sensitive "post now" mechanic drove 73% DAU/MAU ratios at peak — spontaneity as a product mechanic is proven.
- Twitter/X "local" tab experiments showed appetite for location-scoped content discovery.

**Design Principles for x/pat**
- "I'm Here" post type: a special low-friction post (one tap + optional text) that broadcasts to the user's city channel and their followers' feeds simultaneously.
- Shows the spot the user is at (if checked in) or city only (if privacy mode active).
- Surfaces in a "Live in [City]" feed section — time-sorted, auto-expires after 6 hours.
- Enables replies to coordinate: "I'm nearby, coming to join."

**Implementation Path — Supabase**
```sql
CREATE TABLE live_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id),
  spot_id    uuid REFERENCES spots(id),
  city       text,
  message    text,
  expires_at timestamptz DEFAULT (now() + interval '6 hours'),
  created_at timestamptz DEFAULT now()
);
```

Supabase Realtime Postgres Changes on `live_posts` filtered by `city` delivers "I'm Here" posts to all users in the same city feed in real time. Cron job hard-deletes expired posts daily.

---

### Topic 14: Event Recommendation Engine — Matching People to Meetups

**Industry Benchmarks**
- Meetup's AI personalization (2025): search recommendation clicks up 10%, group joins up 9% after implementing interest+behavioral matching.
- Facebook's 2025 algorithm re-prioritization toward Events drove 20%+ increase in event discovery engagement.
- AI recommendation systems that layer social graph signals (friends attending) + behavioral signals (past attendance patterns) + proximity outperform single-signal systems.

**Design Principles for x/pat**
- Signal stack: (1) city match, (2) mutual connections attending, (3) spot type preference (inferred from past check-ins), (4) time-of-day patterns, (5) language/nationality affinity.
- Weekly "Picked for You" digest push notification: 3 upcoming events personalized to the user.
- "Your Network is Going" section in the event feed — most reliable conversion driver.

**Implementation Path — Supabase**
```sql
-- Personalized event feed function
CREATE OR REPLACE FUNCTION personalized_events(p_user_id uuid, p_city text)
RETURNS TABLE (event_id uuid, score float) AS $$
  SELECT
    e.id,
    -- Score: social signal (friends going) + recency
    (COUNT(DISTINCT r.user_id) * 3.0 +
     EXTRACT(EPOCH FROM (e.starts_at - now())) / -86400.0) AS score
  FROM events e
  LEFT JOIN event_rsvps r ON r.event_id = e.id
    AND r.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
    AND r.status = 'going'
  WHERE e.city = p_city
    AND e.starts_at > now()
    AND e.is_public = true
  GROUP BY e.id
  ORDER BY score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;
```

Supabase Edge Function generates personalized digest daily; sends push via Expo Notifications.

---

### Topic 15: Post-Event Social Graph — Building Connections from Meetups

**Industry Benchmarks**
- LinkedIn reports that in-person event connections are 3x more likely to result in ongoing professional relationship vs. cold connection requests.
- Bumble BFF's plan tool shows that structured group activity converts to lasting friendship more reliably than open chat.
- Post-event connection prompts ("You met @username at [Event] — connect?") drive connection graph growth with high acceptance rates.

**Design Principles for x/pat**
- After check-in at a shared event: surface "You both attended [Event]" as a connection prompt.
- Shared-event context visible on connection profile: "You met at Bangkok Nomad Dinner, March 2026."
- Post-event photo wall: a shared ephemeral album for checked-in attendees (24h upload window, permanent display on event page).
- Event host gets a summary: attendance count, photos uploaded, new follows generated.

**Implementation Path — Supabase**
```sql
ALTER TABLE follows
  ADD COLUMN IF NOT EXISTS source_event_id uuid REFERENCES events(id);
-- Records which event context generated a follow
```

Edge Function triggered on `event_checkins` INSERT: finds other users checked into the same event and creates pending "you might know" suggestions.

---

## Domain 4: City-Based Communities and Neighborhood Channels (Topics 16–20)

### Topic 16: City Hub Architecture — The Core Community Container

**Industry Benchmarks**
- Nextdoor (100M users, 29M active): 85% of users feel the app helps them feel more connected to their community. 2025 redesign centers on News, Alerts, and local discovery.
- WhatsApp Communities: up to 100 groups under one umbrella, 2,000 members per community. Widely adopted for neighborhood coordination globally.
- Nextdoor's AI reboot (July 2025) adds personalized local news, neighborhood alerts, and AI-driven content recommendations — a direct template for x/pat's city layer.

**Design Principles for x/pat**
- City Hub = a dedicated screen for each city the user has been to or is currently in. Not a generic feed — a city-specific product surface.
- Sections: Live (spontaneous posts + presence), Events, Spots, Community (discussion threads), Visa/Practical Info.
- City membership: automatic when user sets `current_city`, or manual "join" for past cities.
- Pinned posts from city moderators (trusted long-term members) for critical practical info.

**Implementation Path — Supabase**
```sql
CREATE TABLE city_memberships (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid REFERENCES profiles(id),
  city      text NOT NULL,
  role      text DEFAULT 'member' CHECK (role IN ('member','moderator')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (user_id, city)
);

CREATE TABLE city_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id),
  city       text NOT NULL,
  content    text,
  post_type  text DEFAULT 'discussion',
  is_pinned  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

Supabase Realtime on `city_posts` delivers new posts to all members of the city channel in real time.

---

### Topic 17: Neighborhood Channels — Hyperlocal Below City Level

**Industry Benchmarks**
- Nextdoor operates at neighborhood granularity (~7,500 households per "neighborhood") — this is the sweet spot for hyperlocal relevance.
- Telegram removed "People Nearby" (late 2024) due to misuse — but community groups organized by neighborhood keyword search remain active.
- GoMetro implemented WhatsApp geofence alerts for transit; the geofence-to-messaging pattern is proven for hyperlocal broadcasting.

**Design Principles for x/pat**
- Neighborhood channels below city level: "Silom," "Sukhumvit," "Old Town" within Bangkok.
- Auto-suggest neighborhood based on spot's neighborhood tag (already in spots schema).
- Neighborhood channels are discovery surfaces, not moderated communities — lower overhead.
- Keep neighborhoods as tags on city posts rather than separate tables — reduces fragmentation.

**Implementation Path — Supabase**
```sql
ALTER TABLE city_posts
  ADD COLUMN IF NOT EXISTS neighborhood text;
-- Index for neighborhood filtering
CREATE INDEX ON city_posts (city, neighborhood);
```

Neighborhood filter tab on City Hub screen. Supabase Realtime channel scoped to `city:${city}:neighborhood:${neighborhood}` for users who opt into neighborhood-level notifications.

---

### Topic 18: City Moderator System — Trust and Content Quality

**Industry Benchmarks**
- Reddit's subreddit moderator model: community-driven moderation scales to millions of posts with a small mod team. City-level moderators on travel/nomad communities (r/digitalnomad, r/Bangkok) are highly active.
- Nextdoor's "Neighborhood Lead" program: designated power users with moderation tools + early feature access. Drives high-quality local content.
- Civic engagement rises when users have a moderation stake — moderators post 3–5x more than regular users.

**Design Principles for x/pat**
- City Moderators: max 3 per city, earned through activity (50+ city check-ins or 20+ events attended in the city).
- Moderator powers: pin posts, remove spam, issue official "City Notes" (a curated weekly digest).
- Moderator badge on profile — visible in all city contexts.
- Nomination process: community votes; CTO reviews and approves. No abuse potential.

**Implementation Path — Supabase**
The `city_memberships.role = 'moderator'` field drives moderator permissions. RLS policy allows moderators to UPDATE `is_pinned` on `city_posts` where `city` matches their moderator assignment.

---

### Topic 19: City-Specific Practical Information Channels

**Industry Benchmarks**
- The biggest gap in nomad apps is structured, current, crowdsourced practical information: SIM cards, ATM fees, visa-on-arrival hours, co-working day pass prices.
- Wikiloc, iOverlander, and similar crowdsourced geo-databases show that users actively contribute local knowledge when the UX is low-friction.
- Nomad List's city pages aggregate cost of living, internet speed, weather, and safety — but lack real-time crowdsourced updates.

**Design Principles for x/pat**
- "Practical Info" tab on City Hub: structured posts for SIM cards, banking, transport, accommodation, visa info.
- Upvote/confirm mechanism: "+47 nomads confirm this is still accurate" replaces stale information naturally.
- Template-based contributions: pre-formatted post types for "SIM Card Tip," "ATM Fee," "Visa Update" — structured data is searchable.

**Implementation Path — Supabase**
```sql
CREATE TABLE city_tips (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city         text NOT NULL,
  tip_type     text CHECK (tip_type IN ('sim','atm','transport','visa','housing','coworking')),
  content      text NOT NULL,
  submitted_by uuid REFERENCES profiles(id),
  confirm_count int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
```

Supabase Realtime on `city_tips` table shows new tips and confirmation updates live. Edge Function updates `updated_at` on confirmation to keep the table fresh.

---

### Topic 20: City Onboarding Flow — First 24 Hours in a New City

**Industry Benchmarks**
- Airbnb Experiences' "What to do first" onboarding pattern for new destinations drives 40%+ conversion to first booking.
- Google's "Explore" tab in Maps (city-level) is the most-used feature by travelers in the first 24 hours in a new destination.
- Apps that trigger an onboarding flow on city change (detected via GPS or user profile update) see 3x higher engagement in the first week vs. apps with passive discovery.

**Design Principles for x/pat**
- When user updates `current_city`: trigger a "Welcome to Bangkok" push notification + onboarding modal.
- Onboarding modal: top 3 spots with nomad check-ins this week, 1 upcoming meetup, the City Moderator's pinned note.
- "City Checklist": SIM card, best coworking space, first meetup, local tip submitted. Lightweight gamification for first-week activation.
- Quick link to city visa/practical info tab — most urgent need for new arrivals.

**Implementation Path — Supabase**
Supabase Database Webhook on `profiles.current_city` UPDATE triggers an Edge Function that sends the welcome push (via Expo Push API) and creates a personalized City Onboarding record.

---

## Domain 5: Live Travel Updates (Topics 21–25)

### Topic 21: Flight Delay Intelligence — Real-Time Travel Disruption Alerts

**Industry Benchmarks**
- American Airlines upgraded its flight delay notification system in 2026 to real-time passenger alerts across digital channels — acknowledging that delay communication is a top pain point.
- FlightAware processes 50,000+ flights/day and provides a free tier API for airport delay data.
- TSA's MyTSA app allows user-reported airport delays — crowdsourced data supplements official feeds.
- Travel safety apps with crowdsourced alerts (Crisis24, International SOS) integrated geotagged Reddit updates into alert dashboards in 2025, showing the value of UGC travel intelligence.

**Design Principles for x/pat**
- Flight Tracker integration (read-only): allow users to add their flight details and receive x/pat push notifications for gate changes, delays, and boarding.
- Community flight alerts: "User reported: 2h delay at BKK customs, bring a book." High value for the nomad community.
- Aggregate airport experience ratings: simple 1–5 star for "How was your entry at [Airport]?" — builds a crowdsourced airport intel layer.

**Implementation Path — Supabase**
```sql
CREATE TABLE travel_alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type   text CHECK (alert_type IN ('flight_delay','border_wait','visa_change','airport_tip')),
  location     text NOT NULL,  -- airport IATA code or border crossing name
  content      text,
  severity     text DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  submitted_by uuid REFERENCES profiles(id),
  upvotes      int DEFAULT 0,
  expires_at   timestamptz DEFAULT (now() + interval '24 hours'),
  created_at   timestamptz DEFAULT now()
);
```

Partner with FlightAware API (free tier: airport delay summaries) for official data. Supabase Realtime broadcasts new alerts to users whose `travel_alerts_city` matches.

---

### Topic 22: Border Crossing Intelligence — Wait Times and Conditions

**Industry Benchmarks**
- U.S. CBP Border Wait Times app: updated hourly, shows lane-by-lane wait times (Standard, FAST, SENTRI, Ready Lane) at land crossings.
- EU Entry/Exit System (EES): became operational October 12, 2025, biometric scanning at all EU external borders. Full rollout April 10, 2026. Creates new wait time dynamics at EU ports of entry.
- ETIAS (EU travel authorization): expected October–December 2026. Will require pre-authorization from 60+ visa-exempt countries.
- Grassroots "situation megathreads" (e.g., UAE nomad forums) provide real-time mobility intelligence that outpaces official sources.

**Design Principles for x/pat**
- Border crossing cards on relevant city hub pages: "Entering Thailand: land border from Cambodia" with community-reported current wait times.
- Link to official CBP/EU EES apps for authoritative data; layer with x/pat crowdsourced reports.
- Alert for EES/ETIAS requirement changes — direct value for EU-bound nomads in 2026.
- "Recently crossed" reports: time-stamped user submissions ("Crossed Poipet/Aranyaprathet at 9am, 45 min wait, no issues").

**Implementation Path — Supabase**
Reuse `travel_alerts` table with `alert_type = 'border_wait'`. Geotag border crossing reports with PostGIS point. Users near a border crossing (within 50km) receive a proactive notification option.

---

### Topic 23: Digital Nomad Visa Tracker — Crowdsourced Regulatory Intelligence

**Industry Benchmarks**
- 55+ countries now offer dedicated digital nomad visas as of 2026 (up from ~25 in 2023). Major 2026 additions: Brazil, Philippines, Bermuda, Japan.
- Regulations are changing rapidly: 6-month bank statement requirements in some countries (previously 3 months), rising income thresholds, new tax enforcement frameworks.
- Slovenia (November 2025) and Moldova (September 2025) launched new nomad visas — x/pat's `nomadVisas.ts` dataset needs to be a living document.
- Top destinations: Spain, Malta, Portugal, Germany, Hungary (2026 Digital Nomad Visa Index).

**Design Principles for x/pat**
- Visa Database (already exists as `src/lib/data/nomadVisas.ts`): upgrade to database-driven, user-confirmable records.
- "Visa Change Alert" subscription: users can subscribe to alerts for specific countries. When a moderator or verified contributor marks a visa change, push notifications go out.
- Community confirmation: "+28 nomads confirm Portugal NHR is still valid for 2026" reduces the trust gap.
- Visa eligibility quick-check: user inputs nationality + income → surfaces which visas they qualify for.

**Implementation Path — Supabase**
```sql
CREATE TABLE nomad_visas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country         text NOT NULL,
  visa_type       text,
  income_req_usd  int,
  duration_months int,
  fee_usd         int,
  official_url    text,
  last_verified   date,
  verified_by     uuid REFERENCES profiles(id),
  notes           text,
  is_active       boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);
```

Migrate `nomadVisas.ts` data into this table. Supabase Realtime Postgres Changes on `nomad_visas` broadcasts updates to users subscribed to specific country channels. Moderators can propose changes; CTO approves.

---

### Topic 24: Crowdsourced Safety and Conditions Feed

**Industry Benchmarks**
- Crisis24 and International SOS now ingest geotagged social media posts (Reddit, X) into risk dashboards, cross-validated against government advisories. Crowdsourced data is becoming tier-1 travel intelligence.
- Citizen app (100M users) proved the safety alert model at city scale — real-time incident reporting with location context drives high-frequency engagement (2–5 opens/day during alerts).
- Travel safety apps with crowdsourced data: users flag risky areas, share experiences, and update local conditions continuously.

**Design Principles for x/pat**
- "Conditions" feed on city hub: power/internet outages, political protests, weather events, scam alerts, coworking space closures.
- Severity tiers: `info` (blue), `warning` (yellow), `critical` (red). Critical alerts trigger push to all city members.
- Expiry: community-reported conditions expire after 24h unless re-confirmed. Prevents stale fear-mongering.
- Moderation: city moderators can remove posts; critical alerts require 3 independent user confirmations before push.

**Implementation Path — Supabase**
Reuse `travel_alerts` table. Supabase Realtime Broadcast channel `city:${city}:alerts` pushes critical alerts instantly to all subscribed clients without DB round-trip latency.

---

### Topic 25: In-App Travel Status — "In Transit" and Journey Sharing

**Industry Benchmarks**
- Life360 and Find My's journey sharing feature shows trip progress in real time — high-value for coordinating arrivals with co-travelers.
- Skyscanner and Google Flights have "share trip" features but no community layer — x/pat can own the social trip-sharing niche.
- "In Transit" status on nomad profiles (currently in flight, traveling from A to B) is a natural status type that drives curiosity and connection.

**Design Principles for x/pat**
- "Journey" post type: user sets departure city → arrival city → date. Surfaces in both cities' feeds ("@alex is flying to Lisbon on Thursday").
- Airport lounge networking: if two users are both "in transit" through the same hub airport (e.g., BKK Suvarnabhumi), surface a connection prompt.
- Travel day mode: simplified app UI during flight with offline-cached spot recommendations for the destination city.
- Integration with `current_city` field: Journey post automatically updates `current_city` on landing (user confirms).

**Implementation Path — Supabase**
```sql
CREATE TABLE journeys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id),
  from_city     text,
  to_city       text,
  departs_at    timestamptz,
  arrives_at    timestamptz,
  is_public     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
```

Supabase Realtime on `journeys` for destination city feeds. Edge Function on arrival: prompt user to confirm city update, trigger welcome push.

---

## Domain 6: Co-Working Space Live Availability and Booking (Topics 26–30)

### Topic 26: Live Desk Availability — Real-Time Occupancy Display

**Industry Benchmarks**
- Major coworking software platforms (Spacebring, Archie, Whatspot, Koalendar) all offer real-time desk availability in 2025/2026. Interactive floor plans with live color-coded desk status are the standard UX.
- XY Sense occupancy sensors: 1,000 sq ft per sensor, updates every 2 seconds — the hardware side of the real-time stack.
- IoT in coworking remains "patchy and expensive" (AllWork.Space, November 2025) — sensor deployments are inconsistent across spaces.
- The practical reality: most x/pat-relevant spaces will not have IoT sensors. User-reported occupancy ("I'm working here now") IS the availability signal — presence IS the data.

**Design Principles for x/pat**
- "Live Busyness" score derived from x/pat Presence data: 1–5 people = quiet; 6–15 = moderate; 16+ = busy. No sensor dependency.
- Historical busyness patterns (aggregated from `spot_presence_log`): "Usually quiet on Wednesday mornings."
- Real-time desk count: for spaces that integrate with Nexudus/Spacebring/OfficeRnD via API, surface live desk availability.
- "Save my seat" feature: a soft desk reservation communicated to other users (no booking system integration required) — "I'll be at this coworking space from 9am."

**Implementation Path — Supabase**
```sql
CREATE TABLE spot_busyness_cache (
  spot_id        uuid PRIMARY KEY REFERENCES spots(id),
  current_count  int DEFAULT 0,
  busyness_level text DEFAULT 'unknown',
  updated_at     timestamptz DEFAULT now()
);

-- Updated by Edge Function triggered on presence join/leave
-- Cron refreshes cache every 5 minutes as fallback
```

Supabase Realtime Presence on `spot:${spotId}` channel; count of `presenceState()` keys = live occupancy. Broadcast this count to SpotCard UI without DB writes per heartbeat.

---

### Topic 27: Coworking Booking Integration — External API Layer

**Industry Benchmarks**
- Coworker API (commercial): 25,000+ coworking spaces globally, REST API with nearby spaces by lat/long radius, reviews, and availability status.
- LiquidSpace and Deskpass: flexible office space booking with integration APIs. Calendar sync (Google Calendar, Outlook) is standard.
- Croissant: 700+ coworking spaces, flexible membership model. No public API but deep bookability.
- Nexudus: the dominant coworking management software with an open API used by thousands of spaces. Real-time analytics, heatmaps, booking APIs.

**Design Principles for x/pat**
- Phase 1 (current): community presence data IS the availability signal. No integration required.
- Phase 2: Coworker API integration to pull space listings, hours, and pricing into x/pat spot data. Enriches spot cards with official coworking metadata.
- Phase 3: Nexudus API integration for partner spaces — enables real in-app booking flow for day passes and desk reservations.
- Deep link out to Coworker.com, Deskpass, or the space's own booking page until Phase 3 is built. Mark as affiliate link when partnerships are established.

**Implementation Path — Supabase**
```sql
ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS coworker_id text,      -- Coworker.com space ID
  ADD COLUMN IF NOT EXISTS nexudus_id text,         -- Nexudus space ID
  ADD COLUMN IF NOT EXISTS booking_url text,        -- External booking link
  ADD COLUMN IF NOT EXISTS day_pass_price_usd numeric;
```

Supabase Edge Function runs nightly to sync Coworker API data for spots tagged as coworking spaces. Caches pricing and availability status to avoid per-request API costs.

---

### Topic 28: Day Pass and Hot Desk Booking UX — In-App Flow Design

**Industry Benchmarks**
- Spacebring, OfficeRnD, and Skedda all use a mobile-first "see floor plan → pick desk → confirm → get QR code" booking flow as their standard UX pattern.
- Booking completion rate increases 40% when the floor plan is interactive vs. text-only seat lists (Skedda data).
- QR code delivery (mobile pass) for check-in reduces front-desk friction — the standard expectation for modern coworking spaces.
- Automate booking reminders and cancellation handling — five workflows coworking spaces need automated (AllWork.Space, October 2025).

**Design Principles for x/pat**
- Booking flow (Phase 3): Spot Detail → "Book a Day Pass" → Date/Time picker → Available desks (floor plan or list) → Confirm → QR code in-app pass.
- For spaces without API integration: "Get Day Pass" deep link to the space's website. Never block the user in-app.
- Booking confirmation saved to user's in-app calendar (same calendar as events/meetups) for unified schedule view.
- Cancellation with automated email to the space (Supabase Edge Function → email provider).

**Implementation Path — Supabase**
```sql
CREATE TABLE desk_bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  spot_id      uuid REFERENCES spots(id),
  booking_ref  text,              -- External booking system reference
  date         date NOT NULL,
  start_time   time,
  end_time     time,
  status       text DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','cancelled','completed')),
  created_at   timestamptz DEFAULT now()
);
```

Supabase Realtime on `desk_bookings` updates the booked-desk count on the spot's availability display.

---

### Topic 29: Coworking Community Layer — Who's Working There Today

**Industry Benchmarks**
- The coworking social layer is the least-developed aspect of all major booking platforms — Nexudus, Deskpass, and Coworker all lack meaningful social features.
- This is x/pat's primary competitive moat: the combination of coworking discovery (utility) + who's working there (social) is unoccupied territory.
- Remote work trend (We Work Remotely State of Remote Work 2025): 85%+ of remote workers report wanting more community connection in their work life. Coworking spaces that facilitate introductions see 2x member retention.

**Design Principles for x/pat**
- "Working Here Today" feed on SpotDetail: users who have set "Save my seat" or are in Presence at the spot.
- Interest matching: surface users at the same coworking space who share interests (via profile tags).
- Quiet collaboration indicator: "Open to working with others" vs. "Focus mode" status visible to co-located users only.
- Weekly "Who was here" digest for recurring users — builds coworking spot community identity.

**Implementation Path — Supabase**
Extend Presence payload: `{ user_id, username, avatar_url, status: 'open_to_chat' | 'focus_mode', online_at }`. Filter Presence display by `status` to show/hide "open to chat" users first. No DB schema change required — payload is ephemeral.

---

### Topic 30: Coworking Event Integration — Talks, Workshops, and Networking Nights

**Industry Benchmarks**
- Most coworking spaces host weekly or monthly events (workshops, networking nights, skill shares) but have no effective channel to reach non-member nomads.
- x/pat is positioned as the discovery layer for these events — a coworking space posts an event on x/pat and reaches every nomad currently in their city.
- Coworks booking software explicitly includes event booking alongside meeting room booking — events are a standard coworking product.
- Brella (event networking app): apps built around event-specific networking see 67% higher attendee satisfaction and 156% more colleague recommendations.

**Design Principles for x/pat**
- Verified Coworking Space accounts: a spot can have an "operator account" that posts official events with the space's branding.
- Coworking event badges: "Host" tag on events created by verified space operators vs. community-organized meetups.
- Onsite booking: a "RSVP + Book Desk" combined flow for coworking workshop events where attendance requires a desk reservation.
- Promote to city channel: coworking space events are auto-promoted to the city's Events feed with no extra action from the host.

**Implementation Path — Supabase**
```sql
ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS is_verified_operator boolean DEFAULT false;
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hosted_by_spot_id uuid REFERENCES spots(id);
-- Events created by verified operators get featured placement
-- in city feed via feed ranking function
```

Supabase RLS: only users with `spots.is_verified_operator = true` (set by admin) can create events tagged with `hosted_by_spot_id`. Edge Function on event INSERT for verified operators: automatically create a city channel post with `is_promoted = true`.

---

## Cross-Cutting Technical Architecture

### Supabase Realtime Channel Topology for x/pat

| Channel | Type | Payload | Consumers |
|---|---|---|---|
| `spot:{spot_id}` | Presence | user_id, username, avatar, status | SpotDetail screen |
| `city:{city}:events` | Postgres Changes | events table INSERT | City Hub events feed |
| `city:{city}:posts` | Postgres Changes | city_posts INSERT | City Hub live feed |
| `city:{city}:alerts` | Broadcast | alert object | All city members (push) |
| `event:{event_id}:rsvps` | Postgres Changes | event_rsvps changes | Event Detail RSVP counter |
| `user:{user_id}:invites` | Postgres Changes | meetup_invites INSERT | Notification badge |

### Supabase Cron Jobs Required

| Job | Schedule | Purpose |
|---|---|---|
| `expire-live-posts` | Every hour | Hard-delete `live_posts` past `expires_at` |
| `expire-travel-alerts` | Every hour | Archive `travel_alerts` past `expires_at` |
| `update-streaks` | Daily 00:00 UTC | Recalculate event attendance streaks |
| `award-badges` | Daily 01:00 UTC | Evaluate badge criteria on `event_checkins` |
| `sync-coworker-api` | Daily 03:00 UTC | Refresh coworking space metadata |
| `expire-status` | Every 4 hours | Clear `profile.status_text` past `status_expires_at` |
| `city-presence-cleanup` | Every 4 hours | Mark stale `spot_presence_log` as ended |

### React Native Component Inventory for Events/Presence

| Component | Library | Notes |
|---|---|---|
| Bottom Sheet | `@gorhom/bottom-sheet` | Event creation, RSVP flows |
| Map Clustering | `react-native-map-clustering` + `supercluster` | Event pins on map |
| Calendar | `wix/react-native-calendars` | Event calendar view |
| Geofencing | `expo-location` `startGeofencingAsync` | Auto-check-in trigger |
| QR Scanner | `expo-camera` + `BarCodeScanner` | Event check-in |
| Presence Avatars | Custom `AvatarStack` component | "Who's here now" UI |
| FlatList (events) | `BottomSheetFlatList` from bottom-sheet | Performant event lists |

### Key Performance Notes
- Use `removeClippedSubviews` + `React.memo` on event list items — reduces re-renders by 40–70%.
- Supabase Presence: use ephemeral CRDT state, do NOT write a DB row per heartbeat.
- PostGIS `ST_DWithin` with GiST index on `location` column handles radius queries in <50ms for 100k+ rows.
- No more than 8 concurrent pg_cron jobs; each job max 10 minutes.
- Realtime RLS: broadcast Postgres Changes only to clients whose RLS policies permit the row — no client-side filtering needed.

---

## Prioritized Implementation Roadmap

### Sprint Priority 1 — Highest Impact, Lowest Complexity
1. **Spot Presence** ("Who's here now" avatar stack on SpotDetail) — Topic 7
2. **City Presence** (city hub "Nomads in [City]" count) — Topic 8
3. **Event Creation** (basic: title, spot, date, capacity) — Topic 1
4. **RSVP System** (going/interested with real-time count) — Topic 3

### Sprint Priority 2 — Core Community
5. **City Hub** (events + posts + alerts section) — Topic 16
6. **Event Discovery** (nearby events map layer) — Topic 2
7. **Spontaneous Meetup** ("I'm Here" broadcast) — Topic 13
8. **Custom Status** (nomad work/social status) — Topic 9

### Sprint Priority 3 — Differentiated Value
9. **Visa Tracker** (database-driven, community-verified) — Topic 23
10. **Geofence Check-In** (auto-check-in at event location) — Topic 4
11. **Post-Event Connection** (meet prompt + shared context) — Topic 15
12. **Coworking Live Busyness** (Presence-derived, no sensors) — Topic 26

### Sprint Priority 4 — Moat Building
13. **Travel Alerts + Border Intel** (crowdsourced) — Topics 21–22
14. **Event Gamification** (badges, streaks, leaderboard) — Topic 5
15. **Personalized Event Feed** (social graph + proximity) — Topic 14
16. **Verified Space Operator Events** — Topic 30

---

## Sources

- [Brella Event App Solutions](https://www.brella.io/event-app)
- [Samaaro Mobile Event Apps 2026](https://samaaro.com/event-app-features/mobile-event-apps-in-2026-the-all-in-one-hub-for-registration-engagement-and-real-time-insights/)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase Presence Feature](https://supabase.com/features/realtime-presence)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase PostGIS Geo Queries](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Cron](https://supabase.com/modules/cron)
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Foursquare Swarm Wikipedia](https://en.wikipedia.org/wiki/Foursquare_Swarm)
- [Swarm App](https://swarmapp.com/)
- [Discord Status and Rich Presence](https://discord.com/developers/docs/discord-social-sdk/design-guidelines/status-rich-presence)
- [NomadList Meetups](https://nomads.com/meetups)
- [NomadList levelsio Meetups Feature](https://x.com/levelsio/status/1869566941112803524)
- [Bumble BFF Revamp — TechCrunch](https://techcrunch.com/2025/09/18/bumble-bffs-revamped-app-is-here-focusing-on-friend-groups-and-community-building/)
- [Bumble Repositions BFF App — Social Discovery Insights](https://www.socialdiscoveryinsights.com/2025/10/24/bumble-repositions-bff-app-around-communities/)
- [Nextdoor 2025 Redesign — Axios](https://www.axios.com/2025/07/15/nextdoor-app-ai-reboot)
- [Nextdoor AI Upgrade — BBN Times](https://www.bbntimes.com/technology/nextdoor-upgrades-platform-with-ai-driven-features-neighborhood-news-and-real-time-safety-alerts/)
- [American Airlines Flight Delay Updates 2026](https://www.travelandtourworld.com/news/article/american-airlines-digital-flight-delay-updates-2026-transform-us-air-travel-experience-with-real-time-passenger-alerts/)
- [EU Travel App — EES Border](https://etias.com/articles/eu-travel-app-launches-to-cut-ees-border-delays)
- [Digital Nomad Visa Updates 2026 — All For Nomads](https://www.allfornomads.com/blog/digital-nomad-visa-updates-2026-requirements-applications)
- [55 Digital Nomad Visas 2026 — ImmigrantInvest](https://immigrantinvest.com/digital-nomad-visa/)
- [ETIAS Launch Timeline](https://etias.com/articles/eu-travel-app-launches-to-cut-ees-border-delays)
- [Coworker API for Developers](https://www.coworker.com/coworker-api)
- [Spacebring Desk Booking](https://www.spacebring.com/features/desk-booking)
- [OfficeRnD Coworking Booking Platform](https://www.officernd.com/coworking-software/coworking-booking-platform/)
- [Density Occupancy Sensors](https://density.io/)
- [IoT in Coworking — AllWork.Space 2025](https://allwork.space/2025/11/why-iot-still-hasnt-lived-up-to-the-hype-in-coworking-spaces/)
- [Geofencing Push Notifications — CleverTap](https://clevertap.com/blog/location-based-push-notifications/)
- [App Gamification Strategies 2025 — StudioKrew](https://studiokrew.com/blog/app-gamification-strategies-2025/)
- [Streaks Gamification — Trophy](https://trophy.so/blog/streaks-gamification-case-study)
- [react-native-bottom-sheet — GitHub](https://github.com/gorhom/react-native-bottom-sheet)
- [react-native-map-clustering — npm](https://www.npmjs.com/package/react-native-map-clustering)
- [React Native FlatList Optimization — Instamobile](https://instamobile.io/blog/react-native-flatlist-optimization/)
- [A16Z Social App Benchmarks](https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app/)
- [Meetup 2025 Progress Report](https://www.meetup.com/blog/2025-meetup-progress-report/)
- [AI Transforms Event Discovery — Nyusoft](https://nyusoft.com/how-ai-transforms-event-discovery-from-generic-feeds-to-hyper-personalized-social-experiences/)
- [Travel Safety Apps — InsiderBits 2025](https://insiderbits.com/best-apps/travel-safety-apps/)
- [Telegram People Nearby Removed — Such.chat](https://www.such.chat/blog/telegram-people-nearby-what-happened)
- [WhatsApp Communities Feature](https://blog.whatsapp.com/communities-now-available)
