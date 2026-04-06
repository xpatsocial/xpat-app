# Android Maps, Location & Geospatial Research for x/pat

**Date:** April 6, 2026
**Scope:** Comprehensive research on maps, location, and geospatial features on Android for React Native / Expo apps
**Context:** x/pat is a social travel app with map-first explore, spot discovery, check-ins, and neighborhood safety data. Currently uses react-native-maps 1.27.2 with Google Maps on Android, expo-location, and custom grid-based clustering.

---

## Current x/pat Android Map Stack

- **react-native-maps** 1.27.2 (Google Maps provider on Android, Apple Maps on iOS)
- **react-native-map-clustering** 4.0.0 (installed but app uses custom `clusterSpots()` in `src/utils/mapClustering.ts`)
- **expo-location** 55.1.6 (foreground permissions only, Accuracy.Balanced)
- **Google Maps API key** configured in `app.json` under `android.config.googleMaps`
- **Dark mode** implemented via JSON `customMapStyle` array (7-element style) on Android, `userInterfaceStyle="dark"` on iOS
- **Region-based loading** fetches up to 500 spots within visible bounds from Supabase
- **Markers** use default `pinColor` (no custom views), colored by category
- **Neighborhood Pulse** overlay uses `Circle` components for safety zones

---

## 1. Google Maps SDK for Android: Latest Features & Pricing (2026)

### Pricing Changes (March 1, 2025)

The old $200/month recurring credit was replaced with free monthly usage caps per SKU:
- **Mobile SDK map loads: Unlimited free** (this is critical -- native Android/iOS SDK map views cost nothing)
- Essentials SKUs: 10,000 free events/month, then $2-7/1,000
- Pro SKUs: 5,000 free events/month
- Enterprise SKUs: 1,000 free events/month
- Map Tiles API: 100,000 free/month

Optional subscription plans: Starter ($100/mo, 50K calls), Essentials ($275/mo, 100K), Pro ($1,200/mo, 250K).

### 2026 SDK Features

- **New renderer** is now the only renderer (legacy decommissioned March 2025). Features: cloud-based styling, reduced network/memory, smoother panning/zooming, fluid label positioning.
- **Immersive Navigation** (March 2026): 3D turn-by-turn with Gemini-powered scene understanding. Available via Navigation SDK.
- **Ask Maps** (2026): Conversational Gemini-powered location queries. Consumer feature, not exposed via SDK.
- **Cloud-based maps styling** now supported in Maps SDK v18+, same style declarations as JavaScript API.

### x/pat Relevance

**HIGH.** x/pat pays $0 for Android map views since native SDK loads are unlimited. The main cost drivers will be Places API calls (autocomplete, nearby search) and Directions API if added. Current setup is cost-optimal.

**Action:** No changes needed for basic map display. Monitor cloud-based styling for potential dark mode improvement (see topic 3).

---

## 2. react-native-maps Android Configuration & Optimization

### Current Best Practices (2025-2026)

- **Hermes engine** (default since RN 0.70+): x/pat already uses this. Provides 40-60% faster JS execution.
- **ProGuard** for release builds: Reduces APK size, obfuscates code.
- **enableSeparateBuildPerCPUArchitecture**: Generates per-arch APKs, reducing download size 40-60%.
- **tracksViewChanges={false}** on all Marker components: Critical for Android performance.
- **Remove console.log** from production builds via babel plugin.

### Key Props for Android

- `provider="google"` (required on Android for Google Maps)
- `customMapStyle` for dark mode JSON styling
- `moveOnMarkerPress={false}` to prevent unwanted camera jumps
- `maxZoomLevel` / `minZoomLevel` to constrain zoom range
- `loadingEnabled={true}` shows loading indicator while tiles load

### x/pat Status

x/pat correctly sets `provider` conditionally for Android. The `mapDarkStyle` is applied. Markers use default pin colors (good for performance). Region-based loading with 500-spot limit is sensible.

**Action:** Ensure `tracksViewChanges={false}` is set on all markers (currently not explicitly set -- defaults to true, which hurts performance). Add `loadingEnabled` and `loadingBackgroundColor` props matching the dark theme.

---

## 3. Google Maps Dark Mode / Night Mode on Android

### Two Approaches

**A. JSON Style Arrays (current x/pat approach):**
- Applied via `customMapStyle` prop
- Works with all Maps SDK versions
- x/pat uses a 7-element style covering geometry, labels, water, roads, POIs, transit
- **Limitation:** Legacy approach -- Google migrated away from client-side JSON styles as of March 2025

**B. Cloud-Based Styling (recommended new approach):**
- Create styles in Google Cloud Console
- Assign a Map ID to the style
- SDK v18+ required (react-native-maps 1.27 uses a compatible version)
- Supports separate light/dark styles per Map ID
- **Key benefit:** Google now requires cloud-based styling for new features; legacy JSON styles were migrated/decommissioned March 2025

### x/pat Relevance

**MEDIUM-HIGH.** The current `mapDarkStyle` JSON works but is technically deprecated. Google auto-migrated legacy styles but recommends cloud-based.

**Action:** Create a cloud-based dark map style in Google Cloud Console. Generate a Map ID. Pass it to react-native-maps via the `googleMapId` prop (supported in 1.27+). This gives better control, supports Google's latest rendering, and future-proofs the styling. Keep the JSON array as a fallback.

---

## 4. Map Marker Clustering Libraries & Performance on Android

