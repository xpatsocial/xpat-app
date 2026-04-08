# Performance Benchmarks & Scaling Strategy: 2026 Edition

**For x/pat** -- Social travel app for digital nomads
**Stack**: React Native 0.83 / Expo SDK 55 / Supabase / PostHog / Sentry
**Date**: April 2026

---

## Executive Summary

This report compiles production-grade performance benchmarks, cost projections, and optimization recommendations across five domains: React Native runtime performance, Supabase backend scaling, mobile optimization patterns, infrastructure milestones from 0 to 100K users, and monitoring/observability. All data reflects 2025-2026 ecosystem benchmarks. Key takeaway: x/pat's current stack is well-positioned for launch and early growth. The critical optimization investments are (1) enabling New Architecture if not already active, (2) migrating to MMKV for local storage, (3) implementing marker clustering on maps, and (4) setting up Sentry Performance tracing before launch.

---

## 1. React Native Performance Benchmarks (2026)

### 1.1 Cold Start Time

Cold start is the single most user-visible performance metric. Industry benchmarks for social/travel apps on React Native in 2026:

| Rating | Cold Start (ms) | Notes |
|--------|-----------------|-------|
| **Excellent** | < 1,000 | Top-tier apps with aggressive lazy loading |
| **Good** | 1,000 - 2,000 | Acceptable for most social apps |
| **Average** | 2,000 - 3,000 | Noticeable delay, users tolerate it |
| **Poor** | > 3,000 | Drop-off risk, especially on Android mid-range |

**Target for x/pat**: Under 2,000ms on mid-range devices. Under 1,200ms on flagships.

**Key improvements in RN 0.83+**:
- Hermes V1 (opt-in in 0.82, improved in 0.83) delivers up to 7.6% startup improvement on low-end Android
- Metro bundler achieved 3x faster cold startup in 2025 updates
- Android-specific: skipping JS bundle compression reduces cold start measurably
- React Native 0.84 (Feb 2026) reports 10-15% TTI improvement for complex views with Hermes V1 as default

### 1.2 FPS Benchmarks

| Interaction | Target FPS | Fabric (New Arch) | Legacy Bridge |
|-------------|------------|-------------------|---------------|
| List scrolling | 60 | 55-60 | 30-45 |
| Animations (Reanimated) | 60 | 58-60 | 40-55 |
| Map pan/zoom | 60 | 55-60 (native) | 45-55 |
| Screen transitions | 60 | 55-60 | 35-50 |

The Fabric renderer is the single largest FPS improvement. With React Native 0.76+ making New Architecture the default and 0.82 permanently disabling the old bridge, x/pat on SDK 55 should already be on the New Architecture path.

### 1.3 Memory Usage

Baseline memory benchmarks for React Native apps (2025-2026):

| Component | Typical RAM | Notes |
|-----------|-------------|-------|
| JS heap (idle) | 8-12 MB | Spikes with JSON parsing, large state |
| Base app (minimal screens) | 40-80 MB | iOS tends lower than Android |
| With maps loaded | +30-60 MB | Tile caching is the main driver |
| With real-time chat active | +15-25 MB | WebSocket + message buffer |
| **Total for map+chat app** | **120-180 MB** | Mid-range device ceiling: 200-250 MB |

React Native shows a memory delta of ~45 MB (SD: 10.9 MB) during active use -- higher variability than Flutter or native, meaning memory monitoring is essential.

**Rule of thumb**: Keep per-screen memory under 20 MB on iOS, low double-digits on Android. Monitor with `react-native-performance-stats` or Sentry Performance.

### 1.4 Bundle Size

Expo managed workflow apps include the full SDK, making bundles larger than bare React Native:

| Metric | Typical Range | Notes |
|--------|---------------|-------|
| JS bundle (Hermes bytecode) | 2-8 MB | Depends on dependencies |
| iOS IPA (App Store) | 30-60 MB | After App Store thinning |
| Android APK | 25-50 MB | AAB is smaller after Play delivery |
| OTA update (EAS Update) | 0.5-3 MB | 75% smaller with Hermes bytecode diffing (2026) |

**2026 improvement**: Hermes Bytecode Diffing in latest Expo SDK dramatically reduces OTA update sizes. React Server Components (experimental) may further reduce bundle sizes by offloading data fetching to server.

