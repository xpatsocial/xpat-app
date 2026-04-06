# Real-Time Maps, Location & Geo-Social Research
**x/pat CTO Research Report**
**Date:** April 6, 2026
**Stack:** React Native/Expo + react-native-maps (iOS: Apple Maps, Android: Google Maps) + Supabase/PostGIS

---

## Table of Contents

1. [Real-Time "See Who's Near You" Features](#1-10-real-time-see-whos-near-you-features)
2. [Geofencing for Automatic Check-In Suggestions](#6-10-geofencing-for-automatic-check-in-suggestions)
3. [Map Clustering for Large Numbers of Pins](#11-15-map-clustering-for-large-numbers-of-pins)
4. [Custom Map Styles for Dark-Mode Apps](#16-20-custom-map-styles-for-dark-mode-apps)
5. [PostGIS Spatial Queries](#21-25-postgis-spatial-queries)
6. [Indoor Mapping and Place Precision](#26-30-indoor-mapping-and-place-precision)

---

## 1–10: Real-Time "See Who's Near You" Features

### Topic 1: The Foursquare/Swarm Model — What Actually Works

**Model overview:**
Foursquare Swarm pioneered the geo-social check-in loop: user manually checks in → friends see it on a shared social map → serendipitous "who's here" discovery triggers. This is an **explicit, opt-in event model** — not continuous background tracking. The check-in is the social signal, not the coordinate. After acquiring Superlocal in April 2025, Foursquare folded City Guide into Swarm, consolidating around this model.

**Why it works for x/pat:**
- Digital nomads at a cafe or coworking space already want to signal their presence
- A check-in at a spot is both location discovery AND social broadcast in one action
- No background GPS required — the check-in is the trigger
- Avoids the "creepy factor" of continuous tracking

**Implementation for x/pat:**
- When a user checks in to a spot, write a `check_ins` row with `spot_id`, `user_id`, `checked_in_at`, and optional `expires_at` (e.g., 4 hours)
- Use Supabase Realtime to broadcast the check-in event to a channel scoped to that spot
- Users viewing a spot detail see a live "X people here now" badge
- Optionally display avatars of checked-in users (with their permission tier)

**Cost:** No extra infrastructure cost — this runs on existing Supabase Realtime and the spots table.

---

### Topic 2: Supabase Realtime Presence for Live "Who's Here"

**Technical implementation:**
Supabase Realtime Presence is an in-memory CRDT-backed key-value store. Each connected client publishes a small presence payload (e.g., `{ user_id, spot_id, avatar_url }`) to a shared channel. Other subscribers receive `sync`, `join`, and `leave` events automatically.

```typescript
// Example: Track presence on a spot detail screen
const channel = supabase.channel(`spot:${spotId}`)

channel
  .on('presence', { event: 'sync' }, () => {
    const presentUsers = channel.presenceState()
    setVisitors(Object.values(presentUsers).flat())
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: currentUser.id, avatar_url: currentUser.avatarUrl })
    }
  })
```

**Limits (2025 Supabase pricing):**
- Free tier: 200 concurrent Realtime connections, 500K messages/month included
- Pro tier ($25/mo): higher connection limits, $2.50 per 1M messages over quota, $10 per 1,000 peak connections over quota
- Realtime message byte size cap: 1 MB

**Performance benchmark:** Supabase Realtime cluster supports millions of concurrent connections at the infrastructure level. At x/pat's scale (thousands of users), free tier is sufficient. The main risk is noisy channels — a popular spot at peak time could generate thousands of presence events per minute.

**Recommendation:** Use Presence only on the spot detail screen (not map view) to limit concurrent subscriptions. Unsubscribe on screen unmount.

---

### Topic 3: "Nearby Nomads" — Users Within a Radius

**Concept:**
Show users currently active within, say, 500m of your location — similar to Zenly's model (shut down 2023) and its successor Bump. This is opt-in and requires the user to be "broadcasting" their location.

**Architecture for x/pat:**
1. User enables "visible mode" — an explicit toggle, off by default
2. On enable, write a row to `user_presence` table: `{ user_id, location geography(POINT), last_seen timestamptz, visible boolean }`
3. PostGIS `ST_DWithin` query returns other visible users within radius
4. Supabase Realtime `broadcast` channel updates this list as users move

**Schema:**
```sql
CREATE TABLE user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  location geography(POINT, 4326),
  last_seen timestamptz DEFAULT now(),
  visible boolean DEFAULT false
);
CREATE INDEX user_presence_location_gist ON user_presence USING GIST(location);
```

**RPC for nearby users:**
```sql
CREATE OR REPLACE FUNCTION nearby_users(lat float, lng float, radius_m float DEFAULT 500)
RETURNS TABLE(user_id uuid, distance_m float) AS $$
  SELECT user_id,
         ST_Distance(location, ST_Point(lng, lat)::geography) AS distance_m
  FROM user_presence
  WHERE visible = true
    AND last_seen > now() - interval '15 minutes'
    AND ST_DWithin(location, ST_Point(lng, lat)::geography, radius_m)
  ORDER BY distance_m;
$$ LANGUAGE sql STABLE;
```

**Cost:** Runs on existing PostGIS — no additional cost. Query on a properly indexed table of 10,000 active users returns in under 5ms.

---

### Topic 4: Privacy Architecture — Fuzzy vs. Precise Location

**The privacy problem:**
Geo-social apps that expose precise coordinates enable stalking, infer home addresses, reveal daily routines, and violate GDPR Article 9 (sensitive data) when combined with other profile data. Research shows users are rarely aware of the full privacy exposure when sharing location.

**2025 design best practices:**

| Mode | Precision Shared | Use Case |
|------|-----------------|----------|
| Off | Nothing | Default state |
| City | ~10km blob | "I'm in Bangkok" |
| Neighborhood | ~1km fuzzy | "Near Silom" |
| Spot | Specific venue only | "At Hubba Ekkamai" |
| Precise | Exact GPS | Navigation, opt-in |

**Recommended for x/pat:**
- Default: **Off** (no location sharing)
- When user checks in to a spot: they share that spot only (venue precision, not GPS coordinates)
- "Nearby Nomads" mode: share **neighborhood-level fuzzy location** (~500m jitter added server-side)
- Never expose raw GPS coordinates to other users

**GDPR compliance requirements:**
- Explicit opt-in for each sharing mode (not buried in settings)
- Right to delete location history
- Clear disclosure in Privacy Policy of what is shared, with whom, for how long
- Location data is personal data under GDPR — treat accordingly

**iOS approximate location:** iOS 14+ lets users grant approximate-only location permission. Design the app to degrade gracefully when only approximate location is available — geofence triggers still work at ~3km accuracy in this mode.

---

### Topic 5: Ephemeral Check-In vs. Continuous Broadcasting — UX Tradeoffs

**Ephemeral check-in model (recommended):**
- User is "at a spot" for a defined window (e.g., 2–4 hours, or until they manually check out)
- Low battery impact — only one location lookup at check-in time
- Clear social contract: "I want people to know I'm here"
- Precedent: Foursquare Swarm, Yelp check-ins

**Continuous broadcasting model (Zenly/Bump):**
- Background GPS continuously polled and broadcast
- High battery drain — GPS polling every 30–60 seconds = ~15–38% battery impact
- Privacy concerns are higher
- Regulatory burden: needs "Always" location permission on iOS
- Not recommended for x/pat v1

**"I'm Working Here Today" feature (recommended for v2):**
- User sets a spot as their "working location" for the day at the start of their session
- Expires automatically at midnight or after 8 hours
- Broadcasts to followers only
- Zero ongoing GPS drain after initial set

---

## 6–10: Geofencing for Automatic Check-In Suggestions

### Topic 6: iOS CLRegion Geofencing via Expo

**How it works:**
iOS CLRegionMonitoring uses the device's low-power geofence engine (cell tower + WiFi, not GPS) to detect entry/exit of circular regions. Expo exposes this via `expo-location` + `expo-task-manager`.

**Implementation:**
```typescript
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

const GEOFENCE_TASK = 'SPOT_GEOFENCE_TASK'

TaskManager.defineTask(GEOFENCE_TASK, ({ data: { eventType, region }, error }) => {
  if (error) return
  if (eventType === Location.GeofencingEventType.Enter) {
    // Trigger soft "You're near [SpotName]! Check in?" notification
    scheduleLocalCheckInPrompt(region.identifier)
  }
})

// Register geofences for user's saved/favorite spots
async function registerNearbyGeofences(spots: Spot[]) {
  const { status } = await Location.requestBackgroundPermissionsAsync()
  if (status !== 'granted') return

  await Location.startGeofencingAsync(GEOFENCE_TASK, spots.map(spot => ({
    identifier: spot.id,
    latitude: spot.latitude,
    longitude: spot.longitude,
    radius: 150, // meters — minimum effective radius
    notifyOnEnter: true,
    notifyOnExit: false,
  })))
}
```

**iOS limits:**
- Maximum 20 simultaneous geofence regions per app
- Minimum effective radius: ~100–150m (smaller radii are unreliable)
- Works when app is backgrounded, suspended, or terminated
- On app start, iOS reports the initial state of all registered regions

**Battery impact:** Negligible — CLRegionMonitoring uses cell/WiFi positioning, not GPS. Apple rates this as one of the most battery-efficient location methods.

---

### Topic 7: Android Geofence API via Expo

**How it works:**
Android's Geofence API (part of Fused Location Provider) similarly monitors regions using a blend of cell, WiFi, and GPS signals. Expo wraps this through the same `expo-location` + `expo-task-manager` interface.

**Key Android-specific considerations:**
- Android allows up to **100 active geofences** per app (5x iOS limit)
- Requires both foreground AND background location permissions
- Minimum recommended radius: 100–150m (Android GPS accuracy variance)
- `setNotificationResponsiveness()` — set to 5+ minutes to save battery
- On Android 12+, use a foreground service for reliable background geofencing
- Some OEM battery-optimization systems (Huawei, Xiaomi) aggressively kill background processes — always guide users to disable battery optimization for x/pat

**Battery optimization strategy:**
```
Priority hierarchy:
1. PRIORITY_NO_POWER (piggybacks on other apps' location requests) — use for idle geofences
2. PRIORITY_BALANCED_POWER_ACCURACY (100m accuracy, WiFi/cell) — default
3. PRIORITY_HIGH_ACCURACY (GPS) — only activate when user is actually near a spot
```

Use `distanceFilter` + `stationaryRadius` (react-native-background-geolocation pattern) to detect when user is stationary and turn off GPS polling entirely.

**Known Expo issue:** `expo/expo` GitHub issue #33433 (open as of 2025) — geofencing task fires on every app open, not just on genuine entry/exit events. Workaround: debounce task execution with a timestamp check.

---

### Topic 8: Geofencing Strategy — Which Spots to Monitor

**The 20-region iOS limit is a strategic constraint:**
You cannot register all 431 seeded spots as geofences simultaneously on iOS. Strategy:

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| User's saved spots only | Monitor spots the user has favorited | Relevant, personal | Requires user setup |
| Nearest N spots dynamically | Re-register the 15 closest spots as user moves | Always relevant | Complex logic, battery cost of recalculation |
| Popular city zones | Broad geofences (500m) around dense spot clusters | Easy, reliable | Less precise triggering |
| On-demand | Register geofences only when user enters a city | Lean, no background work | Requires manual city entry |

**Recommended approach for x/pat:**
- Register up to 15 geofences from the user's **saved spots list** (iOS safe margin below 20-region limit)
- On Android, register up to 50 from the user's saved spots + spots within the current city
- Refresh geofence list when user travels to a new city (detect via significant location change API)

---

### Topic 9: Radar.io as a Managed Geofencing Alternative

**What it is:**
Radar.io is a managed geolocation/geofencing platform with a React Native SDK. It abstracts iOS CLRegion + Android Geofence + battery management into a single API.

**Pricing (2025):**
- **Free:** 1,000 monthly tracked users, 100,000 API requests, 1,000 geofences — sufficient for beta/early traction
- **Team:** $499/month — 10,000 tracked users, 1M API requests, 10,000 geofences
- **Enterprise:** Custom pricing

**Advantages over raw Expo Location:**
- Handles the iOS 20-region limit internally (manages a virtual unlimited geofence pool)
- Built-in battery optimization (motion detection, stationary detection)
- Place detection without geofence pre-registration (detects entry to points of interest from Foursquare/HERE dataset)
- Trip tracking, fraud detection, compliance tooling

**Verdict for x/pat:** Free tier covers the beta phase. Consider adopting at $499/month when > 1,000 MAU to eliminate the geofencing complexity tax on engineering time. The Expo integration requires a Development Build (not Expo Go).

---

### Topic 10: Check-In Suggestion UX — The Prompt Design

**Best practice pattern (Foursquare/Yelp precedent):**
1. User enters geofence → **local push notification** (soft suggestion, not a mandatory action)
2. Notification copy: "You're near [SpotName] ☕ — been here before? Quick check-in?"
3. Tap → deep links directly to spot detail with one-tap check-in button
4. **Never auto-check-in** — always require a tap. Trust is the most valuable asset.

**Notification fatigue prevention:**
- Only suggest check-in at a spot if user hasn't checked in there in the last 24 hours
- Maximum 2 check-in suggestions per day
- Settings screen: "Check-in reminders: On / Off"
- Android: Check-in suggestions should use a low-priority notification channel (no sound)

**Accuracy window:**
A 150m geofence with 5-minute responsiveness means the suggestion arrives roughly 5–10 minutes after physical entry. This is ideal — user is settled, not mid-commute.

---

## 11–15: Map Clustering for Large Numbers of Pins

### Topic 11: Why Clustering Is Non-Negotiable

**The performance problem:**
Each `<Marker>` in react-native-maps is a fully-instantiated native UIView (iOS) or View (Android). Rendering 431 markers (x/pat's current seeded spots) means 431 native view instantiations, bridge serialization of 431 objects, and GPU compositing overhead for all of them simultaneously. At 1,000+ spots, this causes dropped frames and scroll jank.

**Benchmark:**
- 50 markers: smooth (< 16ms frame time)
- 200 markers: noticeable lag on mid-range Android
- 500+ markers: unacceptable jank, 40–60ms frame times on typical devices
- With clustering: regardless of dataset size, only the ~10–30 visible cluster bubbles render

**Additional react-native-maps issue (2025):** `tracksViewChanges` on custom markers causes exponential re-render cost on Android — each new marker spawns a new ViewChangesTracker loop that redraws all previous markers. With 100 custom markers and `tracksViewChanges={true}`, frame times can hit 200ms+.

---

### Topic 12: Supercluster — The Gold Standard Algorithm

**What it is:**
Supercluster (by Mapbox) is a JavaScript geospatial point clustering library that uses a hierarchical grid-based approach across zoom levels. It pre-indexes all points and returns only the cluster/point set needed for the current viewport + zoom level in sub-millisecond time.

**How it works:**
At each zoom level, nearby points within a configurable pixel radius are merged into a cluster point. The cluster carries a `point_count` and `cluster_id`. On zoom, clusters expand into their constituent points.

**npm package options for React Native:**

| Package | Algorithm | Performance | Maintained |
|---------|-----------|-------------|-----------|
| `react-native-map-clustering` | JS Supercluster | Good for < 5K points | Active (2025) |
| `react-native-clusterer` | C++ Supercluster via JSI | **10x faster** initial load vs JS | Active (2025) |
| `react-native-maps-super-cluster` | JS Supercluster | Older, less maintained | Stale |

**`react-native-map-clustering` usage:**
```typescript
import MapView from 'react-native-map-clustering'
import { Marker } from 'react-native-maps'

<MapView
  clusterColor="#FF6B35"
  clusterTextColor="#FFFFFF"
  clusterFontFamily="Inter-SemiBold"
  radius={50}
  maxZoom={16}
  minPoints={3}
>
  {spots.map(spot => (
    <Marker key={spot.id} coordinate={{ latitude: spot.lat, longitude: spot.lng }} />
  ))}
</MapView>
```

---

### Topic 13: react-native-clusterer — JSI C++ Implementation

**Why it matters:**
`react-native-clusterer` by JiriHoffmann uses JSI (JavaScript Interface) bindings to call a C++ port of Supercluster directly, bypassing the JS bridge entirely. This delivers up to **10x faster** initial clustering of large point sets compared to the JS implementation.

**When to use it:**
- Dataset > 5,000 points
- Need sub-50ms clustering on initial map load
- Already using the New Architecture (Fabric/TurboModules)

**Three usage modes:**
1. `useClusterer` hook — declarative React hook, simplest to use
2. `Clusterer` component — drop-in MapView wrapper
3. `Supercluster` class — manual imperative control for custom rendering

**Performance data:** The repository's example folder demonstrates speed comparisons showing initial clustering of 50,000 points in < 100ms on a mid-range device using the C++ path vs. ~1 second on the JS path.

**For x/pat today:** With 431 spots, `react-native-map-clustering` is sufficient. Migrate to `react-native-clusterer` when total spots exceed 5,000.

---

### Topic 14: Custom Cluster Markers — Design for Dark Mode

**Rendering custom cluster bubbles:**
Both `react-native-map-clustering` and `react-native-clusterer` support a `renderCluster` prop for custom cluster marker design.

```typescript
const renderCluster = (cluster) => {
  const { id, geometry, onPress, properties } = cluster
  const { point_count } = properties

  return (
    <Marker
      key={`cluster-${id}`}
      coordinate={{
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
      }}
      onPress={onPress}
      tracksViewChanges={false} // CRITICAL for Android performance
    >
      <View style={styles.clusterBubble}>
        <Text style={styles.clusterText}>{point_count}</Text>
      </View>
    </Marker>
  )
}
```

**Design spec for x/pat dark mode:**
- Background: `rgba(255, 107, 53, 0.9)` (x/pat brand orange with blur)
- Text: white, `Inter-SemiBold`, 13pt
- Size: 36px for < 10, 44px for 10–99, 52px for 100+
- Border: 2px white with 50% opacity
- Animate scale-in on cluster formation using `Animated.spring`

**Always set `tracksViewChanges={false}`** on cluster markers immediately after initial render to prevent the Android re-draw loop.

---

### Topic 15: Viewport-Based Clustering — Only Load Visible Spots

**Further optimization — don't load all spots at once:**
Instead of loading all spots globally and clustering client-side, use a viewport-aware backend query: only fetch spots within the current map bounding box. This reduces data transfer and clustering load.

**Implementation with Supabase + PostGIS:**
```sql
CREATE OR REPLACE FUNCTION spots_in_viewport(
  min_lat float, min_lng float, max_lat float, max_lng float
)
RETURNS SETOF spots AS $$
  SELECT * FROM spots
  WHERE ST_Within(
    location::geometry,
    ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  )
  AND is_published = true
  LIMIT 500;
$$ LANGUAGE sql STABLE;
```

**Client-side trigger:**
```typescript
// Only re-query when map region changes significantly (debounced)
const onRegionChangeComplete = useMemo(
  () => debounce(async (region) => {
    const bbox = regionToBoundingBox(region)
    const { data } = await supabase.rpc('spots_in_viewport', bbox)
    setVisibleSpots(data)
  }, 300),
  []
)
```

**Result:** Map loads in < 200ms regardless of global spot count. User only ever downloads what they can see.

---

## 16–20: Custom Map Styles for Dark-Mode Apps

### Topic 16: Apple Maps Dark Mode on iOS (react-native-maps)

**How it works:**
react-native-maps exposes a `userInterfaceStyle` prop on `MapView` for Apple Maps. When set to `'dark'`, the native Apple Maps SDK switches to its system dark style — the same premium dark map shown in Maps.app.

```typescript
import { useColorScheme } from 'react-native'

const colorScheme = useColorScheme()

<MapView
  provider={undefined} // Apple Maps (iOS default)
  userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
  // ...
/>
```

**Known issues (as of react-native-maps 1.26.x):**
- GitHub issues #3795, #3846, #3858 all report `userInterfaceStyle` not reliably applying on iOS
- The system-level dark mode (from app.json `"userInterfaceStyle": "dark"`) can override the prop
- Workaround: Set `UIUserInterfaceStyle` to `Unspecified` in Info.plist and control exclusively via the prop

**What Apple Maps dark mode gives you:**
- Native system-quality dark basemap (not a custom style)
- No JSON style files needed — pure native rendering
- Consistent with iOS design language
- Zero additional cost

**Limitation:** Unlike Google Maps, Apple Maps does not support custom JSON style files. You get dark or light — no further customization of road colors, POI colors, etc.

---

### Topic 17: Google Maps Dark Style on Android (react-native-maps)

**Legacy JSON approach (still works in 2025):**
```typescript
import darkMapStyle from '../assets/map-styles/dark.json'

<MapView
  provider="google"
  customMapStyle={darkMapStyle}
  // ...
/>
```

A minimal dark style JSON that removes default POI clutter and sets the base to near-black:
```json
[
  { "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a99" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#000000" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2d2d44" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d0d1a" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] }
]
```

**Modern Cloud-Based approach (post-March 2025):**
Google migrated all legacy map styles to cloud-based Map IDs on March 18, 2025. The recommended path is now:
1. Create a Map ID in Google Cloud Console
2. Associate a cloud-styled map style with it
3. Pass it via `googleMapId` prop on MapView

```typescript
<MapView
  provider="google"
  googleMapId="YOUR_DARK_MAP_ID"
/>
```

**Note:** The `customMapStyle` JSON prop still works but Google is steering developers toward cloud-based styling long-term.

---

### Topic 18: Mapbox as an Alternative — Full Style Control

**Why consider Mapbox:**
Mapbox offers dramatically more style customization than either Apple Maps or Google Maps. The Mapbox Standard style system supports:
- Full color palette control via LUTs (Look-Up Tables)
- Per-layer color/opacity/visibility control
- Night/Dusk/Dawn/Day theme presets
- 3D building extrusions with dark-mode-aware fade-in
- HD roads with custom emissive strength (glowing road effect in dark mode)

**React Native integration:** `@rnmapbox/maps` (community-maintained package wrapping Mapbox Maps SDKs for iOS/Android)

**Dark mode config:**
```typescript
import MapboxGL from '@rnmapbox/maps'

<MapboxGL.MapView
  styleURL="mapbox://styles/mapbox/navigation-night-v1"
  // or custom style from Mapbox Studio
/>
```

**Mapbox pricing (2025):**
- Free tier: 25,000 monthly active users for mobile maps
- Paid: ~$0.50 per 1,000 MAU above free tier
- Significantly cheaper than Google Maps for high-traffic apps
- No per-load fee for the Mobile SDK itself

**Tradeoff:**
Adding Mapbox means adding a second map SDK dependency to the project, with significant native module weight (~15–25MB per platform). For x/pat, which already uses react-native-maps with Apple Maps (iOS) and Google Maps (Android), adding Mapbox creates inconsistency. **Recommended only if Apple Maps dark mode issues become a persistent blocker.**

---

### Topic 19: Google Maps Styling Wizard and Style Generation

**Practical workflow for generating a dark style:**
1. Go to Google Maps Platform Styling Wizard (mapstyle.withgoogle.com)
2. Select "Dark" preset as base
3. Customize: suppress POI labels (x/pat renders its own), boost road contrast
4. Export as JSON
5. Import into project as `assets/mapStyles/darkMap.json`

**Recommended dark style tweaks for a nomad/cafe app:**
- Hide default `poi.business` labels (x/pat pins replace these)
- Keep `transit` layer for nomad navigation context
- Set road colors to subtle dark blue-grey, not pitch black
- Keep water as deep blue for visual anchor
- Text fill: #9E9EBA (muted lavender-white, legible without harshness)

**Performance:** JSON map styles add < 1ms to MapView initialization. The style is compiled natively by the Maps SDK — no runtime overhead.

**Cost:** JSON styling uses the standard `customMapStyle` prop — no additional SKU charges beyond the standard Dynamic Maps load fee ($7.00 per 1,000 loads after 10,000 free/month).

---

### Topic 20: Map Style Strategy for x/pat

**Recommended approach by platform:**

| Platform | Provider | Dark Mode Method | Status |
|----------|----------|-----------------|--------|
| iOS | Apple Maps | `userInterfaceStyle="dark"` prop | Use — monitor bugs |
| Android | Google Maps | `customMapStyle` JSON + cloud Map ID | Implement now |
| Both (future) | Mapbox | `styleURL` with Night preset | Contingency option |

**Action items:**
1. Create a custom dark JSON style for Android using the Styling Wizard
2. Suppress `poi.business` layer — x/pat's own pins are the POI layer
3. Migrate to `googleMapId` on Android when Google fully deprecates JSON styling
4. Document the `userInterfaceStyle` iOS workaround in project notes
5. Test on iOS: if dark mode map is inconsistent across devices, implement the Info.plist `UIUserInterfaceStyle: Unspecified` fix

---

## 21–25: PostGIS Spatial Queries

### Topic 21: ST_DWithin — The Primary Radius Search Tool

**Why ST_DWithin, not ST_Distance:**
`ST_Distance(a, b) < radius` must calculate the exact distance for every row in the table before filtering. `ST_DWithin(a, b, radius)` uses the spatial index to pre-filter via bounding box expansion — only computing exact distances for the small candidate set. The performance gap on a properly indexed table is enormous.

**Benchmark data:**
- One production case: query time reduced from **45 seconds → 80ms** with spatial index + ST_DWithin
- Another: from **4 seconds → 200ms** after adding spatial clustering
- ST_DWithin with geography type achieves ~48% improvement in query cost vs geometry with degree-based distances

**Geography vs. Geometry for x/pat:**
Use `geography(POINT, 4326)` (WGS84 geographic coordinates):
- Distance in meters, not degrees — no manual degree-to-meter conversion
- Accurate over the globe (important for a multi-city nomad app)
- Slightly slower than geometry at query time, but accuracy tradeoff is worthwhile
- Optimization: pass `use_spheroid=false` for ~20% speed boost (sphere approximation, accurate enough for < 100km)

**Canonical nearby spots query:**
```sql
SELECT id, name, category,
       ST_Distance(location, ST_Point($lng, $lat)::geography) AS distance_m
FROM spots
WHERE ST_DWithin(location, ST_Point($lng, $lat)::geography, $radius_m)
  AND is_published = true
ORDER BY distance_m
LIMIT 50;
```

---

### Topic 22: Spatial Index Setup and Maintenance

**Creating the index:**
```sql
-- Enable PostGIS extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geography column on spots table
ALTER TABLE spots ADD COLUMN location geography(POINT, 4326);

-- Update existing rows if you have lat/lng columns
UPDATE spots SET location = ST_Point(longitude, latitude)::geography;

-- GiST spatial index — required for ST_DWithin performance
CREATE INDEX spots_location_gist ON spots USING GIST(location);

-- Partial index: only index published spots for even better performance
CREATE INDEX spots_location_published_gist ON spots
USING GIST(location)
WHERE is_published = true;
```

**Index type comparison:**

| Index | Avg Query Time | Best For |
|-------|---------------|----------|
| GiST | < 1ms | All spatial queries, overlapping data, **default choice** |
| SP-GiST | < 1ms | Non-overlapping uniform data (slightly better than GiST for point data) |
| BRIN | ~20ms | Very large tables with natural spatial order (append-only) |

**For x/pat spots (< 100K rows):** Standard GiST index on `location` is optimal. No partitioning needed until > 1M rows.

**Maintenance:**
```sql
-- Run after bulk data imports (like the 431-spot seed)
ANALYZE spots;
VACUUM ANALYZE spots;
```

---

### Topic 23: Supabase RPC Pattern for Nearby Spots

**The canonical Supabase PostGIS RPC:**
```sql
CREATE OR REPLACE FUNCTION nearby_spots(
  lat float,
  lng float,
  radius_m float DEFAULT 5000,
  limit_n int DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  distance_m float,
  latitude float,
  longitude float
) AS $$
  SELECT
    s.id,
    s.name,
    s.category,
    ST_Distance(s.location, ST_Point(lng, lat)::geography) AS distance_m,
    ST_Y(s.location::geometry) AS latitude,
    ST_X(s.location::geometry) AS longitude
  FROM spots s
  WHERE s.is_published = true
    AND ST_DWithin(s.location, ST_Point(lng, lat)::geography, radius_m)
  ORDER BY distance_m
  LIMIT limit_n;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Client call:**
```typescript
const { data, error } = await supabase.rpc('nearby_spots', {
  lat: userLocation.latitude,
  lng: userLocation.longitude,
  radius_m: 5000,
  limit_n: 50,
})
```

**Performance on x/pat's dataset (431 spots):** Sub-1ms query execution. At 10,000 spots with GiST index: < 5ms. At 1M spots with GiST index: < 20ms with proper VACUUM/ANALYZE.

**KNN ordering (alternative — faster for large datasets):**
```sql
-- Uses index for ordering, no radius filter needed
SELECT id, name, location <-> ST_Point(lng, lat)::geography AS distance_m
FROM spots
ORDER BY distance_m
LIMIT 20;
```
The `<->` KNN operator utilizes the GiST index for ordering by distance. Use this for "show 20 nearest spots" without a radius filter.

---

### Topic 24: Viewport Bounding Box Queries (Map Pan/Zoom)

**Why bounding box beats radius for map rendering:**
When the user pans the map, you need spots within the visible rectangle (viewport), not a circle. `ST_MakeEnvelope` with `&&` (bounding box intersection) is faster than ST_DWithin for this use case because the `&&` operator is a pure bounding-box operation — even cheaper than the distance calculation.

**RPC function:**
```sql
CREATE OR REPLACE FUNCTION spots_in_bounds(
  min_lat float, min_lng float,
  max_lat float, max_lng float
)
RETURNS SETOF spots AS $$
  SELECT * FROM spots
  WHERE location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    AND is_published = true
  LIMIT 300;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Client pattern:**
```typescript
// Debounce to avoid querying on every frame during pan
const onRegionChangeComplete = useCallback(
  debounce(async (region: Region) => {
    const { latitudeDelta, longitudeDelta, latitude, longitude } = region
    const { data } = await supabase.rpc('spots_in_bounds', {
      min_lat: latitude - latitudeDelta / 2,
      min_lng: longitude - longitudeDelta / 2,
      max_lat: latitude + latitudeDelta / 2,
      max_lng: longitude + longitudeDelta / 2,
    })
    setSpots(data ?? [])
  }, 300),
  []
)
```

**Debounce value:** 300ms is the sweet spot — responsive without excessive database calls during animated region transitions.

---

### Topic 25: Scaling PostGIS for Growth — Partitioning Strategy

**Current state (431 spots):** No optimization needed beyond the GiST index.

**At 10,000 spots:** GiST index alone handles this in < 5ms. No changes needed.

**At 100,000 spots:** Add a partial index per city (if cities are stored):
```sql
CREATE INDEX spots_bangkok_gist ON spots USING GIST(location)
WHERE city = 'Bangkok' AND is_published = true;
```

**At 1M+ spots:** Use spatial partitioning by tile or city region. PostGIS supports table partitioning via PostgreSQL's native partitioning by range or list. Alternatively, use the BRIN index for append-only historical data (user check-ins table, not spots table).

**Check-ins table optimization:**
The `check_ins` table will grow unbounded. Use BRIN index on `created_at` for time-based queries + GiST on `location` for spatial queries. Archive check-ins older than 90 days to a separate `check_ins_archive` table.

```sql
CREATE INDEX check_ins_time_brin ON check_ins USING BRIN(checked_in_at);
CREATE INDEX check_ins_location_gist ON check_ins USING GIST(location);
```

**Rule of thumb:** ST_DWithin + GiST + proper ANALYZE handles 99% of production geo-social use cases. Partitioning is only needed at Foursquare/Yelp scale (tens of millions of places).

---

## 26–30: Indoor Mapping and Place Precision

### Topic 26: What3words — 3-Meter Spot Precision

**What it is:**
What3words divides the entire Earth surface into 3m × 3m squares, each assigned a unique three-word address (e.g., `///filled.count.soap`). The system encodes geographic coordinates into permanently fixed word triplets.

**Use case for x/pat:**
For coworking spaces and cafes, a single lat/lng coordinate points to the building entrance or centroid. What3words enables users to specify "the back corner with the power outlets" or "the rooftop seating area" with 3m precision — genuinely useful for large venues.

**API pricing (2025):**
- **Free tier:** Available for testing and low-volume integrations (collecting/validating addresses from users)
- **Paid tiers:** Starting from £0 to ~£235/month depending on monthly conversion volume
- Free tier sufficient for a feature where users optionally tag a 3-word precise location

**React Native integration:**
```typescript
import { W3WAutosuggest } from '@what3words/react-native-components'

// Or use the REST API directly
const getW3WAddress = async (lat: number, lng: number) => {
  const response = await fetch(
    `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat}%2C${lng}&key=${W3W_API_KEY}`
  )
  const { words } = await response.json()
  return words // e.g., "///filled.count.soap"
}
```

**Verdict for x/pat:** Worth adding as an **optional precision layer** for power users who want to save a very specific table or corner within a venue. Store the w3w address as an optional field on the `check_ins` table. Not a primary navigation feature — supplementary precision.

---

### Topic 27: Google Plus Codes — Open Source Alternative

**What it is:**
Plus Codes (Open Location Code) is Google's open-source geocode system similar to what3words but freely available with no API cost. A full Plus Code like `8FW4V75V+8Q` encodes a location to ~14m × 14m. A short code (V75V+8Q in Bangkok) requires a reference city.

**Precision vs. What3words:**
- What3words: 3m × 3m — more granular
- Plus Code (10 character): ~14m × 14m — sufficient for table-level precision
- Plus Code (11 character): ~3m × 3m — matches what3words precision

**Advantages over what3words:**
- Fully open source (Apache 2.0 license)
- No API calls required — pure mathematical encoding/decoding
- Works offline
- Available natively in Google Maps (users can find any Plus Code on Google Maps)

**npm package:** `open-location-code` (Google's official JS implementation)

```typescript
import OpenLocationCode from 'open-location-code'

const plusCode = OpenLocationCode.encode(latitude, longitude, 11) // 3m precision
const decoded = OpenLocationCode.decode(plusCode) // returns { latitudeLo, longitudeLo, ... }
```

**Cost:** Free. No API key, no rate limits, runs entirely client-side.

**Recommendation for x/pat:** Use Plus Codes as the primary precision identifier (free, offline-capable). Offer what3words as a premium-legible alternative if user base response data suggests it's valued.

---

### Topic 28: Google Maps Indoor Maps and Apple IMDF

**Current state of indoor venue mapping (2025):**
- Google has mapped **10,000+ indoor venues** globally (airports, malls, transit stations)
- Apple IMDF (Indoor Mapping Data Format) is expanding and powers Apple Maps indoor
- Both systems require venues to submit floor plan data — not crowdsourced

**Coverage for x/pat's target venues:**
- Large coworking chains (WeWork, IWG/Regus): **likely indexed** in Google/Apple indoor maps
- Independent cafes and small coworking spaces: **not indexed** — these are the majority of x/pat's spots

**React Native integration:**
- Google Maps indoor is **automatically rendered** when the user zooms in sufficiently on an indexed venue — no code required, just Google Maps as the provider
- Apple Maps indoor: similar automatic rendering on iOS
- MapsIndoors SDK (`@mapsindoors/react-native-maps-indoors-google-maps`) enables custom indoor floor plan overlays for venues that provide their own IMDF data

**Practical implication for x/pat:** Indoor maps are a passive free benefit for a small percentage of x/pat's spots (major WeWork locations, etc.). For the long tail of independent spots, indoor precision comes from user-contributed data (see Topics 26–27 on Plus Codes and what3words).

---

### Topic 29: BLE Beacon-Based Indoor Positioning

**What it is:**
BLE (Bluetooth Low Energy) beacons placed inside a venue enable centimeter-to-meter indoor positioning via RSSI triangulation. The device detects beacon signal strengths and triangulates position against a known beacon map.

**React Native/Expo support:**
- `react-native-ble-plx` — BLE scanning and connection (works in Expo Development Build)
- Custom BLE beacon ranging requires bare workflow or Development Build (not Expo Go)
- Requires physical BLE beacons deployed in the venue (~$20–$50 per beacon, need 3+ per floor)

**Accuracy:** 1–5 meters with 3+ beacons; degrades in RF-noisy environments (busy cafes with many WiFi devices)

**Barriers for x/pat:**
1. x/pat does not own or control the venues — cannot deploy beacons
2. Venue operators would need to install and maintain beacons
3. Per-venue floor plan maps would need to be ingested and stored
4. SDK complexity is high for the precision benefit

**Verdict:** BLE indoor positioning is **not feasible for x/pat v1 or v2**. It requires venue operator partnership and physical hardware deployment. Suitable only for a future "venue partnership" program where coworking spaces become active x/pat partners and install beacons.

**If pursued:** Mappedin is a leading indoor mapping SDK platform that handles the full stack (IMDF ingestion, BLE blue-dot positioning, React Native SDK). Their SDK supports "Blue Dot" indoor navigation and is used by malls and airports.

---

### Topic 30: Practical Precision Strategy for x/pat — Synthesis

**The precision hierarchy for x/pat spots:**

| Precision Level | Technology | Accuracy | Cost | Feasibility |
|----------------|-----------|----------|------|-------------|
| City | IP geolocation | ~10km | Free | Now |
| Street/Building | GPS + Geocoding | 5–50m | Free | Now |
| Entrance point | Manually placed pin on map | 1–5m | Free | Now (current) |
| Table/Corner | Plus Code (user-submitted) | 3–14m | Free | v2 |
| Table/Corner | What3words (user-submitted) | 3m | Free tier | v2 |
| Floor plan | IMDF/Google Indoor | 1–10m | Free (auto) | Limited coverage |
| Sub-meter | BLE beacons | 0.5–2m | $$$$ + ops | Future partnership |

**Recommended implementation roadmap:**

**Now (already done):** GPS-based lat/lng pin placement when a spot is created. This is sufficient for map discovery.

**v2 — Precision Check-In Tags:**
When a user checks in, optionally let them add a precision tag:
- "Saved spot" — a named location within the venue (e.g., "Window seat, 2nd floor")
- Plus Code auto-generated from their GPS at check-in time
- These precision tags are stored on the `check_ins` table and surfaced on the spot detail screen

**v2 — "Spot Map" Feature:**
For verified power spots (top 50 most-visited venues), allow venue managers or power users to submit a simple JSON floor plan sketch (SVG overlay) that shows seating zones. Render this as a semi-transparent layer over Apple/Google Maps when zoomed in past zoom level 18.

**v3 — Partner Venue Program:**
For coworking spaces that become official x/pat partners, offer a beacon integration kit. Partners install 3–5 BLE beacons, upload their IMDF floor plan, and x/pat users get true indoor navigation and automatic floor detection.

**Cost summary for v2 precision features:**
- Plus Codes: $0 (open source JS library)
- What3words: $0 (free tier for low volume)
- IMDF/Google Indoor: $0 (automatic, no SDK changes)
- Total additional infrastructure cost: $0

---

## Key Decisions Summary

| Decision | Recommendation | Priority |
|----------|----------------|----------|
| "Who's here" feature | Manual check-in model (Swarm-style), not continuous GPS | High — v1 |
| Realtime presence | Supabase Presence on spot detail screen only | High — v1 |
| Geofencing | Expo Location + TaskManager, user's saved spots only (15 max iOS) | Medium — v2 |
| Geofencing service | Radar.io free tier when > 1,000 MAU | Medium — v2 |
| Map clustering | `react-native-map-clustering` now; migrate to `react-native-clusterer` at 5K+ spots | High — now |
| Marker performance | Always set `tracksViewChanges={false}` after initial render | High — now |
| iOS dark map | `userInterfaceStyle="dark"` prop + Info.plist workaround | Medium — now |
| Android dark map | Custom JSON style via `customMapStyle`, migrate to Cloud Map ID | Medium — now |
| Spot query | `ST_DWithin` RPC via Supabase, geography type, GiST index | High — now |
| Map pan query | `ST_MakeEnvelope` viewport query, 300ms debounce | High — now |
| Precision tagging | Plus Codes (free, offline) as primary; what3words as optional UX layer | Low — v2 |
| Indoor mapping | Passive (Google/Apple auto-render) + Plus Codes; BLE only via partnerships | Low — v3 |

---

## Sources

- [Foursquare Swarm — Wikipedia](https://en.wikipedia.org/wiki/Foursquare_Swarm)
- [Foursquare Swarm Support — Check-ins](https://support.foursquare.com/hc/en-us/articles/12534514074012-Swarm-check-ins)
- [Supabase Realtime Presence Docs](https://supabase.com/docs/guides/realtime/presence)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase PostGIS Geo Queries](https://supabase.com/docs/guides/database/extensions/postgis)
- [Expo Location SDK Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo TaskManager Docs](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Building Location-Based Features with Expo — Anthony Coffey](https://coffey.codes/articles/building-location-based-features-using-expo-location)
- [Android Geofencing — Google Developer Docs](https://developer.android.com/develop/sensors-and-location/location/geofencing)
- [Android Geofencing in 2026: Complete Guide — Smartupworld](https://smartupworld.com/android-geofencing/)
- [Radar.io React Native SDK](https://docs.radar.com/sdk/react-native)
- [Radar.io Pricing — G2](https://www.g2.com/products/radar-labs-inc-radar/pricing)
- [react-native-clusterer (JSI C++ Supercluster)](https://github.com/JiriHoffmann/react-native-clusterer)
- [react-native-map-clustering — npm](https://www.npmjs.com/package/react-native-map-clustering)
- [Performant Custom Map Markers for react-native-maps — ITNEXT](https://itnext.io/performant-custom-map-markers-for-react-native-maps-ddc8d5a1eeb0)
- [Optimizing Map Performance in React Native — Stackademic](https://medium.com/@ismailharmanda/optimizing-map-performance-enhancing-user-experience-in-react-native-and-react-native-maps-ac3301f70ac)
- [Supercharge Your React Native Maps — React News](https://react-news.com/supercharge-your-react-native-maps-a-deep-dive-into-performance-and-modern-clustering)
- [react-native-maps userInterfaceStyle Issue #3846](https://github.com/react-native-maps/react-native-maps/issues/3846)
- [Google Maps Custom Dark Style — Styled Maps Night Mode](https://developers.google.com/maps/documentation/javascript/examples/style-array)
- [Mapbox Style Updates 2025 — Enhanced 3D Basemap](https://www.mapbox.com/blog/mapbox-style-updates-more-flexible-configurations-for-the-3d-basemap)
- [Mapbox vs Google Maps 2026 Comparison — Radar](https://radar.com/blog/mapbox-vs-google-maps-api)
- [PostGIS ST_DWithin Documentation](https://postgis.net/docs/ST_DWithin.html)
- [Use ST_DWithin for Radius Queries — PostGIS Tips](https://postgis.net/documentation/tips/st-dwithin/)
- [PostGIS Spatial Indexing Workshop](http://postgis.net/workshops/postgis-intro/indexing.html)
- [5 Principles for High-Performance PostGIS Queries — Medium](https://medium.com/@cfvandersluijs/5-principles-for-writing-high-performance-queries-in-postgis-bbea3ffb9830)
- [Leveraging Supabase for Distance-Based Filtering — blog.mansueli.com](https://blog.mansueli.com/leveraging-supabase-and-postgresql-for-distance-based-filtering-and-location-data-retrieval)
- [PostGIS Many Spatial Indexes — Crunchy Data](https://www.crunchydata.com/blog/the-many-spatial-indexes-of-postgis)
- [PostGIS Bounding Box Geo Search — Medium](https://medium.com/@ali.saranj1384/geo-search-with-bounding-box-using-postgis-postgresql-5097a90fdb8d)
- [What3words API Plans and Pricing](https://accounts.what3words.com/select-plan)
- [What3words — Wikipedia](https://en.wikipedia.org/wiki/What3words)
- [Convert Floor Plans to Indoor Maps 2025 — Mapsted](https://mapsted.com/blog/how-to-convert-floor-plans-into-interactive-indoor-maps)
- [MapsIndoors React Native SDK](https://docs.mapsindoors.com/other/changelog/react-native-sdk)
- [Apple Indoor Maps Program](https://register.apple.com/resources/indoor/program/indoor_maps)
- [React Native BLE Integration — Expo Blog](https://expo.dev/blog/how-to-build-a-bluetooth-low-energy-powered-expo-app)
- [Mappedin Indoor Positioning Systems — Blue Dot](https://www.mappedin.com/resources/blog/ips-integration/)
- [Google Maps Platform Pricing 2026](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Approximate vs Precise Location in LBS — Tandfonline](https://www.tandfonline.com/doi/full/10.1080/17489725.2024.2310006)
- [IP Geolocation and GDPR — Kamero Geo IP](https://geo.kamero.ai/blog/ip-geolocation-gdpr-privacy-compliance)
- [Zenly Case Study — Google Cloud](https://cloud.google.com/customers/zenly)
- [Expo Background Task — expo.dev](https://expo.dev/blog/goodbye-background-fetch-hello-expo-background-task)