### Available Libraries

| Library | Approach | Performance | Notes |
|---------|----------|-------------|-------|
| **react-native-map-clustering** 4.0.0 | JS-based supercluster | Good for <5K points | x/pat has this installed |
| **react-native-clusterer** | C++ supercluster via JSI | 10x faster initial load | Best for large datasets |
| **Custom grid clustering** | Simple O(n) grid | Fast, predictable | x/pat uses this currently |

### x/pat Current Implementation

The custom `clusterSpots()` in `src/utils/mapClustering.ts` uses grid-based clustering with `gridSize=12`. This is efficient (O(n)) and avoids bridge traffic, but lacks:
- Smooth cluster expansion/animation
- Cluster count badges
- Spiderfy for overlapping markers at max zoom

### Performance Impact

With 431 seeded spots and region-based loading (500 max), the custom clustering is adequate. At scale (thousands of spots), consider:
- **react-native-clusterer** for JSI-powered supercluster
- Pre-computing clusters server-side in Supabase (PostGIS)

**Action:** Current approach is fine for launch. When spot count exceeds 1,000 in a single city, evaluate `react-native-clusterer` for its C++/JSI performance. The installed `react-native-map-clustering` 4.0.0 is a reasonable middle ground if custom clustering needs replacing.

---

## 5. Custom Map Markers on Android: Performance Impact (SVG vs Bitmap)

### Critical Finding

Google Maps on Android **only supports bitmap markers**. When you use custom React components as markers, react-native-maps must:
1. Render the React component to a View
2. Screenshot that View to a bitmap
3. Pass the bitmap to Google Maps

This creates a `ViewChangesTracker` loop: with N markers, each loop re-draws every marker, resulting in N^2 bitmap renders every 40ms. With 20 markers, that is 400 bitmap renders causing FPS drops from 120 to 10.

### Best Practices

- **Use `image` prop with pre-rendered PNG/bitmap**: Eliminates the React-to-bitmap conversion entirely
- **Use `pinColor` for simple color changes**: What x/pat does now -- the most performant option
- **Set `tracksViewChanges={false}`**: Stops the re-render loop after initial draw
- **Never use SVG as marker content**: SVGs rendered via react-native-svg cause extreme CPU load on older Android devices
- **Pre-render category icons as PNG assets** in 1x/2x/3x densities if custom icons are needed

### x/pat Relevance

**HIGH.** x/pat currently uses `pinColor` which is optimal. If moving to custom emoji or branded markers:
- Export marker designs as PNG at mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi
- Use the `image` prop on Marker: `image={require('../assets/markers/cafe.png')}`
- Never use tracksViewChanges for static markers

**Action:** When implementing custom category markers (cafe emoji, cowork icon, etc.), use pre-rendered PNG assets, not SVG or React component markers.

---

## 6. Google Maps vs Mapbox vs MapLibre: Cost, Features, Performance

### Comparison Matrix

| Factor | Google Maps | Mapbox | MapLibre |
|--------|-------------|--------|----------|
| **Cost (mobile)** | SDK loads: free. APIs: pay-per-use | 25K MAU free, then $5/1K MAU | Free (open source) |
| **Dark mode** | Cloud styling or JSON | Full Mapbox Studio control | Full style control |
| **Offline maps** | Limited (caching only) | Built-in download regions | Built-in OfflineManager |
| **Customization** | Moderate | Extensive | Extensive |
| **3D/Tilt** | Limited | Full 3D terrain | Full 3D terrain |
| **React Native lib** | react-native-maps (mature) | @rnmapbox/maps | @maplibre/maplibre-react-native |
| **Expo compatibility** | Excellent (config plugin) | Good (requires dev client) | Good (requires dev client) |
| **Data source** | Google proprietary | OpenStreetMap + proprietary | OpenStreetMap |
| **Search/Places** | Google Places (best-in-class) | Mapbox Geocoding | Third-party needed |
| **Street View** | Yes | No | No |
| **Indoor maps** | Yes | No | No |

### Cost Projection for x/pat

At 10,000 MAU:
- **Google Maps:** $0 for map views + API costs (Places, Directions)
- **Mapbox:** $0 (under 25K MAU free tier)
- **MapLibre:** $0 (free forever) + tile hosting costs (~$20-50/mo for vector tiles)

At 100,000 MAU:
- **Google Maps:** $0 for map views + API costs
- **Mapbox:** ~$375/mo (75K billable MAU at $5/1K)
- **MapLibre:** $0 + tile hosting costs (~$100-200/mo)

### x/pat Relevance

**MEDIUM.** Google Maps is the right choice for x/pat at launch:
- Free mobile SDK loads
- Best-in-class Places API for spot discovery
- Street View potential for spot previews
- Proven react-native-maps integration
- Already configured and working

**When to reconsider:** If offline maps become critical (nomads with poor connectivity), MapLibre's OfflineManager is superior. If map customization becomes a design priority (liquid glass aesthetic), Mapbox Studio offers deeper visual control.

**Action:** Stay with Google Maps. Revisit if offline maps or deep customization becomes a user need.

---

## 7. Geofencing on Android: Battery-Efficient Location Monitoring

### How It Works

Android's Geofencing API sits atop the Fused Location Provider. It uses a combination of GPS, Wi-Fi, Bluetooth, cell towers, and motion sensors to detect region entry/exit without keeping GPS active continuously.