Use **Expo Atlas** and **Lighthouse** to analyze and reduce bundle size. Tree-shake unused Expo modules where possible.

### 1.5 New Architecture (Fabric/TurboModules) Real-World Gains

Production data from Shopify and other large-scale migrations (2025-2026):

| Metric | Improvement | Source |
|--------|-------------|--------|
| Cold startup | 43% faster | Shopify production |
| Rendering performance | 39% faster | Shopify production |
| Memory usage | 25-26% reduction | Across app lifecycle |
| Native module call overhead | 10x reduction | JSI vs Bridge serialization |
| Animation FPS | 55-60 vs 30-45 | Fabric vs Legacy |

**Ecosystem compatibility** (2026): 90%+ core ecosystem is New Architecture compatible -- React Navigation 7.2+, Reanimated 3.5.1+, Gesture Handler 2.16.2+, Expo SDK 52+ full Fabric, Vision Camera 4.0+, Detox E2E.

---

## 2. Supabase Scaling Research

### 2.1 Free vs Pro Tier Limits (2026)

| Resource | Free | Pro ($25/mo) | Team ($599/mo) |
|----------|------|-------------|----------------|
| Projects | 2 | Unlimited | Unlimited |
| Database storage | 500 MB | 8 GB (then $0.125/GB) | 8 GB included |
| File storage | 1 GB | 100 GB (then $0.021/GB) | 100 GB included |
| Database egress | 5 GB | 250 GB (then $0.09/GB) | 250 GB included |
| Monthly active users | 50,000 | 100,000 (then $0.00325/user) | 100,000 included |
| Edge function invocations | 500,000 | 2,000,000 | 2,000,000 |
| Realtime peak connections | 200 | 500 (then per 1K package) | 500 included |
| Realtime messages | 2M/mo | 5M/mo | 5M/mo |
| Inactivity pause | After 1 week | Never | Never |
| Backups | None | Daily | Daily |

**When to upgrade from Free to Pro**: Move when you hit any of: 400+ MB database, need daily backups, require no-pause guarantee, exceed 200 concurrent realtime connections, or need email support. For x/pat at launch, Pro ($25/mo) is already active and appropriate.

### 2.2 Connection Pooling (PgBouncer)

Supabase includes PgBouncer by default. For mobile apps:
- Use **transaction mode** (default) -- connections are returned to pool after each query
- Free tier: 200 concurrent database connections ceiling
- Pro tier: scales with compute add-on (Small: 60 direct / 200 pooled, Medium: 120 / 400 pooled)
- Mobile apps should always use the pooled connection string (port 6543)
- Configure client-side connection timeout and retry logic

### 2.3 Realtime Channel Limits for City Chat

For x/pat's city chat architecture:
- Free tier: 200 concurrent realtime connections (sufficient for beta)
- Pro tier: 500 included, then billed per 1,000-connection package
- Each user subscribed to a city chat channel = 1 concurrent connection
- **Architecture recommendation**: Use a single Postgres Changes subscription per city channel, not per-message polling. Implement channel multiplexing -- one WebSocket connection can subscribe to multiple channels.

**Scaling projection for city chat**:
- 10 cities, 50 concurrent users/city = 500 connections (Pro tier limit)
- 30 cities, 100 concurrent users/city = 3,000 connections (~$75/mo additional)
- Fan-out architecture: consider Edge Function broadcast for 10K+ concurrent

### 2.4 Row-Level Security Performance at Scale

RLS is powerful but adds query overhead. Benchmarks:

| Row Count | Without Index | With Index | Improvement |
|-----------|---------------|------------|-------------|
| 10K | ~50 ms | ~5 ms | 10x |
| 100K | ~450 ms | ~45 ms | 10x |
| 1M | ~3,000+ ms (timeout risk) | ~100-200 ms | 15-30x |

**Critical optimizations**:
1. Index every column referenced in RLS policies
2. Use `SECURITY DEFINER` functions for subqueries (execute once, not per-row)
3. Wrap `auth.uid()` in a SELECT to cache per-statement instead of per-row
4. Avoid JOINs in RLS policies -- use materialized membership tables instead
5. Test RLS query plans with `EXPLAIN ANALYZE` as data grows

