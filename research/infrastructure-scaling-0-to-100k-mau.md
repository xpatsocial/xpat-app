# Infrastructure, DevOps & Scaling: 0 to 100K MAU

**For x/pat** -- Social travel app for digital nomads
**Stack**: React Native/Expo (SDK 55) + Supabase (Postgres 17, us-east-1) + EAS Build
**Current plan**: Supabase Pro ($25/mo), EAS free tier
**Date**: April 2026

---

## Executive Summary

x/pat is pre-launch with ~1 user in the database. The path to 100K MAU crosses four distinct infrastructure phases, each with specific triggers for action. This document covers 30 operational domains with concrete recommendations for x/pat's stack, prioritized into pre-launch (do now), post-launch (1K-10K MAU), growth (10K-50K MAU), and scale (50K-100K+ MAU) phases.

**Key finding**: At the current stage, roughly 80% of the work should focus on CI/CD, monitoring, environment management, and security hardening. Scaling infrastructure decisions (read replicas, multi-region, self-hosted) should be deferred until clear data signals emerge. Premature optimization at this stage wastes the solo founder's most scarce resource: time.

---

## Phase Definitions

| Phase | MAU | Concurrent Users | DB Connections | Monthly Cost Target |
|-------|-----|-------------------|----------------|---------------------|
| **Pre-launch** | 0-100 | 1-10 | 1-5 | $25-50 |
| **Post-launch** | 100-10K | 10-500 | 5-100 | $50-200 |
| **Growth** | 10K-50K | 500-5K | 100-500 | $200-800 |
| **Scale** | 50K-100K+ | 5K-20K | 500-2000 | $800-3000 |

---

## 1. Supabase Scaling Roadmap

### Plan Comparison (2026 Pricing)

| Feature | Pro ($25/mo) | Team ($599/mo) | Enterprise (Custom) |
|---------|-------------|----------------|---------------------|
| Database size | 8 GB included | 8 GB included | Custom |
| Bandwidth | 250 GB | 250 GB | Custom |
| Storage | 100 GB | 100 GB | Custom |
| Edge Function invocations | 2M | 2M | Custom |
| Realtime messages | 5M | 5M | Custom |
| Max DB connections (direct) | 60 | 60 | Custom |
| Pooler connections (transaction mode) | 200 | 200 | Custom |
| Daily backups | 7 days | 14 days | Custom |
| Read replicas | Add-on ($) | Add-on ($) | Included |
| Point-in-time recovery | Add-on ($) | Add-on ($) | Included |
| SOC2 / HIPAA | No | SOC2 | Both |
| Support | Email | Priority email | Dedicated |

### Decision Points for x/pat

- **Stay on Pro until**: You hit 10K MAU, need SOC2 compliance for a partnership, or require organizational role-based access (Team plan adds granular member roles).
- **Move to Team when**: You hire your first employee/contractor who needs Supabase dashboard access with restricted permissions, OR a partnership requires SOC2 attestation.
- **Move to Enterprise when**: You need read replicas included in price, HIPAA compliance, dedicated support SLA, or custom connection limits.
- **Self-hosted consideration**: Only if Supabase pricing exceeds $2000/mo AND you have a DevOps hire. Self-hosting Supabase on Fly.io or Railway is viable but requires managing Postgres, GoTrue, PostgREST, Realtime, Storage, and Kong yourself. At 100K MAU this is almost never worth it for a small team.

### Cost Projection

| MAU | Plan | Compute Add-on | Estimated Total |
|-----|------|-----------------|-----------------|
| 0-5K | Pro | None (Micro) | $25 |
| 5K-20K | Pro | Small ($50) | $75 |
| 20K-50K | Pro | Medium ($100) | $125-200 |
| 50K-100K | Pro or Team | Large ($200) | $225-800 |

### Priority
- **Pre-launch**: Stay on Pro. No action needed.
- **Post-launch**: Monitor compute usage in Supabase dashboard. Upgrade compute add-on before plan.
- **Growth**: Evaluate Team plan only if org access controls needed.

---

## 2. Edge Function Optimization

### Cold Start Mitigation
- **Current state**: No Edge Functions deployed yet. This is the right time to design the architecture.
- **Cold start reality**: First invocation of an Edge Function after idle period takes 200-800ms. Subsequent invocations ("warm") take 5-50ms.
- **Best practice**: Consolidate related endpoints into a single "fat" function using Hono router. Each distinct function slug gets its own cold start. One function with 10 routes = 1 cold start. Ten separate functions = 10 cold starts.

### Recommended Architecture for x/pat

```
supabase/functions/
  _shared/
    supabaseAdmin.ts      # Service-role client (for server-side operations)
    cors.ts               # Standard CORS headers
    response.ts           # JSON response helpers
  api/                    # Fat function: all REST-style operations
    index.ts              # Hono router
    routes/
      feed.ts             # Personalized feed generation
      trending.ts         # Trending spots calculation
      affiliates.ts       # Affiliate click tracking
      digest.ts           # Email digest generation
  notifications/          # Push notification sender (triggered by DB webhook)
    index.ts
  translate/              # Chat message translation
    index.ts
  cron/                   # Scheduled jobs (called by pg_cron)
    index.ts
```

### Connection Pooling in Edge Functions
- Always use the pooler URL (`pooler.supabase.co`) in Edge Functions, NOT the direct database URL.
- Use transaction mode pooling (port 6543) for short-lived Edge Function connections.
- Never hold a connection open across await boundaries if possible.

### Caching Strategy
- Use `Cache-Control` headers for GET responses that can be cached at CDN layer.
- For expensive computations (trending spots), cache results in a `cache` table or use Supabase Storage as a JSON cache with TTL-based invalidation.

### Regional Pinning
- Pin all database-heavy Edge Functions to `us-east-1` (your DB region) using the `x-region: us-east-1` header.
- For compute-only functions (translation, formatting), allow global edge execution.

### Cost at Scale
- 2M invocations included in Pro. At 100K MAU with average 20 API calls/day = 2M calls/day = need additional invocations (~$2 per million).
- Optimization: Use PostgREST (free, unlimited) for simple CRUD. Reserve Edge Functions for logic that requires server-side processing.

### Priority
- **Pre-launch**: Design the fat function architecture. Deploy a notifications function.
- **Post-launch**: Add feed generation, trending calculation.
- **Growth**: Monitor invocation counts, optimize hot paths.

---

## 3. Database Scaling Strategies

### Connection Pooling (Immediate Action)
- **PgBouncer (Supavisor)**: Already included in Supabase Pro. Use the pooler URL for all application connections.
- **Transaction mode** (port 6543): Best for serverless/Edge Functions. Connection returned to pool after each transaction.
- **Session mode** (port 5432): Required for Realtime subscriptions and prepared statements. Use sparingly.
- x/pat's Supabase client currently uses the direct URL. For the mobile app this is fine (each user = 1 connection, managed by Supabase client). For Edge Functions, switch to pooler.

### Read Replicas (10K+ MAU)
- Supabase read replicas cost ~$70/mo per replica (depends on compute size).
- Decision point: When dashboard shows >50% of pooler connections sustained, or when read-heavy queries (feed, explore, search) cause write latency.
- Implementation: Create replica in a different region (eu-west-1 for European nomads, ap-southeast-1 for Asian nomads). Route read queries to replica.

### Table Partitioning (50K+ MAU)
- Candidate tables for partitioning:
  - `chat_messages` -- partition by `created_at` (monthly). Old messages archived.
  - `posts` -- partition by `created_at` (monthly) when exceeding 10M rows.
  - `affiliate_clicks` -- partition by `created_at` (monthly) for analytics.
  - `check_ins` -- partition by `created_at`.
- Do NOT partition: `profiles`, `spots`, `follows` -- these are lookup-heavy, not append-heavy.

### Materialized Views (5K+ MAU)
- Create materialized views for:
  - Trending spots (refreshed every 15 min via pg_cron)
  - User feed (pre-computed, refreshed on new post)
  - City statistics (nomad count, spot count per city)
- Refresh strategy: `REFRESH MATERIALIZED VIEW CONCURRENTLY` (requires unique index) to avoid locking.

### Indexing (Now)
- The existing Supabase optimization research identified redundant indexes to drop and missing indexes to add. Execute those recommendations.
- Key missing index: `spots(lat, lng)` -- use PostGIS `GIST` index for geographic queries.
- Add `profiles(current_city)` partial index for "who's here" queries.

### Priority
- **Pre-launch**: Clean up redundant indexes, add missing indexes, ensure pooler URL used in Edge Functions.
- **Post-launch**: Create materialized views for trending/feed.
- **Growth**: Evaluate read replicas.
- **Scale**: Implement table partitioning for chat_messages.

---

## 4. CDN Strategy

### Current State
- Supabase Storage includes Cloudflare CDN automatically for public buckets.
- Supabase Edge Functions are deployed globally via Deno Deploy (Cloudflare-backed).
- PostgREST API responses are NOT cached by default (dynamic data).