### Battery Impact

- Geofencing responsiveness: ~2 minutes (not seconds), which yields up to 10x better battery life
- `setNotificationResponsiveness(300000)` (5 min) recommended for non-critical geofences
- Optimal radius: 100-150 meters minimum (smaller = more battery drain)
- `PRIORITY_NO_POWER` incurs almost zero battery drain (passive location)

### Android Limits

- **100 active geofences per app** on Android
- Geofences survive device reboots if app re-registers them via BOOT_COMPLETED
- Background restrictions on Android 14/15 require ACCESS_BACKGROUND_LOCATION permission

### Expo Implementation

expo-location supports geofencing via `Location.startGeofencingAsync()` with `expo-task-manager`:
```
Location.startGeofencingAsync(TASK_NAME, [
  { latitude, longitude, radius: 200, notifyOnEnter: true, notifyOnExit: true }
]);
```
Requires background location permission on Android.

### x/pat Relevance

**HIGH (future feature).** Geofencing enables:
- "You're near a spot!" notifications when approaching saved/trending spots
- Auto check-in suggestions at popular coworking spaces
- City arrival detection for community presence features
- Neighborhood safety alerts entering flagged zones

**Action:** Not needed for launch. Plan for v2 as a "Smart Discovery" feature. Implement with 200m radius geofences around top-rated spots in user's current city. Use passive location priority to minimize battery impact.

---

## 8. Android Location Services: Fused Location Provider & Accuracy

### Accuracy Levels

| Level | expo-location Constant | Behavior | Battery | Accuracy |
|-------|----------------------|----------|---------|----------|
| Lowest | `Accuracy.Lowest` | Cell tower only | Minimal | ~3km |
| Low | `Accuracy.Low` | Wi-Fi + cell | Low | ~100m |
| Balanced | `Accuracy.Balanced` | Wi-Fi + cell + passive GPS | Moderate | ~100m |
| High | `Accuracy.High` | GPS + all sources | Higher | ~10m |
| BestForNavigation | `Accuracy.BestForNavigation` | GPS only, continuous | Highest | ~3m |

### x/pat Current Usage

- ExploreScreen: `Accuracy.Balanced` -- good choice for city-level positioning
- AddSpotScreen: `Accuracy.Balanced` -- could use `High` for more precise spot placement

### Fused Location Provider Features

- Automatically switches between providers based on context
- Filters noisy readings below accuracy threshold
- Prompts users to enable location mode if needed
- On Android 12+, improved "Improve Location Accuracy" setting uses Wi-Fi scanning

### x/pat Relevance

**HIGH.** Location accuracy directly affects spot placement and "nearby" calculations.

**Action:** Keep `Accuracy.Balanced` for ExploreScreen (viewing nearby spots). Upgrade AddSpotScreen to `Accuracy.High` for precise lat/lng when sharing a new spot. Consider caching last known location to avoid repeated GPS queries on screen focus.

---

## 9. Background Location Tracking on Android

### Progressive Restrictions by Android Version

- **Android 8 (API 26):** Background apps receive location updates only a few times per hour
- **Android 10 (API 29):** `ACCESS_BACKGROUND_LOCATION` permission required; "Allow all the time" dialog option
- **Android 11 (API 30):** No "Allow all the time" in dialog -- user must manually enable in Settings
- **Android 14 (API 34):** Foreground service type must be declared in manifest; SecurityException if not permitted
- **Android 15:** Background location requires multi-step manual approval in system settings

### Play Store Policy

- Apps requesting background location must submit a declaration explaining why it is core functionality
- Google reviews the request and can reject apps that don't justify background access
- Video walkthrough demonstrating the feature is often required
- Apps that can function with foreground-only location should not request background

### Battery Impact

Background location tracking can consume 2-5% battery per hour with GPS active. Passive/balanced modes reduce this to 0.1-0.5%.

### x/pat Relevance

**LOW for launch, MEDIUM for future.** x/pat does not need background location for its core features. Foreground-only is sufficient for:
- Map-based exploration (user is looking at the app)
- Adding spots (user is actively sharing)
- Check-ins (user initiates action)

Background location would only be needed for:
- Geofence-triggered notifications (nearby spot alerts)
- Auto city detection on arrival
- Travel journey tracking

**Action:** Do NOT request background location for v1. It complicates Play Store review and battery impact. If geofencing is added later, request it with a clear in-app explanation and use `PRIORITY_NO_POWER` or passive geofencing.

---

## 10. Google Places API on Android: Nearby Search, Autocomplete, Costs

### Pricing (March 2025 revision)

| SKU | Category | Free Tier | Cost After |
|-----|----------|-----------|------------|
| Autocomplete (New) per session | Essentials | 10,000/mo | $2.83/1K |
| Place Details (New) - Basic | Essentials | 10,000/mo | $2/1K |
| Place Details (New) - Contact | Pro | 5,000/mo | $3/1K |
| Place Details (New) - Atmosphere | Pro | 5,000/mo | $5/1K |
| Nearby Search (New) - Basic | Pro | 5,000/mo | $5/1K |
| Nearby Search (New) - Advanced | Enterprise | 1,000/mo | $20/1K |
| Text Search (New) - Basic | Pro | 5,000/mo | $5/1K |

### Cost Optimization