### 2.5 Edge Function Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Cold start (median) | 400 ms | First request in hourly window |
| Hot response (median) | 125 ms | Subsequent requests |
| Cold start (optimized) | ~12 ms | With persistent storage (97% improvement) |
| Wall clock limit | 150 seconds (Free), 400s (Pro) | Per invocation |

**Optimization strategies**: Consolidate multiple actions into a single Edge Function to reduce cold starts. Keep dependencies minimal. Leverage the new persistent storage feature for dramatically faster cold starts.

### 2.6 Supabase vs Firebase vs Appwrite (2026)

| Feature | Supabase | Firebase | Appwrite |
|---------|----------|----------|----------|
| Database | PostgreSQL (full SQL) | Firestore (NoSQL) | MariaDB |
| Open source | Yes | No | Yes |
| Self-hosting | Yes | No | Yes |
| Realtime | Postgres Changes + Broadcast | Native realtime DB | Realtime subscriptions |
| Auth providers | 20+ | 20+ | 20+ |
| Edge functions | Deno (TypeScript) | Cloud Functions (Node) | Multi-language |
| Vendor lock-in | Low (standard Postgres) | High | Low |
| Cost at 10K MAU | ~$27/mo | ~$50-100/mo | ~$25/mo |
| Cost at 100K MAU | ~$630/mo | ~$1,500-3,000/mo | ~$400-600/mo |
| Mobile SDK maturity | Good | Excellent | Good |

**Verdict for x/pat**: Supabase remains the right choice. PostgreSQL's full-text search, JSON operations, and extensions (PostGIS for geo) outweigh Firebase's more mature mobile SDK. Cost advantage widens significantly at scale.

---

## 3. Mobile App Performance Optimization

### 3.1 Image Optimization

For a travel app with user-uploaded photos:

| Strategy | Impact | Implementation |
|----------|--------|----------------|
| **expo-image** (replace RN Image) | 2-3x faster loading | Built-in caching via SDWebImage/Glide |
| **WebP format** | 25-35% smaller than JPEG | Supabase Storage transform or CDN |
| **AVIF format** | 50% smaller than JPEG | Newer devices only, use with fallback |
| **Blurhash placeholders** | Perceived instant load | expo-image native support |
| **CDN resizing** | Serve exact dimensions | Prevent client-side downscaling waste |
| **Progressive loading** | Better perceived performance | Low-res first, then full quality |

**Recommendation for x/pat**: Use expo-image with blurhash placeholders. Serve WebP via Supabase Storage image transforms. Implement 3 size variants (thumbnail 150px, card 400px, full 1200px).

### 3.2 Map Rendering Optimization

Critical for x/pat's spot-discovery maps with 431+ seeded spots:

| Technique | Impact | Priority |
|-----------|--------|----------|
| **Marker clustering** (supercluster) | Eliminates render lag at 100+ markers | High |
| **trackViewChanges={false}** | Prevents crash/lag on Android | High |
| **Memoize marker components** | Avoid re-render on every frame | High |
| **LiteMode (Android)** | Reduced memory for static previews | Medium |
| **Throttle region change callbacks** | Reduce JS bridge traffic | Medium |
| **Tile caching (offline)** | Offline map support, reduced bandwidth | Low (pre-launch) |
| **Custom marker image caching** | Avoid redownload of marker icons | Medium |

**At scale (10K+ markers)**: Consider Deck.GL + WebView approach for GPU-accelerated rendering, or implement aggressive viewport-based marker virtualization (only render markers in visible bounds + buffer).

### 3.3 Chat Performance

For x/pat's DM + city chat:

| Optimization | Details |
|-------------|---------|
| **Message pagination** | Load 50 messages initially, paginate on scroll-up |
| **Subscription management** | Subscribe only to active chat channel, unsubscribe on navigate away |
| **Optimistic updates** | Show sent message immediately, reconcile with server |
| **Message deduplication** | Use message UUID to prevent double-render |
| **FlashList for chat** | 5-10x faster than FlatList for long message lists |
| **Image message lazy load** | Only load images in viewport |

### 3.4 Local Storage: MMKV vs AsyncStorage vs SQLite

