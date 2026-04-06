# Offline-First Architecture & Sync Strategies for x/pat
**Research Date:** 2026-04-06
**Platform:** React Native / Expo 55 + Supabase
**Context:** Digital nomads on unreliable WiFi worldwide

---

## Executive Summary

x/pat's core users — digital nomads — work from cafes in Chiang Mai, coworking spaces in Medellín, and Airbnbs in Lisbon. Their connectivity is fundamentally unreliable: slow hotel WiFi, airplane mode between flights, spotty 4G in developing markets. An app that freezes or errors offline is a dead app in this demographic.

This research covers 30 topics across 6 domains: design patterns, React Native libraries, Supabase integration, background sync, conflict resolution, and UX patterns. Each entry includes industry examples, implementation complexity (1-5 scale), specific Expo-compatible packages, and a pre/post-launch recommendation.

---

## DOMAIN 1: Offline-First Design Patterns (Topics 1–5)

---

### Topic 1: Optimistic Updates

**What it is:** The client immediately applies the user's action to local state and renders success UI before the server confirms the write. If the server rejects the request, the UI rolls back.

**How it works:**
1. User taps "Save Spot" — UI instantly shows spot in saved list
2. App queues a POST to Supabase in the background
3. If server returns 200: queue item cleared, local state confirmed
4. If server returns 4xx/5xx or network fails: local state rolls back, toast shown

**Industry Examples:**
- Twitter/X: Likes register instantly; the heart animates before the server responds. If the server rejects (rate limit, auth failure), the like count rolls back.
- Gmail: "Message sent" appears in Sent folder instantly; actual SMTP delivery happens asynchronously.
- Notion: Block edits appear in real time locally; server sync happens every few seconds silently.
- Linear (project management): Issue status changes are optimistic; the board updates before server confirms.

**Implementation Complexity:** 2/5
- React Query's `useMutation` has built-in `onMutate` / `onError` rollback hooks
- Zustand or Jotai can hold optimistic state alongside server state
- Supabase JS client makes the network call; React Query wraps it

**Expo/React Native Packages:**
- `@tanstack/react-query` v5 — `useMutation` with `onMutate` (optimistic) + `onError` (rollback) + `onSettled` (confirmation)
- `zustand` — lightweight client state for local optimistic snapshots
- `immer` — immutable state updates for clean rollback logic

**x/pat Relevance:**
- Saving spots, liking spots, following users, posting comments — all high-frequency, all should be optimistic
- Spot check-in (tap "I'm here") is the highest-stakes optimistic action — affects social feed visibility

**Pre or Post-Launch:** PRE-LAUNCH. This is table stakes for a social app. Users who see a spinner on every tap will not return. React Query already supports this pattern; implementation is 1-2 days per feature.

---

### Topic 2: Conflict Resolution via Operational Transforms (OT)

**What it is:** When two clients edit the same document concurrently, Operational Transform mathematically transforms the operations so both edits can be applied without overwriting each other. This is the algorithm behind Google Docs.

**How it works:**
- Each edit is expressed as an operation: `insert(position, text)` or `delete(position, length)`
- When two concurrent operations arrive, OT transforms one relative to the other so both land correctly
- Requires a central server to order and transform operations

**Industry Examples:**
- Google Docs: Multiple cursors editing simultaneously — OT prevents one user's typing from deleting another's
- Figma (early): Used OT for vector path co-editing before switching to a hybrid model
- Etherpad: Open-source OT-based collaborative text editor

**Implementation Complexity:** 5/5 — OT is notoriously hard to implement correctly. The algorithms are complex, require formal proofs, and bugs manifest as subtle data corruption that's hard to reproduce.

**Expo/React Native Packages:**
- `ot.js` — JavaScript OT library, rarely maintained
- `sharedb` — Node.js OT server + client, real-time document sync; heavy infrastructure requirement
- No Expo-native package exists; this requires custom server-side logic

**x/pat Relevance:**
- x/pat does not have collaborative document editing. Spots have simple fields (name, description, rating). The only shared writes are check-ins, likes, and comments — none of which require OT.
- OT is architectural overkill for x/pat's data model.

**Pre or Post-Launch:** NOT APPLICABLE. x/pat's data model does not require OT. Simpler conflict strategies (last-write-wins on profile fields, append-only on social actions) are sufficient.

---

### Topic 3: Queue-Based Sync with Persistent Mutation Queue

**What it is:** All write operations are serialized into a persistent local queue (survives app kill). A sync engine drains the queue in order when connectivity is restored. This is the backbone of true offline-first.

**How it works:**
1. User creates a spot review while offline
2. Action is written to MMKV or SQLite queue: `{ id: uuid, type: 'INSERT_REVIEW', payload: {...}, retries: 0, created_at: timestamp }`
3. App shows the review in the local feed immediately (optimistic)
4. When online: sync engine dequeues, POSTs to Supabase, marks item `status: 'synced'`
5. If POST fails: retry with exponential backoff (1s, 2s, 4s, max 5 retries), then move to dead-letter queue

**Industry Examples:**
- Slack: Messages typed offline are held in a local queue and sent in order when connection returns. The "Sending..." indicator persists until confirmed.
- Airbnb app: Property favorites saved offline, synced on reconnect
- WhatsApp: The clock icon (single check) means queued; double check means delivered
- Linear: Issue creation while offline stored locally, synced in background

**Implementation Complexity:** 3/5
- Queue data structure is straightforward (array in MMKV)
- The complexity is in retry logic, ordering guarantees, and dead-letter handling
- A well-built queue is 3-5 days of engineering

**Expo/React Native Packages:**
- `react-native-mmkv` — fastest key-value storage for queue persistence (10x faster than AsyncStorage)
- `@tanstack/react-query` — offline mutation queue support in v5 with `persistQueryClient`
- `expo-network` — detect connectivity changes to trigger drain
- `@react-native-community/netinfo` — finer-grained network type (wifi/cellular/none)

**x/pat Relevance:**
- Queue actions: add spot, submit review, post comment, follow user, save spot, check in
- Non-queued (read-only cache sufficient): browse spots, view profiles
- Dead-letter handling matters: if a review fails 5 times, user needs to know — not silently drop it

**Pre or Post-Launch:** PRE-LAUNCH for core write actions (save spot, submit review). The UX degradation of losing a review the user typed while offline is severe and will generate App Store complaints.

---

### Topic 4: Event Sourcing for Offline Sync

**What it is:** Instead of storing current state, the app stores a log of events (immutable facts). "User liked spot X at T1", "User unliked spot X at T2". State is derived by replaying events. Sync means merging event logs.

**How it works:**
- Local event store: append-only log in SQLite
- Every action creates an event record with `(user_id, event_type, aggregate_id, payload, timestamp, client_id)`
- On sync: upload unsynced events to server; server appends to master log; server returns events client doesn't have
- Conflicts resolved by event ordering (timestamp or vector clock)

**Industry Examples:**
- Eventsource/CQRS backends (Axon, EventStoreDB): Used in banking, healthcare for audit trails
- CouchDB/PouchDB: Documents are versioned; sync is event-based under the hood
- Figma: Internally uses an event-sourced model for design edits

**Implementation Complexity:** 4/5
- Schema design is straightforward; the complexity is event replay, projections, and ensuring idempotency
- Supabase doesn't natively support event sourcing — requires custom tables and application logic