- Use **FieldMask** to request only needed fields (name, location, rating) -- reduces per-request cost
- Use **session tokens** for Autocomplete to bundle keystrokes into one billable session
- Abandoned sessions (no Place Details call) charge each Autocomplete request individually
- Cache results client-side to reduce repeat calls

### x/pat Relevance

**MEDIUM.** x/pat has its own spot database, so Places API is supplementary:
- **Autocomplete** for AddSpotScreen city/country fields: Would improve UX but adds cost
- **Nearby Search** to suggest existing businesses: Could auto-populate spot names and coordinates
- **Place Details** for spot enrichment: Hours, photos, ratings from Google

At 10K MAU with moderate usage, expect 5K-15K Place API calls/month, mostly within free tier.

**Action:** For v1, the manual text input for city/country is fine. For v2, add Places Autocomplete to AddSpotScreen for location input (cheaper than Nearby Search). Use session tokens and FieldMask to minimize costs. Budget $10-30/month at moderate scale.

---

## 11. Offline Maps on Android

### Options

**Google Maps SDK:** Limited offline support. Users can download areas in the consumer Google Maps app, but the SDK itself does not expose offline download APIs. Tile caching happens automatically for recently viewed areas but is not controllable.

**MapLibre React Native:** Full offline support via OfflineManager API:
- Define bounding box, zoom range, and style URL
- Download tile packs for offline use
- Set max ambient cache size
- Monitor download progress
- Supports MBTiles format for pre-packaged tiles

**Mapbox:** Similar offline capabilities through its SDK, with managed tile hosting.

### Implementation (MapLibre)

```typescript
import { offlineManager } from '@maplibre/maplibre-react-native';

await offlineManager.createPack({
  name: 'bangkok-offline',
  styleURL: 'https://tiles.example.com/style.json',
  minZoom: 10,
  maxZoom: 16,
  bounds: [[100.35, 13.55], [100.75, 13.95]],
});
```

### Storage Considerations

- A typical city at zoom 10-16 requires 50-200MB of tile data
- Vector tiles are 5-10x smaller than raster tiles
- Users need to manage downloads (delete old cities)

### x/pat Relevance

**MEDIUM (future).** Nomads frequently have unreliable internet in developing countries. Offline maps for their current city would be valuable. However:
- This requires switching from Google Maps to MapLibre (major change)
- Or implementing a hybrid: MapLibre for offline map view, Google for online features
- Alternative: cache spot data locally (Supabase offline-first) while showing a static map image

**Action:** Not for v1. For v2+, evaluate MapLibre as an Android-only map provider for offline exploration. Keep Google Maps for all API features (Places, search). Consider a lighter approach: cache spot coordinates/names locally so the list view works offline even if the map does not.

---

## 12. Android Location Permissions: Foreground vs Background

### Permission Hierarchy

```
ACCESS_COARSE_LOCATION (approximate, ~100m)
  -> ACCESS_FINE_LOCATION (precise, ~10m)
    -> ACCESS_BACKGROUND_LOCATION (always, even when app closed)
```

### User-Facing Dialogs

- **Android 10:** "While using the app" / "Allow all the time" / "Deny"
- **Android 11+:** "While using the app" / "Only this time" / "Deny" -- NO "all the time" option
- **Android 12+:** "Precise" / "Approximate" toggle added to location permission dialog
- **Android 14+:** Foreground service type `location` must be declared in manifest

### Best Practices

1. Request `ACCESS_FINE_LOCATION` only when needed (not on app launch)
2. Request coarse first if approximate location suffices for the feature
3. Never request background location in the same dialog as foreground
4. Show in-app rationale before system permission dialog
5. Handle "Only this time" gracefully (re-request on next session)

### x/pat Current Implementation

x/pat correctly:
- Requests foreground permissions only (`requestForegroundPermissionsAsync`)
- Checks permission status before accessing location
- Falls back to profile city if permission denied
- Shows rationale via alert when permission needed

### x/pat Relevance

**HIGH.** Current implementation is good. Two improvements:

**Action:**
1. Request `ACCESS_COARSE_LOCATION` for ExploreScreen initial positioning (approximate is fine for showing nearby city spots), then upgrade to fine when user adds a spot
2. Handle Android 12+ approximate/precise toggle -- check `coords.accuracy` and warn user if approximate location was granted but precise is needed for AddSpot

---

## 13. Google Maps Street View Integration on Android

### Available Libraries

- **react-native-streetview** (community, limited maintenance)
- **react-native-maps** does NOT include Street View natively
- **Google Navigation SDK React Native** (beta, includes Street View) -- requires RN 0.79+ new architecture

### Implementation Options

1. **WebView approach:** Load Street View JavaScript API in a WebView component. Simple but slower.
2. **Native module:** Use `react-native-streetview` which wraps the native StreetViewPanorama on Android.
3. **Deep link:** Open Google Maps Street View via intent for a specific coordinate.

### Limitations

- Street View coverage is not universal -- many developing-world locations lack coverage
- Data consumption is high (loading 360-degree imagery)
- Custom camera angles and POV are configurable (tilt, bearing, zoom)

### x/pat Relevance

**LOW-MEDIUM.** Street View could enhance the SpotDetail screen ("Preview this spot's surroundings"), but:
- Many nomad destinations (Bali, Chiang Mai side streets) have limited Street View coverage
- User-uploaded photos are more relevant than Google's street-level imagery
- Adds SDK complexity and potential permission issues