| Library | Read (1000 ops) | Write (1000 ops) | Sync? | Best For |
|---------|-----------------|-------------------|-------|----------|
| **MMKV** | ~12 ms | ~15 ms | Yes (synchronous) | Settings, tokens, small cache |
| **AsyncStorage** | ~242 ms | ~300 ms | No (async) | Legacy, simple key-value |
| **SQLite (expo-sqlite)** | ~50 ms | ~80 ms | Yes | Structured data, offline-first |

MMKV is 20-30x faster than AsyncStorage. For x/pat:
- **Migrate auth tokens and user preferences to MMKV** (immediate win)
- Use SQLite (via expo-sqlite) for offline spot cache if implementing offline-first
- Keep AsyncStorage only for React Query persistence adapter if needed

### 3.5 React Query Cache Strategies for Location Data

| Pattern | Strategy | TTL |
|---------|----------|-----|
| Spot listings by city | staleTime: 5 min, cacheTime: 30 min | Moderate churn |
| Spot detail | staleTime: 10 min, cacheTime: 1 hour | Rarely changes |
| User profile | staleTime: 1 min, cacheTime: 15 min | May change often |
| City chat messages | staleTime: 0 (always fresh via realtime) | N/A |
| Search results | staleTime: 30 sec, cacheTime: 5 min | Location-dependent |

Use `queryKey` arrays with city/region to automatically invalidate when user changes location. Prefetch adjacent cities on map pan.

---

## 4. Scaling from 0 to 100K Users

### 4.1 Infrastructure Milestones: What Breaks When

| Users | What Breaks | Action Required |
|-------|------------|-----------------|
| **100** | Nothing (if basics are right) | Monitoring, error tracking, basic indexes |
| **1,000** | Slow queries surface, missing indexes | Add composite indexes, enable query logging |
| **5,000** | Realtime connection limits hit | Upgrade Supabase compute, connection pooling tuning |
| **10,000** | Database CPU spikes, slow RLS policies | Optimize RLS, add read replica consideration, CDN for images |
| **25,000** | Push notification queuing delays | Batch notifications, implement queue (Edge Function + pg_cron) |
| **50,000** | Storage egress costs spike, DB size grows | CDN for user photos, archive old messages, consider Supabase Large compute |
| **100,000** | Connection pooling limits, multi-region latency | Read replicas, regional edge functions, dedicated infrastructure |

### 4.2 Database Optimization Timeline

**Pre-launch (now)**:
- Index all foreign keys
- Index columns used in RLS policies
- Index `(city_id, created_at)` for spot queries
- Index `(user_id, created_at)` for message queries

**At 10K users**:
- Add composite indexes based on slow query log analysis
- Consider partial indexes for active records only
- Implement `SECURITY DEFINER` functions for complex RLS

**At 50K+ users**:
- Add read replica for analytics and heavy reads
- Partition large tables (messages, notifications) by date
- Consider pg_partman for automatic partition management

### 4.3 CDN Strategy for User Photos

| Stage | Approach | Cost |
|-------|----------|------|
| 0-10K | Supabase Storage direct (100 GB included on Pro) | $0 additional |
| 10K-50K | Supabase Storage + image transforms (resize on request) | ~$10-30/mo |
| 50K-100K | Cloudflare R2 or Bunny CDN + Supabase Storage origin | ~$50-100/mo |
| 100K+ | Dedicated CDN (Cloudflare) + edge image optimization | ~$100-300/mo |

### 4.4 Push Notification Scaling

| Service | Rate Limit | Cost |
|---------|------------|------|
| Expo Push Service | 600 notifications/sec/project | Free |
| FCM (Android) | ~500K messages/day (free tier) | Free up to quota |
| APNs (iOS) | No hard rate limit, but throttles burst | Free |

Expo's push service is free with no per-notification charge. At 100K users with daily push:
- Batch sends in chunks of 100 (Expo recommendation)
- Implement exponential backoff for failed deliveries
- Clean up stale push tokens (uninstalled users) weekly
- At 100K+ daily sends: consider direct FCM/APNs integration for latency

### 4.5 Cost Modeling by MAU

