# Android Networking, Offline Capabilities & Data Management Research

**Date**: April 2026
**Context**: x/pat social travel app for digital nomads — users frequently on poor WiFi, changing networks, VPNs, across 100+ countries
**Current Stack**: Expo 55 / React Native 0.83 / Supabase / AsyncStorage / No offline layer

---

## Table of Contents

1. [Network State Detection (NetInfo)](#1-network-state-detection-netinfo)
2. [Offline-First Architecture](#2-offline-first-architecture)
3. [Android Background Sync](#3-android-background-sync)
4. [Supabase Offline Support](#4-supabase-offline-support)
5. [TanStack Query Offline Mode](#5-tanstack-query-offline-mode)
6. [Android Data Saver Mode](#6-android-data-saver-mode)
7. [WebSocket Reconnection Strategies](#7-websocket-reconnection-strategies)
8. [Android Doze Mode & App Standby](#8-android-doze-mode--app-standby)
9. [GraphQL vs REST on Android](#9-graphql-vs-rest-on-android)
10. [Android IPv6 Compatibility](#10-android-ipv6-compatibility)
11. [VPN Detection & Behavior](#11-vpn-detection--behavior)
12. [Content Delivery Optimization](#12-content-delivery-optimization)
13. [Android Download Manager](#13-android-download-manager)
14. [Pagination Strategies](#14-pagination-strategies)
15. [Data Usage Tracking](#15-data-usage-tracking)
16. [MQTT vs WebSocket vs SSE](#16-mqtt-vs-websocket-vs-sse)
17. [Network Security Config](#17-network-security-config)
18. [Offline Map Tile Caching](#18-offline-map-tile-caching)
19. [Bluetooth/NFC Proximity](#19-bluetoothnfc-proximity)
20. [Wi-Fi Direct Local Sharing](#20-wi-fi-direct-local-sharing)
21. [API Response Compression](#21-api-response-compression)
22. [DNS-over-HTTPS](#22-dns-over-https)
23. [Networking Libraries Comparison](#23-networking-libraries-comparison)
24. [HTTP/3 & QUIC Support](#24-http3--quic-support)
25. [Local Database Options](#25-local-database-options)

---

## 1. Network State Detection (NetInfo)

### How It Works
`@react-native-community/netinfo` provides real-time network state information on Android. It detects connection type (WiFi, cellular, bluetooth, ethernet, VPN), whether the connection is actually reachable (not just connected), and whether the network is **metered** — critical for nomads on expensive data plans.

### Key Capabilities
- **Connection type detection**: WiFi, cellular (2G/3G/4G/5G), VPN, none
- **Metered network detection**: Flags when user is on an expensive/limited connection
- **Reachability check**: Distinguishes "connected to WiFi" from "WiFi actually has internet" (captive portals are common in hostels/cafes)
- **Event subscription**: Real-time callbacks when network state changes

### Android Permissions Required
```
android.permission.INTERNET
android.permission.ACCESS_NETWORK_STATE
android.permission.ACCESS_WIFI_STATE
```

### Implementation Approach
```typescript
import NetInfo from '@react-native-community/netinfo';

// Subscribe to state changes
const unsubscribe = NetInfo.addEventListener(state => {
  const isConnected = state.isConnected && state.isInternetReachable;
  const isMetered = state.details?.isConnectionExpensive;
  const connectionType = state.type; // wifi, cellular, vpn, none

  // Adapt app behavior based on network quality
  if (isMetered) {
    // Reduce image quality, defer non-critical syncs
  }
  if (!isConnected) {
    // Switch to offline mode
  }
});
```

### Nomad Relevance: CRITICAL
Nomads constantly switch between hostel WiFi, cafe WiFi, mobile data, and VPN. NetInfo is the foundation of every other offline/networking strategy. The metered network detection is particularly valuable — a nomad in Bali on a $5/GB prepaid SIM needs different behavior than one on hotel WiFi in Lisbon.

### x/pat Recommendation
**Implement immediately.** Create a `useNetworkStatus` hook that wraps NetInfo and provides context to the entire app. Use this to drive:
- Image quality decisions (load thumbnails on metered, full on WiFi)
- Sync frequency (batch on metered, real-time on WiFi)
- Presence heartbeat interval (slower on metered)
- UI indicators ("Offline mode" banner)

---

## 2. Offline-First Architecture

### Core Principle
Treat local storage as the source of truth. The network is an enhancement, not a requirement. The app should always work, and sync when connectivity allows.

### Architectural Patterns (2025-2026)

**Pattern A: Cache-First with Background Sync**
- Show cached data immediately, fetch updates in background
- Best for: Feed, spots, profiles — data that's useful even if slightly stale
- Simplest to implement, biggest UX impact

**Pattern B: Local-First with Sync Engine**
- All writes go to local database first, sync engine handles replication
- Best for: Chat messages, spot reviews, user-generated content
- Requires conflict resolution strategy
- Libraries: PowerSync, RxDB, WatermelonDB

**Pattern C: Optimistic Updates with Queue**
- Apply changes to UI immediately, queue mutations for when online
- Best for: Likes, follows, check-ins, bookmarks
- Simplest conflict model (last-write-wins)

### Key Libraries (2026)
| Library | Approach | Sync Built-in | Expo Compatible |
|---------|----------|---------------|-----------------|
| PowerSync | SQLite sync engine | Yes (Supabase) | Yes (CNG required) |
| WatermelonDB | Lazy-loading SQLite | Custom needed | Yes |
| RxDB | NoSQL reactive | Plugin-based | Yes |
| TinyBase | State management | Yes (Yjs/SQLite) | Yes |
| MMKV | Fast key-value | No | Yes |

### Nomad Relevance: CRITICAL
This is the single most important architecture decision for x/pat. A nomad in a Cambodian bus with no signal should still be able to browse cached spots, read saved messages, and draft reviews that sync later. Without offline-first, the app is useless for the exact moments nomads need it most.

### x/pat Recommendation
**Phased approach:**
1. **Phase 1 (now)**: Add TanStack Query with MMKV persistence for cache-first reads. Biggest bang for the buck. No schema changes needed.
2. **Phase 2 (v1.5)**: Add PowerSync for chat and user-generated content. Enables true offline writes.
3. **Phase 3 (v2.0)**: Full local-first with conflict resolution for collaborative features (shared itineraries, group chat).

Start with last-write-wins conflict resolution. Only ~5% of apps need anything more sophisticated.

---

## 3. Android Background Sync

### The Landscape (2026)
Android 15 introduced more aggressive battery optimization. The **only** reliable way to run background tasks is through WorkManager (which `expo-background-task` wraps).

### Key Libraries

**expo-background-task** (Recommended for x/pat)
- Wraps WorkManager on Android, BGTaskScheduler on iOS
- Minimum interval: 15 minutes (Android limitation)
- Uses a single worker per app (platform limitation)
- Automatically handles Doze mode
- Replaces the deprecated `expo-background-fetch`

**react-native-background-fetch** (Alternative)
- Most battle-tested option (maintained since 2015)
- Updated for Android 14/15
- More configuration options than expo-background-task

### Implementation Approach
```typescript
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

const SYNC_TASK = 'XPAT_BACKGROUND_SYNC';

TaskManager.defineTask(SYNC_TASK, async () => {
  // 1. Upload pending mutations (new reviews, messages, check-ins)
  // 2. Fetch unread message count
  // 3. Download new spots for current city
  // Keep task lightweight — max 30 seconds
  return BackgroundTask.BackgroundTaskResult.Success;
});

// Register at app startup
await BackgroundTask.registerTaskAsync(SYNC_TASK, {
  minimumInterval: 15 * 60, // 15 min minimum on Android
});
```

### Best Practices
- Keep tasks under 30 seconds
- Use lightweight API endpoints that return only deltas
- Implement exponential backoff for failures
- Store pending jobs in persistent queue (MMKV or SQLite)

### Nomad Relevance: HIGH
Background sync means a nomad can leave the app while exploring a new city, and when they open it again, messages and new spots are already loaded. Critical for chat and notifications.

### x/pat Recommendation
**Implement in v1.5.** Use `expo-background-task` for:
- Syncing unread message counts
- Uploading queued mutations (offline-created content)
- Refreshing spots data for current city
- Pair with PowerSync for the sync logic itself

---

## 4. Supabase Offline Support

### Current State
**Supabase has no native offline support.** This is the biggest gap in x/pat's current architecture. When a nomad goes offline:
- All Supabase queries fail
- Realtime WebSocket drops with no graceful recovery
- Auth tokens expire after failed refresh retries, **logging the user out**
- No queued mutations, no cached reads

### Solutions

**PowerSync (Recommended)**
- Postgres-to-SQLite sync layer purpose-built for Supabase
- Non-invasive: no schema changes required
- Handles conflict resolution (last-write-wins by default)
- Free tier: 1 million synced rows
- React Native SDK available with Expo support (requires CNG, not Expo Go)
- Background sync via `expo-background-task` integration
- Community demo: offline-first group chat app with Supabase backend

**Auth Token Issue Workaround**
Supabase Auth sessions expire when refresh token retries fail offline. Solutions:
- Cache the session in MMKV with longer expiry
- Implement custom token refresh on reconnection
- PowerSync handles auth re-establishment automatically

**Supabase Realtime Issues on Mobile**
Known issues (as of 2026):
- Reconnection after TIMED_OUT loops endlessly on native iOS/Android
- Silent disconnections when JS timers are throttled (app backgrounded)
- Heartbeat timers stop when app is suspended

Mitigations:
- Use `heartbeatCallback` option to monitor connection health
- Implement manual reconnection logic when app returns to foreground
- Set up `AppState` listener to force-reconnect channels

### Nomad Relevance: CRITICAL
This is the #1 reliability issue for x/pat. A nomad losing their session because they walked through a dead zone is unacceptable.

### x/pat Recommendation
**Phase 1 (immediate):** Fix Supabase Realtime reconnection with AppState listener + manual channel re-subscription. Cache auth session in MMKV. Add heartbeat monitoring.
**Phase 2 (v1.5):** Integrate PowerSync for offline reads/writes. Start with spots and chat tables.

---

## 5. TanStack Query Offline Mode

### How It Works
TanStack Query (formerly React Query) provides a complete data fetching/caching layer with first-class offline support. It can persist its cache to disk and serve stale data when offline.

### Key Configuration
```typescript
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// Use MMKV for fast cache persistence
const storage = new MMKV();
const mmkvPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
});

// Wire up NetInfo for online/offline detection
onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',   // Serve cache first, fetch in background
      gcTime: 1000 * 60 * 60 * 24,  // 24h garbage collection
      staleTime: 1000 * 60 * 5,      // 5 min stale time
    },
    mutations: {
      networkMode: 'offlineFirst',    // Queue mutations when offline
    },
  },
});
```

### Benefits
- **Instant UI**: Shows cached data immediately, even offline
- **Automatic retries**: Failed queries retry when back online
- **Mutation queue**: Offline mutations are queued and executed on reconnect
- **Cache persistence**: Survives app restarts via MMKV
- **Minimal migration**: Works with existing Supabase queries

### Nomad Relevance: HIGH
This is the fastest path to a dramatically better offline experience. A nomad opens the app on a bus with no signal — instead of a loading spinner, they see the last-fetched spots, profiles, and feed.

### x/pat Recommendation
**Implement immediately.** This is the highest-impact, lowest-effort improvement available:
1. Install `@tanstack/react-query`, `@tanstack/query-sync-storage-persister`, `react-native-mmkv`
2. Wrap app in `PersistQueryClientProvider`
3. Convert Supabase calls in hooks to `useQuery`/`useMutation`
4. Cached data is served instantly; fresh data loads in background
5. Pair with NetInfo for automatic online/offline management

---

## 6. Android Data Saver Mode

### How It Works
Android 7.0+ (API 24) Data Saver restricts background data usage system-wide. When enabled on a metered network, the system blocks background data and signals apps to use less foreground data.

### Detection Methods
- **NetInfo**: The `isConnectionExpensive` / metered flag captures this
- **Native Android**: `ConnectivityManager.getRestrictBackgroundStatus()` returns RESTRICT_BACKGROUND_STATUS_ENABLED/DISABLED/WHITELISTED
- **BroadcastReceiver**: Listen for `ConnectivityManager.ACTION_RESTRICT_BACKGROUND_CHANGED`

### React Native Implementation
There is no direct React Native API for Data Saver status. However, NetInfo's `isConnectionExpensive` flag covers the most important case. For full Data Saver detection, a thin native module bridge is needed.

### Behavioral Adaptations
When Data Saver / metered is detected:
- Load thumbnail-quality images (150px instead of 600px)
- Disable auto-playing videos/animations
- Batch API calls (combine 5 requests into 1)
- Reduce presence heartbeat from 30s to 120s
- Defer non-critical syncs (analytics, feed pre-fetch)
- Show "Data Saver active" indicator

### Nomad Relevance: HIGH
Many nomads use prepaid SIMs with limited data (1-5 GB). In Southeast Asia and Latin America, data is relatively cheap but bandwidth is slow. Respecting Data Saver shows the app understands its users.

### x/pat Recommendation
**Implement in v1.5.** Use NetInfo's `isConnectionExpensive` as the trigger. Create a `DataSaverContext` that adapts image quality, sync frequency, and network request priority across the app. This can share logic with the `useNetworkStatus` hook.

---

## 7. WebSocket Reconnection Strategies

### The Problem
Supabase Realtime uses WebSocket channels for chat, presence, and real-time updates. On mobile, connections drop constantly due to:
- WiFi to cellular transitions
- Entering buildings/tunnels
- VPN connection changes
- Android Doze mode suspending timers
- Captive portal interruptions

### Current x/pat Issue
The `useCityChat` and `usePresence` hooks subscribe to Supabase Realtime channels but have no reconnection logic. When the WebSocket drops, chat goes silent and presence stops updating.

### Recommended Strategy: Exponential Backoff with Jitter
```typescript
class ReconnectionManager {
  private attempt = 0;
  private maxDelay = 30000; // 30 seconds max
  private baseDelay = 1000; // 1 second start

  getNextDelay(): number {
    const exponential = this.baseDelay * Math.pow(2, this.attempt);
    const jitter = Math.random() * 1000; // Prevent thundering herd
    const delay = Math.min(exponential + jitter, this.maxDelay);
    this.attempt++;
    return delay;
  }

  reset() { this.attempt = 0; }
}
```

### Integration with AppState
```typescript
AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') {
    // App came to foreground — force reconnect all channels
    supabase.realtime.reconnect();
    // Reset heartbeat timers
  }
});
```

### Supabase-Specific: heartbeatCallback
```typescript
const channel = supabase.channel('city-chat', {
  config: {
    heartbeatCallback: (isHealthy) => {
      if (!isHealthy) {
        // Connection silently dropped — force reconnect
        channel.unsubscribe();
        // Re-subscribe with backoff
      }
    }
  }
});
```

### Nomad Relevance: CRITICAL
Chat is a core social feature. A nomad messaging another nomad about a meetup cannot have messages silently fail because the WebSocket dropped while switching from cafe WiFi to cellular.

### x/pat Recommendation
**Implement immediately.** Add reconnection logic to `useCityChat`, `useDirectMessages`, and `usePresence`:
1. AppState listener to force-reconnect on foreground
2. Exponential backoff with jitter
3. Supabase heartbeatCallback monitoring
4. UI indicator when connection is degraded ("Reconnecting...")
5. Queue outgoing messages during disconnection, send on reconnect

---

## 8. Android Doze Mode & App Standby

### Impact on x/pat
When the device screen is off and stationary:
- **Doze Mode**: Network access is deferred. Background tasks pause. Only high-priority FCM messages can wake the app.
- **App Standby**: If the user hasn't opened x/pat recently, Android further restricts background activity.
- **Maintenance windows**: Periodically (increasing intervals: 1min, then 30min, then hours), the system briefly allows pending syncs.

### What Breaks
- Presence heartbeats stop (user appears offline when they're just not actively using the app)
- Background sync tasks are deferred to maintenance windows
- WebSocket connections are closed by the OS
- Real-time chat notifications stop until next maintenance window

### Mitigations
1. **WorkManager** (via expo-background-task): Automatically schedules work during maintenance windows. This is the correct approach.
2. **FCM high-priority messages**: For chat messages, use push notifications instead of relying on WebSocket. FCM high-priority messages bypass Doze.
3. **Do NOT request battery optimization exemption**: Google Play will reject apps that request this without strong justification. x/pat does not qualify.
4. **Foreground service**: Only for active navigation/location tracking. Not appropriate for general sync.

### Android 15 Changes (2025)
Even more aggressive battery optimization. Apps flagged as "battery drainers" get permanently restricted. WorkManager-based approaches are the only safe path.

### Nomad Relevance: HIGH
Nomads frequently leave their phone in a bag while exploring. The app needs to handle graceful degradation during Doze and recover quickly on resume.

### x/pat Recommendation
- **Use push notifications (FCM) for chat messages** — do not rely on WebSocket for delivery when app is backgrounded
- **Reduce presence heartbeat frequency** — 30-second heartbeats are too aggressive. Consider 2-minute intervals with graceful stale thresholds
- **Use expo-background-task for sync** — WorkManager respects Doze and is the only reliable path
- **Fast recovery on resume** — When app comes to foreground, immediately refresh critical data (unread count, presence status)

---

## 9. GraphQL vs REST on Android

### Performance Comparison (2026 Benchmarks)
| Metric | REST | GraphQL |
|--------|------|---------|
| Latency (simple query) | ~50ms | ~65ms |
| Latency (complex/nested) | ~150ms (3 calls) | ~70ms (1 call) |
| Bandwidth (over-fetching) | 30-50% wasted | Minimal |
| Caching | Built-in HTTP caching | Requires client-side cache |
| Mobile battery | Lower (simpler parsing) | Higher (query planning) |

### Key Findings
- GraphQL reduces API calls by up to 60% and bandwidth by 30-50% for complex data
- REST has built-in HTTP caching that works with CDNs, proxies, and browsers
- GraphQL's single endpoint makes traditional HTTP caching nearly impossible
- Most organizations use hybrid approaches in 2026

### Nomad Relevance: MODERATE
The bandwidth savings from GraphQL matter on metered connections. But the complexity cost is significant for a small team.

### x/pat Recommendation
**Stay with REST (Supabase PostgREST).** The reasons:
- Supabase provides PostgREST which already does column-level selection (`.select('id, name, photo')`)
- One-person team cannot maintain a GraphQL schema + resolvers + client codegen
- REST caching is simpler and works with standard CDN infrastructure
- PostgREST's `.select()` already solves over-fetching
- If bandwidth becomes a real issue, Supabase Edge Functions can aggregate multiple queries into one endpoint

---

## 10. Android IPv6 Compatibility

### Current State (2026)
- Over 44% of Google traffic uses IPv6
- Many mobile carriers (T-Mobile, Jio, Reliance) run IPv6-only with 464XLAT for IPv4 compatibility
- Android supports IPv6 via SLAAC since version 4.0
- Android 16 added DHCPv6 Prefix Delegation for tethering

### Known React Native Issue
There is a documented React Native bug where `fetch()` hangs indefinitely on IPv6-only networks on some devices (Happy Eyeballs algorithm issue, GitHub #32730). This primarily affects older React Native versions.

### 464XLAT
Most IPv6-only carriers use 464XLAT translation, which transparently converts IPv4 traffic. Apps don't need to do anything special — the OS handles it.

### Nomad Relevance: MODERATE
Nomads in India, parts of Southeast Asia, and on T-Mobile US may be on IPv6-only networks. If the app's networking stack doesn't handle this correctly, requests will hang.

### x/pat Recommendation
- **Test on IPv6-only network** in Android emulator (configurable in emulator settings)
- **Ensure Supabase endpoints resolve over IPv6** (Supabase Cloud does support this)
- **No code changes needed** unless testing reveals issues — React Native 0.83 should handle this correctly via the new architecture
- **Log network failures** with connection type metadata to detect IPv6-specific issues in production

---

## 11. VPN Detection & Behavior

### Why Nomads Use VPNs
- Access home-country banking apps and streaming services
- Privacy on untrusted public WiFi (cafes, hostels, airports)
- Bypass regional restrictions on communication tools (WhatsApp blocked in some countries)
- Some countries require VPN for basic internet access

### Detection Methods
- **NetInfo**: Reports connection type as 'vpn' when VPN is active
- **react-native-vpn-detect**: Dedicated library for VPN/proxy detection
- **Native Android**: `NetworkCapabilities.hasTransport(TRANSPORT_VPN)`

### Impact on x/pat
- **Latency increase**: VPN adds 20-100ms round-trip depending on server location
- **Geo-location mismatch**: User's IP geolocation differs from physical location. x/pat uses device GPS, so this is mostly irrelevant for spot discovery.
- **WebSocket stability**: Some VPN protocols (especially free VPNs) drop WebSocket connections
- **Certificate pinning conflicts**: Some VPN apps inject certificates that break SSL pinning

### Nomad Relevance: HIGH
Virtually 100% of digital nomads use VPNs at least occasionally. The app must work seamlessly with VPN active.

### x/pat Recommendation
- **Do NOT block or warn about VPN usage** — it would alienate the entire user base
- **Do NOT implement SSL certificate pinning** initially — it breaks for VPN users and adds certificate rotation complexity
- **Increase WebSocket timeout thresholds** when VPN is detected (via NetInfo)
- **Use device GPS for location**, never IP-based geolocation
- **Log VPN status** in error reports for debugging connectivity issues

---

## 12. Content Delivery Optimization

### Current State
x/pat stores images in Supabase Storage, which serves them through Supabase's CDN. No image optimization or responsive sizing is implemented.

### Recommended Strategy

**Image Optimization**
- Supabase Storage supports image transformations: `supabase.storage.from('photos').getPublicUrl('spot.jpg', { transform: { width: 300, quality: 75 } })`
- Serve WebP format (95% Android support) or AVIF (newer devices)
- AVIF delivers 41% smaller files than JPEG, 20-30% smaller than WebP
- Use responsive sizes: thumbnail (150px), card (400px), detail (800px), full (1200px)

**CDN Configuration**
- Supabase Storage CDN handles global distribution
- Set appropriate Cache-Control headers: `public, max-age=31536000, immutable` for user-uploaded content with unique filenames
- Consider Cloudflare in front of Supabase for additional edge caching and image polish

**Client-Side Caching**
- Use `expo-image` (or react-native-fast-image) for disk-level image caching
- Images persist across app restarts
- Implement progressive loading: show blurred placeholder, then load full image

**Compression**
- Compress uploads client-side using `expo-image-manipulator` before sending to Supabase
- Target: 200KB for spot photos, 50KB for avatars
- Serve Brotli-compressed API responses (20-26% better than gzip)

### Nomad Relevance: CRITICAL
A nomad on 3G in Bali needs spots to load fast. Unoptimized 2MB photos per spot card would make the app unusable. Proper CDN + compression + responsive images = the app feels fast even on slow networks.

### x/pat Recommendation
**Implement in phases:**
1. **Now**: Add Supabase image transforms for responsive sizes. Compress uploads with expo-image-manipulator.
2. **v1.5**: Switch to expo-image for built-in disk caching. Add progressive loading.
3. **v2.0**: Consider Cloudflare for image optimization at edge, AVIF support.

---

## 13. Android Download Manager

### How It Works
Android's DownloadManager handles background file downloads at the OS level — they continue even when the app is killed. Useful for large downloads (offline maps, media packs).

### React Native Libraries
- **@kesha-antonov/react-native-background-downloader**: Uses DownloadManager + Foreground Services with pause/resume support. Expo config plugin available.
- **expo-file-system**: Basic download capability, but not background-persistent
- **expo-downloads-manager**: Community wrapper for download management

### Nomad Relevance: LOW (for now)
x/pat doesn't currently have large downloadable content. This becomes relevant if/when offline map packs or city guide downloads are added.

### x/pat Recommendation
**Defer to v2.0+.** Only needed when introducing downloadable content like offline city guides or map packs. When that time comes, use `@kesha-antonov/react-native-background-downloader` with the Expo config plugin.

---

## 14. Pagination Strategies

### Cursor-Based vs Offset

**Offset Pagination** (`LIMIT 20 OFFSET 40`)
- Simple to implement with Supabase: `.range(40, 59)`
- Breaks when data changes: if a new spot is added while paginating, items shift and duplicates/gaps appear
- Performance degrades on large datasets: database must scan all offset rows

**Cursor-Based Pagination** (`WHERE created_at < cursor LIMIT 20`)
- Stable results regardless of new inserts
- Consistent performance on large datasets
- Supabase support: `.lt('created_at', cursor).order('created_at', { ascending: false }).limit(20)`
- Slightly more complex client-side

### React Native Implementation
```typescript
// FlatList with cursor-based infinite scroll
<FlatList
  data={spots}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  removeClippedSubviews={true}  // Android default: true — saves memory
  windowSize={5}                 // Render 5 screens worth of content
  maxToRenderPerBatch={10}
  initialNumToRender={10}
/>
```

### Nomad Relevance: HIGH
The feed and spots list are infinite-scrolling. Poor pagination = duplicate spots, missing content, and wasted bandwidth re-fetching.

### x/pat Recommendation
**Switch to cursor-based pagination for all lists.** Use `created_at` or `id` as cursor. This pairs perfectly with TanStack Query's `useInfiniteQuery`:
```typescript
useInfiniteQuery({
  queryKey: ['spots', city],
  queryFn: ({ pageParam }) => fetchSpots(city, pageParam),
  getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.created_at,
});
```

---

## 15. Data Usage Tracking

### Android Capabilities
- `react-native-android-datausage` module exposes per-app data consumption (Android 4.4+)
- Android's `NetworkStatsManager` provides granular data: per-UID, per-network-type, per-time-period
- Requires `android.permission.READ_PHONE_STATE` and `android.permission.PACKAGE_USAGE_STATS` (settings redirect)

### In-App Data Awareness
Rather than tracking absolute data usage, x/pat can estimate usage:
- Track bytes sent/received per API call via Axios interceptors
- Aggregate and display: "x/pat used ~45 MB this month"
- Break down by category: spots images (80%), chat (10%), API calls (10%)

### Nomad Relevance: MODERATE
Nomads on limited data plans would appreciate knowing how much data x/pat consumes. It builds trust and lets them make informed choices about Data Saver settings.

### x/pat Recommendation
**Defer to v2.0.** The permission requirements are heavy. Instead, focus on reducing data usage first (image optimization, compression, caching). If user feedback requests it, add a lightweight "data usage estimate" in Settings using Axios interceptor byte counting — no special permissions needed.

---

## 16. MQTT vs WebSocket vs SSE

### Comparison for x/pat's Real-Time Needs

| Feature | WebSocket | SSE | MQTT |
|---------|-----------|-----|------|
| Direction | Bidirectional | Server-to-client only | Bidirectional |
| Bandwidth | Moderate | Low | Lowest (2-byte header) |
| Battery impact | Moderate | Low | Lowest |
| Reconnection | Manual | Built-in (browser) | Built-in (QoS) |
| React Native support | Native | Polyfill needed | Via libraries |
| Supabase integration | Native (Realtime) | Not supported | Not supported |

### Key Insights
- MQTT reduces bandwidth by up to 80% vs WebSocket for messaging scenarios
- SSE is ideal for one-way real-time (feed updates, notifications) but lacks bidirectional support
- MQTT's QoS levels allow per-message reliability tuning
- Supabase Realtime is WebSocket-based — switching protocols means leaving Supabase Realtime

### Nomad Relevance: MODERATE
The bandwidth savings of MQTT are significant on metered connections. But the ecosystem cost of leaving Supabase Realtime is high.

### x/pat Recommendation
**Stay with WebSocket (Supabase Realtime) for now.** The integration cost of MQTT is not justified at current scale. Instead, optimize the WebSocket usage:
- Reduce unnecessary channel subscriptions
- Only subscribe to channels for the active screen
- Unsubscribe from city chat when user navigates away
- Use push notifications (FCM) for background delivery instead of maintaining WebSocket
- Revisit MQTT if user count exceeds 50K and bandwidth costs become significant

---

## 17. Network Security Config

### Android Network Security Configuration
Android's `network_security_config.xml` controls HTTPS enforcement and certificate handling:

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

### Certificate Pinning
```xml
<domain-config>
  <domain includeSubdomains="true">diiqponrvrcpwoerenwz.supabase.co</domain>
  <pin-set expiration="2027-01-01">
    <pin digest="SHA-256">base64-encoded-hash</pin>
    <pin digest="SHA-256">backup-pin-hash</pin>
  </pin-set>
</domain-config>
```

### React Native Libraries
- **react-native-ssl-pinning**: Uses OkHttp3 on Android for pinning
- **TrustKit-style pinning**: Can be configured natively without a library

### VPN Conflict Warning
Certificate pinning **breaks** for users whose VPN injects its own CA certificate (common with corporate VPNs and some consumer VPNs). Since nearly all nomads use VPNs, this is a deal-breaker.

### Nomad Relevance: MODERATE
Security matters, but pinning that breaks VPN users is worse than no pinning.

### x/pat Recommendation
- **Enforce HTTPS-only** via network_security_config (block cleartext)
- **Do NOT implement certificate pinning** — it will break for VPN users and adds certificate rotation overhead
- **Do implement** `cleartextTrafficPermitted="false"` to prevent accidental HTTP requests
- **Revisit pinning** only if handling sensitive financial data (affiliate payments), and use dynamic pin updates

---

## 18. Offline Map Tile Caching

### Current x/pat Setup
- iOS: Apple Maps (native dark mode)
- Android: Google Maps via react-native-maps
- No offline tile caching

### Offline Map Options

**Option A: Google Maps Offline (Limited)**
- Google Maps SDK for Android does not expose offline caching API to third-party apps
- Users can download areas in the Google Maps app, but this doesn't help x/pat

**Option B: Mapbox (Best for Offline)**
- Full offline map SDK with tile download API
- Download specific regions (e.g., "Bangkok" = ~50MB at zoom 0-15)
- Vector tiles are 40% smaller than raster tiles (2025 update)
- Dark mode built in
- Pricing: 25,000 free mobile users/month, then $5/1000

**Option C: react-native-maps with LocalTile**
- Load pre-downloaded tile images from device storage
- OpenStreetMap tiles can be freely downloaded
- Must set `mapType="none"` on Android to prevent underlying tile download
- Storage: City at zoom 10-17 = ~200-500MB depending on density
- Android 11+ storage restrictions complicate external file access

### Storage Requirements (Approximate)
| Region | Zoom 10-15 | Zoom 10-17 |
|--------|-----------|-----------|
| City center (10km radius) | ~20 MB | ~200 MB |
| Metro area (50km radius) | ~100 MB | ~2 GB |
| Country | ~500 MB | Not practical |

### Nomad Relevance: HIGH
Nomads exploring a new city often have no data. Offline maps for cafes, coworking spots, and saved places would be a killer feature.

### x/pat Recommendation
**Phase 1 (v1.5)**: Cache spot pins and basic map data locally so saved spots show on the map offline.
**Phase 2 (v2.0)**: Evaluate Mapbox for full offline maps. The 25K free user tier is generous for launch. City-level downloads (~50MB each) are practical.
**Defer for now**: Full offline tile caching with OpenStreetMap is too storage-heavy and complex for v1.

---

## 19. Bluetooth/NFC Proximity

### Bluetooth Low Energy (BLE) for Nearby Discovery
- **react-native-ble-plx**: Mature BLE library, Expo compatible
- Can scan for nearby devices running the x/pat app
- Range: ~10-100 meters depending on environment
- Battery impact: Low with BLE (vs. classic Bluetooth)
- Requires: `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `ACCESS_FINE_LOCATION` on Android 12+

### NFC for Quick Connect
- **react-native-nfc-manager**: Read/write NFC tags, Expo compatible
- Tap-to-connect: Exchange profile URLs via NFC
- Range: ~10 centimeters (requires physical proximity)
- No special permissions beyond NFC hardware capability

### Use Cases for Nomads
- **Coworking space**: "See who's here" — discover other x/pat users nearby via BLE
- **Events/meetups**: Tap phones to connect (NFC)
- **Hostel common area**: Passive nearby discovery

### Privacy Concerns
- BLE scanning requires explicit user opt-in
- Must be clearly communicated what data is shared
- Users must be able to go "invisible" at will

### Nomad Relevance: MODERATE (future feature)
Cool feature for community building, but not core to MVP. The location permission requirements and privacy UX add complexity.

### x/pat Recommendation
**Defer to v2.0+.** Nearby discovery is a "delight" feature, not a core need. When implemented:
- Use BLE beaconing for passive nearby discovery (opt-in)
- Use NFC for "tap to connect" at events
- Pair with the existing presence/check-in system
- Requires careful privacy UX design

---

## 20. Wi-Fi Direct Local Sharing

### What It Is
Wi-Fi Direct (P2P) enables device-to-device communication without a router. Speeds up to 250 Mbps, range ~100m.

### React Native Libraries
- **react-native-wifi-p2p**: Most mature, Android only, supports file/message transfer
- **rn-wifi-p2p**: Newer fork, Android only, focused on offline messaging
- **Limitations**: iOS does not support Wi-Fi Direct (uses Multipeer Connectivity instead)

### Potential Use Cases
- Share spot recommendations device-to-device when both users are offline
- Transfer photos between nearby nomads
- Local chat in areas with no internet

### Nomad Relevance: LOW
While theoretically useful, the use cases are niche and Android-only. Nomads rarely need to transfer data peer-to-peer when they can just share a link when they're back online.

### x/pat Recommendation
**Do not implement.** The Android-only limitation and niche use case don't justify the development effort. If local sharing becomes a requested feature, consider using the Share API (share links, not P2P transfer).

---

## 21. API Response Compression

### Algorithm Comparison (2026)

| Algorithm | Compression Ratio | Speed | Android Support | Best For |
|-----------|------------------|-------|-----------------|----------|
| gzip | Good | Fast | Universal | Default choice |
| Brotli | 20-26% better than gzip | Slower compress, fast decompress | Android 5+ | Text/JSON APIs |
| Zstd | Similar to Brotli | Fastest decompress | Limited browser, good native | Real-time APIs |

### Supabase + Compression
- Supabase PostgREST automatically serves gzip-compressed responses when `Accept-Encoding: gzip` is present
- Supabase Edge Functions can be configured to serve Brotli
- OkHttp (Android's HTTP client under React Native) supports gzip and Brotli decompression automatically

### Impact Analysis
For x/pat's typical API responses:
- Spots list (20 items): ~15KB raw JSON → ~3KB gzip → ~2.4KB Brotli
- Chat messages (50 items): ~25KB raw → ~5KB gzip → ~4KB Brotli
- Profile data: ~2KB raw → ~0.5KB gzip → ~0.4KB Brotli

### Nomad Relevance: MODERATE
Every byte saved matters on metered connections. The savings are real but not dramatic for x/pat's relatively small JSON payloads. Image optimization has 10-100x more impact.

### x/pat Recommendation
**Verify gzip is active (it likely already is via Supabase defaults).** No immediate action needed. Consider Brotli via Edge Functions if serving large JSON responses. Focus image compression efforts first — that's where the real bandwidth savings are.

---

## 22. DNS-over-HTTPS

### Android Private DNS (DoT/DoH)
- Built into Android since 9.0 (Pie)
- Uses DNS-over-TLS (DoT) by default; Android 13+ supports DNS-over-HTTPS (DoH/3)
- Encrypts DNS queries, preventing ISP/WiFi operator snooping
- Reduces DNS resolution time by 18% on average (2025 benchmarks), up to 32% on cellular
- Only ~17% of Android users have enabled it (as of early 2026)

### Impact on x/pat
- **Privacy**: DNS queries reveal every service the app contacts (Supabase, Sentry, PostHog, CDN). On hostile networks (some countries, public WiFi), this is a privacy risk.
- **Performance**: Faster DNS = faster first-connection latency
- **No app-level control**: This is an OS-level setting. x/pat cannot programmatically enable it.

### Nomad Relevance: MODERATE
Nomads in privacy-hostile countries (China, Iran, some Middle Eastern countries) benefit from encrypted DNS. But this is an OS setting, not an app setting.

### x/pat Recommendation
**No code changes needed.** Android handles this at the OS level. Consider:
- Adding a "Privacy tips for travelers" section in the Nomad Toolkit that recommends enabling Private DNS
- Documenting recommended DNS providers (Cloudflare 1.1.1.1, Google 8.8.8.8) in the travel safety content
- Ensuring all x/pat backend services have proper HTTPS (already the case with Supabase)

---

## 23. Networking Libraries Comparison

### Options for React Native Android

**Fetch API (Built-in)**
- Zero dependencies, native to React Native
- Lacks: interceptors, timeout configuration (pre-AbortController), automatic retries
- Sufficient for simple use cases

**Axios**
- De facto standard for React Native HTTP
- Request/response interceptors, automatic JSON transforms, timeout, cancellation
- Larger bundle size (~13KB)
- Perfect pairing with TanStack Query

**Apisauce**
- Built on Axios with standardized error format
- Every response has `ok`, `problem`, `data` properties
- Makes error handling consistent across the app
- Adds ~2KB on top of Axios

### Nomad Relevance: LOW
This is a developer experience choice, not a user-facing difference. All three use OkHttp under the hood on Android.

### x/pat Recommendation
**Use Axios with TanStack Query.** The interceptor pattern is valuable for:
- Adding auth tokens to every request
- Logging request/response times to Sentry
- Detecting and reporting network errors with context
- Adding `Accept-Encoding` headers

If adopting TanStack Query, the query functions can use either fetch or Axios — the caching/offline layer is independent of the HTTP client.

---

## 24. HTTP/3 & QUIC Support

### Why QUIC Matters for Nomads
QUIC is a transport protocol built on UDP that eliminates head-of-line blocking and enables:
- **0-RTT connection resumption**: Reconnecting to a known server skips the handshake entirely
- **Connection migration**: When switching from WiFi to cellular, the connection persists (uses Connection ID, not IP)
- **Better packet loss handling**: Individual stream losses don't block other streams
- **47% faster** than HTTP/1.1 in real benchmarks, significant improvement over HTTP/2

### Adoption (2026)
- 35% of global web traffic uses HTTP/3
- Chrome, Firefox, Safari, Edge all support it natively
- Cloudflare, Google Cloud, AWS CloudFront support HTTP/3
- **Supabase**: Uses Cloudflare's network, HTTP/3 is available

### Android Implementation
- **OkHttp** (React Native's default): HTTP/3 support is still experimental (Issue #907 open since 2015)
- **Cronet** (Google's networking library): Full QUIC/HTTP/3 support, usable in React Native via native module
- **React Native 0.83**: No built-in HTTP/3 support yet

### Nomad Relevance: HIGH
Connection migration (WiFi → cellular without dropping) is exactly what nomads need. 0-RTT is valuable for repeatedly connecting to the same Supabase backend. But the React Native ecosystem isn't ready yet.

### x/pat Recommendation
**Monitor but don't implement yet.** The React Native ecosystem doesn't have production-ready HTTP/3 support. When OkHttp or a React Native wrapper for Cronet matures:
- Connection migration would eliminate the WiFi→cellular WebSocket drop issue
- 0-RTT would make API calls feel instant on reconnection
- Estimated timeline: Late 2026 or 2027 for React Native ecosystem readiness
- **For now**: Ensure Supabase backend is on Cloudflare (it is), so HTTP/3 is available when clients support it

---

## 25. Local Database Options

### Comparison for x/pat's Needs

| Feature | AsyncStorage (current) | MMKV | SQLite (expo-sqlite) | WatermelonDB | Realm |
|---------|----------------------|------|---------------------|--------------|-------|
| Type | Key-value | Key-value | Relational | Relational (lazy) | Object-oriented |
| Speed | Slow (async JSON parse) | 30x faster than AS | Fast | Very fast (lazy loading) | 10x faster than SQLite |
| Complex queries | No | No | Yes (SQL) | Yes (query builder) | Yes (query builder) |
| Offline sync | No | No | Manual | Manual | Built-in (MongoDB) |
| Max size | ~6MB practical | No limit | 140TB theoretical | SQLite-backed | No practical limit |
| Expo compatible | Yes | Yes | Yes | Yes | Yes (CNG) |
| Reactivity | No | No | No | Yes (observable) | Yes (listeners) |
| Cost | Free | Free | Free | Free | Free (no MongoDB Sync) |

### Current x/pat Usage
- **AsyncStorage**: Used for Supabase auth session persistence only
- No local database for spots, messages, or user data

### Recommendations by Use Case

**For TanStack Query cache persistence**: **MMKV**
- 30x faster than AsyncStorage
- Simple key-value, perfect for serialized query cache
- Zero migration cost — drop-in replacement for AsyncStorage

**For offline-first data (spots, messages)**: **PowerSync (SQLite-based)**
- Built specifically for Supabase sync
- SQLite under the hood, so fast queries
- Handles conflict resolution
- Better than raw SQLite because sync logic is built in

**For reactive UI with large datasets**: **WatermelonDB**
- Most queries under 1ms even with 10,000+ records
- Lazy loading prevents memory bloat
- Observable records auto-update UI
- Good if PowerSync doesn't fit the use case

### Nomad Relevance: CRITICAL
The local database choice determines whether the app works offline and how fast it feels. AsyncStorage is a bottleneck.

### x/pat Recommendation
**Immediate**: Replace AsyncStorage with MMKV for auth session and TanStack Query cache.
**v1.5**: Add PowerSync (SQLite) for spots, chat, and profile data sync.
**Do not use**: Realm (MongoDB sync doesn't integrate with Supabase), raw SQLite (no sync logic).

---

## Priority Implementation Roadmap

### Phase 1: Quick Wins (v1.4 — 1-2 weeks)
1. **Install @react-native-community/netinfo** — network detection foundation
2. **Install react-native-mmkv** — replace AsyncStorage, 30x faster
3. **Install @tanstack/react-query** with MMKV persister — instant offline cache
4. **Fix Supabase Realtime reconnection** — AppState listener + heartbeat monitoring
5. **Add exponential backoff** to WebSocket reconnection in chat hooks
6. **Compress image uploads** with expo-image-manipulator before Supabase Storage
7. **Use Supabase image transforms** for responsive sizes (thumbnail/card/detail)

### Phase 2: Offline Foundation (v1.5 — 2-4 weeks)
8. **Integrate PowerSync** for offline-first spots and chat data
9. **Add expo-background-task** for background sync (WorkManager)
10. **Implement Data Saver mode** — reduce quality/frequency on metered networks
11. **Switch to cursor-based pagination** for all lists
12. **Reduce presence heartbeat** from 30s to 120s, add graceful stale handling

### Phase 3: Polish (v2.0 — 4-8 weeks)
13. **Evaluate Mapbox** for offline map tiles
14. **Add progressive image loading** (blur placeholder → full image)
15. **Data usage estimation** in Settings (via Axios interceptor byte counting)
16. **Privacy tips** in Nomad Toolkit (Private DNS, VPN recommendations)

### Phase 4: Future (v2.0+)
17. BLE nearby discovery (opt-in)
18. NFC tap-to-connect at events
19. HTTP/3 when React Native ecosystem supports it
20. MQTT evaluation if user count exceeds 50K

### Not Recommended
- Wi-Fi Direct (too niche, Android only)
- Certificate pinning (breaks VPN users)
- GraphQL migration (Supabase PostgREST is sufficient)
- Per-app data usage tracking (heavy permissions)
- Full offline map tile caching with OSM (too storage-heavy for v1)

---

## Sources

- [NetInfo - GitHub](https://github.com/react-native-netinfo/react-native-netinfo)
- [NetInfo - Expo Docs](https://docs.expo.dev/versions/latest/sdk/netinfo/)
- [Local-first architecture with Expo](https://docs.expo.dev/guides/local-first/)
- [Offline-First React Native Guide](https://oneuptime.com/blog/post/2026-01-15-react-native-offline-architecture/view)
- [React Native Background Tasks 2026](https://dev.to/eira-wexford/run-react-native-background-tasks-2026-for-optimal-performance-d26)
- [expo-background-task Docs](https://docs.expo.dev/versions/latest/sdk/background-task/)
- [Expo Background Tasks + PowerSync](https://www.powersync.com/blog/keep-background-apps-fresh-with-expo-background-tasks-and-powersync)
- [PowerSync + Supabase Offline-First](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync)
- [Supabase Offline Discussion](https://github.com/orgs/supabase/discussions/357)
- [Supabase + WatermelonDB](https://supabase.com/blog/react-native-offline-first-watermelon-db)
- [TanStack Query Offline Mode](https://dev.to/fedorish/react-native-offline-first-with-tanstack-query-1pe5)
- [TanStack Query Network Mode](https://tanstack.com/query/v4/docs/react/guides/network-mode)
- [TanStack Query Cache Persistence](https://tanstack.com/query/v4/docs/react/plugins/persistQueryClient)
- [Android Data Saver - Android Developers](https://developer.android.com/develop/connectivity/network-ops/data-saver)
- [WebSocket Reconnection 2026](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view)
- [Exponential Backoff for WebSockets](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
- [Supabase Realtime Disconnection Troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794)
- [Supabase Realtime Reconnection Issue](https://github.com/supabase/realtime/issues/1088)
- [Android Doze & App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [Doze - React Native Background Guardian](https://www.mintlify.com/ivangonzalezg/react-native-background-guardian/concepts/doze-and-app-standby)
- [GraphQL vs REST 2026](https://jsmanifest.com/graphql-rest-practical-comparison-2026)
- [REST vs GraphQL Statistics 2025](https://jsonconsole.com/blog/rest-api-vs-graphql-statistics-trends-performance-comparison-2025)
- [Android IPv6 WiFi Support 2026](https://copyprogramming.com/howto/does-android-have-support-for-ipv6)
- [464XLAT IPv6-Only Networks](https://oneuptime.com/blog/post/2026-03-20-464xlat-ipv6-only-mobile-networks/view)
- [React Native IPv6 fetch issue](https://github.com/facebook/react-native/issues/32730)
- [react-native-vpn-detect](https://github.com/leekuo/react-native-vpn-detect)
- [Image CDN Solutions 2026](https://portalzine.de/best-image-cdn-solutions-2025-2026/)
- [React Native Image Optimization 2025](https://ficustechnologies.com/blog/react-native-image-optimization-2025-fastimage-caching-strategies-and-jank-free-scrolling/)
- [Media Uploads in React Native 2026](https://dev.to/fasthedeveloper/mastering-media-uploads-in-react-native-images-videos-smart-compression-2026-guide-5g2i)
- [react-native-background-downloader](https://github.com/kesha-antonov/react-native-background-downloader)
- [Cursor vs Offset Pagination](https://medium.com/@siddhantshelake/understanding-offset-and-cursor-pagination-8c5c53b1ad16)
- [Infinite Scroll React Native](https://truesparrow.com/blog/infinite-scrolling-in-react-native/)
- [react-native-android-datausage](https://github.com/shimatai/react-native-android-datausage)
- [WebSocket vs HTTP, SSE, MQTT 2026](https://websocket.org/comparisons/)
- [MQTT vs SSE](https://ably.com/blog/mqtt-vs-sse)
- [MQTT with React Native](https://reactnativeexpert.com/blog/mqtt-with-react-native-for-efficient-communication/)
- [SSL Pinning in React Native 2026](https://oneuptime.com/blog/post/2026-01-15-react-native-ssl-pinning/view)
- [SSL Pinning - Callstack](https://www.callstack.com/blog/ssl-pinning-in-react-native-apps)
- [Mapbox Offline Tiles (40% savings)](https://www.mapbox.com/blog/more-efficient-offline-map-tiles-save-up-to-40-storage-space)
- [react-native-maps Tile Docs](https://github.com/react-native-maps/react-native-maps/blob/master/docs/tiles.md)
- [BLE in React Native Expo](https://medium.com/@chinweikemichaelchinonso/bluetooth-ble-integration-in-react-native-expo-new-architecture-ios-android-5c0100960979)
- [Expo BLE Guide](https://expo.dev/blog/how-to-build-a-bluetooth-low-energy-powered-expo-app)
- [react-native-wifi-p2p](https://github.com/kirillzyusko/react-native-wifi-p2p)
- [Compression: Zstd vs Brotli vs Gzip](https://koder.ai/blog/zstd-vs-brotli-vs-gzip-api-compression)
- [Android Private DNS 2026](https://www.airdroid.com/mdm/private-dns-android/)
- [DNS-over-HTTP/3 in Android](https://security.googleblog.com/2022/07/dns-over-http3-in-android.html)
- [Axios vs Fetch 2025](https://blog.logrocket.com/axios-vs-fetch-best-http-requests/)
- [Axios vs Fetch 2026](https://iproyal.com/blog/axios-vs-fetch/)
- [HTTP/3 QUIC Deployment 2026](https://dev.to/linou518/http3-and-quic-in-production-a-practical-deployment-guide-for-2026-3n8e)
- [HTTP/3 35% Adoption](https://dev.to/linou518/http3-is-at-35-adoption-you-cant-call-quic-a-future-technology-anymore-2ghm)
- [Cronet in React Native](https://medium.com/the-react-native-log/using-cronet-in-your-mobile-app-7dda3a89c132)
- [Top 11 Local Databases React Native 2026](https://www.algosoft.co/blogs/top-11-local-databases-for-react-native-app-development-in-2026/)
- [Local Database Options for Offline React Native](https://medium.com/@husnainsardar07/local-database-options-for-offline-functionality-in-react-native-apps-359dc669fb73)
- [PowerSync React Native SDK](https://docs.powersync.com/client-sdks/reference/react-native-and-expo)
- [PowerSync + Supabase Cookbook](https://ignitecookbook.com/docs/recipes/LocalFirstDataWithPowerSync/)