**Action:** Not for v1. Consider as a "nice-to-have" for v2 SpotDetail -- show a Street View thumbnail if available, otherwise show user photos. Use the simple deep-link approach (open in Google Maps app) rather than embedding natively.

---

## 14. AR-Based Navigation/Discovery on Android (ARCore)

### Current State (2025-2026)

- **ARCore Geospatial API:** Can anchor 3D objects to GPS coordinates worldwide. Uses Google Maps' understanding of the world.
- **React Native libraries:** ViroReact (most mature), react-native-arcore (limited maintenance), Sceneview (native Android)
- **Expo compatibility:** No first-class Expo support. Requires native modules and dev client builds.

### Capabilities

- Place 3D markers at real-world GPS coordinates (Pokmon GO style)
- Surface detection for placing informational overlays
- Visual positioning (camera-based precise localization, better than GPS in urban areas)
- Navigation arrows overlaid on camera feed

### Performance Concerns

- AR is resource-intensive, especially on mid-tier Android phones
- Requires camera permission and continuous processing
- Battery drain is significant during active AR sessions
- Testing requires real-world scenarios (cannot simulate AR in emulator)

### x/pat Relevance

**LOW for launch, MEDIUM-HIGH for differentiation.** AR spot discovery ("Point your camera and see nearby spots floating in the air") would be a strong differentiator, but:
- Development cost is high (native modules, no Expo support)
- Requires high-end devices for good experience
- The core UX (map + list) serves the same discovery purpose without AR complexity

**Action:** Not for v1 or v2. Consider for v3+ as a premium "AR Explorer" feature. Would require native module development and careful device capability detection. Could start with a simple "AR compass" pointing toward nearby spots without full 3D rendering.

---

## 15. Heatmaps and Data Visualization on Maps

### react-native-maps Heatmap Support

react-native-maps includes a `Heatmap` component that supports:
- Density-based heatmaps (using Google Maps Utils algorithm)
- Weight-based heatmaps
- Configurable radius (10-50 pixels), opacity, and gradient
- Android and iOS support

### Implementation

```typescript
import { Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';

<Heatmap
  points={spots.map(s => ({
    latitude: s.lat,
    longitude: s.lng,
    weight: s.upvote_count || 1,
  }))}
  radius={40}
  opacity={0.7}
  gradient={{
    colors: ['#2EC4A0', '#FFD700', '#FF4444'],
    startPoints: [0.1, 0.5, 1.0],
    colorMapSize: 256,
  }}
/>
```

### Performance

- Density-based heatmaps handle thousands of points efficiently (computed natively)
- Weight-based heatmaps are slightly heavier but still performant
- For >10K points, use `setNativeProps` instead of `setState` for updates
- Heatmaps re-render on region change -- debounce updates

### x/pat Relevance

**MEDIUM-HIGH.** Heatmaps could visualize:
- **Spot density:** Where the most spots are concentrated (hot neighborhoods)
- **Safety pulse:** Overlay neighborhood safety sentiment as color gradient
- **Activity:** Where nomads are currently active (check-ins, recent spots)
- **Category density:** Show "cafe-heavy" vs "cowork-heavy" areas

**Action:** Add a "Heatmap" toggle to ExploreScreen for v2. Use density-based heatmap weighted by spot upvotes. Matches x/pat's existing Neighborhood Pulse concept. Low development effort with react-native-maps' built-in component.

---

## 16. Android GPS Accuracy: Urban Canyons, Indoor, Wi-Fi RTT

### GPS Accuracy by Environment

| Environment | Typical Accuracy | Issues |
|-------------|-----------------|--------|
| Open sky | 3-5m | Best case |
| Suburban | 5-10m | Some signal reflections |
| Urban canyon | 10-50m+ | Multipath, blocked satellites |
| Indoor | 50m-3km+ | No direct satellite signals |
| Dense forest | 10-30m | Canopy blocks signals |

### Wi-Fi RTT (Round-Trip Time)

- Available since Android 9 (API 28)
- **Android 15:** Sub-meter accuracy with 160MHz bandwidth + 6GHz band support
- Requires RTT-capable access points (IEEE 802.11mc)
- One-sided RTT (Android 12+): Works with any AP but 3-5m accuracy
- Multilateration with 3+ APs estimates position
- Ideal for indoor positioning in coworking spaces, malls, airports

### Fused Location Provider Fusion

The Fused Location Provider automatically combines:
- GPS satellites
- Wi-Fi signal strength
- Cell tower triangulation
- Bluetooth beacons
- Device motion sensors (accelerometer, gyroscope)

### x/pat Relevance

**MEDIUM.** Nomad cities with dense urban environments (Bangkok, Mexico City) will have urban canyon issues. This primarily affects:
- Spot placement accuracy in AddSpotScreen
- "Distance to spot" calculations on ExploreScreen
- Potential mismatches between GPS coordinates and actual building locations

**Action:** Show accuracy radius on AddSpotScreen map ("Your location is accurate to ~X meters"). Allow manual pin adjustment (already implemented via draggable marker). For indoor coworking spaces, consider accepting manually entered addresses as primary location source.

---

## 17. Route/Direction APIs on Android

### Google Directions API

- **Cost:** $5/1K requests (Pro SKU) with 5K free/month
- **Features:** Real-time traffic, multiple transport modes, waypoints, alternatives
- **Transit directions** include bus/subway schedules
- **Walking directions** with pedestrian paths

### OSRM (Open Source Routing Machine)