**Expo/React Native Packages:**
- No specific Expo package — this is a custom architecture
- `expo-sqlite` — local event store
- `zustand` + `immer` — local state derived from event replay
- Custom sync service using Supabase REST/Realtime

**x/pat Relevance:**
- High value for the social graph (follows, likes, check-ins) where append-only semantics naturally fit
- An `events` table in Supabase (with `synced_at` nullable) doubles as an audit log — useful for trust/safety
- Partial adoption is viable: use event sourcing for social actions (likes, follows, check-ins) while using standard CRUD for spots

**Pre or Post-Launch:** POST-LAUNCH. Requires architectural commitment. Adopt selectively post-v1 for the social action feed. Pre-launch, use optimistic updates + queue instead.

---

### Topic 5: Delta Sync (Incremental Sync)

**What it is:** Instead of fetching all data on every sync, the app only fetches records changed since the last successful sync. Uses a `updated_at` watermark or server-side change sequence numbers.

**How it works:**
1. Client stores `last_sync_at` timestamp locally
2. On sync: `SELECT * FROM spots WHERE updated_at > last_sync_at`
3. Server returns only the delta (changed/new/deleted records)
4. Client merges delta into local cache
5. Hard deletes require a `deleted_at` soft-delete column or a tombstone table

**Industry Examples:**
- Dropbox: Only syncs file chunks that changed (content-addressed delta sync)
- Apple Contacts/Calendar (CloudKit): Delta sync using change tokens — only sync what changed since last token
- Salesforce Mobile: Uses incremental sync for large CRM datasets on mobile
- Notion mobile: Syncs only recently-modified pages on app open

**Implementation Complexity:** 3/5
- Requires `updated_at` column on all synced tables (x/pat already has these in Supabase)
- Soft deletes (`deleted_at`) instead of hard deletes — schema change required
- Watermark management and handling clock skew between devices

**Expo/React Native Packages:**
- `expo-sqlite` — local cache store
- Supabase `.gt('updated_at', lastSyncAt)` query filter — native support
- `@react-native-async-storage/async-storage` — store watermark
- `react-native-mmkv` — faster alternative for watermark storage

**x/pat Relevance:**
- The spots table has 431 records today; it will grow to thousands. Fetching all spots on every app open is wasteful and slow on poor connections.
- Delta sync for spots, profiles, and reviews is high-value and low-risk
- x/pat's Supabase schema already has `created_at` / `updated_at` columns — delta sync is additive

**Pre or Post-Launch:** PRE-LAUNCH for the spots feed. The 431-spot dataset is already large enough that full re-fetch on every app open will cause perceptible lag on slow connections (Chiang Mai cafe WiFi). A `last_sync_at` watermark is a 1-day implementation.

---

## DOMAIN 2: React Native Offline Libraries (Topics 6–10)

---

### Topic 6: WatermelonDB

**What it is:** A high-performance reactive database for React Native, built on SQLite. Designed specifically for offline-first apps with thousands of records. Uses lazy loading and observable queries.

**Architecture:**
- Data stored in SQLite (via `@nozbe/watermelondb`)
- Models defined as JavaScript classes with `@field` decorators
- Queries return `Observable` streams — UI re-renders automatically when data changes
- Sync: two-pass protocol (pushes local changes, then pulls server changes)
- Built-in sync primitive: `synchronize({ pullChanges, pushChanges })`

**Industry Examples:**
- Nozbe Teams: The creator's own app, 10k+ records per user, full offline support
- Electro (e-commerce app): Product catalog browsing offline
- Several Shopify internal tools: Inventory management offline

**Implementation Complexity:** 4/5
- Schema definition and model setup is significant boilerplate
- Sync implementation requires mapping Supabase's API to WatermelonDB's pull/push protocol
- Migrations require explicit schema versioning
- Not drop-in — requires architectural commitment

**Expo Compatibility:**
- Requires Expo dev client (not compatible with Expo Go due to native SQLite dependency)
- `@nozbe/watermelondb` — core library
- `expo-sqlite` is NOT the same — WatermelonDB uses its own native SQLite binding
- Compatible with EAS Build

**Supabase Integration:**
- Community adapters exist: `supabase-watermelondb` (unofficial, ~200 GitHub stars)
- Must implement `pullChanges` and `pushChanges` functions manually
- WatermelonDB sync expects `{ changes: { tableName: { created, updated, deleted } } }` format

**x/pat Relevance:**
- Best fit for: offline spot browsing, saved spots, downloaded city guides
- Overkill for social feed (too dynamic for local caching to add value)
- Would replace current Supabase direct queries with a local-first data layer

**Pre or Post-Launch:** POST-LAUNCH. The migration from direct Supabase queries to WatermelonDB is a major refactor (2-3 weeks). Post-v1.1, if offline browsing becomes a top user request.

---

### Topic 7: RxDB

**What it is:** A reactive NoSQL database for JavaScript/TypeScript. Stores documents, supports real-time queries via RxJS observables, and has built-in replication plugins for various backends including CouchDB, GraphQL, REST, and Supabase.

**Architecture:**
- Document-based (JSON documents, like MongoDB)
- Persistent storage via adapters: SQLite, IndexedDB, memory, AsyncStorage
- Replication: RxDB v15 includes a generic `replicateRxCollection` with custom pull/push handlers
- Built-in conflict handling: configurable conflict resolution functions

**Industry Examples:**
- Lego Education (internal tool): Offline lesson planner for teachers
- AthleteX: Sports tracking app with offline session recording
- Several fintech prototypes using RxDB + Supabase

**Implementation Complexity:** 3/5
- Better TypeScript support than WatermelonDB
- Supabase replication adapter available in community
- Requires understanding RxJS observables
- React Native storage adapter is less mature than web (IndexedDB not available)

**Expo Compatibility:**
- `rxdb` — core package
- Storage adapter: `rxdb/plugins/storage-sqlite` (requires Expo dev client)
- Or `rxdb/plugins/storage-memory` for testing
- `rxdb/plugins/replication` — sync engine

**Supabase Integration:**
- `rxdb-supabase` npm package (community): implements Supabase as replication target
- Pull: uses Supabase `select().gt('updated_at', checkpoint)` pattern
- Push: uses Supabase `upsert()`

**x/pat Relevance:**
- The NoSQL document model is a better fit for x/pat's spot data (nested amenities, tags, photos)
- Reactive queries suit the feed UI (spots appearing as they load from local DB)
- More flexible than WatermelonDB for JSON-heavy data

**Pre or Post-Launch:** POST-LAUNCH. Same architectural commitment as WatermelonDB. Evaluate at v1.1 alongside WatermelonDB; choose based on team familiarity with RxJS.

---

### Topic 8: AsyncStorage (Legacy Cache Layer)

**What it is:** React Native's original key-value storage API. Asynchronous, string-based, max ~6MB on iOS. Used for persisting small amounts of data: auth tokens, user preferences, small JSON blobs.

**How it works:**
- Simple `get/set/remove/multiGet/multiSet` API
- Data persisted to disk (survives app kill and device restart)
- Async by design (all operations return Promises)
- NOT suitable for large datasets or structured queries