### Recommendation for x/pat: Cloudflare (Already Included)

Supabase's built-in Cloudflare CDN is sufficient through 100K MAU. No separate CDN vendor needed.

### Optimization Steps

1. **Static assets** (spot photos, avatars): Set `cacheControl: '31536000'` (1 year) on upload. Use content-addressed filenames (hash-based) so URLs change when content changes.

2. **API responses**: For semi-static data (city info, spot details that rarely change), add `Cache-Control: public, max-age=300` headers in Edge Functions. Cloudflare will cache these at edge.

3. **Custom domain**: Point `api.xpat.social` to your Supabase project via custom domain (Supabase Pro feature). This gives you Cloudflare edge caching on your own domain.

4. **xpat.social website**: Already on GitHub Pages with built-in CDN. No changes needed.

### Cost
- Included in Supabase Pro. Bandwidth: 250 GB/mo included, then $0.09/GB.
- At 100K MAU with average 5 MB/user/month of image downloads = 500 GB. Overage cost: ~$22.50/mo.
- Alternative: Cloudflare R2 for image storage ($0.015/GB/mo storage, zero egress) if bandwidth costs become significant. But this is a 100K+ MAU concern.

### Priority
- **Pre-launch**: Set proper cache headers on all uploads. Use WebP transforms.
- **Post-launch**: Set up custom domain for API.
- **Growth**: Monitor bandwidth. Consider R2 only if overage exceeds $50/mo.

---

## 5. Image Pipeline

### Architecture: Upload -> Compress -> Transform -> CDN -> Cache

```
[Mobile App]
    |
    v
[expo-image-picker] -- max 1200px, JPEG 80%
    |
    v
[expo-image-manipulator] -- client-side resize/compress
    |
    v
[Supabase Storage] -- upload to public bucket
    |
    v
[Supabase Image Transforms] -- on-the-fly resize via URL params
    |
    v
[Cloudflare CDN] -- cache transformed images at edge
    |
    v
[expo-image] -- client-side caching with blurhash placeholder
```

### Implementation for x/pat

**Client-side (before upload):**
- Resize to max 1200px wide using expo-image-manipulator (already installed)
- Compress to JPEG quality 80 (reduces 4MB photo to ~200KB)
- Strip EXIF metadata for privacy (manipulator does this by default on resize)

**Server-side (Supabase Storage):**
- Three transform presets accessed via URL params:
  - Thumbnail: `?width=200&height=200&resize=cover&format=webp` (SpotCard, Avatar)
  - Medium: `?width=600&height=400&resize=cover&format=webp` (Feed, Detail)
  - Full: `?width=1200&format=webp&quality=85` (Full-screen view)
- Transforms are cached by Cloudflare CDN after first request.

**Client-side (display):**
- expo-image handles disk caching, memory caching, and progressive loading
- Generate blurhash on upload (server-side Edge Function) for instant placeholders
- Store blurhash string in the `spots.photo_blurhash` or `posts.photo_blurhash` column

### Storage Bucket Design
- `avatars` -- public, RLS: only owner can upload/update/delete
- `spot-photos` -- public, RLS: only spot creator can upload, anyone can read
- `post-photos` -- public, same pattern
- `chat-media` -- private (signed URLs), RLS: only channel members

### Cost
- Image transforms: 100 transforms/month free, then included in Pro plan (no per-transform charge)
- Storage: 100 GB included. At 100K MAU with ~5 photos/user average = ~100 GB at 200KB/photo compressed. Right at the limit.

### Priority
- **Pre-launch**: Implement client-side compression. Set up storage buckets with proper RLS. Add cache headers.
- **Post-launch**: Add blurhash generation. Implement transform URL helpers.
- **Growth**: Monitor storage usage. Consider cleanup job for orphaned images.

---

## 6. Real-time Infrastructure at Scale

### Supabase Realtime Limits (Pro Plan)
- 5M messages/month included (then $2.50 per million)
- 500 concurrent connections included (then $10 per 1000)
- Max 100 channels per connection
- Max message size: 1 MB (Broadcast), variable for Postgres Changes

### x/pat Real-time Usage Patterns