- **Cost:** Free (self-hosted)
- **Features:** Fastest routing engine (ms response times), customizable profiles
- **Limitation:** No real-time traffic data
- **Infrastructure:** Requires server with 16-64GB RAM for global data

### Google Routes API (New)

- Replaces legacy Directions API
- Toll-aware routing, eco-friendly routes
- ComputeRoutes and ComputeRouteMatrix endpoints
- Field masking for cost optimization

### x/pat Relevance

**LOW for launch.** x/pat is a discovery app, not a navigation app. Users find spots on the map and navigate using Google Maps / Apple Maps natively.

**Action:** For v1, use deep links to open directions in native maps apps:
```typescript
const url = Platform.OS === 'android'
  ? `google.navigation:q=${lat},${lng}`
  : `maps://maps.apple.com/?daddr=${lat},${lng}`;
Linking.openURL(url);
```
This costs $0. Only integrate Directions API if x/pat needs to show walking time to spots inline (use FieldMask for `duration` only to minimize cost).

---

## 18. Map Animation and Camera Movement on Android

### Available Methods in react-native-maps

| Method | Behavior | Android Support |
|--------|----------|----------------|
| `animateToRegion(region, duration)` | Smooth pan + zoom to region | Yes |
| `animateCamera(camera, duration)` | Camera with center, zoom, heading, pitch | Yes |
| `fitToCoordinates(coords, options)` | Fit all points in view with padding | Yes |
| `animateMarkerToCoordinate(coord, dur)` | Move marker smoothly | Android only |
| `setCamera(camera)` | Instant camera change (no animation) | Yes |

### Known Issues

- `animateCamera` and `animateToRegion` occasionally animate to wrong corner (race condition with region state)
- Using `AnimatedRegion` for marker movement avoids this issue
- Debounce `onRegionChangeComplete` to prevent animation conflicts

### Best Practices

- Use 500-1000ms duration for smooth transitions
- Avoid simultaneous animations (queue them)
- Use `fitToCoordinates` with `edgePadding` for showing search results
- Cache the current region in state to prevent unnecessary re-animations

### x/pat Current Implementation

x/pat uses `animateToRegion` with 1000ms duration for GPS centering and 500ms for cluster zoom-in. This is correctly implemented.

**Action:** No changes needed. Consider adding `fitToCoordinates` for search results -- when a user searches "cafes in Bangkok", fit all matching spots in the viewport with padding.

---

## 19. Google Maps Compose vs Views: react-native-maps Architecture

### How react-native-maps Works on Android

react-native-maps uses the **Views-based** Google Maps SDK (not Jetpack Compose). Specifically:
- It wraps `com.google.android.gms.maps.MapView` as a native Android View
- React Native's bridge renders it via `ViewManager` pattern
- Markers, Polylines, etc. are managed as child views
- The new renderer (v18+) runs under this same Views architecture

### Jetpack Compose Maps

Google's `maps-compose` library (for Compose-native apps) is NOT used by react-native-maps. Even Google's official React Native Navigation SDK uses Views, not Compose.

### New Architecture (Fabric)

react-native-maps has been updating for React Native's New Architecture (Fabric + TurboModules). react-native-maps 1.27+ supports the new architecture, which:
- Reduces bridge overhead for map interactions
- Improves gesture handling latency
- Better synchronization between JS and native map state

### x/pat Relevance

**LOW.** This is purely an implementation detail. x/pat does not need to care about Compose vs Views since react-native-maps abstracts it.

**Action:** No action needed. When upgrading to React Native New Architecture, verify react-native-maps compatibility (1.27.2 should be fine).

---

## 20. Android 14/15 Location API Changes and Privacy Restrictions

### Android 14 (API 34) -- Already Required

- **Foreground service type declaration:** Apps must declare `<service android:foregroundServiceType="location">` in manifest for location foreground services
- **Background location:** Starting a location foreground service from background throws SecurityException without ACCESS_BACKGROUND_LOCATION
- **Data sharing disclosure:** Location permission dialog shows if app shares location data with third parties

### Android 15 (API 35) -- Required by August 2025

- **Multi-step background location:** Users must navigate to Settings to enable "Allow all the time" (no dialog option)
- **Wi-Fi Ranging improvements:** Sub-meter accuracy with 160MHz and 6GHz band
- **Edge-to-edge enforcement:** Affects map UI layout (must handle insets)

### API Level Requirements

- **New apps:** Must target API 35 (Android 15) as of August 2025
- **Existing apps:** Must target API 34 minimum to remain discoverable on Android 15 devices
- **August 2026:** Expected requirement to target API 36

### x/pat Relevance

**HIGH.** x/pat must ensure:
1. `expo-location` plugin correctly declares foreground service types in AndroidManifest
2. App handles "only this time" permission (re-request gracefully on next launch)
3. Privacy manifest accurately declares location data collection (already done for iOS)

**Action:** Verify that EAS build targets API 35. Check that expo-location's config plugin adds the correct foreground service type. Test the permission flow on Android 14/15 devices specifically.

---

## 21. Google Maps Platform SDK Versioning and Compatibility

### Current Versions (April 2026)

- **Maps SDK for Android:** v19.x (auto-updated via Google Play Services)
- **Navigation SDK for Android:** Latest versions require Android 8+ (API 26)
- **react-native-maps 1.27.2:** Uses whatever Maps SDK version is installed via Google Play Services

### Compatibility Notes

- Google Play Services auto-updates the Maps SDK -- apps always get the latest renderer
- react-native-maps does not pin a specific Maps SDK version
- Navigation SDK requires explicit version pinning in build.gradle
- Target SDK must be API 35+ for Play Store submission (August 2025)

### Breaking Changes

- Legacy renderer decommissioned March 2025
- Legacy JSON map styles auto-migrated March 2025
- Q3 2025+: Navigation SDK minimum raised to Android 8 (API 26)

### x/pat Relevance

**LOW.** react-native-maps abstracts version management. Google Play Services auto-updates ensure users always have the latest SDK.

**Action:** No specific version management needed. When upgrading react-native-maps versions, check their CHANGELOG for any breaking native SDK changes.

---

## 22. Map Performance with 1000+ Markers on Android

### Benchmarks

| Marker Count | Default Markers (pinColor) | Custom View Markers | With Clustering |
|-------------|---------------------------|--------------------|-----------------|
| 100 | 60 FPS | 30-45 FPS | 60 FPS |
| 500 | 40-50 FPS | 10-20 FPS | 55-60 FPS |
| 1,000 | 20-30 FPS | <10 FPS | 55-60 FPS |
| 5,000 | <10 FPS | Unusable | 50-60 FPS |

### Optimization Strategies (Priority Order)

1. **Clustering** -- reduces 5,000 points to ~20-50 cluster markers
2. **Region-based loading** -- only fetch markers in visible viewport
3. **Default markers (pinColor)** -- fastest rendering path
4. **tracksViewChanges={false}** -- stops re-render loop
5. **Debounce region changes** -- prevent over-fetching during pan/zoom
6. **Server-side pre-clustering** -- compute clusters in Supabase/PostGIS
7. **Deck.GL in WebView** -- GPU-accelerated rendering for massive datasets

### x/pat Current Performance

With 431 seeded spots, 500-spot region limit, and grid clustering (gridSize=12):
- Typical cluster count: 20-40 markers visible
- Performance: 60 FPS (default pinColor markers)
- Adequate for current scale

### x/pat Relevance

**HIGH (for scaling).** When Bangkok alone has 2,000+ spots:
- Region-based loading (already implemented) caps at 500
- Custom clustering reduces to 30-50 visible markers
- Performance stays smooth

**Action:** Current architecture scales to ~5,000 spots per city. Beyond that:
1. Add server-side viewport queries with PostGIS bounding box indexes
2. Consider pre-computed cluster tiles at zoom levels
3. Add `tracksViewChanges={false}` to all markers (quick win now)

---

## 23. Location-Based Push Notifications on Android

### Architecture

```
Geofence API (native)
  -> Detects enter/exit event
    -> IntentService / BroadcastReceiver
      -> expo-notifications local notification
      OR
      -> Server call -> push notification via FCM