| MAU | Supabase | Storage/CDN | Push | Monitoring | **Total** |
|-----|----------|-------------|------|------------|-----------|
| **1K** | $25 (Pro base) | $0 | $0 | $0 (free tiers) | **~$25/mo** |
| **10K** | $27-50 | $5-10 | $0 | $29 (Sentry Team) | **~$65-90/mo** |
| **50K** | $200-400 | $30-50 | $0 | $29-80 | **~$260-530/mo** |
| **100K** | $500-700 | $50-100 | $0 | $80-150 | **~$630-950/mo** |

**Versus AWS equivalent at 100K MAU**: ~$3,180/mo. Supabase delivers approximately 3-5x cost advantage at this scale.

---

## 5. Monitoring and Observability

### 5.1 Sentry Configuration for React Native

**Essential setup**:
- Initialize Sentry before any other code in App entry point
- Enable performance tracing with `tracesSampleRate: 0.2` (20% of transactions)
- Configure `attachScreenshot: true` for crash reports
- Set up source maps upload in EAS Build
- Use `Sentry.wrap()` on root component for automatic error boundary

**Performance metrics Sentry captures**:
- App start (cold/warm)
- Slow/frozen frames
- Time to initial display (TTID)
- Time to full display (TTFD)
- Custom spans for API calls, DB queries

**Session Replay considerations**: Active replay recording introduces slow frames on older iOS devices (iPhone 8 era). Set `replaysSessionQuality` to "low" on mobile to reduce CPU/memory/network impact. Sample at 10% for production.

### 5.2 PostHog Session Replay for Mobile

PostHog session replay is available for React Native as of 2026. Requirements:
- PostHog React Native SDK v3.2.0+
- Android API 26+, iOS 13+
- Install `posthog-react-native-session-replay` package

**Limitations**: Wireframe-only mode by default (screenshot mode opt-in), no keyboard capture. Useful for understanding navigation patterns and rage taps, less useful for pixel-perfect debugging.

**Recommendation**: Use PostHog session replay for product analytics (understanding user flows) and Sentry for crash debugging. They complement each other.

### 5.3 Crash-Free Session Rate Benchmarks

| Rating | Crash-Free Rate | Context |
|--------|----------------|---------|
| **Excellent** | > 99.8% | Top-tier production apps |
| **Good** | 99.5 - 99.8% | Healthy production app |
| **Acceptable** | 99.0 - 99.5% | Early-stage startup, known issues |
| **Needs attention** | < 99.0% | Active stability issues |

**Target for x/pat at launch**: 99.5%+ crash-free sessions. Improve to 99.8%+ within first 3 months.

### 5.4 SLO and Error Budget Recommendations

For an early-stage startup, start conservative and tighten as you grow:

| SLI | SLO Target | Error Budget (30 days) |
|-----|------------|------------------------|
| API availability | 99.5% | 3h 39m downtime |
| Crash-free sessions | 99.5% | 0.5% sessions may crash |
| p95 cold start | < 3,000 ms | 5% of starts may exceed |
| p95 API response | < 500 ms | 5% of requests may exceed |
| Chat message delivery | 99.9% | 0.1% messages may fail |
| Push notification delivery | 99.0% | 1% may not deliver (platform dependent) |

**Error budget policy**: When error budget is exhausted (e.g., crash-free drops below 99.5%), freeze feature work and focus exclusively on reliability until budget recovers. This is not punishment -- it is a data-driven signal to shift priorities.

---

## 6. Prioritized Action Items for x/pat

### Immediate (Pre-Launch)

1. **Verify New Architecture is active** -- RN 0.83 should have it by default, confirm in build logs
2. **Set up Sentry Performance tracing** -- `tracesSampleRate: 0.2`, source maps in EAS Build
3. **Implement marker clustering** on map screens (supercluster library)
4. **Set `trackViewChanges={false}`** on all map markers
5. **Measure cold start time** on physical devices, establish baseline

### Short-Term (Post-Launch, 0-1K users)

6. **Migrate to MMKV** for auth tokens and user preferences (20-30x speed improvement)
7. **Add database indexes** on all RLS policy columns and common query patterns
8. **Implement FlashList** for chat message lists (if not already using)
9. **Set up PostHog session replay** at 10% sample rate
10. **Establish SLO dashboard** tracking crash-free rate, cold start, API latency