| Feature | Channel Type | Messages/Day Estimate (10K MAU) |
|---------|-------------|--------------------------------|
| City chat | Broadcast | 50K (5 msgs/user in active city) |
| Presence (who's here) | Presence | 100K (join/leave/heartbeat) |
| DMs | Broadcast | 20K |
| Post notifications | Postgres Changes | 5K |
| **Total** | | **175K/day = 5.25M/month** |

At 10K MAU, you are right at the 5M message limit. At 100K MAU, expect 50M+ messages/month = ~$125/mo in Realtime overage.

### Scaling Strategies

1. **Reduce Presence noise**: Set `presence_key` to user ID (not random). Use longer heartbeat intervals (30s instead of default). Only track presence for users who have the app in foreground.

2. **Debounce typing indicators**: Instead of broadcasting every keystroke, debounce to 1 event per 2 seconds.

3. **Unsubscribe aggressively**: When user leaves a screen, unsubscribe from that channel. Do not maintain subscriptions to inactive chats.

4. **Use Broadcast over Postgres Changes**: For chat messages, INSERT via PostgREST and then Broadcast the message. Postgres Changes listens to WAL and doubles the work. Broadcast is pure WebSocket relay with no DB overhead.

5. **Batch presence updates**: Instead of tracking individual user presence, aggregate by city and push city-level presence counts every 30 seconds.

### Alternatives Assessment (100K+ MAU)
- **Ably**: $0.0025/message. At 50M messages = $125K/mo. Too expensive.
- **Pusher**: $0.000001/message. At 50M = $50/mo but connection limits are tight.
- **Socket.io on Fly.io**: Self-hosted, ~$20/mo per node. Full control but requires DevOps.
- **Recommendation**: Stay on Supabase Realtime through 100K MAU. The overage costs (~$125/mo) are far cheaper than any alternative when you factor in development time.

### Priority
- **Pre-launch**: Implement Broadcast-based chat (not Postgres Changes). Set up presence with proper heartbeat intervals.
- **Post-launch**: Monitor message counts in dashboard. Optimize presence noise.
- **Growth**: Evaluate if specific channels are noisy. Add message batching for high-volume cities.

---

## 7. Push Notification Infrastructure

### Expo Push vs Direct FCM/APNs

| Factor | Expo Push | Direct FCM/APNs |
|--------|-----------|-----------------|
| Setup complexity | Minutes (already configured) | Hours (certificates, service accounts) |
| Cost | Free unlimited | Free (FCM), Free (APNs) |
| Reliability | 99.9% (routes through Expo servers) | 99.99% (direct to platform) |
| Features | Basic push, categories | Rich push, silent push, background fetch |
| Throughput | 600 notifications/sec | 250K/sec (FCM), no published limit (APNs) |
| Vendor dependency | Expo | Google/Apple only |
| Analytics | Basic receipt tracking | Full delivery/open tracking |

### Recommendation for x/pat

**Stay on Expo Push through 100K MAU.** Here is why:
- 600 notifications/sec = 36K/minute. Even at 100K MAU, a "send to all users" broadcast takes under 3 minutes. For targeted notifications (new message, new follower), you will never hit this limit.
- Expo Push is free and already integrated in the codebase.
- Migration to direct FCM/APNs is only worthwhile if you need: silent background push for data sync, notification grouping/threading (Expo supports basic categories), or >600/sec burst throughput.

### Server-Side Sending Architecture

```
[Database trigger / pg_cron]
    |
    v
[Edge Function: notifications/]
    |
    v
[Query push_tokens table for target user(s)]
    |
    v
[Expo Push API: POST https://exp.host/--/api/v2/push/send]
    |
    v
[Check receipts after 15 min, remove invalid tokens]
```

### Implementation Checklist
- Store tokens in `push_tokens` table (already exists, has RLS)
- Edge Function to send notifications (batch up to 100 per Expo Push request)
- Receipt checking: Edge Function called by pg_cron every 15 minutes to check delivery receipts and remove expired/invalid tokens
- Token refresh: Re-register token on every app launch (tokens can rotate)

### Cost
- Free at all scale points through Expo Push.
- If migrating to direct: FCM is free. APNs is free. Only cost is the Edge Function invocations to send them.

### Priority
- **Pre-launch**: Deploy notification Edge Function. Implement receipt checking.
- **Post-launch**: Add notification categories (chat, social, spots, events -- already defined in channels).
- **Growth**: Monitor delivery rates. Clean up stale tokens aggressively.

---

## 8. Background Job Processing

### Available Options on Supabase

| Method | Best For | Limitations |
|--------|----------|-------------|
| **pg_cron** | Scheduled tasks (hourly/daily) | Runs in DB context, max ~60s recommended |
| **Supabase Queues (pgmq)** | Async job processing | New in 2025, still maturing |
| **Edge Function + cron** | Scheduled HTTP tasks | 150s timeout, can chain |
| **Database triggers** | Event-driven processing | Synchronous, blocks the triggering query |
| **Supabase Webhooks** | External service integration | Fire-and-forget, no retry |

### Recommended Jobs for x/pat

**pg_cron (in-database, no extra cost):**
```sql
-- Refresh trending spots every 15 minutes
SELECT cron.schedule('refresh-trending', '*/15 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_spots$$);

-- Clean up expired presence records every 5 minutes
SELECT cron.schedule('cleanup-presence', '*/5 * * * *',
  $$DELETE FROM user_presence WHERE last_seen < NOW() - INTERVAL '10 minutes'$$);

-- Clean up stale push tokens (no activity in 90 days) weekly
SELECT cron.schedule('cleanup-tokens', '0 3 * * 0',
  $$DELETE FROM push_tokens WHERE updated_at < NOW() - INTERVAL '90 days'$$);

-- Generate daily city statistics at 4 AM UTC
SELECT cron.schedule('daily-stats', '0 4 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_city_stats$$);
```

**Edge Function cron (for HTTP/external calls):**
- Send weekly digest emails (requires external email API)
- Check Expo Push receipts every 15 minutes
- Sync affiliate partner data (when partnerships are live)

**Database triggers (event-driven):**
- On new chat_message INSERT: trigger notification Edge Function via webhook
- On new follow INSERT: trigger notification
- On new connection_request: trigger notification
- Keep triggers lightweight -- just enqueue, don't do heavy processing

### Supabase Queues (pgmq) for Reliable Processing

For operations that must not be lost (notification delivery, affiliate click attribution):
```sql
-- Create a queue
SELECT pgmq.create('notifications');

-- Enqueue from a trigger
SELECT pgmq.send('notifications', jsonb_build_object(
  'type', 'new_message',
  'user_id', NEW.recipient_id,
  'message_id', NEW.id
));

-- Process in Edge Function (called by pg_cron every 30 seconds)
SELECT * FROM pgmq.read('notifications', 30, 10); -- 30s visibility, batch of 10
-- After processing:
SELECT pgmq.delete('notifications', msg_id);
```

### Cost
- pg_cron: Free (included in Supabase Pro, uses the pg_cron extension).
- Edge Function cron: Counts against 2M invocation limit. At 4 calls/hour x 24h x 30 days = 2,880 invocations/month. Negligible.
- pgmq: Free (Postgres extension, no external service).

### Priority
- **Pre-launch**: Set up pg_cron for presence cleanup and token cleanup. Add database triggers for notifications.
- **Post-launch**: Add materialized view refresh jobs. Implement pgmq for notification queue.
- **Growth**: Add digest email job. Monitor pg_cron job durations.

---

## 9. Monitoring and Alerting Stack

### Recommended Stack for Solo Founder

| Layer | Tool | Cost | Why |
|-------|------|------|-----|
| **Error tracking** | Sentry (already integrated) | Free (5K events/mo) | Already in codebase, captures React Native crashes + screenshots |
| **Uptime monitoring** | Better Stack (formerly Better Uptime) | Free tier (5 monitors) | Simple, good mobile alerts |
| **Analytics** | PostHog (already integrated) | Free (1M events/mo) | Already in codebase, includes session replay |
| **Database monitoring** | Supabase Dashboard | Included | Built-in query performance, connection monitoring |
| **APM (later)** | Sentry Performance | Free tier included | Already installed, just increase `tracesSampleRate` |

### What NOT to Set Up Now
- **PagerDuty**: Overkill for solo founder. Your phone IS the pager. Use Better Stack's free SMS/call alerts.
- **Grafana**: Beautiful but requires a data source and maintenance. Use Supabase dashboard + Sentry.
- **Datadog**: Starts at $15/host/mo. Not needed until you have servers to monitor. Supabase is serverless.
- **New Relic**: Same reasoning. No servers to instrument.

### Alert Configuration

**Sentry alerts to set up:**
1. New error in production (first occurrence) -- email + Slack/Discord
2. Error spike (>10 events in 5 minutes) -- email + SMS
3. Performance degradation (p95 > 3s for any transaction) -- email

**Better Stack monitors:**
1. `https://diiqponrvrcpwoerenwz.supabase.co/rest/v1/` -- API uptime (every 60s)
2. `https://xpat.social` -- Website uptime (every 60s)
3. Edge Function health endpoint (when deployed)

**Supabase dashboard checks (manual, weekly):**
1. Database size growth trend
2. Connection count trends
3. Slow query log (pg_stat_statements)
4. RLS policy performance
5. Storage usage

### Cost
- Total: $0/mo (all free tiers). Budget $15/mo once you outgrow Sentry free tier (~5K MAU).

### Priority
- **Pre-launch**: Configure Sentry alerts. Set up Better Stack uptime monitors. Weekly dashboard review habit.
- **Post-launch**: Enable Sentry Performance tracing (increase sample rate to 0.5).
- **Growth**: Consider Sentry paid plan ($26/mo) for more events and longer retention.

---

## 10. Log Management

### Current State
- Supabase provides built-in logs for: Postgres queries, PostgREST, Auth, Storage, Edge Functions, Realtime.
- Logs are available in the Supabase dashboard with 1 day retention (Pro), or queryable via the Logs Explorer using SQL-like syntax.
- No application-level structured logging exists in the React Native app.

### Structured Logging Strategy for x/pat

**Client-side (React Native):**
- Do NOT implement verbose client-side logging. Mobile apps should not ship logs to a server in real-time.
- Use Sentry breadcrumbs for error context (automatically captured for navigation, network requests, console.log in dev).
- Use PostHog events for business-level tracking (user signed up, spot created, etc.).
- For debugging production issues: Sentry's session replay and error context are sufficient.

**Server-side (Edge Functions):**
- Use `console.log()`, `console.error()`, `console.warn()` -- these are captured in Supabase Logs Explorer automatically.
- Structure logs as JSON for queryability:
```typescript
console.log(JSON.stringify({
  event: 'notification_sent',
  user_id: userId,
  type: 'new_message',
  duration_ms: Date.now() - start,
}));
```
- Query in Logs Explorer: `SELECT timestamp, event_message FROM edge_logs WHERE event_message LIKE '%notification_sent%'`

**Database-level:**
- `pg_stat_statements` for query performance (already enabled)
- `auto_explain` extension for slow query analysis (enable with `auto_explain.log_min_duration = 1000` for queries >1s)
- Supabase dashboard Logs Explorer provides real-time filtering

### Log Aggregation (Growth Phase)
- At 10K+ MAU, if you need longer log retention or cross-service correlation:
  - **Better Stack Logs** ($24/mo for 30-day retention, 1 GB/mo) -- pairs with their uptime monitoring
  - **Axiom** (free tier: 500 MB/mo, 30-day retention) -- modern, fast, built for developers
  - Forward Edge Function logs via a logging Edge Function or webhook

### Cost
- Now: $0 (Supabase built-in logs + Sentry + PostHog free tiers)
- Growth: ~$24/mo if Better Stack Logs or Axiom needed

### Priority
- **Pre-launch**: Add structured JSON logging to Edge Functions. Enable pg_stat_statements if not already.
- **Post-launch**: Establish weekly log review habit (slow queries, error patterns).
- **Growth**: Evaluate Better Stack Logs or Axiom for longer retention.

---

## 11. CI/CD Pipeline Design

### Current State
- No GitHub Actions workflows. Manual `eas build` and `eas submit` from local machine.
- EAS free tier: limited builds per month, queued builds.

### Recommended Pipeline

```
[Push to main]
    |
    v
[GitHub Actions: Lint + Type Check + Test]
    |
    v (on tag/release)
[GitHub Actions: Trigger EAS Build]
    |
    v
[EAS Build: iOS + Android]
    |
    v (production only)
[EAS Submit: App Store + Play Store]
```

### GitHub Actions Workflows

**1. PR Checks (every pull request):**
```yaml
# .github/workflows/pr-check.yml
name: PR Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit           # Type checking
      - run: npx eslint . --max-warnings 0  # Linting (add eslint first)
      # - run: npx jest --ci             # Tests (add jest first)
```

**2. Build on Release (manual or tag-triggered):**
```yaml
# .github/workflows/build.yml
name: EAS Build
on:
  workflow_dispatch:
    inputs:
      profile:
        description: 'Build profile'
        required: true
        default: 'production'
        type: choice
        options: [development, preview, production]
      platform:
        description: 'Platform'
        required: true
        default: 'all'
        type: choice
        options: [ios, android, all]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --profile ${{ inputs.profile }} --platform ${{ inputs.platform }} --non-interactive
```

### EAS Build Optimization
- **Cache key** (already configured as `v5-all-capabilities-2026-03-10`): Update this when native dependencies change. Same cache key = faster builds.
- **SENTRY_DISABLE_AUTO_UPLOAD**: Already set to `true` in eas.json. Good -- source map upload should be a separate step or disabled entirely until Sentry is on a paid plan.
- **Build concurrency**: Free tier allows 1 concurrent build. Do NOT trigger iOS and Android simultaneously. Build sequentially or upgrade to EAS Production ($99/mo) for parallel builds.

### Cost
- GitHub Actions: Free for public repos. 2,000 minutes/month for private repos (free tier). PR checks use ~2 min each = ~1000 PRs/month before hitting limits.
- EAS Build: Free tier includes 15 iOS + 15 Android builds/month (with queue). Priority builds: $99/mo unlimited.
- Recommendation: Stay on free tiers until PR volume or build frequency justifies upgrade.

### Priority
- **Pre-launch**: Set up PR check workflow (TypeScript type checking at minimum). Add ESLint.
- **Post-launch**: Add EAS build workflow for one-click builds from GitHub.
- **Growth**: Add automated testing. Consider EAS Production plan for faster builds.

---

## 12. Environment Management

### Current State
- Single Supabase project (`diiqponrvrcpwoerenwz`, us-east-1) used for everything.
- No staging environment. No development database.

### Recommended Setup

| Environment | Purpose | Supabase Setup | Cost |
|-------------|---------|----------------|------|
| **Development** | Local dev, rapid iteration | Supabase branching (or local Docker) | $0 (branching included in Pro) |
| **Staging** | Pre-release testing, beta | Separate Supabase project | $0 (free tier for staging, or branch) |
| **Production** | Live app | Current project | $25/mo (Pro) |

### Supabase Branching (Recommended)
- Supabase branching creates ephemeral database instances from your production schema.
- Each branch gets its own URL and anon key.
- Branch from production, test migrations, merge back.
- Included in Pro plan (compute costs apply per branch while active).
- Perfect for testing schema changes without risking production.

### Environment Variables Strategy
```
# .env.development
EXPO_PUBLIC_SUPABASE_URL=https://[branch-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SENTRY_DSN=        # Empty = no Sentry in dev
EXPO_PUBLIC_POSTHOG_KEY=       # Empty = no analytics in dev

# .env.staging
EXPO_PUBLIC_SUPABASE_URL=https://[staging-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...     # Staging DSN
EXPO_PUBLIC_POSTHOG_KEY=...    # Staging project

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://diiqponrvrcpwoerenwz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_POSTHOG_KEY=...
```

### App Variant Strategy for Expo
- Use EAS build profiles (`development`, `preview`, `production`) already configured in eas.json.
- Add env-specific Supabase URLs in EAS secrets (not in eas.json): `eas secret:create EXPO_PUBLIC_SUPABASE_URL --value "..." --scope project`.
- Development builds connect to branch/staging. Production builds connect to production.

### Priority
- **Pre-launch**: Create a Supabase branch for testing migrations. Set up EAS secrets for environment separation.
- **Post-launch**: Create a permanent staging project (free tier) for beta testing.
- **Growth**: Enforce that all schema changes go through branching before production.

---

## 13. Database Migration Strategy

### Current State
- No formal migration system detected. Schema changes likely applied directly via Supabase SQL Editor or MCP tools.
- This is acceptable for pre-launch but must change before production users exist.

### Recommended Approach: Supabase CLI Migrations

```
supabase/
  migrations/
    20260401000000_initial_schema.sql
    20260402000000_add_events_table.sql
    20260403000000_add_city_presence_index.sql
  seed.sql
```

**Workflow:**
1. Create migration: `supabase migration new add_events_table`
2. Write SQL in the generated file
3. Test on branch: `supabase db push` (to branch)
4. Verify on branch
5. Apply to production: `supabase db push` (to production) or merge branch

### Zero-Downtime Migration Rules
1. **Never** `DROP COLUMN` in one step. First deploy code that stops reading the column, then drop it in a subsequent migration.
2. **Never** `ALTER COLUMN ... SET NOT NULL` on an existing column with data. Instead: add a check constraint as NOT VALID, then validate it in a separate transaction.
3. **Add columns** as nullable with defaults. Backfill in batches, then add NOT NULL constraint.
4. **Index creation**: Always use `CREATE INDEX CONCURRENTLY` to avoid locking the table.
5. **Rename tables/columns**: Create new, copy data, swap views. Never rename in-place with live traffic.

### Rollback Strategy
- Every migration should have a corresponding rollback SQL file (manual discipline).
- For Supabase: use branching to test migrations. If a migration fails on the branch, fix it before merging.
- For emergency rollback: have a `rollback/` directory with reverse SQL for the last 5 migrations.
- Point-in-time recovery (PITR) is available as a Supabase add-on ($100/mo) -- consider at 10K+ MAU for disaster scenarios.

### Priority
- **Pre-launch**: Export current schema as the initial migration. Set up supabase CLI migrations workflow.
- **Post-launch**: Enforce all changes go through migration files. No more direct SQL Editor changes.
- **Growth**: Add PITR add-on. Implement rollback scripts.

---

## 14. API Versioning

### Current State
- x/pat uses Supabase PostgREST directly from the client. No custom API layer.
- Edge Functions (when deployed) will be the custom API surface.

### Strategy for x/pat: Client-Side Versioning

Since the mobile app is the only client and you control the update cycle:

1. **PostgREST (direct Supabase access)**: No versioning needed. PostgREST auto-reflects schema changes. Add columns freely. Removing columns requires a deprecation period (stop reading in app first, then drop).

2. **Edge Functions**: Use path-based versioning in the Hono router:
```typescript
// supabase/functions/api/index.ts
app.route('/v1/feed', feedV1Routes);
app.route('/v2/feed', feedV2Routes);  // When breaking changes needed
```

3. **App version gating**: Use a `min_app_version` check:
```sql
-- Store minimum required app version
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO app_config VALUES ('min_app_version', '1.3.5');
INSERT INTO app_config VALUES ('recommended_app_version', '1.4.0');
```
The app checks this on launch. If below minimum, show a force-update screen. If below recommended, show a soft update prompt.

4. **Feature detection over versioning**: Instead of versioning endpoints, use feature flags (see section 15) to enable/disable features per app version.

### Priority
- **Pre-launch**: Add `app_config` table with version check. Implement force-update screen.
- **Post-launch**: Design Edge Function routes with `/v1/` prefix from day one.
- **Growth**: Only add `/v2/` routes when truly breaking changes are needed.

---

## 15. Feature Flags

### PostHog Feature Flags (Already Partially Integrated)

PostHog is already in the codebase with a graceful no-op pattern. PostHog includes feature flags on the free plan (1M API requests/month).

### Implementation for x/pat

```typescript
// src/lib/featureFlags.ts
import { usePostHog } from './posthog';

export function useFeatureFlag(flag: string): boolean {
  const posthog = usePostHog();
  // PostHog feature flags are evaluated locally after initial fetch
  try {
    const ph = require('posthog-react-native');
    return ph.useFeatureFlag(flag) === true;
  } catch {
    return false; // Default to off if PostHog not installed
  }
}
```

### Recommended Flags for x/pat

| Flag | Purpose | Default | Type |
|------|---------|---------|------|
| `enable_events` | Events feature rollout | false | Boolean |
| `enable_ai_ask` | AI recommendations | false | Boolean |
| `enable_affiliate_links` | Show affiliate CTAs | false | Boolean |
| `enable_chat_translation` | Message translation | false | Boolean |
| `enable_swipe_discover` | Swipe card deck for spots | true | Boolean |
| `maintenance_mode` | Kill switch for app features | false | Boolean |
| `max_photo_uploads` | Limit photos per spot | 5 | Number |

### Kill Switch Pattern
```typescript
// Check on app launch
const inMaintenance = useFeatureFlag('maintenance_mode');
if (inMaintenance) {
  return <MaintenanceScreen />;
}
```

### Gradual Rollout
- PostHog supports percentage-based rollouts: roll out to 10% of users, monitor errors, increase to 50%, then 100%.
- Target by user properties: roll out to beta testers first (`is_beta: true`), then all users.

### Cost
- PostHog free tier: 1M feature flag API requests/month. At 100K MAU checking 7 flags on each app launch = 700K/month. Well within limits.

### Priority
- **Pre-launch**: Set up 2-3 feature flags (maintenance_mode, enable_events). Install posthog-react-native package.
- **Post-launch**: Add flags for each new feature. Use percentage rollouts.
- **Growth**: Use flags for A/B testing (different UIs, different onboarding flows).

---

## 16. Disaster Recovery

### Backup Strategy

| Method | Included | Retention | RPO |
|--------|----------|-----------|-----|
| **Daily backups** | Supabase Pro | 7 days | 24 hours |
| **PITR (Point-in-Time Recovery)** | Add-on ($100/mo) | 7 days | Seconds |
| **Manual pg_dump** | Free (DIY) | As long as you keep them | On-demand |

### RTO/RPO Targets for x/pat

| Scenario | RPO (Data Loss Tolerance) | RTO (Downtime Tolerance) |
|----------|--------------------------|--------------------------|
| **Database corruption** | 24 hours (daily backup) | 1-2 hours |
| **Accidental data deletion** | Minutes (if PITR) / 24h (if not) | 30 min - 2 hours |
| **Supabase region outage** | 24 hours | 4-8 hours (Supabase SLA) |
| **Account compromise** | 0 (change keys immediately) | 1 hour |

### Implementation

**Now (Pre-launch):**
- Daily backups are automatic on Pro. Verify they are running in Supabase dashboard.
- Store a manual `pg_dump` monthly to a separate location (local machine or cloud storage).
- Document the recovery procedure: which Supabase dashboard buttons to click, in what order.

**Post-launch (1K+ MAU):**
- Enable PITR add-on ($100/mo) once you have real user data you cannot afford to lose.
- This gives second-level recovery granularity for 7 days.

**Growth (10K+ MAU):**
- Set up automated weekly pg_dump to cloud storage (S3/R2/GCS) via Edge Function or external cron.
- Test recovery procedure quarterly: restore a backup to a separate project, verify data integrity.

### Supabase Outage Response Plan
1. Monitor status at status.supabase.com
2. If region outage: communicate to users via xpat.social (hosted on GitHub Pages, independent of Supabase)
3. If >4 hours: evaluate restoring from backup to a new project in a different region
4. Auth tokens are JWT-based -- users do not lose sessions during a Supabase outage, they just cannot make API calls

### Priority
- **Pre-launch**: Verify daily backups are running. Take one manual pg_dump. Document recovery steps.
- **Post-launch**: Enable PITR when real user data exists ($100/mo).
- **Growth**: Automated off-site backups. Quarterly recovery drills.

---

## 17. Security Operations

### Vulnerability Scanning

**Dependencies (npm):**
- Run `npm audit` weekly (or in CI on every PR).
- Use GitHub Dependabot (free) for automatic security PRs.
- Expo SDK updates frequently patch React Native vulnerabilities -- stay current.

**Supabase:**
- RLS is enabled on all 32 tables (verified). This is the most critical security control.
- Run `supabase db lint` to check for RLS policy gaps.
- Supabase advisor API checks for security issues (missing RLS, exposed functions, weak auth settings).

### Security Checklist for x/pat

**Already Done:**
- [x] SecureStore for auth tokens (not AsyncStorage) -- OWASP M1/M9
- [x] RLS on all tables
- [x] Apple Sign-In for iOS
- [x] Privacy manifest configured
- [x] GDPR consent component
- [x] Content moderation system
- [x] Client-side rate limiting

**To Do (Pre-launch):**
- [ ] Rotate the Supabase anon key that is hardcoded in `supabase.ts` -- while anon keys are safe to embed (they are public), verify the service role key is NOT anywhere in the client code
- [ ] Enable Supabase Auth email confirmation for new signups
- [ ] Set up Supabase Auth rate limits (built-in: 30 signups/hour per IP)
- [ ] Add CSP headers to xpat.social website
- [ ] Review all RLS policies for bypass vectors (e.g., can a user modify another user's profile?)
- [ ] Pin dependency versions in package.json (many are using `^` -- production should use exact versions)

**Post-launch:**
- [ ] Enable MFA option for user accounts (Supabase Auth supports TOTP)
- [ ] Implement server-side rate limiting in Edge Functions (the client-side rate limiter is easily bypassed)
- [ ] Set up npm audit in CI pipeline
- [ ] Enable Dependabot

**Growth:**
- [ ] Commission a penetration test ($2K-10K for a small app)
- [ ] SOC2 Type I if partnerships require it (Team plan + Supabase compliance)
- [ ] Implement session management (force logout, view active sessions)

### Cost
- npm audit, Dependabot, supabase db lint: Free
- Penetration test: $2K-10K (one-time, at growth phase)
- SOC2: ~$5K-15K for Type I (if needed)

### Priority
- **Pre-launch**: Complete the "To Do" checklist above. Critical security items.
- **Post-launch**: Server-side rate limiting. Dependabot. npm audit in CI.
- **Growth**: Penetration test before major partnership.

---

## 18. Performance Budgets

### Mobile App Targets

| Metric | Target | Current Priority |
|--------|--------|-----------------|
| **App launch to interactive** | < 3 seconds | Pre-launch |
| **Screen transition** | < 300ms | Pre-launch |
| **API response (PostgREST)** | < 200ms p95 | Pre-launch |
| **API response (Edge Function)** | < 500ms p95 (cold), < 100ms p95 (warm) | Post-launch |
| **Image load (cached)** | < 100ms | Pre-launch |
| **Image load (network, thumbnail)** | < 1 second | Pre-launch |
| **JS bundle size** | < 5 MB (compressed) | Pre-launch |
| **OTA update size** | < 2 MB | Post-launch |
| **Memory usage** | < 200 MB | Post-launch |
| **Battery drain** | < 5% per hour active use | Growth |

### Bundle Size Management
- Current: Need to measure. Run `npx expo export --dump-assetmap` to audit.
- Heavy dependencies to watch: `react-native-maps` (~2 MB), `@sentry/react-native` (~500 KB), `react-native-reanimated` (~800 KB).
- Optimization: Lazy-load screens with `React.lazy()` and `Suspense`. The map screen is the heaviest -- defer its bundle until user navigates to Explore tab.

### API Response Time Budget
- PostgREST simple queries (indexed lookup): < 50ms
- PostgREST with RLS + JOINs: < 200ms
- Edge Function cold start: < 800ms (acceptable), warm: < 100ms
- Supabase Storage image serve (cached): < 50ms
- Supabase Storage image serve (transform, uncached): < 500ms

### Monitoring Performance
- Sentry Performance (already installed, `tracesSampleRate: 0.2`): Tracks screen load times, API call durations automatically.
- PostHog: Track custom performance events for critical flows (time to first spot on map, time to send first message).

### Priority
- **Pre-launch**: Measure current bundle size and launch time. Set up Sentry Performance alerts for p95 > 3s.
- **Post-launch**: Optimize bundle with lazy loading. Set up performance dashboards.
- **Growth**: Profile memory usage. Optimize map rendering for dense spot areas.

---

## 19. Cost Optimization

### Current Monthly Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Supabase Pro | Pro | $25 |
| EAS Build | Free | $0 |
| Sentry | Free | $0 |
| PostHog | Free | $0 |
| GitHub | Free (private repos) | $0 |
| Apple Developer | Annual ($99/year) | $8.25 |
| Google Play | One-time ($25) | $0 |
| Domain (xpat.social) | Annual | ~$3 |
| **Total** | | **~$36/mo** |

### Cost at Scale Points

| MAU | Supabase | EAS | Sentry | PostHog | Other | Total |
|-----|----------|-----|--------|---------|-------|-------|
| 1K | $25 | $0 | $0 | $0 | $11 | $36 |
| 10K | $75 | $0 | $26 | $0 | $11 | $112 |
| 50K | $175 | $99 | $26 | $0 | $11 | $311 |
| 100K | $325 | $99 | $80 | $0 | $111* | $615 |

*At 100K: add Better Stack ($24), PITR ($100), possibly CDN overage

### Cost Optimization Strategies

1. **Supabase compute right-sizing**: Start with Micro (included in Pro). Monitor CPU/RAM in dashboard. Only upgrade when you see sustained >70% utilization.

2. **Edge Function invocation reduction**: Use PostgREST for all simple CRUD (free, unlimited). Reserve Edge Functions for operations requiring server-side logic.

3. **Realtime message reduction**: Use Broadcast instead of Postgres Changes. Debounce presence heartbeats. Unsubscribe from inactive channels.

4. **Storage optimization**: Compress images client-side before upload. Use WebP transforms. Delete orphaned uploads (spots that were deleted but photos remain).

5. **EAS build optimization**: Use cache keys aggressively. Build iOS and Android sequentially on free tier (not parallel). Only build when native changes occur -- use EAS Update (OTA) for JS-only changes.

6. **Free tier maximization**: PostHog free tier (1M events) and Sentry free tier (5K errors) are generous. Monitor usage to avoid surprise overages.

### Priority
- **Pre-launch**: No optimization needed. Current costs are minimal.
- **Post-launch**: Set up cost monitoring alerts in Supabase dashboard.
- **Growth**: Right-size compute. Implement image cleanup jobs. Consider EAS Production plan only if build frequency demands it.

---

## 20. Multi-Region Considerations

### x/pat User Geography (Digital Nomad Hubs)

| Region | Key Cities | Expected % of Users |
|--------|-----------|---------------------|
| **Southeast Asia** | Bangkok, Bali, HCMC, Chiang Mai | 35% |
| **Europe** | Lisbon, Barcelona, Berlin, Tbilisi | 30% |
| **Americas** | CDMX, Medellin, Buenos Aires, Austin | 25% |
| **Other** | Dubai, Cape Town, Seoul | 10% |

### Current Latency from Single Region (us-east-1)

| User Location | Latency to us-east-1 | Experience |
|---------------|----------------------|------------|
| New York | ~5ms | Excellent |
| CDMX | ~30ms | Excellent |
| Lisbon | ~80ms | Good |
| Bangkok | ~200ms | Acceptable |
| Bali | ~250ms | Acceptable |

### Optimization Strategy (by phase)

**Pre-launch (no action needed):**
- 200-250ms latency to Southeast Asia is acceptable for a social app. Users will not notice on feed loads and spot queries.
- Real-time chat messages over WebSocket add ~200ms one-way. This is fine for chat (not a trading app).

**Post-launch (1K-10K MAU):**
- Enable Supabase Edge Functions globally (they already run on Deno Deploy's edge network). Only pin database-heavy functions to us-east-1.
- Use Supabase Storage CDN aggressively -- images are the heaviest payload and CDN eliminates latency for repeat views.
- Implement client-side caching for spot data, profiles, and city info (stale-while-revalidate pattern).

**Growth (10K-50K MAU):**
- Add a Supabase read replica in `eu-west-1` (Frankfurt or Ireland). Route European users' read queries there.
- Add a read replica in `ap-southeast-1` (Singapore) for Asian users.
- Cost: ~$70-140/mo per replica depending on compute size.
- Implementation: Use Supabase client configuration to route reads to nearest replica.

**Scale (50K-100K+ MAU):**
- Evaluate moving primary to a more central region if most users are in Asia/Europe.
- Consider Fly.io edge proxy for connection routing to nearest read replica.
- Custom domain with geo-DNS (Cloudflare) to route API calls to nearest region.

### What NOT to Do
- Do NOT set up multi-region before 10K MAU. The complexity cost exceeds the latency benefit.
- Do NOT move the primary database region. Supabase does not support region migration -- you would need to create a new project and migrate.
- Do NOT use Supabase's global Edge Functions for database writes -- always write to the primary region.

### Priority
- **Pre-launch**: No action. Current latency is acceptable globally.
- **Post-launch**: Aggressive CDN caching for images. Client-side caching for data.
- **Growth**: First read replica in eu-west-1 when European user count justifies $70+/mo.

---

## 21. Rate Limiting and Abuse Prevention

### Current State
- Client-side rate limiter exists (`rateLimiter.ts`) -- sliding window, 10 action types covered.
- This is trivially bypassable by anyone with a REST client or modified app.
- Supabase Auth has built-in rate limiting (configurable in dashboard).
- RLS prevents unauthorized data access but does not limit volume.

### Server-Side Rate Limiting Strategy

**Layer 1: Supabase Auth (built-in, configure now)**
- Sign-up rate limit: 30/hour per IP (default, verify in dashboard)
- Password login attempts: 30/hour per IP
- OTP/magic link: 30/hour per email

**Layer 2: PostgREST (built-in, limited)**
- PostgREST does not have per-user rate limiting. It relies on Postgres connection limits.
- For API abuse: use RLS policies with `pg_stat_activity` checks (advanced, not recommended until needed).

**Layer 3: Edge Function Rate Limiting (implement at post-launch)**
```typescript
// In Edge Function: use Supabase as rate limit store
async function checkRateLimit(userId: string, action: string, limit: number, windowSec: number) {
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', new Date(Date.now() - windowSec * 1000).toISOString());

  return (count ?? 0) < limit;
}
```

**Layer 4: Cloudflare WAF (growth phase)**
- If you set up a custom domain (`api.xpat.social`), Cloudflare's free WAF provides:
  - Bot detection
  - DDoS protection
  - IP reputation blocking
  - Rate limiting rules (5 free rules)

### Bot Detection
- Monitor for: accounts creating spots with identical descriptions, mass follow/unfollow patterns, API calls without standard mobile app headers.
- PostHog can flag suspicious patterns (same user triggering 100+ events in a minute).
- Simple defense: require a minimum account age (24 hours) before allowing posts/spots/messages.

### Abuse Patterns Specific to Social Apps
- Spam messaging: Server-side limit of 60 DMs/hour per user
- Follow/unfollow spam: Limit 100 follows/day
- Fake spot creation: Limit 10 spots/day, require photo
- Report abuse: Limit 20 reports/day per user
- Scraping: Rate limit API responses, require auth for list endpoints

### Priority
- **Pre-launch**: Verify Supabase Auth rate limits in dashboard. Keep client-side limiter as UX guard.
- **Post-launch**: Implement server-side rate limiting in Edge Functions for write operations.
- **Growth**: Add Cloudflare WAF. Implement bot detection heuristics.

---

## 22. Data Migration Between Environments

### Seeding Strategy

**Development/Staging:**
- Maintain a `seed.sql` file in the migrations directory.
- Include: 10 test users, 50 spots across 3 cities, sample chat messages, sample events.
- Use `is_seed = true` flag on seeded records (already used for the 431 production spots).
- Sanitize any real user data before copying to dev/staging.

**Production Seed Data:**
- 431 spots already seeded (Bangkok/Lisbon/CDMX) with `is_seed = true`.
- Plan to add: sample events, neighborhood vibes, curated city content.
- Seed data should be attributable to a "system" user, not real users.

### Environment Sync Patterns

**Production -> Staging (data refresh):**
```bash
# Export production (anonymized)
pg_dump $PROD_DB_URL --data-only --exclude-table=auth.* | \
  sed 's/real_email@/test_/g' > staging_data.sql

# Import to staging
psql $STAGING_DB_URL < staging_data.sql
```

**Never sync**: `auth.users` table (contains passwords/tokens), `push_tokens`, `sessions`.

**Staging -> Production**: Only via migrations (SQL files). Never copy data from staging to production.

### Data Cleanup Jobs
```sql
-- Remove test data before launch
DELETE FROM spots WHERE is_seed = true AND created_at < '2026-04-01';

-- Remove orphaned records
DELETE FROM spot_votes WHERE spot_id NOT IN (SELECT id FROM spots);
DELETE FROM comments WHERE post_id NOT IN (SELECT id FROM posts);
```

### Priority
- **Pre-launch**: Create `seed.sql` for dev environment. Clean up test data in production.
- **Post-launch**: Establish staging data refresh process (monthly).
- **Growth**: Automate data sanitization for staging refreshes.

---

## 23. On-Call and Incident Response for Solo Founders

### The Solo Founder Reality
- You are the only responder. The system must be designed to minimize incidents and maximize self-healing.
- You cannot be on-call 24/7. Design for "fix it in the morning" resilience.

### Incident Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| **P1 - Critical** | App completely down, data loss | ASAP (phone alert) | Supabase outage, auth broken |
| **P2 - Major** | Key feature broken, workaround exists | 4 hours | Chat not working, uploads failing |
| **P3 - Minor** | Cosmetic or edge case | Next business day | UI glitch on specific device |
| **P4 - Low** | Enhancement request, non-urgent | This week | Slow query, minor UX improvement |

### Alert Routing

**Phone call/SMS (P1 only):**
- Better Stack: API endpoint down for >5 minutes
- Sentry: >50 errors in 5 minutes (error spike)

**Push notification (P2):**
- Sentry: New unhandled error in production
- Better Stack: Degraded response time (>3s for >5 minutes)

**Email (P3-P4):**
- Sentry: Weekly error digest
- GitHub: Dependabot security alerts
- Supabase: Usage approaching limits

### Self-Healing Patterns
1. **Circuit breaker in app**: If Supabase API returns 5xx, show cached data + "offline mode" banner. Do not crash.
2. **Retry with backoff**: All API calls should retry 3x with exponential backoff (1s, 2s, 4s).
3. **Graceful degradation**: If Realtime WebSocket disconnects, fall back to polling every 30 seconds for chat.
4. **Feature flags as kill switches**: If a feature is causing errors, disable it via PostHog feature flag without deploying a new build.

### Incident Response Runbook Template
```
INCIDENT: [Brief description]
DETECTED: [How -- Sentry alert, user report, monitoring]
SEVERITY: P[1-4]
IMPACT: [How many users affected, what feature]

STEPS TAKEN:
1. [First action]
2. [Second action]

ROOT CAUSE: [Why it happened]
FIX: [What was done]
PREVENTION: [How to prevent recurrence]
```

### Priority
- **Pre-launch**: Set up Better Stack phone alerts. Configure Sentry alert rules. Build ErrorBoundary with offline mode.
- **Post-launch**: Create incident runbook for top 5 failure scenarios (Supabase down, auth broken, push not working, build failed, app store rejection).
- **Growth**: Consider a part-time contractor for weekend coverage.

---

## 24. Technical Debt Management

### Current Technical Debt Inventory

Based on code review:

| Debt Item | Severity | Effort | Priority |
|-----------|----------|--------|----------|
| Hardcoded Supabase URL/key in `supabase.ts` | Medium | 1 hour | Pre-launch |
| No ESLint configured | Low | 2 hours | Pre-launch |
| No automated tests | High | Ongoing | Post-launch |
| PostHog uses try/catch require (bundler hack) | Low | 1 hour | Post-launch |
| No error boundaries on individual screens | Medium | 4 hours | Pre-launch |
| Client-side rate limiter only (no server-side) | High | 8 hours | Post-launch |
| No database migration files | High | 4 hours | Pre-launch |
| Manual EAS builds (no CI/CD) | Medium | 4 hours | Pre-launch |
| No staging environment | Medium | 2 hours | Post-launch |
| Redundant database indexes (5 identified) | Low | 30 min | Pre-launch |

### Tracking System
- For a solo founder, a simple GitHub Issues board with labels (`tech-debt`, `P1`-`P4`) is sufficient.
- Do NOT set up Jira, Linear, or any heavy project management tool.
- Rule of thumb: Spend 20% of each sprint on tech debt. For every 4 features, pay down 1 debt item.

### Prioritization Framework
1. **Security debt first**: Anything that could lead to data breach or unauthorized access.
2. **Reliability debt second**: Anything that could cause crashes or data loss.
3. **Developer velocity debt third**: Things that slow you down (no CI, no tests, no linting).
4. **Performance debt last**: Optimization that is not yet needed at current scale.

### Priority
- **Pre-launch**: Address all "Pre-launch" items in the table above.
- **Post-launch**: Establish the 20% tech debt sprint allocation. Track in GitHub Issues.

---

## 25. Infrastructure as Code

### Current State
- No IaC. All infrastructure configured via Supabase dashboard and manual CLI commands.

### What to Codify (and What Not To)

**Worth codifying:**
- Database schema (via Supabase migrations -- covered in section 13)
- Edge Function deployments (via `supabase functions deploy`)
- GitHub Actions workflows (YAML files in repo)
- EAS build configuration (already in `eas.json`)
- Environment variables (via EAS secrets CLI)

**NOT worth codifying (for solo founder):**
- Supabase project creation (one-time, done via dashboard)
- Supabase plan/compute upgrades (rare, dashboard is fine)
- DNS configuration (rare changes)
- Apple/Google developer portal settings (rare, complex)

### Terraform/Pulumi Assessment
- **Verdict: Skip for now.** Supabase has a Terraform provider but it only manages projects, not schema or Edge Functions. The ROI for a solo founder managing 1-2 Supabase projects is negative.
- **When to adopt**: When you have 3+ environments (dev/staging/prod), a DevOps hire, or need reproducible infrastructure for compliance.
- **Alternative**: Shell scripts (`setup.sh`) that run Supabase CLI commands in sequence. Version-controlled, reproducible, zero learning curve.

### Recommended `setup.sh`
```bash
#!/bin/bash
# Idempotent setup script for x/pat infrastructure
set -euo pipefail

echo "Applying migrations..."
supabase db push

echo "Deploying Edge Functions..."
supabase functions deploy api
supabase functions deploy notifications
supabase functions deploy translate

echo "Setting secrets..."
supabase secrets set EXPO_PUSH_TOKEN=$EXPO_PUSH_TOKEN

echo "Done."
```

### Priority
- **Pre-launch**: Create migration files and Edge Function deployment commands. Version control everything.
- **Post-launch**: Create `setup.sh` for repeatable deployments.
- **Growth**: Evaluate Terraform only if managing 3+ environments.

---

## 26. SSL/TLS Management

### Current State
- **Supabase**: Handles all TLS termination. Certificates auto-renewed. Nothing to manage.
- **xpat.social**: GitHub Pages handles TLS via Let's Encrypt. Auto-renewed. Nothing to manage.
- **Expo/EAS**: All build and update channels use TLS. Nothing to manage.
- **App Transport Security (iOS)**: Enforced by default. All Supabase URLs are HTTPS.

### What to Actually Do

**Security Headers for xpat.social (GitHub Pages):**
GitHub Pages has limited header control, but you can add a `_headers` file or use meta tags:
```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self' https://*.supabase.co; img-src 'self' https://*.supabase.co data:; style-src 'self' 'unsafe-inline';">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
```

**Custom Domain TLS:**
When setting up `api.xpat.social` pointing to Supabase:
- Supabase custom domains include TLS certificate provisioning and auto-renewal.
- HSTS is enabled by default on Supabase custom domains.
- Verify with: `curl -I https://api.xpat.social` -- check for `Strict-Transport-Security` header.

**Certificate Pinning (Mobile App):**
- Do NOT implement certificate pinning. It causes more outages than it prevents attacks, and makes certificate rotation dangerous.
- Rely on standard TLS verification (built into React Native).

### Priority
- **Pre-launch**: Add security meta tags to xpat.social. Verify HTTPS on all endpoints.
- **Post-launch**: Set up custom domain with Supabase. Verify HSTS.
- **Growth**: No additional action needed. TLS is fully managed.

---

## 27. API Documentation

### Current State
- No API documentation. PostgREST auto-generates OpenAPI spec from the database schema.

### Strategy for x/pat

**PostgREST (auto-generated):**
- Access the auto-generated OpenAPI spec at: `https://diiqponrvrcpwoerenwz.supabase.co/rest/v1/?apikey=YOUR_ANON_KEY` (returns JSON schema)
- This documents every table, column, filter, and relationship automatically.
- Not worth maintaining separate docs for PostgREST -- it is self-documenting.

**Edge Functions (manual):**
- Document Edge Function endpoints in a simple format in the repo:
```
supabase/functions/README.md

## API Endpoints

### POST /api/v1/feed
Returns personalized feed for authenticated user.
Auth: Bearer token required
Body: { cursor?: string, limit?: number }
Response: { posts: Post[], next_cursor: string | null }

### POST /notifications/send
Internal: sends push notification. Called by database webhooks.
Auth: Service role key required
Body: { user_id: string, title: string, body: string, data?: object }
```

**When to invest in proper docs:**
- When you have external API consumers (partners, third-party integrations)
- When you hire developers who need to understand the API
- Tool: Use Swagger UI pointed at your PostgREST OpenAPI endpoint for interactive docs

### Priority
- **Pre-launch**: No action needed for PostgREST (auto-documented).
- **Post-launch**: Document Edge Function endpoints in a README.
- **Growth**: Set up Swagger UI if partners need API access.

---

## 28. Load Testing

### Tools for x/pat's Stack

| Tool | Best For | Cost |
|------|----------|------|
| **k6 (Grafana)** | API load testing, scripted scenarios | Free (open source) |
| **Artillery** | Quick HTTP load tests | Free (open source) |
| **Supabase Benchmarks** | Built-in dashboard metrics | Included |

### Recommended: k6

k6 is the best fit because it supports: WebSocket testing (for Realtime), HTTP testing (for PostgREST/Edge Functions), and scripted user scenarios.

### Test Scenarios for x/pat

**Scenario 1: Feed Load (most common)**
```javascript
// k6 script
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp to 100 concurrent users
    { duration: '5m', target: 100 },  // Hold
    { duration: '2m', target: 500 },  // Ramp to 500
    { duration: '5m', target: 500 },  // Hold
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  const res = http.get('https://diiqponrvrcpwoerenwz.supabase.co/rest/v1/posts?select=*,profiles(*)&order=created_at.desc&limit=20', {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${USER_TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200, 'fast': (r) => r.timings.duration < 500 });
}
```

**Scenario 2: Concurrent Chat Messages**
- Simulate 100 users sending messages to 5 city chat channels simultaneously.
- Measure: message delivery latency, WebSocket connection stability, database write throughput.

**Scenario 3: Spot Search with Geographic Filter**
- 500 concurrent users searching for spots in different cities.
- Measure: query response time, connection pool utilization.

### When to Load Test
- Before any major launch or press coverage.
- After database schema changes or new indexes.
- Before upgrading/downgrading Supabase compute.

### Interpreting Results
- **Target**: p95 response time < 500ms at 500 concurrent users
- **Warning zone**: p95 > 1s or error rate > 1%
- **Scale trigger**: Sustained >70% connection pool utilization

### Priority
- **Pre-launch**: Run basic k6 test against PostgREST endpoints. Establish baseline.
- **Post-launch**: Full scenario testing before any press/marketing push.
- **Growth**: Regular monthly load tests. Test before compute changes.

---

## 29. Mobile App Release Management

### Versioning Strategy

**Current**: `1.3.5` (version in app.json + package.json)

**Recommended scheme**: `MAJOR.MINOR.PATCH`
- **MAJOR** (2.0.0): Breaking changes, major redesign, data migration required
- **MINOR** (1.4.0): New features (events, AI recommendations, new screens)
- **PATCH** (1.3.6): Bug fixes, polish, performance improvements

**Build number**: Auto-incremented by EAS (`autoIncrement: true` already configured)

### Release Process

```
[Development] -- code changes on feature branch
    |
    v
[PR Check] -- TypeScript + lint (GitHub Actions)
    |
    v
[Merge to main] -- squash merge
    |
    v
[Decision: JS-only or native change?]
    |                    |
    v                    v
[EAS Update]        [EAS Build]
(OTA, instant)      (new binary, App Store review)
    |                    |
    v                    v
[Internal Testing]  [TestFlight / Internal Track]
    |                    |
    v                    v
[Staged Rollout]    [App Store Review]
(EAS Update channels) (1-3 days)
    |                    |
    v                    v
[Production]        [Staged Rollout: 10% -> 50% -> 100%]
```

### EAS Update (OTA) vs EAS Build

| Change Type | Deployment Method | Time to Users |
|-------------|-------------------|---------------|
| Bug fix in JS/TS | EAS Update (OTA) | Minutes |
| New screen/feature (JS only) | EAS Update (OTA) | Minutes |
| New native module added | EAS Build (binary) | 1-3 days (review) |
| Expo SDK upgrade | EAS Build (binary) | 1-3 days |
| Asset changes (icons, splash) | EAS Build (binary) | 1-3 days |

### Staged Rollout

**iOS (App Store Connect):**
- Phased release: Auto-rolls out over 7 days (Day 1: 1%, Day 2: 2%, Day 3: 5%, ... Day 7: 100%)
- Can pause/halt if issues detected via Sentry
- Can manually release to 100% at any time

**Android (Google Play Console):**
- Staged rollout: Manual percentage control (start at 10%, increase manually)
- More flexible than iOS -- can set any percentage

**EAS Update (OTA):**
- Use channels: `production`, `beta`
- Roll out to `beta` channel first (family testers), then promote to `production`
- Rollback: Publish a new update pointing to the previous JS bundle

### Hotfix Process
1. Branch from `main` (or the release tag)
2. Fix the bug
3. If JS-only: `eas update --channel production` (live in minutes)
4. If native: `eas build --profile production` + submit (1-3 day delay)
5. For critical native fixes: Use TestFlight "external testing" expedited review or Google Play's "urgent update" flag

### Priority
- **Pre-launch**: Set up EAS Update channels (production, beta). Test OTA update flow.
- **Post-launch**: Implement staged rollout for both platforms. Use beta channel for family testers.
- **Growth**: Formalize release cadence (e.g., minor release every 2 weeks, patches as needed).

---

## 30. Vendor Risk Management

### Dependency Analysis

| Vendor | Criticality | Lock-in Level | Migration Difficulty | Risk Level |
|--------|-------------|---------------|---------------------|------------|
| **Supabase** | Critical | Medium | High (3-6 months) | Medium |
| **Expo/EAS** | Critical | High | Very High (rewrite) | Low |
| **Apple (App Store)** | Critical | Total | N/A | Low |
| **Google (Play Store)** | Critical | Total | N/A | Low |
| **Sentry** | Low | Low | Easy (swap SDK) | Very Low |
| **PostHog** | Low | Low | Easy (swap SDK) | Very Low |
| **GitHub** | Medium | Low | Easy (git push to new remote) | Very Low |
| **Cloudflare (via Supabase)** | Medium | None | Transparent | Very Low |
| **Google Maps (Android)** | Medium | Medium | Moderate (swap to Mapbox) | Low |
| **Apple Maps (iOS)** | Low | Low | Native, no risk | Very Low |

### Risk Mitigation by Vendor

**Supabase (highest migration risk):**
- **Risk**: Supabase shuts down, price increases dramatically, or quality degrades.
- **Mitigation**: Supabase is open source. You can self-host the entire stack. Your data is standard Postgres -- `pg_dump` works at any time.
- **Abstraction layer**: The `supabase.ts` client is the only import point. Wrapping Supabase calls in a service layer (e.g., `spotService.getSpots()`) would make swapping easier, but adds complexity now for an unlikely scenario.
- **Action**: Monthly `pg_dump` backup to local storage. This is your escape hatch.

**Expo/EAS (highest lock-in):**
- **Risk**: Expo pricing becomes unsustainable or Expo ceases operations.
- **Mitigation**: Expo is open source. You can `expo eject` (now called "prebuild") to get bare React Native at any time. EAS Build is convenient but you can build locally or use other CI services (Bitrise, App Center).
- **Action**: No action needed. Expo is well-funded (Series B, profitable) and the ecosystem is growing.

**Google Maps (Android):**
- **Risk**: Google Maps pricing changes (currently free for mobile native maps, pay for web/API).
- **Mitigation**: react-native-maps supports Mapbox as a provider. Migration requires changing the provider prop and getting a Mapbox API key.
- **Action**: No action. Mobile Maps SDK is free and is not likely to change.

**Sentry / PostHog:**
- **Risk**: Minimal. Both are open source with self-hosted options.
- **Mitigation**: Both are already integrated with graceful no-op patterns. Removing either is a 1-hour task.
- **Action**: No action.

### Vendor Monitoring
- Subscribe to status pages: status.supabase.com, status.expo.dev
- Monitor pricing page changes (quarterly check)
- Track Supabase's funding/growth news (healthy company = lower risk)

### Priority
- **Pre-launch**: Set up monthly pg_dump backup. Subscribe to Supabase status page.
- **Post-launch**: No additional action.
- **Growth**: Evaluate vendor costs annually. Consider service layer abstraction only if migration becomes likely.

---

## Priority Matrix: What to Do When

### PRE-LAUNCH (Do Now)

| # | Action | Section | Effort | Impact |
|---|--------|---------|--------|--------|
| 1 | Set up GitHub Actions PR check (TypeScript + lint) | 11 | 2h | High |
| 2 | Create database migration files from current schema | 13 | 4h | High |
| 3 | Configure Sentry alert rules (error spike, new errors) | 9 | 1h | High |
| 4 | Set up Better Stack uptime monitors | 9 | 30m | High |
| 5 | Drop redundant database indexes (5 identified) | 3 | 30m | Medium |
| 6 | Add missing database indexes (lat/lng, current_city) | 3 | 30m | Medium |
| 7 | Implement client-side image compression before upload | 5 | 2h | Medium |
| 8 | Set cache headers on all storage uploads | 4 | 1h | Medium |
| 9 | Deploy notification Edge Function | 7 | 4h | High |
| 10 | Add app_config table for force-update mechanism | 14 | 1h | High |
| 11 | Set up EAS Update channels (production, beta) | 29 | 1h | High |
| 12 | Verify Supabase Auth rate limits in dashboard | 21 | 15m | High |
| 13 | Take manual pg_dump backup | 16 | 15m | High |
| 14 | Add security meta tags to xpat.social | 26 | 30m | Medium |
| 15 | Set up pg_cron for presence cleanup and token cleanup | 8 | 1h | Medium |
| 16 | Run baseline k6 load test | 28 | 2h | Medium |

**Total pre-launch effort: ~20 hours**

### POST-LAUNCH (1K-10K MAU)

| # | Action | Section | Effort |
|---|--------|---------|--------|
| 1 | Create staging Supabase environment (branch or project) | 12 | 2h |
| 2 | Implement server-side rate limiting in Edge Functions | 21 | 8h |
| 3 | Add Dependabot + npm audit to CI | 17 | 1h |
| 4 | Create materialized views for trending/feed | 3 | 4h |
| 5 | Implement feature flags (maintenance_mode + 2-3 others) | 15 | 4h |
| 6 | Enable PITR when real user data matters ($100/mo) | 16 | 15m |
| 7 | Set up EAS build GitHub Action | 11 | 2h |
| 8 | Add structured JSON logging to Edge Functions | 10 | 2h |
| 9 | Begin automated testing (critical paths) | 24 | Ongoing |
| 10 | Implement pgmq for notification queue | 8 | 4h |

### GROWTH (10K-50K MAU)

| # | Action | Section | Effort |
|---|--------|---------|--------|
| 1 | Add read replica in eu-west-1 | 20 | 4h |
| 2 | Upgrade Supabase compute (Small or Medium) | 1 | 15m |
| 3 | Commission penetration test | 17 | Vendor-managed |
| 4 | Implement table partitioning for chat_messages | 3 | 8h |
| 5 | Add Cloudflare WAF via custom domain | 21 | 4h |
| 6 | Set up automated off-site backups | 16 | 4h |
| 7 | Monthly load testing cadence | 28 | 2h/month |

### SCALE (50K-100K+ MAU)

| # | Action | Section | Effort |
|---|--------|---------|--------|
| 1 | Add second read replica (ap-southeast-1) | 20 | 4h |
| 2 | Evaluate Supabase Team plan vs staying on Pro | 1 | Research |
| 3 | Right-size all compute resources | 19 | 2h |
| 4 | Consider hiring DevOps contractor | 23 | Hire |
| 5 | SOC2 Type I if partnerships require | 17 | 3-6 months |

---

## Quick Reference: Monthly Cost by Phase

| Phase | MAU | Infrastructure | Monitoring | Build/CI | Total |
|-------|-----|----------------|------------|----------|-------|
| Pre-launch | <100 | $25 | $0 | $0 | $25 |
| Post-launch | 1K-10K | $75-125 | $0-26 | $0 | $75-151 |
| Growth | 10K-50K | $175-400 | $26-50 | $0-99 | $201-549 |
| Scale | 50K-100K | $400-800 | $50-100 | $99 | $549-999 |

The app can realistically reach 100K MAU spending under $1,000/month on infrastructure. The biggest cost driver will be Supabase compute and Realtime message volume, both of which scale predictably and can be optimized with the strategies outlined above.