**Industry Examples:**
- Most React Native apps use AsyncStorage for session tokens, theme preference, onboarding completion flags
- Early versions of Expo apps used it for caching API responses (now largely replaced by React Query's persist plugin)

**Implementation Complexity:** 1/5 — trivially simple API

**Expo Compatibility:**
- `@react-native-async-storage/async-storage` — works in Expo Go and dev client
- `expo-secure-store` — for sensitive data (auth tokens) — hardware-backed encryption on iOS/Android

**x/pat Current Usage:**
- Auth tokens should be in `expo-secure-store` (more secure)
- User preferences (dark mode, notification settings): AsyncStorage is fine
- DO NOT store spot data in AsyncStorage — too large, no query capability

**x/pat Relevance:**
- x/pat should audit current AsyncStorage usage and migrate auth tokens to `expo-secure-store`
- Keep AsyncStorage for: onboarding flags, theme, last-viewed city, notification preferences

**Pre or Post-Launch:** PRE-LAUNCH (already in use). Audit and optimize existing usage. Migrate auth tokens to secure store.

---

### Topic 9: MMKV (react-native-mmkv)

**What it is:** A high-performance key-value storage library from WeChat/Tencent. 10x faster than AsyncStorage. Uses memory-mapped files for near-instant reads. Synchronous API (unlike AsyncStorage's Promise-based API).

**Performance Benchmarks (from library README):**
- AsyncStorage write: ~9ms average
- MMKV write: ~0.2ms average
- AsyncStorage read: ~2ms average
- MMKV read: ~0.07ms average

**How it works:**
- C++ core using memory-mapped file I/O
- Data encoded with Protocol Buffers
- Synchronous getter/setter — no await needed
- Supports encryption (AES-128)
- Multiple instances (namespaced storage)

**Industry Examples:**
- WeChat: Used by ~1 billion users for local state persistence
- Several React Native performance-critical apps (payment apps, trading apps)
- Recommended by the React Native Performance documentation

**Implementation Complexity:** 2/5 — API nearly identical to AsyncStorage but synchronous

**Expo Compatibility:**
- Requires Expo dev client (native module)
- `react-native-mmkv` — core package
- Works with EAS Build on both iOS and Android
- NOT compatible with Expo Go

**x/pat Relevance:**
- Replace AsyncStorage with MMKV for the mutation queue (Topic 3) — synchronous writes are critical for queue reliability
- Use for: sync watermarks (`last_sync_at`), draft spot data, pending comment text
- MMKV's synchronous API prevents race conditions in the mutation queue

**Pre or Post-Launch:** PRE-LAUNCH if implementing the mutation queue (Topic 3). The queue depends on reliable synchronous writes that AsyncStorage cannot guarantee.

---

### Topic 10: React Query Offline Persistence (TanStack Query)

**What it is:** React Query v5 includes a `persistQueryClient` plugin that serializes the entire query cache to disk. On next app launch, cached data loads instantly while fresh data is fetched in background. The `networkMode: 'offlineFirst'` option queues mutations when offline.

**How it works:**
- `PersistQueryClientProvider` wraps the app
- `createAsyncStoragePersister` or `createSyncStoragePersister` (MMKV) serializes cache
- `gcTime` (formerly `cacheTime`) determines how long persisted data survives
- Mutations with `networkMode: 'offlineFirst'` are queued when offline, retried when online
- `useIsRestoring` hook shows loading state while cache hydrates

**Industry Examples:**
- Most production React Query apps use persistence for perceived performance
- Expo examples in TanStack Query docs show MMKV persister
- Used in food delivery apps for menu caching

**Implementation Complexity:** 2/5
- Configuration is declarative
- Main complexity: choosing correct `gcTime` values per query (spots: 24h, feed: 30min)
- Stale-while-revalidate pattern works naturally with persisted cache

**Expo Compatibility:**
- `@tanstack/react-query` v5
- `@tanstack/react-query-persist-client`
- `@tanstack/query-sync-storage-persister` (use with MMKV)
- `@tanstack/query-async-storage-persister` (use with AsyncStorage)
- All work in Expo dev client; no native modules required for AsyncStorage persister

**x/pat Relevance:**
- x/pat likely already uses React Query for data fetching — adding persistence is a configuration change, not an architectural rewrite
- Spots feed: 24-hour cache — browse all 431 spots offline instantly
- User profiles: 1-hour cache — view recently-seen profiles offline
- `networkMode: 'offlineFirst'` for mutations — queue save/like/follow actions

**Pre or Post-Launch:** PRE-LAUNCH. Highest ROI offline improvement available. If React Query is already in the stack, adding `persistQueryClient` is 2-4 hours of work and immediately makes the app feel fast on poor connections.

---

## DOMAIN 3: Supabase Offline Support Options (Topics 11–15)

---

### Topic 11: Local SQLite + Manual Sync with Supabase

**What it is:** Store a local copy of critical data in `expo-sqlite` (bundled with Expo). Write a custom sync layer that pushes local changes to Supabase and pulls remote changes. Full offline capability without a third-party sync engine.

**Architecture:**
```
[User Action] → [expo-sqlite (local)] → [UI renders from local]
                      ↓ (background)
              [Sync Service] ← → [Supabase REST API]
```

**How it works:**
- Schema mirrored between Supabase Postgres and local SQLite (subset of columns)
- `sync_status` column on local tables: `pending | syncing | synced | conflict`
- On app open: pull delta from Supabase (updated_at > last_sync)
- On write: write locally first, set status `pending`
- Background sync: drain pending queue to Supabase

**Industry Examples:**
- Todoist mobile: Custom SQLite-backed offline sync, syncs to server
- Bear notes (iOS): SQLite local, iCloud sync — same architecture pattern
- Jira mobile app: Local SQLite cache with custom sync

**Implementation Complexity:** 4/5
- Most control, most work
- Schema design, sync protocol, conflict detection, error recovery — all custom
- `expo-sqlite` v2 (Expo 50+) has significant API improvements (async, prepared statements)

**Expo Compatibility:**
- `expo-sqlite` — ships with Expo SDK, works in dev client and Expo Go (Expo 50+)
- No additional native modules required

**Supabase Integration:**
- REST API (`fetch` or `supabase-js`) for sync
- Supabase Realtime for push invalidation (trigger re-sync on server change)
- Row-level security applies to sync queries — no bypassing RLS

**x/pat Relevance:**
- Most appropriate for: spot data (relatively static, high browse value offline)
- Less appropriate for: social feed (too dynamic), real-time chat (defeats the purpose)
- Bundling a SQLite snapshot of the 431 seeded spots at app install provides instant value

**Pre or Post-Launch:** POST-LAUNCH for full implementation. Pre-launch: bundle a static JSON snapshot of seeded spots as a fallback (faster to implement, provides immediate offline value).

---

### Topic 12: Supabase Optimistic Inserts with Rollback

**What it is:** Use Supabase's client library with React Query's optimistic update pattern to insert records locally in the UI cache before the server confirms. If the insert fails, roll back to the previous cache state.

**How it works (React Query + Supabase):**
```typescript
useMutation({
  mutationFn: (newReview) => supabase.from('reviews').insert(newReview),
  onMutate: async (newReview) => {
    await queryClient.cancelQueries(['reviews', spotId]);
    const previous = queryClient.getQueryData(['reviews', spotId]);
    queryClient.setQueryData(['reviews', spotId], old => [...old, newReview]);
    return { previous };
  },
  onError: (err, newReview, context) => {
    queryClient.setQueryData(['reviews', spotId], context.previous);
    showToast('Failed to save review. Try again.');
  },
  onSettled: () => {
    queryClient.invalidateQueries(['reviews', spotId]);
  }
})
```

**Industry Examples:**
- All major React Query production apps use this pattern
- Supabase's own documentation recommends this pattern
- Vercel's deployment dashboard uses optimistic state for deployment status

**Implementation Complexity:** 2/5 — well-documented pattern with React Query

**Expo Compatibility:**
- No native modules required
- `@tanstack/react-query` + `@supabase/supabase-js`
- Works in Expo Go

**x/pat Relevance:**
- Implement for: save spot, like spot, post comment, follow user, check in
- Each mutation: 20-30 lines of boilerplate
- Can be abstracted into a custom hook `useOptimisticMutation`

**Pre or Post-Launch:** PRE-LAUNCH. Core to the social app experience. Implement as a shared hook, apply to all write mutations before launch.

---

### Topic 13: Supabase Realtime + Local Cache Invalidation

**What it is:** Subscribe to Supabase Realtime channels to receive server-pushed change events. When a change arrives, invalidate the local React Query cache, triggering a background re-fetch. Keeps local data fresh without polling.

**How it works:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('spots_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spots' },
      (payload) => {
        queryClient.invalidateQueries(['spots']);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

**Industry Examples:**
- Slack: WebSocket push invalidates local channel cache
- Notion: Collaborative editing via WebSocket invalidation
- Supabase's own dashboard: Uses Realtime for live table previews

**Implementation Complexity:** 2/5 — straightforward with Supabase's client library

**Expo Compatibility:**
- `@supabase/supabase-js` handles WebSocket connection
- Must configure Supabase Realtime (enable replication on tables in Supabase dashboard)
- Works in Expo Go and dev client

**Limitations for Offline Scenarios:**
- Realtime requires network connection — does not help offline
- Combine with: React Query persistence (offline cache) + Realtime invalidation (online freshness)
- Background app state: Realtime connection drops when app is backgrounded on iOS (aggressive battery management)

**x/pat Relevance:**
- Use for: live spot check-ins (show "3 people here now"), new comments on spot, follower notifications
- NOT a substitute for offline sync — it's the online complement
- Configure Realtime for: `spots`, `checkins`, `comments` tables

**Pre or Post-Launch:** PRE-LAUNCH for check-in presence (core social feature). Post-launch for granular change subscriptions.

---

### Topic 14: PGlite — Postgres in the Browser/App (Experimental)

**What it is:** PGlite is a WASM-compiled PostgreSQL running entirely client-side. Electric SQL builds on this to provide local-first Postgres with automatic sync to a remote Postgres (including Supabase). The client runs actual SQL queries locally with full Postgres semantics.

**How it works:**
- PGlite embeds PostgreSQL as a WASM module
- ElectricSQL's sync layer replicates data from Supabase Postgres → PGlite
- App queries local PGlite — no network required
- Changes are streamed back to server via Electric's sync protocol
- Conflict resolution: CRDT-based or last-write-wins configurable

**Industry Examples:**
- Electric SQL is used by: Supabase itself (for local dev), Linear (internal tooling), several YC-backed startups
- PGlite powers offline-first Postgres apps in browser (deployed apps, not just dev tools)

**Implementation Complexity:** 5/5 for React Native — PGlite is primarily designed for web (WASM). React Native WASM support is experimental and limited.

**Expo Compatibility:**
- NOT compatible with React Native / Expo (no stable WASM runtime)
- Electric SQL has a React Native adapter in beta (`@electric-sql/react-native`) using SQLite (not PGlite)
- The Electric SQL React Native SQLite sync is a separate (more viable) path

**Electric SQL React Native (Alternative):**
- `@electric-sql/react-native` — local SQLite synced to Postgres
- Requires self-hosted Electric server (additional infrastructure)
- More complex than Supabase-only setup

**x/pat Relevance:**
- PGlite: Not viable for React Native today
- Electric SQL React Native: Promising but requires self-hosted infrastructure and adds operational complexity for a solo founder
- Monitor: ElectricSQL is evolving rapidly; re-evaluate at v1.2

**Pre or Post-Launch:** NOT RECOMMENDED currently. Technical maturity insufficient for production React Native in 2026. Re-evaluate Q3 2026.

---

### Topic 15: Supabase Edge Functions for Sync Orchestration

**What it is:** Use Supabase Edge Functions (Deno) as a server-side sync coordinator. The function handles conflict detection, merges, and returns a canonical diff to the client. Moves conflict logic server-side rather than in the app.

**How it works:**
1. Client POSTs its pending changes queue to an Edge Function
2. Edge Function reads server state, compares timestamps, detects conflicts
3. Function applies non-conflicting changes, returns conflict set for client resolution
4. Client receives: `{ applied: [...], conflicts: [...] }` and updates local state

**Industry Examples:**
- Firebase Cloud Functions: Used for sync orchestration in many apps
- Supabase Edge Functions replacing REST sync endpoints in newer apps
- Custom sync protocols at companies like Figma, Linear use server-side merge logic

**Implementation Complexity:** 3/5
- Edge Function itself is straightforward Deno/TypeScript
- Complexity is in the conflict detection logic
- Cold start latency (~100-300ms) is acceptable for background sync

**Expo Compatibility:**
- No native modules required — Edge Functions called via `fetch` or Supabase client
- `supabase.functions.invoke('sync-changes', { body: pendingQueue })`

**x/pat Relevance:**
- Use case: batch sync of a user's pending queue (saved spots, reviews, check-ins) in a single roundtrip
- Single network call instead of N individual Supabase REST calls — better for poor connections
- Edge Function can validate data, check rate limits, and apply all changes atomically

**Pre or Post-Launch:** POST-LAUNCH. Significant backend engineering. Pre-launch, individual Supabase client calls with React Query mutations are sufficient. Post-v1, consolidate sync into an Edge Function for efficiency.

---

## DOMAIN 4: Background Sync on iOS and Android (Topics 16–20)

---

### Topic 16: expo-background-fetch

**What it is:** Expo's API for scheduling periodic background execution of JavaScript code. Allows the app to sync data even when it's not in the foreground. Wraps iOS `BGAppRefreshTask` and Android `WorkManager`.

**How it works:**
```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const SYNC_TASK = 'background-sync';

TaskManager.defineTask(SYNC_TASK, async () => {
  await syncPendingQueue();
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
  minimumInterval: 60 * 15, // 15 minutes
  stopOnTerminate: false,
  startOnBoot: true,
});
```

**Platform Limitations:**
- iOS: System decides when to run tasks based on battery, usage patterns. Minimum interval is a hint, not a guarantee. Typically runs every 15-30 minutes for frequently-used apps. Can be delayed or skipped.
- Android: More reliable execution. WorkManager respects the minimum interval more closely. Battery optimization settings can still block execution.

**Industry Examples:**
- Email apps: Background sync every 15 minutes
- Podcast apps (Overcast, Pocket Casts): Download new episodes in background
- News apps: Prefetch articles in background

**Implementation Complexity:** 3/5
- API is simple; complexity is in making sync logic idempotent (safe to run multiple times)
- iOS throttles heavily for low-usage apps — unreliable for time-sensitive sync

**Expo Compatibility:**
- `expo-background-fetch` + `expo-task-manager`
- Works with EAS Build; NOT available in Expo Go
- Requires permissions declaration in `app.json`

**x/pat Relevance:**
- Use for: draining pending sync queue when app is backgrounded but device is online
- NOT reliable enough for: notifications, real-time features
- Best case: user writes a review offline, closes app, background fetch delivers it within 15 minutes without user re-opening app

**Pre or Post-Launch:** POST-LAUNCH. Background sync is a polish feature. Pre-launch, users expect to open the app to sync. Post-v1, add background sync to drain the pending queue automatically.

---

### Topic 17: iOS BGProcessingTask (Long-Running Background Tasks)

**What it is:** iOS 13+ API for longer background tasks (up to 30 seconds, sometimes minutes) that run when the device is charging and connected to WiFi. For heavier sync operations like downloading large datasets.

**How it works:**
- Registered in Info.plist with identifier
- iOS schedules the task when conditions are favorable (charging + WiFi)
- App implements task handler, performs heavy sync, calls `task.setTaskCompleted()`
- Separate from BGAppRefreshTask (which is shorter, 30s max)

**Industry Examples:**
- Podcast apps: Download full episode audio files during BGProcessingTask
- Maps apps (HERE, Maps.me): Download offline map tiles
- Photo apps: Upload full-resolution photos when charging

**Implementation Complexity:** 4/5
- Not directly exposed by Expo SDK — requires custom native code or a plugin
- `expo-background-task` (third-party) provides limited wrapping
- Full access requires an Expo config plugin that modifies AppDelegate

**Expo Compatibility:**
- Not in Expo SDK officially
- Can be implemented via a custom Expo config plugin (modifies Info.plist + AppDelegate)
- Requires EAS Build (no Expo Go support)

**x/pat Relevance:**
- Use case: pre-download spot photos and map tiles for a city the user has selected as their base
- "Download Bangkok offline" feature — initiate full city data package download during BGProcessingTask
- High UX value for nomads arriving at a new city on airplane mode

**Pre or Post-Launch:** POST-LAUNCH (v1.2+ feature). "Offline city packs" is a v2 feature. Implement BGProcessingTask as part of that feature.

---

### Topic 18: Android WorkManager

**What it is:** Android's recommended solution for guaranteed background work. Unlike older AlarmManager or JobScheduler approaches, WorkManager works even if the app is killed or the device restarts. Supports chaining, constraints (network, battery), and retry policies.

**How it works:**
- Define a `Worker` class with a `doWork()` method
- Enqueue work with constraints: `Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED)`
- WorkManager persists the work request to a Room database — survives app kill and reboot
- Supports: periodic work (every 15 min), one-time work, chained work

**Industry Examples:**
- Gmail: Email sync via WorkManager on Android
- Google Drive: Upload queue via WorkManager
- WhatsApp: Media upload queue uses WorkManager

**Implementation Complexity:** 3/5 for Android native; 4/5 to expose to React Native
- `expo-background-fetch` wraps WorkManager for simple periodic tasks
- For advanced WorkManager features (chaining, custom constraints): requires a custom Expo module or Turbo Native Module

**Expo Compatibility:**
- Basic periodic sync: `expo-background-fetch` wraps WorkManager automatically
- Advanced features: `react-native-background-job` or `react-native-background-actions` (community packages, varying maintenance status)
- Best advanced option: write a custom Expo module in Kotlin exposing WorkManager

**x/pat Relevance:**
- Android-side complement to iOS BackgroundFetch for the sync queue
- `expo-background-fetch` is sufficient for x/pat's needs (drain pending queue)
- Advanced WorkManager only needed if x/pat adds large file sync (city packs, photo uploads)

**Pre or Post-Launch:** POST-LAUNCH. `expo-background-fetch` handles the basic Android background sync requirement. WorkManager advanced features are v2 territory.

---

### Topic 19: Connectivity Detection and Adaptive Sync

**What it is:** Detecting not just online/offline state but network quality (WiFi vs cellular, fast vs slow) and adapting sync behavior accordingly. Avoid syncing large payloads on metered connections. Trigger aggressive sync on WiFi.

**How it works:**
```typescript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  if (state.isConnected && state.type === 'wifi') {
    // Aggressive sync: full delta, prefetch next page
    syncAllPendingActions();
    prefetchNearbySpots();
  } else if (state.isConnected && state.type === 'cellular') {
    // Conservative sync: only drain critical queue
    syncCriticalPendingActions();
  } else {
    // Offline mode
    enableOfflineUI();
  }
});
```

**Industry Examples:**
- Spotify: Downloads on WiFi only by default; streams on cellular
- Netflix: Quality adapts to connection speed; downloads require WiFi by default
- Google Maps: Offline map downloads only on WiFi

**Implementation Complexity:** 2/5 — `NetInfo` provides all necessary data

**Expo Compatibility:**
- `@react-native-community/netinfo` — works in Expo Go and dev client
- `expo-network` — simpler but less detailed (no connection type)
- Use NetInfo for production; expo-network for quick prototypes

**x/pat Relevance:**
- WiFi: sync pending queue + prefetch nearby spots for next city
- Cellular: sync pending queue only (no prefetch)
- Offline: queue writes, show cached UI with "offline" indicator
- Nomads especially appreciate apps that don't burn mobile data — a WiFi-only prefetch option in settings would be well-received

**Pre or Post-Launch:** PRE-LAUNCH. Connection-aware sync behavior is expected by 2026. The NetInfo integration is 1 day. Add a "Sync on WiFi only" setting in the profile preferences screen.

---

### Topic 20: Push-to-Sync (Silent Push Notifications)

**What it is:** Server sends a silent (non-visible) push notification when it has new data for the client. The app wakes briefly in background, fetches the delta, updates local cache. User opens app to find data already fresh.

**How it works:**
- iOS: `content-available: 1` flag in APNs payload + `apns-push-type: background`
- Android: FCM `data` message (not `notification` message) for silent delivery
- App's push handler calls sync service, fetches delta, stores in local cache
- Time limit: iOS allows ~30 seconds of background execution on silent push

**Industry Examples:**
- iMessage: Silent push to wake the app and fetch new messages before user opens app
- WhatsApp: Hybrid — visible push for message preview + silent push for full sync
- Slack: Silent push triggers channel sync before notification tap

**Implementation Complexity:** 4/5
- Requires push infrastructure (already planned via expo-notifications)
- iOS strict limits on background execution time
- Supabase needs a mechanism to send silent pushes on relevant changes (Edge Function + webhook)

**Expo Compatibility:**
- `expo-notifications` — handles both visible and silent notifications
- Configure `setNotificationHandler` to intercept background notifications
- Requires push credentials (already configured in EAS for x/pat)

**x/pat Relevance:**
- High value for: "New spots added in your current city" — app is fresh when user opens
- Implementation: Supabase webhook → Edge Function → Expo push API → silent push to user
- Pre-launch push infrastructure (expo-notifications) is already in Sprint 10 scope

**Pre or Post-Launch:** POST-LAUNCH. Silent push requires careful iOS permission handling and battery optimization. Pre-launch: standard visible pushes. Post-v1.1: add silent push for feed freshness.

---

## DOMAIN 5: Conflict Resolution Strategies (Topics 21–25)

---

### Topic 21: Last-Write-Wins (LWW)

**What it is:** The simplest conflict resolution strategy. When two writes conflict, the one with the later timestamp wins. The earlier write is discarded.

**How it works:**
- Every record has an `updated_at` timestamp (millisecond precision)
- On sync: `INSERT INTO spots ... ON CONFLICT (id) DO UPDATE SET ... WHERE excluded.updated_at > spots.updated_at`
- Supabase: `supabase.from('spots').upsert(data, { onConflict: 'id' })`
- Postgres timestamp comparison handles the logic

**Industry Examples:**
- Amazon S3: Object versioning uses LWW for concurrent PUTs
- DynamoDB: Default conflict resolution is LWW
- Most simple mobile sync systems (Evernote legacy, early Dropbox)

**Implementation Complexity:** 1/5 — trivial to implement

**Failure Modes:**
- Clock skew: if two devices have different system clocks, the "later" write might be from the device with a fast clock, not the actual later write
- Rapid edits: user edits on Device A, then switches to Device B, edits on B, sync arrives from A — A's edit is lost even though it was valid
- Solution: use server-assigned timestamps instead of client timestamps for `updated_at`

**x/pat Relevance:**
- Appropriate for: user profile fields (name, bio, avatar URL), spot descriptions, spot hours
- These fields are rarely edited simultaneously from multiple devices
- Use server-assigned `updated_at` (Supabase default trigger): eliminates clock skew

**Pre or Post-Launch:** PRE-LAUNCH. x/pat should use LWW as the default conflict strategy for all mutable fields. Server-assigned timestamps (already in Supabase schema via triggers) make this safe.

---

### Topic 22: Server-Authoritative Sync (Single Source of Truth)

**What it is:** The server always wins. Client changes are proposals. The server validates, applies, and returns the canonical state. Client never assumes its local change is final until server confirms.

**How it works:**
1. Client writes locally with `status: 'pending'`
2. Client POSTs proposed change to server
3. Server validates, applies (or rejects)
4. Server returns canonical state: `{ success: true, data: {...} }` or `{ success: false, reason: '...', canonical: {...} }`
5. Client updates local state with server's canonical version
6. On conflict: client discards its local version, adopts server version

**Industry Examples:**
- Chess.com: Move validation is server-authoritative (client can't fake moves)
- Stripe: Payment state is server-authoritative; client status is provisional
- Banking apps: All balance updates are server-authoritative

**Implementation Complexity:** 2/5 — simple to implement; complexity is in handling rejection gracefully

**x/pat Relevance:**
- Required for: check-ins (server validates user isn't already checked in), reviews (server checks one-review-per-user-per-spot constraint), follow actions (server enforces follow limits or block lists)
- For social integrity: server-authoritative prevents client-side manipulation of like counts, check-in counts, follower counts

**Pre or Post-Launch:** PRE-LAUNCH. All social-integrity-critical actions (check-ins, reviews, follows) must be server-authoritative. The server is the arbiter of social state.

---

### Topic 23: CRDTs (Conflict-free Replicated Data Types)

**What it is:** Mathematical data structures that can be merged from multiple concurrent sources without conflicts, by design. The merge operation is commutative, associative, and idempotent — merging in any order always produces the same result.

**Common CRDT Types:**
- **G-Counter**: Grow-only counter (like counts, view counts) — each device has its own counter, merge sums them
- **PN-Counter**: Positive-negative counter (like/unlike) — two G-counters, one for adds, one for removes
- **OR-Set**: Add/remove set where adds always win over concurrent removes (used for collaborative tag lists)
- **LWW-Element-Set**: Set with last-write-wins per element
- **RGA (Replicated Growable Array)**: For collaborative text editing — basis for Yjs, Automerge

**Industry Examples:**
- Figma: Uses CRDTs for layer state in collaborative design
- Notion: Text blocks use a CRDT-like model
- Linear: Issue state machine uses CRDT principles for offline updates
- Apple Notes: CloudKit sync uses a form of CRDTs for concurrent edits

**Implementation Complexity:** 4/5 for custom implementation; 3/5 with Yjs or Automerge

**Expo/React Native Packages:**
- `yjs` — most popular CRDT library; WebSocket sync with `y-websocket`; no React Native-specific adapter but works in JS layer
- `automerge` — JSON-native CRDTs; heavier than Yjs; `@automerge/automerge-repo` for sync
- Both require careful memory management on mobile

**x/pat Relevance:**
- G-Counter / PN-Counter: like counts, check-in counts — naturally CRDT-friendly
- Or-Set: spot tags (community-added tags) — concurrent adds should merge, not conflict
- Full CRDT adoption is architectural overkill for v1; targeted use for counters is feasible
- Yjs would be relevant if x/pat adds collaborative spot editing (community wiki model)

**Pre or Post-Launch:** POST-LAUNCH. LWW + server-authoritative covers v1 needs. CRDTs for collaborative spot enrichment (community tags, wiki descriptions) is a v2 feature.

---

### Topic 24: Vector Clocks and Causal Ordering

**What it is:** A mechanism to track causal relationships between events across distributed devices. Each device maintains a version vector `{ deviceA: 5, deviceB: 3 }`. On sync, comparing version vectors reveals concurrent operations vs. causally ordered ones.

**How it works:**
- Each device has a unique ID and a local clock counter
- Every write increments the device's own counter: `deviceA: 5 → 6`
- Version vector travels with every record
- Comparing two vectors: if all counters in A ≤ B, then A happened before B (no conflict). If some counters in A > B and some in B > A, they're concurrent (conflict).

**Industry Examples:**
- Riak (distributed database): Uses vector clocks for conflict detection
- CouchDB: Uses a simplified form (revision tree) for document conflict tracking
- Amazon Dynamo paper: Introduced vector clocks to the mainstream

**Implementation Complexity:** 4/5 — conceptually clear but operationally complex
- Vector management across many devices grows storage cost
- Pruning stale device entries requires coordination

**Expo/React Native Packages:**
- No dedicated package; custom implementation required
- `vector-clock` npm package (utility library)
- Typically implemented as part of a sync engine, not standalone

**x/pat Relevance:**
- Overkill for x/pat's use case. x/pat has simple, user-scoped data. A user's profile is only written by that user. A review is only written by its author. Concurrent conflicting writes from the same user on two devices are rare.
- LWW with server-assigned timestamps effectively handles x/pat's concurrency patterns without vector clock complexity.

**Pre or Post-Launch:** NOT RECOMMENDED. Complexity-to-benefit ratio too high for x/pat's data model.

---

### Topic 25: Three-Way Merge (Diff3)

**What it is:** When two versions of a document diverge from a common base version, diff3 identifies what each version changed relative to the base and merges the non-overlapping changes automatically. Conflicting changes (same region edited by both) are flagged for user resolution.

**How it works:**
1. Base version: `{ description: "Great WiFi, good coffee" }`
2. Version A (user edit): `{ description: "Great WiFi, good coffee, standing desks" }`
3. Version B (concurrent edit): `{ description: "Excellent WiFi, good coffee" }`
4. Diff3 detects: A added "standing desks" (non-conflicting), B changed "Great" to "Excellent" (conflicting region)
5. Result: auto-merge the "standing desks" addition; present WiFi adjective conflict for user resolution

**Industry Examples:**
- Git: Uses diff3 for merge conflicts
- Mercurial, SVN: Same algorithm
- Text editors with collaborative mode: Atom Teletype used diff3

**Implementation Complexity:** 4/5
- `diff3` npm package exists but is designed for text, not structured data
- Applying diff3 to JSON fields requires field-level diffing

**Expo/React Native Packages:**
- `diff3` (npm) — text-based diff3
- `json-merge-patch` (RFC 7396) — simpler structured merge for JSON objects
- No Expo-specific package

**x/pat Relevance:**
- Relevant if x/pat implements community-editable spot descriptions (wiki model)
- Not relevant for user profile fields (user-owned, no concurrent editors)
- Spot descriptions edited by both the creator and a moderator simultaneously — diff3 resolves this

**Pre or Post-Launch:** POST-LAUNCH. Required only when x/pat introduces community editing. Not a launch concern.

---

## DOMAIN 6: UX Patterns for Offline Apps (Topics 26–30)

---

### Topic 26: Skeleton Screens and Loading States

**What it is:** Instead of a blank screen or spinner while data loads, show anatomically correct placeholders (skeleton shapes matching the real content layout) that pulse with a shimmer animation. Drastically improves perceived performance.

**Psychology:** Skeleton screens set user expectations about content shape. They signal "data is coming" rather than "something broke." Facebook, LinkedIn, and YouTube all shipped skeleton screens and reported 20-30% improvements in perceived performance scores.

**Industry Examples:**
- Facebook: Pioneered skeleton screens in the News Feed (2016)
- LinkedIn: Card skeletons for feed and profile
- YouTube: Video thumbnail skeletons while feed loads
- Airbnb: Listing card skeletons

**Implementation Complexity:** 2/5

**Expo/React Native Packages:**
- `react-native-skeleton-placeholder` — most popular, customizable shapes
- `moti` — animation library with built-in skeleton support (from Expo team's Nate Weinert)
- `react-native-reanimated` — for custom shimmer animations
- Custom implementation is also viable (View with gradient animation)

**x/pat Design Alignment:**
- x/pat's Mercury/liquid glass aesthetic pairs well with skeleton screens using dark shimmer (`#1A1A2E` → `#252545` gradient)
- SpotCard skeletons: rectangular image placeholder + 2 text line placeholders
- FeedScreen skeleton: 3-4 stacked SpotCard skeletons
- ProfileScreen skeleton: circular avatar + 2 text lines

**Pre or Post-Launch:** PRE-LAUNCH. Skeleton screens should be in every data-loading screen before launch. Users have high expectations in 2026; spinners feel dated. `moti` skeletons take 2-4 hours to implement per screen.

---

### Topic 27: Optimistic UI Feedback (Visual Confirmation Patterns)

**What it is:** Immediate visual feedback for user actions before server confirmation. The UI updates as if the action succeeded, with subtle animation. If the action fails, the UI reverts with a clear error message.

**Patterns:**
1. **Instant toggle**: Like button fills immediately on tap (heart → filled heart, color transition)
2. **Instant counter update**: Like count increments immediately
3. **Instant list insertion**: New comment appears at top of list immediately
4. **Pending state indicator**: A subtle dot or ring around the item indicating it's pending sync
5. **Success animation**: Brief burst animation (confetti, pulse) on confirmed sync

**Industry Examples:**
- Twitter: Heart animation on like (immediate) → confirmed (API returns)
- Instagram: Double-tap like is instantly visible
- Duolingo: XP counter animates immediately on lesson complete, settles on server-confirmed value
- Todoist: Task checked off immediately with strikethrough; syncs in background

**Implementation Complexity:** 2/5 for basic toggles; 3/5 for counter animations with rollback

**Expo/React Native Packages:**
- `react-native-reanimated` — spring animations for state transitions
- `lottie-react-native` — for complex success animations (Lottie files from LottieFiles.com)
- `moti` — simpler animation API built on Reanimated

**x/pat Relevance:**
- Heart/bookmark fill animation for saving a spot (immediate, pre-server)
- Check-in button glow animation (immediate, pre-server)
- Follow button transition: "Follow" → "Following" immediately
- Pending sync dot: subtle indicator on comments/reviews that haven't synced yet

**Pre or Post-Launch:** PRE-LAUNCH. The like/save animations are core to the social app feel. Without them, the app feels unresponsive. Implement all primary interaction feedback pre-launch.

---

### Topic 28: Offline Mode Banner and Sync Status Indicators

**What it is:** Clear, non-intrusive UI elements that communicate connectivity status to the user. A top banner when offline. A sync progress indicator when draining the queue. A "Last synced X minutes ago" timestamp.

**Design Principles:**
1. **Non-blocking**: Offline indicator should not prevent app use — show it, don't block
2. **Actionable**: "You're offline. Tap to retry" is better than "No connection"
3. **Contextual**: Show offline indicators near affected content, not globally
4. **Recovery**: When coming back online, animate the indicator away with a brief "Syncing..." then "Up to date" confirmation

**Industry Examples:**
- Gmail: "Working offline" banner — non-blocking, shows draft queue count
- Slack: Yellow bar "Reconnecting..." → green "Back online" → fades out
- Notion: "Syncing" spinner in header → checkmark when synced
- Google Docs: "Offline" badge in toolbar; "All changes saved" when synced
- WhatsApp: "Waiting for this message" with clock icon → checkmarks when delivered

**Implementation Complexity:** 2/5

**Expo/React Native Packages:**
- `@react-native-community/netinfo` — connectivity state
- Custom banner component (Animated.View sliding down from top)
- `react-native-reanimated` for smooth slide animation
- Toast libraries: `react-native-toast-message`, `burnt` (Expo-native)

**x/pat Design:**
- Offline: Subtle amber/yellow bar (not red — red implies error, not graceful degradation): "Offline — your changes will sync when connected"
- Syncing: Small spinner + "Syncing 3 changes..." in header status
- Synced: Brief "All saved" → fades after 2 seconds
- Match to Mercury aesthetic: frosted glass banner, not a hard-colored bar

**Pre or Post-Launch:** PRE-LAUNCH. Offline indicator is mandatory for an app targeting nomads. The absence of it makes offline failures confusing. 1-day implementation.

---

### Topic 29: Content Availability Indicators (Cached vs. Live)

**What it is:** Visual differentiation between content served from local cache (potentially stale) vs. freshly fetched from the server. Helps users make decisions with accurate information about data freshness.

**Patterns:**
1. **Staleness timestamp**: "Last updated 2 hours ago" on a spot's details
2. **Cache badge**: A subtle "Cached" or cloud-with-slash icon near content known to be offline-only
3. **Freshness gradient**: New content has slightly higher contrast/brightness; older cache content slightly muted
4. **"Refresh for latest" prompt**: Pull-to-refresh with a note "Showing cached data from 3h ago"

**Industry Examples:**
- Google Maps offline areas: Shows "Offline area" badge on downloaded map regions
- Spotify: "Downloaded" green arrow on tracks available offline
- Pocket (read-later app): Shows article save date; "Cached" indicator on offline articles
- Citymapper: "Offline" indicator on cached transit routes

**Implementation Complexity:** 2/5
- React Query's `dataUpdatedAt` timestamp enables "last updated" display
- `isStale` from React Query indicates if data might be outdated

**Expo/React Native Packages:**
- `@tanstack/react-query` — `dataUpdatedAt`, `isStale`, `isFetching` from `useQuery`
- `date-fns` — "2 hours ago" formatting via `formatDistanceToNow`

**x/pat Relevance:**
- SpotDetail screen: "Last updated 4h ago" on spot info (hours, WiFi speed) — critical for nomads who need accurate operational info
- FeedScreen: "Cached — pull to refresh" prompt when showing stale feed
- Check-in count: "3 people here • 15 min ago" — timestamp on presence data

**Pre or Post-Launch:** PRE-LAUNCH for spot details (WiFi speed, hours are time-sensitive). Post-launch for feed staleness indicators (lower stakes).

---

### Topic 30: Progressive Data Loading and Offline Graceful Degradation

**What it is:** Design the app to load and display whatever data is available — local cache first, then progressively enhance with fresh server data as it arrives. Never show an empty screen when cached data exists. Gracefully degrade features when offline (disable write actions, not read actions).

**Patterns:**
1. **Stale-while-revalidate**: Show cached data immediately, fetch fresh data in background, silently update when it arrives
2. **Progressive enhancement**: Basic spot card from cache, enhanced with live check-in count when online
3. **Feature degradation**: Check-in button grayed out with "Requires connection" tooltip when offline; browsing still works
4. **Offline landing**: If app launched with no cache, show "Discover spots" button pointing to a bundled starter dataset

**Industry Examples:**
- Google Maps: Full offline navigation from cached maps; routing works; search limited
- Spotify: Full playback of downloaded songs; browse limited to downloaded
- Airbnb: Property listings cached from recent searches; booking requires online
- Wikipedia app: Cached articles readable offline; search requires online

**Implementation Complexity:** 3/5
- Requires coordinated design decisions: which features degrade gracefully, which fail
- `networkMode` settings in React Query control this behavior
- UI needs offline-aware variants of interactive components

**Expo/React Native Packages:**
- `@tanstack/react-query` — `networkMode: 'offlineFirst'` for queries, `'always'` for critical online-only operations
- `@react-native-community/netinfo` — gate feature availability on `isConnected`
- `expo-network` — simpler connectivity check for feature gating

**x/pat Graceful Degradation Matrix:**

| Feature | Offline Behavior |
|---|---|
| Browse spots | Full functionality (cached data) |
| View spot detail | Full (cached) + stale indicator |
| Search spots | Local search on cached data |
| Save spot | Optimistic + queue sync |
| Write review | Optimistic + queue sync |
| Check in | Queue sync + pending indicator |
| View profile | Cached |
| Edit profile | Queue sync |
| View chat | Cached messages |
| Send chat message | Queue sync |
| Real-time presence | Disabled gracefully (no "X people here now") |
| Map view | Cached map tiles (React Native Maps caches tiles) |

**Pre or Post-Launch:** PRE-LAUNCH. The degradation matrix should be designed and implemented before launch. Nomads will hit offline scenarios in the first week. An app that shows blank screens or crashes offline will not survive early App Store reviews.

---

## Implementation Roadmap for x/pat

### Pre-Launch (Before v1.0 / Current Sprint)

**Priority 1 — High Impact, Low Effort (1-3 days each):**
1. **React Query persistence** (Topic 10): Add `persistQueryClient` with MMKV persister. Spots, profiles, and feed load instantly on reopen.
2. **Optimistic updates on all mutations** (Topics 1, 12): Save/like/follow/check-in update UI instantly. Use the `useOptimisticMutation` hook pattern.
3. **Offline mode banner** (Topic 28): Amber banner when offline. Non-blocking. 1 day.
4. **Skeleton screens** (Topic 26): SpotCard, FeedScreen, SpotDetail, ProfileScreen skeletons.
5. **Delta sync watermark** (Topic 5): `last_sync_at` MMKV key, add `.gt('updated_at', lastSync)` to spots query.
6. **Connectivity-aware sync** (Topic 19): NetInfo integration for WiFi vs cellular vs offline behavior.
7. **LWW conflict strategy** (Topic 21): Verify all Supabase upserts use server-assigned timestamps.
8. **Graceful degradation matrix** (Topic 30): Audit every screen/action for offline behavior.

**Priority 2 — Medium Impact, Medium Effort (3-5 days):**
9. **Persistent mutation queue** (Topic 3): MMKV-backed queue for saves, reviews, comments, check-ins.
10. **Server-authoritative for social actions** (Topic 22): Check-ins, reviews validated server-side.
11. **Optimistic UI animations** (Topic 27): Like animation, follow button transition, check-in glow.
12. **Staleness timestamps** (Topic 29): "Last updated X ago" on SpotDetail for WiFi/hours info.

### Post-Launch (v1.1 — v1.2)

**v1.1:**
- Background sync via `expo-background-fetch` (Topic 16)
- Silent push notifications for feed freshness (Topic 20)
- "Sync on WiFi only" user preference
- Supabase Realtime for live check-in presence (Topic 13)

**v1.2:**
- WatermelonDB or RxDB evaluation for offline spot browsing (Topics 6, 7)
- Offline city packs (bundled spot data for top nomad cities)
- BGProcessingTask for iOS city pack downloads (Topic 17)
- Edge Function batch sync endpoint (Topic 15)

**Future / Not Recommended:**
- OT (Topic 2): Not applicable
- PGlite/Electric SQL (Topic 14): Monitor quarterly
- Vector clocks (Topic 24): Not needed
- Three-way merge (Topic 25): Only if community wiki editing launches
- CRDTs (Topic 23): Re-evaluate if collaborative spot editing becomes a feature

---

## Package Summary

| Package | Use Case | Expo Go | Dev Client | Priority |
|---|---|---|---|---|
| `@tanstack/react-query` v5 | Caching, mutations, offline queue | Yes | Yes | PRE-LAUNCH |
| `@tanstack/react-query-persist-client` | Cache persistence | Yes | Yes | PRE-LAUNCH |
| `react-native-mmkv` | Fast sync queue, watermarks | No | Yes | PRE-LAUNCH |
| `@react-native-community/netinfo` | Connectivity detection | Yes | Yes | PRE-LAUNCH |
| `moti` | Skeleton screens, animations | Yes | Yes | PRE-LAUNCH |
| `react-native-reanimated` | Optimistic UI animations | Yes | Yes | PRE-LAUNCH |
| `expo-secure-store` | Auth token storage | Yes | Yes | PRE-LAUNCH |
| `expo-background-fetch` | Background sync | No | Yes | POST-LAUNCH |
| `expo-task-manager` | Background task registration | No | Yes | POST-LAUNCH |
| `@nozbe/watermelondb` | Full offline SQLite | No | Yes | POST-LAUNCH |
| `rxdb` | Reactive NoSQL offline | No | Yes | POST-LAUNCH |
| `expo-sqlite` | Local SQLite cache | Yes | Yes | POST-LAUNCH |
| `lottie-react-native` | Success animations | No | Yes | POST-LAUNCH |
| `yjs` | CRDT collaborative editing | Yes | Yes | FUTURE |

---

## Key Decision: React Query Persistence is the Launch Unlock

x/pat is already (presumably) using React Query for data fetching. The highest-ROI offline improvement is adding `persistQueryClient` with an MMKV persister. This single change:
- Makes the spots feed load in <100ms on reopen (from cache)
- Enables browsing all 431 spots offline
- Queues mutations when offline (with `networkMode: 'offlineFirst'`)
- Requires no architectural changes

Combined with skeleton screens and an offline mode banner, this is a full offline-capable experience in approximately 5 engineering days — entirely pre-launch.

The heavier architectural work (WatermelonDB, Event Sourcing, Background sync) is real but is post-launch optimization, not a launch blocker. Ship the React Query persistence layer now; evaluate WatermelonDB after seeing actual user offline behavior patterns from analytics.