### Medium-Term (1K-10K users)

11. **Optimize RLS policies** with SECURITY DEFINER functions and cached auth.uid()
12. **Add expo-image** with blurhash placeholders and WebP transforms
13. **Implement React Query** cache strategies per data type (as outlined in 3.5)
14. **Set up push notification batching** and stale token cleanup
15. **Analyze bundle size** with Expo Atlas, tree-shake unused modules

### Growth Phase (10K-100K users)

16. **Add read replica** for analytics queries
17. **Implement CDN** for user-uploaded photos (Cloudflare R2 or Bunny CDN)
18. **Partition messages table** by date
19. **Evaluate Supabase compute upgrade** based on connection pool utilization
20. **Consider regional edge functions** if expanding beyond initial city clusters

---

## Sources

- [React Native 0.83 Features & Updates](https://www.drcsystems.com/blogs/whats-new-in-react-native-0-83-latest-features-you-should-know/)
- [React Native 0.84 - Hermes V1 by Default](https://reactnative.dev/blog/2026/02/11/react-native-0.84)
- [React Native in 2026: Trends & Predictions (SW Mansion)](https://swmansion.com/blog/react-native-in-2026-trends-our-predictions-463a837420c7)
- [How React Native's New Architecture Affects Performance (DEV)](https://dev.to/amazonappdev/how-does-react-natives-new-architecture-affect-performance-1dkf)
- [New Architecture Migration Guide 2026](https://www.agilesoftlabs.com/blog/2026/03/react-native-new-architecture-migration)
- [Hermes Performance on iOS (Callstack)](https://www.callstack.com/blog/hermes-performance-on-ios)
- [Supabase Pricing 2026 (UI Bakery)](https://uibakery.io/blog/supabase-pricing)
- [Supabase Pricing: Real Costs at 10K-100K Users](https://designrevision.com/blog/supabase-pricing)
- [Supabase True Cost Breakdown 2026 (Metacto)](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices (Leanware)](https://www.leanware.co/insights/supabase-best-practices)
- [Persistent Storage and 97% Faster Edge Function Cold Starts](https://supabase.com/blog/persistent-storage-for-faster-edge-functions)
- [Supabase vs Firebase vs Appwrite 2026 (UI Bakery)](https://uibakery.io/blog/appwrite-vs-supabase-vs-firebase)
- [Supabase vs Firebase vs Appwrite Enterprise Comparison](https://www.askantech.com/supabase-vs-firebase-vs-appwrite-2026-guide-enterprise-baas-selection/)
- [MMKV vs AsyncStorage (react-native-mmkv GitHub)](https://github.com/mrousavy/react-native-mmkv)
- [Storage Benchmark App (mrousavy)](https://github.com/mrousavy/StorageBenchmark)
- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [Analyzing JS Bundles with Expo Atlas](https://docs.expo.dev/guides/analyzing-bundles/)
- [Expo Push Notifications FAQ](https://docs.expo.dev/push-notifications/faq/)
- [PostHog React Native Session Replay](https://posthog.com/docs/session-replay/installation/react-native)
- [Sentry React Native Performance](https://docs.sentry.io/platforms/react-native/tracing/instrumentation/performance-metrics/)
- [Sentry Session Replay Performance Overhead](https://docs.sentry.io/platforms/react-native/session-replay/performance-overhead/)
- [Scaling to 100K Users (Alex Pareto)](https://blog.alexpareto.com/p/scaling-100k)
- [How to Scale from 0 to 10M Users (AlgoMaster)](https://blog.algomaster.io/p/scaling-a-system-from-0-to-10-million-users)
- [React Native Performance Tips for Maps](https://medium.com/@richardpetrov/performance-tips-for-react-native-maps-1bd1813c3c81)
- [Optimising React Native Performance 2026 (AddJam)](https://addjam.com/blog/2026-02-25/optimising-react-native-performance-real-world-lessons/)
- [SLO Best Practices (Nobl9)](https://www.nobl9.com/service-level-objectives/slo-best-practices)
- [Error Budget Calculation (One2N)](https://one2n.io/blog/error-budget-calculation-downtime-minutes-for-every-slo)