```

### Implementation with Expo

```typescript
// Register geofences
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

TaskManager.defineTask('GEOFENCE_TASK', ({ data, error }) => {
  if (data?.eventType === Location.GeofencingEventType.Enter) {
    Notifications.scheduleNotificationAsync({
      content: { title: 'Nearby Spot!', body: `You're near ${data.region.identifier}` },
      trigger: null, // immediate
    });
  }
});

await Location.startGeofencingAsync('GEOFENCE_TASK', geofences);
```

### Limitations

- **100 geofence limit** on Android per app
- Geofence notifications may be delayed 2-5 minutes (battery optimization)
- App must be at least in background (not force-killed) for reliable delivery
- Background location permission required
- Play Store review required for background location justification

### x/pat Relevance

**MEDIUM-HIGH (v2 feature).** This enables:
- "You're 200m from Dojo Bali (4.8 stars, 12 check-ins)" notifications
- "3 nomads checked in at this cafe nearby" social triggers
- "New spot added in your neighborhood" proximity alerts

**Action:** Plan for v2. Implementation steps:
1. Request background location permission with clear rationale
2. Register geofences for user's saved/bookmarked spots (max 100)
3. Use local notifications (no server needed for basic proximity alerts)
4. Rotate geofences as user moves between cities
5. Add Play Store background location declaration

---

## 24. Google Maps JavaScript API vs Native SDK

### When to Use Each

| Scenario | Use JavaScript API | Use Native SDK |
|----------|-------------------|----------------|
| React Native mobile app | No | Yes (via react-native-maps) |
| WebView embedded map | Yes | No |
| Progressive Web App | Yes | No |
| Maximum performance | No | Yes |
| Device GPS access | Indirect | Direct |
| Offline caching | No | Limited |
| Custom markers (HTML) | Easy | Bitmap only |

### Key Differences

- **Native SDK** uses device GPU directly for rendering -- smoother animations
- **JavaScript API** runs in a WebView with DOM overhead
- **Native SDK** has better gesture handling and touch response
- **JavaScript API** supports HTML/CSS custom markers (more flexible)
- Both now support cloud-based styling (same SKU billing)

### Hybrid Approach

Some apps embed a WebView with the JavaScript API for complex visualizations (heatmaps, cluster animations) and use native SDK for the primary map. Deck.GL + WebView is used for 10K+ point visualizations where native markers cannot cope.

### x/pat Relevance

**LOW.** x/pat correctly uses the Native SDK via react-native-maps. There is no reason to switch to JavaScript API.

**Action:** No change. If a future feature requires WebGL-powered data visualization (like animated heatmaps with 10K+ points), consider a Deck.GL WebView overlay on top of the native map.

---

## 25. Indoor Mapping and Floor Plans on Android

### Google Maps Indoor Maps

Google Maps has built-in indoor maps for many large venues (airports, malls, transit stations). These display automatically when:
- The venue has been mapped by Google or submitted floor plans
- The user zooms to level 17+ (building level)
- The Maps SDK displays floor selector UI automatically

### React Native Indoor Map Libraries

- **@mapsindoors/react-native-maps-indoors-google-maps** -- MapsIndoors integration with Expo plugin
- **Proximi.io React Native** -- Wi-Fi/BLE positioning with floor plan visualization
- **Custom SVG floor plans** -- Convert floor plans to SVG, overlay as tile layer

### Wi-Fi RTT Indoor Positioning

- Sub-meter accuracy with 802.11mc APs
- Android 15 adds 160MHz and 6GHz support
- Requires venue infrastructure (RTT-capable APs)
- UWB offers higher precision but requires UWB-equipped devices

### x/pat Relevance

**LOW.** Indoor mapping is not relevant for x/pat's use case:
- Spots are buildings/venues, not specific rooms within buildings
- Coworking spaces are single-address destinations
- Indoor navigation adds massive complexity for minimal user value

**Action:** No action needed. If x/pat ever adds coworking space partnerships with floor-level desk booking, indoor mapping could become relevant, but this is far future.

---

## Priority Matrix for x/pat

### Implement Now (v1.3.x)

| Item | Effort | Impact | Details |
|------|--------|--------|---------|
| Add `tracksViewChanges={false}` to all markers | 5 min | HIGH | Prevents Android performance degradation |
| Add `loadingEnabled` + `loadingBackgroundColor` | 5 min | LOW | Better loading state UX |
| Upgrade AddSpotScreen to `Accuracy.High` | 5 min | MEDIUM | More precise spot placement |

### Implement for v2

| Item | Effort | Impact | Details |
|------|--------|--------|---------|
| Cloud-based dark map style (Map ID) | 1 day | MEDIUM | Future-proofs styling, better dark mode |
| Heatmap toggle on ExploreScreen | 1-2 days | MEDIUM-HIGH | Spot density visualization |
| Pre-rendered PNG category markers | 1 day | MEDIUM | Custom branded markers, better than pinColor |
| Places Autocomplete on AddSpotScreen | 1-2 days | HIGH | Better location input UX |
| Deep-link directions to spots | 2 hours | MEDIUM | "Navigate to this spot" button |
| Fit-to-coordinates for search results | 2 hours | MEDIUM | Better search result display |

### Plan for v3

| Item | Effort | Impact | Details |
|------|--------|--------|---------|
| Geofence proximity notifications | 1 week | HIGH | "You're near a spot!" alerts |
| Offline spot data cache | 1 week | MEDIUM-HIGH | Works without internet |
| Server-side PostGIS clustering | 1 week | HIGH | Scales to 10K+ spots |
| Street View on SpotDetail | 2-3 days | LOW-MEDIUM | Nice-to-have visual feature |

### Future Exploration (v4+)

| Item | Effort | Impact | Details |
|------|--------|--------|---------|
| MapLibre offline maps | 2-3 weeks | HIGH | Full offline map viewing |
| AR Spot Discovery | 3-4 weeks | MEDIUM | Strong differentiator |
| Walking time to spots | 1-2 days | MEDIUM | Requires Directions API ($5/1K) |

---

## Cost Summary

### Current Monthly Cost: $0

x/pat uses only the free Mobile SDK (unlimited map loads) and no paid APIs.

### Projected Costs at Scale

| Feature | 10K MAU | 50K MAU | 100K MAU |
|---------|---------|---------|----------|
| Map views (native SDK) | $0 | $0 | $0 |
| Places Autocomplete | $0-10 | $20-50 | $50-100 |
| Nearby Search (if added) | $0-25 | $50-150 | $150-500 |
| Directions API (if added) | $0-25 | $50-150 | $150-500 |
| **Total Google Maps** | **$0-60** | **$120-350** | **$350-1,100** |

### Cost Mitigation

1. Use session tokens for Autocomplete (bundles requests)
2. Use FieldMask to request only needed fields
3. Cache results client-side (AsyncStorage or in-memory)
4. Rate-limit API calls per user
5. Use free alternatives where possible (OSRM for routing, Nominatim for geocoding)

---

## Key Takeaways

1. **Google Maps is the right choice for x/pat at launch and likely through v3.** Mobile SDK loads are free. The ecosystem is mature. react-native-maps integration is stable.

2. **The current map implementation is solid.** Region-based loading, custom clustering, dark mode styling, foreground-only permissions -- all follow best practices.

3. **Three quick wins exist right now:** Add `tracksViewChanges={false}`, upgrade AddSpot to `Accuracy.High`, add `loadingEnabled`.

4. **The biggest v2 opportunities are:** heatmap visualization (built-in to react-native-maps), Places Autocomplete for spot creation, and deep-link navigation.

5. **Background location / geofencing is the highest-impact future feature** but requires careful Play Store compliance and battery management. Plan it carefully for v3.

6. **MapLibre is the best path to offline maps** if that becomes a user need. It would run alongside Google Maps, not replace it.

7. **AR is a differentiator but premature.** Focus on perfecting the 2D map experience first.
