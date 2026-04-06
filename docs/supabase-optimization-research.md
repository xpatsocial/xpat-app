# Supabase Optimization, Scaling & Advanced Features Research

**For x/pat** -- Social travel app for digital nomads
**Database**: Postgres 17.6 on Supabase (us-east-1), project `diiqponrvrcpwoerenwz`
**Current state**: 28 tables, 7 functions, 80+ RLS policies, 85+ indexes, 6 extensions
**Date**: April 2026

---

## Table of Contents

1. [Query Optimization](#1-query-optimization)
2. [RLS Performance](#2-rls-performance)
3. [Edge Functions Best Practices](#3-edge-functions-best-practices)
4. [Realtime Scaling](#4-realtime-scaling)
5. [Storage Optimization](#5-storage-optimization)
6. [Auth Best Practices 2026](#6-auth-best-practices-2026)
7. [PostgREST Performance](#7-postgrest-performance)
8. [Database Triggers](#8-database-triggers)
9. [pg_cron Scheduled Tasks](#9-pg_cron-scheduled-tasks)
10. [Full-Text Search](#10-full-text-search)
11. [Geographic Queries](#11-geographic-queries)
12. [Connection Pooling](#12-connection-pooling)
13. [Branching for Development](#13-branching-for-development)
14. [Migrations Best Practices](#14-migrations-best-practices)
15. [Monitoring](#15-monitoring)
16. [RLS Patterns for Social Apps](#16-rls-patterns-for-social-apps)
17. [Materialized Views](#17-materialized-views)
18. [Webhooks](#18-webhooks)
19. [Vector Search](#19-vector-search)
20. [Rate Limiting](#20-rate-limiting)
21. [Backup & Disaster Recovery](#21-backup--disaster-recovery)
22. [Multi-Region Deployment](#22-multi-region-deployment)
23. [Pricing Optimization](#23-pricing-optimization)
24. [Supabase vs Alternatives at Scale](#24-supabase-vs-alternatives-at-scale)
25. [AI Features 2026](#25-ai-features-2026)

---

## 1. Query Optimization

### Current Best Practice
- Use `EXPLAIN ANALYZE` on every slow query to understand the query planner's choices
- Supabase provides `index_advisor` extension for automatic index recommendations
- `pg_stat_statements` is already enabled on x/pat -- use it to find top resource consumers

### x/pat Audit Findings

**Redundant indexes detected:**
- `blocks` table has FOUR indexes on the same columns: `idx_blocks_blocker`, `idx_blocks_blocked`, `idx_blocks_blocker_blocked`, `idx_blocks_blocked_blocker` PLUS the unique constraint `blocks_blocker_id_blocked_id_key`. The unique composite index already covers lookups in blocker/blocked order. **Drop** `idx_blocks_blocker`, `idx_blocks_blocker_blocked` (the unique covers these). Keep `idx_blocks_blocked` for reverse lookups and drop `idx_blocks_blocked_blocker` (redundant with the reverse lookup + unique).
- `travel_plans` has both `idx_travel_plans_user` AND `idx_travel_plans_user_id` -- identical indexes. **Drop one.**
- `push_tokens` has `idx_push_tokens_user_id` plus `push_tokens_user_id_key` (unique). The unique index already serves as the lookup. **Drop** the non-unique one.

**Missing indexes for common patterns:**
- `spots.lat, spots.lng` -- no index for geographic proximity queries. Currently using btree on city but proximity queries on lat/lng will seq scan. See Section 11 for PostGIS recommendation.
- `profiles.current_city` -- if filtering users by city (common for "who's here" features), add an index.
- `posts.created_at DESC` exists, but feed queries joining with `follows` need a covering index on follows(follower_id) which exists via the unique constraint.

### Implementation Approach
```sql
-- Run on any query to understand performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM spots WHERE city = 'Bangkok' AND category = 'cafe';

-- Enable index_advisor for automatic recommendations
CREATE EXTENSION IF NOT EXISTS index_advisor;

-- Drop redundant indexes
DROP INDEX IF EXISTS idx_blocks_blocker;
DROP INDEX IF EXISTS idx_blocks_blocker_blocked;
DROP INDEX IF EXISTS idx_blocks_blocked_blocker;
DROP INDEX IF EXISTS idx_travel_plans_user_id;
DROP INDEX IF EXISTS idx_push_tokens_user_id;

-- Add missing index for profile city lookups
CREATE INDEX idx_profiles_current_city ON profiles (current_city) WHERE current_city IS NOT NULL;
```

### Recommendations for x/pat
1. Run `EXPLAIN ANALYZE` on your top 10 queries from `pg_stat_statements` (sorted by total_exec_time)
2. Clean up the 5 redundant indexes identified above -- each wastes write performance
3. Add `index_advisor` extension and run it against your most frequent queries
4. For feed queries: ensure the query planner uses the `idx_posts_created` index with a LIMIT clause rather than scanning all posts

---

## 2. RLS Performance

### Current Best Practice
- RLS policies execute on EVERY query to a table -- they are essentially appended as WHERE clauses
- Policies calling functions (like `is_blocked()`, `are_connected()`) add overhead per row
- `SECURITY DEFINER` functions bypass RLS of referenced tables, reducing recursive RLS evaluation
- Use `auth.uid()` comparisons directly on indexed columns for best performance

### x/pat Audit Findings

**Performance concerns:**
- `chat_messages` SELECT policy calls `is_blocked(auth.uid(), sender_id)` -- this executes a subquery against `blocks` for EVERY message returned. With 1000 messages in a channel, that is 1000 subqueries.
- `direct_messages` SELECT and INSERT both call `is_blocked()` -- same concern
- `connections` INSERT calls `is_blocked()` -- acceptable since it is per-insert, not bulk reads
- `chat_channels` SELECT has an EXISTS subquery against `chat_members` -- this is efficient if `chat_members(channel_id, user_id)` is indexed (it is, via the unique constraint)
- `message_translations` SELECT has a two-table JOIN in the EXISTS -- this runs per row

**Efficient policies (good):**
- `spots_read`, `posts_read`, `comments_read`, `follows_read`, `likes_read` all use `qual = true` (no RLS filtering on reads) -- this is optimal for public data
- `profiles_read` is public -- correct for social profiles
- Owner-check policies like `auth.uid() = user_id` hit the primary key index

### Implementation Approach
```sql
-- Optimize chat_messages: pre-compute blocked users list instead of per-row check
-- Option A: Use a set-returning function that returns blocked user IDs once
CREATE OR REPLACE FUNCTION blocked_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT blocked_id FROM public.blocks WHERE blocker_id = auth.uid()
  UNION
  SELECT blocker_id FROM public.blocks WHERE blocked_id = auth.uid();
$$;

-- Then rewrite the chat_messages SELECT policy:
-- OLD: NOT is_blocked(auth.uid(), sender_id)  [per-row function call]
-- NEW: sender_id NOT IN (SELECT blocked_user_ids())  [single subquery, cached by planner]
```

### Recommendations for x/pat
1. Replace per-row `is_blocked()` calls in chat_messages and direct_messages SELECT policies with a set-based approach (blocked_user_ids IN list)
2. For message_translations, consider denormalizing the channel_id onto the translations table to avoid the JOIN in the RLS policy
3. Keep all public-read policies as `true` -- this is correct for a social discovery app
4. Monitor RLS overhead with: `EXPLAIN (ANALYZE) SELECT * FROM chat_messages WHERE channel_id = '...'`

---

## 3. Edge Functions Best Practices

### Current Best Practice (2026)
- **Cold starts**: Combine multiple endpoints into a single "fat" Edge Function using Hono/Oak router to minimize cold starts. Each unique function gets its own cold start; fewer functions = fewer cold starts.
- **Regional invocation**: Pin Edge Functions to `us-east-1` (your DB region) for database-heavy operations using `x-region` header or `FunctionRegion.UsEast1`
- **Timeouts**: Default 150s wall clock. For long operations, use Supabase Queues (pgmq) instead.
- **Caching**: Use Storage as a cache-first layer; serve from CDN for repeated requests
- **Rate limits**: Function-to-function calls limited to 5000/min per request chain
- **Shared code**: Use `_shared/` directory for common utilities (CORS headers, Supabase client init)

### Implementation Approach for x/pat
```
supabase/functions/
  _shared/
    supabaseAdmin.ts     # Service role client
    supabaseClient.ts    # Anon client
    cors.ts              # CORS headers
  api/
    index.ts             # Fat function: Hono router for CRUD operations
  notifications/
    index.ts             # Push notification sender
  translate/
    index.ts             # Chat message translation
  embed/
    index.ts             # Future: embedding generation for spot recommendations
```

### Recommendations for x/pat
1. Create a single "api" Edge Function with Hono router for: affiliate click tracking, feed generation, trending spots calculation, digest email sending
2. Pin all database-heavy functions to `us-east-1` with `region: FunctionRegion.UsEast1`
3. Use `_shared/` for Supabase client initialization and CORS headers
4. For translation: cache translations in `message_translations` table (already exists) -- check cache before calling translation API
5. Set `verify_jwt = false` only for webhook endpoints (Stripe, external triggers)

---

## 4. Realtime Scaling

### Current Best Practice (2026)
- **Channel limits**: Supabase benchmarks show 2-6 node clusters handling 200+ concurrent connections per channel, 500K+ messages/min across system
- **Broadcast**: Most efficient -- no database involvement, pure WebSocket message relay. 10K msg/s per channel demonstrated.
- **Presence**: Track up to ~2000 concurrent users per channel efficiently. Each presence change broadcasts to all channel subscribers.
- **Postgres Changes**: Listens to WAL -- adds database overhead. Use sparingly and filter with RLS.
- **Authorization**: Broadcast and Presence now support authorization (public beta) -- use RLS-based auth for channels

### x/pat Architecture
- **City chat**: Use Broadcast for messages (not Postgres Changes) -- messages are already persisted via INSERT, no need to listen to WAL
- **Presence**: Use for "who's online in this city" -- map to `city_presence` / `user_presence` tables
- **DMs**: Use Broadcast channels scoped to conversation pairs

### Recommendations for x/pat
1. For chat: POST message via PostgREST (persists to DB), then Broadcast the message to channel subscribers. Do NOT use Postgres Changes for chat -- it doubles the work.
2. City presence: Use Realtime Presence with channel name `city:{cityName}`. Track user status (exploring/working/available) in presence state.
3. Limit concurrent channel subscriptions per client to ~10 (tabs, city chat, DMs, presence)
4. Use authorization on Broadcast channels to enforce that only chat_members can send/receive
5. For "new post" notifications: Postgres Changes on `posts` table filtered by followed user IDs

---

## 5. Storage Optimization

### Current Best Practice
- **CDN**: Supabase Storage includes CDN via Cloudflare. Public buckets served from CDN automatically.
- **Smart CDN**: Automatically revalidates cached assets at edge. Enabled by default on Pro.
- **Image transforms**: On-the-fly resizing/format conversion via URL params. Transforms are cached.
- **Signed URLs**: For private assets; set short expiry for security.
- **Resumable uploads**: Use TUS protocol for large files (photos from mobile).

### Implementation Approach for x/pat
```typescript
// Upload spot photo with automatic CDN caching
const { data } = await supabase.storage
  .from('spot-photos')
  .upload(`spots/${spotId}/${filename}`, file, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',  // 1 year -- immutable content
    upsert: false,
  });

// Serve with transforms for thumbnails
const thumbUrl = supabase.storage
  .from('spot-photos')
  .getPublicUrl(`spots/${spotId}/${filename}`, {
    transform: {
      width: 400,
      height: 300,
      resize: 'cover',
      format: 'webp',    // Smaller than JPEG
      quality: 80,
    }
  });

// Avatar with circular crop
const avatarUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}.jpg`, {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover',
      format: 'webp',
    }
  });
```

### Recommendations for x/pat
1. Create separate buckets: `avatars` (public), `spot-photos` (public), `chat-media` (private, signed URLs)
2. Set `cacheControl: '31536000'` on all uploaded photos -- use unique filenames for versioning
3. Use WebP format transforms everywhere -- 30% smaller than JPEG at same quality
4. Generate 3 sizes on upload via Edge Function: thumbnail (200px), medium (600px), full (1200px). Or use on-the-fly transforms.
5. Set Storage policies: avatars only uploadable by profile owner, spot photos by spot creator

---

## 6. Auth Best Practices 2026

### Current Best Practice
- **Session management**: `autoRefreshToken: true` + `persistSession: true` (x/pat already does this correctly)
- **Secure storage**: Use Keychain (iOS) / Keystore (Android) for tokens (x/pat already uses SecureStore)
- **Token refresh**: supabase-js handles automatic refresh 60s before expiry. `detectSessionInUrl: false` is correct for React Native.
- **Auth hooks**: Use custom hooks for MFA verification, custom access tokens, send-email/send-sms
- **Social login**: Deep links for OAuth providers. Use `expo-auth-session` for React Native.

### x/pat Current Setup (Good)
```typescript
// Already well-configured:
auth: {
  storage: SecureStoreAdapter,     // Keychain/Keystore
  autoRefreshToken: true,          // Auto-refresh before expiry
  persistSession: true,            // Persist across app restarts
  detectSessionInUrl: false,       // Correct for RN (no browser URLs)
}
```

### Recommendations for x/pat
1. **Already well-implemented.** The SecureStore adapter with proper config is exactly right.
2. Add error recovery: listen for `TOKEN_REFRESHED` and `SIGNED_OUT` events to handle edge cases
3. Consider adding Apple Sign In and Google Sign In for social login (important for App Store)
4. Implement `onAuthStateChange` listener at app root to handle session expiry gracefully
5. For the `handle_new_user` trigger: add ON CONFLICT handling for username collisions (two users with same email prefix)
6. SecureStore 2048-byte limit: monitor JWT sizes. If adding custom claims via hooks, JWTs can grow. The current note about the limit in the code is correct.

---

## 7. PostgREST Performance

### Current Best Practice
- **Resource embedding**: Use `select=*,profiles(display_name,avatar_url)` for JOINs. Limit depth to 2 levels.
- **Batch requests**: PostgREST supports bulk INSERT/UPSERT. Batch 431 seed spots into groups of 100.
- **Pagination**: Use `range` headers or `.range(0, 24)` for cursor-based pagination. Avoid large offsets.
- **Prefer: count=exact** adds overhead -- use `count=estimated` for large tables or omit entirely
- **Column selection**: Always specify columns with `.select()` -- avoid `select('*')` on wide tables like `profiles` (30+ columns)

### Implementation Approach for x/pat
```typescript
// Good: Specific columns + embedded relation
const { data } = await supabase
  .from('posts')
  .select('id, content, photo_url, created_at, profiles(display_name, avatar_url)')
  .order('created_at', { ascending: false })
  .range(0, 19);  // 20 posts per page

// Good: Batch insert
const { data } = await supabase
  .from('spots')
  .insert(spotsArray);  // PostgREST handles bulk

// Bad: Avoid this
const { data, count } = await supabase
  .from('spots')
  .select('*', { count: 'exact' });  // Full table scan for count + all columns
```

### Recommendations for x/pat
1. Audit every `.select('*')` call and replace with specific columns -- profiles has 30 columns, most views need 5-6
2. For feed: use cursor-based pagination with `created_at` instead of offset-based `.range()`
3. For spot cards: only fetch `id, name, city, category, photo_url, votes, lat, lng` -- skip description, tags, etc. until detail view
4. Use `Prefer: return=minimal` for INSERT/UPDATE/DELETE when you don't need the response body
5. For counts on explore screen: use `count: 'estimated'` or cache counts in a materialized view

---

## 8. Database Triggers

### Current Best Practice
- Use triggers for: auto-creating related records, denormalizing counts, sending real-time notifications
- Keep trigger functions fast -- avoid network calls (use pg_net for async HTTP)
- Use `AFTER` triggers for side effects, `BEFORE` triggers for data validation/modification
- `SECURITY DEFINER` on trigger functions to bypass RLS for system operations

### x/pat Current Triggers
- `handle_new_user` -- creates profile on auth.users INSERT (good)
- `handle_new_user_preferences` -- creates user_preferences on auth.users INSERT (good)
- No triggers detected in the public schema (the auth triggers are on auth.users)

### Recommended New Triggers for x/pat
```sql
-- 1. Auto-update vote count on spots when spot_votes changes
CREATE OR REPLACE FUNCTION update_spot_votes()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spots SET votes = votes + 1 WHERE id = NEW.spot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spots SET votes = votes - 1 WHERE id = OLD.spot_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_spot_votes
  AFTER INSERT OR DELETE ON public.spot_votes
  FOR EACH ROW EXECUTE FUNCTION update_spot_votes();

-- 2. Auto-calculate profile_completion_score on profile update
CREATE OR REPLACE FUNCTION calculate_profile_completion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  score int := 0;
BEGIN
  IF NEW.display_name IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.avatar_url IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.bio IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.current_city IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.tagline IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.nationality IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.languages != '{}' THEN score := score + 5; END IF;
  IF NEW.skills != '{}' THEN score := score + 5; END IF;
  IF NEW.travel_style != '{}' THEN score := score + 5; END IF;
  IF NEW.work_type IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.prompt_1_answer IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.prompt_2_answer IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.prompt_3_answer IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.countries_visited != '{}' THEN score := score + 5; END IF;
  NEW.profile_completion_score := score;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_completion
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION calculate_profile_completion();

-- 3. Update updated_at timestamp on relevant tables
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Recommendations for x/pat
1. Add the vote count denormalization trigger -- avoids COUNT(*) queries on spot_votes for every spot card
2. Add profile completion score auto-calculation -- currently the column exists but is always 0
3. Add `updated_at` auto-update triggers on profiles, user_preferences, connections
4. Consider a trigger on `follows` INSERT to create a notification record (for "X started following you")

---

## 9. pg_cron Scheduled Tasks

### Current Best Practice
- pg_cron v1.6.4 available on Postgres 17. Max 8 concurrent jobs recommended, each under 10 minutes.
- Jobs can run SQL, call database functions, or invoke Edge Functions via pg_net
- Monitor job health via `cron.job_run_details`
- Wrap long-running queries in functions with custom timeouts

### Recommended Cron Jobs for x/pat
```sql
-- Enable pg_cron (already available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Clean up expired user_availability (older than 24 hours)
SELECT cron.schedule(
  'cleanup-expired-availability',
  '0 * * * *',  -- Every hour
  $$DELETE FROM public.user_availability WHERE expires_at < now() - interval '12 hours';$$
);

-- 2. Clean up stale user_presence (offline for >7 days)
SELECT cron.schedule(
  'cleanup-stale-presence',
  '0 3 * * *',  -- Daily at 3 AM UTC
  $$DELETE FROM public.user_presence WHERE last_seen < now() - interval '7 days';$$
);

-- 3. Clean up old city_presence (inactive >48 hours)
SELECT cron.schedule(
  'cleanup-stale-city-presence',
  '0 4 * * *',  -- Daily at 4 AM UTC
  $$DELETE FROM public.city_presence WHERE last_active < now() - interval '48 hours';$$
);

-- 4. Refresh materialized views (see Section 17)
SELECT cron.schedule(
  'refresh-trending-spots',
  '*/15 * * * *',  -- Every 15 minutes
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_spots;$$
);

-- 5. Aggregate daily affiliate analytics
SELECT cron.schedule(
  'daily-affiliate-stats',
  '0 1 * * *',  -- Daily at 1 AM UTC
  $$INSERT INTO affiliate_daily_stats (partner_id, click_count, date)
    SELECT partner_id, COUNT(*), CURRENT_DATE - 1
    FROM affiliate_clicks
    WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE
    GROUP BY partner_id
    ON CONFLICT (partner_id, date) DO UPDATE SET click_count = EXCLUDED.click_count;$$
);

-- 6. Clean up soft-deleted chat messages older than 30 days
SELECT cron.schedule(
  'purge-deleted-messages',
  '0 2 * * 0',  -- Weekly on Sunday at 2 AM
  $$DELETE FROM public.chat_messages WHERE deleted = true AND created_at < now() - interval '30 days';$$
);
```

### Recommendations for x/pat
1. Start with cleanup jobs -- they prevent table bloat and keep queries fast
2. Add the materialized view refresh for trending spots (see Section 17)
3. Build affiliate analytics aggregation for when partners come on board
4. Monitor job health: `SELECT * FROM cron.job_run_details WHERE status != 'succeeded' ORDER BY start_time DESC LIMIT 10;`
5. Keep job count under 8 concurrent to avoid connection pressure on free tier

---

## 10. Full-Text Search

### Current Best Practice
- Use `tsvector` generated columns for automatic search index maintenance
- Create GIN indexes on tsvector columns for fast lookups
- Use `ts_rank()` for relevance ordering
- `to_tsvector('english', ...)` for language-aware stemming
- Supabase PostgREST supports `.textSearch()` operator

### Implementation for x/pat
```sql
-- Add full-text search to spots
ALTER TABLE spots ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(note, '')), 'D')
  ) STORED;

CREATE INDEX idx_spots_fts ON spots USING GIN (fts);

-- Add full-text search to profiles
ALTER TABLE profiles ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(current_city, '')), 'C')
  ) STORED;

CREATE INDEX idx_profiles_fts ON profiles USING GIN (fts);

-- Search function for spots
CREATE OR REPLACE FUNCTION search_spots(query text, p_city text DEFAULT NULL)
RETURNS SETOF spots
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM spots
  WHERE fts @@ websearch_to_tsquery('english', query)
    AND (p_city IS NULL OR city = p_city)
  ORDER BY ts_rank(fts, websearch_to_tsquery('english', query)) DESC
  LIMIT 50;
$$;
```

### Client Usage
```typescript
// Using PostgREST text search
const { data } = await supabase
  .from('spots')
  .select('id, name, city, category, photo_url')
  .textSearch('fts', 'coworking wifi fast', { type: 'websearch' })
  .eq('city', 'Bangkok')
  .limit(20);

// Or using the RPC function
const { data } = await supabase
  .rpc('search_spots', { query: 'coworking wifi', p_city: 'Bangkok' });
```

### Recommendations for x/pat
1. Add FTS columns to `spots` and `profiles` as generated columns -- zero maintenance overhead
2. Weight name/title as 'A', city/category as 'B', description as 'C' for better relevance
3. Use `websearch_to_tsquery` instead of `plainto_tsquery` -- supports quoted phrases and boolean operators
4. The GIN index makes FTS queries sublinear -- critical as spots grow past 1000+
5. Combine FTS with city filter for the explore screen search bar

---

## 11. Geographic Queries (PostGIS)

### Current Best Practice
- PostGIS extension provides proper spatial data types and indexes
- Use `geography(POINT)` type instead of separate lat/lng float columns
- GIST spatial indexes enable efficient nearest-neighbor queries via `<->` operator
- `ST_DWithin()` for "find within radius" queries
- `ST_MakeBox2D()` for map viewport bounding box queries

### Implementation for x/pat
```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Add geography column to spots (keep lat/lng for backward compat)
ALTER TABLE spots ADD COLUMN location extensions.geography(POINT);

-- Populate from existing lat/lng
UPDATE spots SET location = extensions.st_point(lng, lat)::extensions.geography
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Create spatial index
CREATE INDEX idx_spots_location ON spots USING GIST (location);

-- Nearby spots function
CREATE OR REPLACE FUNCTION nearby_spots(
  p_lat float, p_lng float,
  p_radius_meters float DEFAULT 5000,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  id bigint, name text, city text, category text,
  photo_url text, votes int, lat float, lng float,
  dist_meters float
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT
    s.id, s.name, s.city, s.category,
    s.photo_url, s.votes, s.lat, s.lng,
    extensions.st_distance(s.location, extensions.st_point(p_lng, p_lat)::extensions.geography) as dist_meters
  FROM public.spots s
  WHERE extensions.st_dwithin(s.location, extensions.st_point(p_lng, p_lat)::extensions.geography, p_radius_meters)
    AND (p_category IS NULL OR s.category = p_category)
  ORDER BY s.location operator(extensions.<->) extensions.st_point(p_lng, p_lat)::extensions.geography
  LIMIT 100;
$$;

-- Spots in map viewport (bounding box)
CREATE OR REPLACE FUNCTION spots_in_viewport(
  min_lat float, min_lng float, max_lat float, max_lng float
)
RETURNS TABLE (
  id bigint, name text, city text, category text,
  photo_url text, votes int, lat float, lng float
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT s.id, s.name, s.city, s.category, s.photo_url, s.votes, s.lat, s.lng
  FROM public.spots s
  WHERE s.location operator(extensions.&&) extensions.st_setsrid(
    extensions.st_makebox2d(
      extensions.st_point(min_lng, min_lat),
      extensions.st_point(max_lng, max_lat)
    ), 4326
  );
$$;
```

### Client Usage
```typescript
// Find cafes within 2km
const { data } = await supabase.rpc('nearby_spots', {
  p_lat: 13.7563,
  p_lng: 100.5018,
  p_radius_meters: 2000,
  p_category: 'cafe'
});

// Load spots visible on map
const { data } = await supabase.rpc('spots_in_viewport', {
  min_lat: bounds.southwest.lat,
  min_lng: bounds.southwest.lng,
  max_lat: bounds.northeast.lat,
  max_lng: bounds.northeast.lng,
});
```

### Recommendations for x/pat
1. Enable PostGIS and add geography column to `spots` -- this is the single biggest performance win for map-based features
2. The GIST index replaces the current btree index on (lat, lng) which cannot do radius/proximity queries
3. Do the same for `neighborhood_vibes`, `events`, and `user_availability` tables
4. For "who's nearby" on the map: add geography column to `city_presence` or `user_availability`
5. Keep `lat` and `lng` columns for backward compatibility and client-side use -- update both when location changes

---

## 12. Connection Pooling

### Current Best Practice (2026)
- **Supavisor** (shared pooler) included on all plans. Supports session mode (port 5432) and transaction mode (port 6543).
- **PgBouncer** (dedicated pooler) available on paid plans. Co-located with DB for lowest latency.
- **From React Native**: Use PostgREST (Data API) not direct Postgres connections. PostgREST handles its own connection pool.
- **From Edge Functions**: Use transaction mode (port 6543) since they are short-lived
- **Pool size**: Default pool shared between session and transaction modes. Don't exceed Postgres max connections.

### x/pat Architecture
- **App client** -> PostgREST API (via supabase-js) -> Postgres. No direct DB connections needed.
- **Edge Functions** -> `SUPABASE_DB_URL` env var (transaction mode automatically)
- **Agent system** (Python) -> Should use transaction mode pooler if connecting directly

### Recommendations for x/pat
1. The current architecture is correct -- React Native app uses supabase-js which goes through PostgREST, not direct connections
2. For Edge Functions that need direct SQL: use the `SUPABASE_DB_URL` env variable (automatically transaction-pooled)
3. If the Python agent system connects directly to Postgres, use the transaction mode pooler string (port 6543)
4. Monitor connections: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active';`
5. On free tier: you get ~15 direct connections. PostgREST uses ~3-5, leaving 10-12 for other services.

---

## 13. Branching for Development

### Current Best Practice (2026)
- Supabase Branching creates isolated preview environments per Git branch
- Each branch gets its own: database, API endpoints, auth, storage, Edge Functions
- Migrations run sequentially on branch creation; seeded from `supabase/seed.sql`
- Configure per-branch settings in `config.toml` with `[remotes]` blocks
- Secrets managed per-branch via CLI

### Implementation for x/pat
```toml
# supabase/config.toml
[api]
enabled = true
schemas = ["public", "storage", "graphql_public"]

[db]
port = 54322
pool_size = 10

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]

# Staging branch
[remotes.staging]
project_id = "staging-ref-here"

[remotes.staging.db.seed]
sql_paths = ["./seeds/staging.sql"]
```

### Recommendations for x/pat
1. Enable branching once on a paid plan -- it is invaluable for testing schema changes before production
2. Create a `staging` persistent branch for beta testing
3. Use ephemeral branches tied to PRs for feature development
4. Keep seed data in version control: `supabase/seed.sql` with the 431 seeded spots
5. Use `supabase db diff` locally to generate migration files from dashboard changes
6. Note: branching requires Pro plan. For now, use local Supabase CLI for development.

---

## 14. Migrations Best Practices

### Current Best Practice
- Store migrations in `supabase/migrations/` with timestamped filenames
- Use `supabase db diff` to auto-generate migrations from schema changes
- Use `supabase db push` to apply migrations
- For rollbacks: write a new "down" migration rather than deleting the "up" migration
- Test migrations locally before pushing to production
- Never edit a migration that has already been applied

### Recommended Workflow for x/pat
```bash
# 1. Start local Supabase
supabase start

# 2. Make schema changes in local dashboard or via SQL
# 3. Generate migration
supabase db diff -f add_fts_to_spots

# 4. Review the generated migration file
# 5. Test locally
supabase db reset

# 6. Push to production
supabase db push

# 7. If something goes wrong, write a rollback migration
supabase db diff -f rollback_fts_spots
```

### Recommendations for x/pat
1. Initialize local Supabase project with `supabase init` and `supabase link`
2. Pull current remote schema: `supabase db pull` to create initial migration baseline
3. Never modify migrations that have already been applied to production
4. For data migrations (like populating the geography column from lat/lng): use a separate migration file
5. Keep migration files small and focused -- one feature per migration
6. Add migration tests by including test queries in `supabase/tests/`

---

## 15. Monitoring

### Current Best Practice
- `pg_stat_statements` tracks query performance (already enabled on x/pat)
- Supabase Dashboard provides: database connections, CPU/memory, disk I/O, query performance advisor
- Log Explorer for real-time error tracking
- Set up alerts for: high CPU, connection exhaustion, slow queries

### Key Monitoring Queries for x/pat
```sql
-- Top 10 slowest queries (average)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Top 10 most called queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Table bloat check
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Index usage stats
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Unused indexes (candidates for removal)
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Recommendations for x/pat
1. Run the "unused indexes" query periodically -- the redundant indexes identified in Section 1 will show up here
2. Set up Supabase Dashboard alerts for CPU > 80% and connections > 80% of max
3. Use the Query Performance advisor in the dashboard to catch slow queries
4. After adding FTS and PostGIS, monitor index sizes with `pg_relation_size()`
5. Consider Supabase Grafana integration for detailed monitoring if moving to Pro

---

## 16. RLS Patterns for Social Apps

### Current Best Practice
Social apps have complex access patterns: public profiles, private messages, follow-gated content, blocked user exclusion. Key patterns:

1. **Public read, owner write**: `SELECT true` for reads, `auth.uid() = user_id` for writes
2. **Follow-gated content**: EXISTS subquery against follows table
3. **Block filtering**: Exclude blocked users from all queries (use set-based, not per-row)
4. **Privacy levels**: Use user_preferences.profile_visibility for tiered access
5. **Connection-based access**: Check connections table for DM permissions

### x/pat Current Patterns (Audit)

**Good patterns already in use:**
- Public spots, posts, comments, follows, likes -- correct for discovery app
- Owner-only writes on all tables
- Block checks on chat_messages, direct_messages, connections
- Privacy-aware travel_plans (is_public OR own)

**Missing patterns to add:**
```sql
-- 1. Block-aware profile visibility
-- Currently profiles_read allows all. Should filter blocked users.
DROP POLICY IF EXISTS "profiles_read" ON profiles;
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
        OR (blocker_id = profiles.id AND blocked_id = auth.uid())
    )
  );

-- 2. Privacy-level aware profile access
-- After the above, layer in profile_visibility:
-- (This is an advanced version -- implement when user base grows)
CREATE POLICY "profiles_read_privacy" ON profiles
  FOR SELECT USING (
    id = auth.uid()  -- Always see own profile
    OR (
      NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id) OR (blocker_id = profiles.id AND blocked_id = auth.uid()))
      AND (
        (SELECT profile_visibility FROM user_preferences WHERE user_id = profiles.id) = 'public'
        OR (
          (SELECT profile_visibility FROM user_preferences WHERE user_id = profiles.id) = 'connections'
          AND are_connected(auth.uid(), profiles.id)
        )
      )
    )
  );

-- 3. Feed filtered by follows (future enhancement)
-- When feed becomes follow-based instead of global:
CREATE POLICY "feed_followed_users" ON posts
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = posts.user_id
    )
    OR is_seed = true  -- Always show seeded content
  );
```

### Recommendations for x/pat
1. Keep current public-read policies for now -- at this stage, discovery is more important than privacy
2. Add block-awareness to profile reads when blocks feature is actively used
3. When transitioning to a follow-based feed, use the `feed_followed_users` policy pattern
4. The `is_blocked()` function in chat RLS should be refactored to use IN-list pattern (see Section 2)
5. Consider RLS on `saved_spots` -- currently only the owner can see their saves (correct and efficient)

---

## 17. Materialized Views

### Current Best Practice
- Materialized views pre-compute expensive queries and store results
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` allows reads during refresh (requires unique index)
- Refresh via pg_cron on a schedule (not on every write)
- Perfect for: trending calculations, feed generation, statistics dashboards

### Implementation for x/pat
```sql
-- 1. Trending spots (by votes + recency + check-ins)
CREATE MATERIALIZED VIEW mv_trending_spots AS
SELECT
  s.id, s.name, s.city, s.country, s.category, s.photo_url, s.lat, s.lng,
  s.votes,
  COUNT(DISTINCT ci.id) AS recent_check_ins,
  COUNT(DISTINCT sv.id) AS recent_saves,
  (s.votes * 2 + COUNT(DISTINCT ci.id) * 3 + COUNT(DISTINCT sv.id)) AS trend_score
FROM spots s
LEFT JOIN check_ins ci ON ci.spot_id = s.id AND ci.created_at > now() - interval '7 days'
LEFT JOIN saved_spots sv ON sv.spot_id = s.id AND sv.created_at > now() - interval '7 days'
GROUP BY s.id
ORDER BY trend_score DESC;

CREATE UNIQUE INDEX ON mv_trending_spots (id);

-- 2. City stats (number of nomads, spots, events)
CREATE MATERIALIZED VIEW mv_city_stats AS
SELECT
  city, country,
  COUNT(DISTINCT cp.user_id) AS active_nomads,
  COUNT(DISTINCT s.id) AS spot_count,
  COUNT(DISTINCT e.id) AS upcoming_events
FROM city_presence cp
FULL OUTER JOIN spots s ON s.city = cp.city
FULL OUTER JOIN events e ON e.city = COALESCE(cp.city, s.city) AND e.starts_at > now()
WHERE cp.last_active > now() - interval '48 hours' OR cp.user_id IS NULL
GROUP BY COALESCE(cp.city, s.city), COALESCE(cp.country, s.country);

CREATE UNIQUE INDEX ON mv_city_stats (city, country);

-- 3. User feed cache (posts from followed users)
CREATE MATERIALIZED VIEW mv_user_feed AS
SELECT
  f.follower_id AS user_id,
  p.id AS post_id,
  p.content,
  p.photo_url,
  p.created_at,
  p.user_id AS author_id,
  pr.display_name AS author_name,
  pr.avatar_url AS author_avatar,
  (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
FROM follows f
JOIN posts p ON p.user_id = f.following_id
JOIN profiles pr ON pr.id = p.user_id
WHERE p.created_at > now() - interval '30 days'
ORDER BY p.created_at DESC;

CREATE UNIQUE INDEX ON mv_user_feed (user_id, post_id);

-- Refresh schedule (via pg_cron from Section 9)
-- Trending: every 15 min
-- City stats: every hour
-- Feed: every 5 min (or use trigger-based invalidation)
```

### Recommendations for x/pat
1. Start with `mv_trending_spots` -- gives the explore screen a "trending" section without expensive real-time computation
2. Add `mv_city_stats` for the city overview cards (nomad count, spot count)
3. The feed materialized view is optional until user count grows -- at <100 users, real-time queries are fine
4. Always use CONCURRENTLY refresh to avoid locking reads
5. Grant SELECT on materialized views to the `anon` and `authenticated` roles

---

## 18. Webhooks

### Current Best Practice
- Database Webhooks = triggers + pg_net for async HTTP
- Use for: external notifications, n8n/Zapier integration, analytics pipelines
- Payload includes `type`, `table`, `schema`, `record`, `old_record`
- Use Edge Functions as webhook endpoints for complex processing
- Non-blocking: pg_net fires async, does not slow down the triggering query

### Implementation for x/pat
```sql
-- Webhook: notify Edge Function when new post is created (for push notifications)
CREATE TRIGGER webhook_new_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://diiqponrvrcpwoerenwz.supabase.co/functions/v1/notifications',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_ROLE_KEY"}',
    '{}',
    '5000'
  );

-- Webhook: notify on new connection request
CREATE TRIGGER webhook_new_connection
  AFTER INSERT ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://diiqponrvrcpwoerenwz.supabase.co/functions/v1/notifications',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_ROLE_KEY"}',
    '{}',
    '5000'
  );
```

### Recommendations for x/pat
1. Use webhooks for push notification delivery -- trigger an Edge Function that reads push_tokens and sends via Expo push service
2. For n8n automation: expose a webhook endpoint that n8n polls or receives from
3. Webhook for affiliate analytics: when `affiliate_clicks` gets INSERT, forward to analytics pipeline
4. Monitor webhook delivery: `SELECT * FROM net._http_response ORDER BY created DESC LIMIT 20;`
5. For the notification Edge Function: batch multiple notifications and deduplicate (e.g., don't notify someone 5 times in 1 minute)

---

## 19. Vector Search (pgvector)

### Current Best Practice (2026)
- pgvector extension for storing and querying embeddings
- Use `halfvec(1536)` for half-precision storage (saves 50% space vs float)
- HNSW indexes for approximate nearest neighbor search (fast, scalable)
- IVFFlat indexes for exact search on smaller datasets
- Supabase's automatic embeddings system: triggers + pgmq + Edge Functions + pg_cron

### Implementation for x/pat (AI-Powered Spot Recommendations)
```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to spots
ALTER TABLE spots ADD COLUMN embedding extensions.halfvec(1536);

-- HNSW index for cosine similarity search
CREATE INDEX idx_spots_embedding ON spots
  USING hnsw (embedding extensions.halfvec_cosine_ops);

-- Function to find similar spots
CREATE OR REPLACE FUNCTION find_similar_spots(
  query_embedding extensions.halfvec(1536),
  p_city text DEFAULT NULL,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint, name text, city text, category text,
  photo_url text, similarity float
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT s.id, s.name, s.city, s.category, s.photo_url,
    1 - (s.embedding operator(extensions.<=>) query_embedding) AS similarity
  FROM public.spots s
  WHERE s.embedding IS NOT NULL
    AND (p_city IS NULL OR s.city = p_city)
  ORDER BY s.embedding operator(extensions.<=>) query_embedding
  LIMIT match_count;
$$;

-- User taste profile: average of embeddings from saved/visited spots
CREATE OR REPLACE FUNCTION get_recommendations(
  p_user_id uuid,
  p_city text DEFAULT NULL,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id bigint, name text, city text, category text,
  photo_url text, similarity float
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  WITH user_taste AS (
    SELECT extensions.avg(s.embedding) AS taste_vector
    FROM public.saved_spots ss
    JOIN public.spots s ON s.id = ss.spot_id
    WHERE ss.user_id = p_user_id AND s.embedding IS NOT NULL
  )
  SELECT s.id, s.name, s.city, s.category, s.photo_url,
    1 - (s.embedding operator(extensions.<=>) ut.taste_vector) AS similarity
  FROM public.spots s, user_taste ut
  WHERE s.embedding IS NOT NULL
    AND s.id NOT IN (SELECT spot_id FROM public.saved_spots WHERE user_id = p_user_id)
    AND s.id NOT IN (SELECT spot_id FROM public.visited WHERE user_id = p_user_id)
    AND (p_city IS NULL OR s.city = p_city)
  ORDER BY s.embedding operator(extensions.<=>) ut.taste_vector
  LIMIT match_count;
$$;
```

### Recommendations for x/pat
1. This is a Phase 2 feature -- implement after launch when you have user behavior data
2. Generate spot embeddings from: name + category + description + note + tags concatenated, passed through OpenAI text-embedding-3-small
3. Use the automatic embeddings architecture (triggers + pgmq + Edge Function) from the docs
4. For recommendations: average a user's saved/visited spot embeddings to create a "taste vector", then find nearest neighbors
5. Start with 431 spots -- pgvector handles this easily. HNSW index scales to millions.
6. Cost: ~$0.01 to embed all 431 spots via OpenAI's embedding API

---

## 20. Rate Limiting

### Current Best Practice
- **Edge Function level**: Use Supabase's built-in rate limiting or implement custom with Redis/KV
- **PostgREST level**: PostgREST has built-in connection limits per role
- **Database level**: Use pg_stat_activity monitoring to detect abuse
- **Application level**: Implement rate limiting in the React Native app (debounce, throttle)

### Implementation for x/pat
```typescript
// Edge Function rate limiter using Supabase as KV store
// In supabase/functions/_shared/rateLimiter.ts
export async function rateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<boolean> {
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!);

  const [result] = await sql`
    INSERT INTO rate_limits (identifier, window_start, request_count)
    VALUES (${identifier}, now(), 1)
    ON CONFLICT (identifier)
    DO UPDATE SET
      request_count = CASE
        WHEN rate_limits.window_start < now() - interval '${windowSeconds} seconds'
        THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - interval '${windowSeconds} seconds'
        THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING request_count;
  `;

  return result.request_count <= maxRequests;
}
```

```sql
-- Rate limits tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1
);

-- RLS: only service role can access
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = only service role key can read/write

-- Cleanup old entries (via pg_cron)
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *',
  $$DELETE FROM rate_limits WHERE window_start < now() - interval '5 minutes';$$
);
```

### Recommendations for x/pat
1. For launch: rely on Supabase's built-in PostgREST rate limiting (included on all plans)
2. Add Edge Function rate limiting for: affiliate click tracking (prevent gaming), chat message sending, connection requests
3. Client-side: debounce search input (300ms), throttle location updates (30s minimum interval)
4. For chat: max 1 message per second per user. For follows: max 30 per minute.
5. Monitor with `pg_stat_statements` for suspicious query patterns

---

## 21. Backup & Disaster Recovery

### Current Best Practice
- **Free tier**: Daily automated backups, retained for 7 days (not PITR)
- **Pro tier**: Daily backups + Point-in-Time Recovery (PITR) for continuous backup
- **Manual backups**: Use `supabase db dump` via CLI or `pg_dump` for manual exports
- **Storage**: Backed up independently from database
- **Recovery**: Restore from dashboard or contact Supabase support

### Recommendations for x/pat
1. **Immediately**: Set up periodic manual backups via CLI: `supabase db dump -f backup_$(date +%Y%m%d).sql`
2. When on Pro tier: enable PITR for continuous backup with second-level granularity
3. Back up seed data separately: keep `seed.sql` in version control with all 431 spots
4. Test restore procedure: dump and restore to a local Supabase instance quarterly
5. For Storage: download critical assets (logos, seed spot photos) to local backup
6. Document the recovery procedure so it's not dependent on one person (you)

### Manual Backup Script
```bash
#!/bin/bash
# Run weekly via Windows Task Scheduler or cron
DATE=$(date +%Y%m%d)
supabase db dump --project-ref diiqponrvrcpwoerenwz -f "backups/xpat_backup_${DATE}.sql"
# Optionally compress
gzip "backups/xpat_backup_${DATE}.sql"
```

---

## 22. Multi-Region Deployment

### Current Best Practice (2026)
- **Read replicas**: Deploy read-only databases in multiple regions. Writes go to primary (us-east-1).
- **Edge Functions**: Automatically execute in region closest to user. Pin to DB region for write-heavy functions.
- **CDN**: Storage assets served from nearest Cloudflare edge. Already global.
- **Auth**: Supabase Auth is regional (follows project region). Token verification is fast everywhere.

### x/pat Consideration
Digital nomads are globally distributed -- latency matters:
- Bangkok users: ~200ms to us-east-1
- Lisbon users: ~100ms to us-east-1
- CDMX users: ~50ms to us-east-1

### Recommendations for x/pat
1. **Not needed yet.** With <1000 users, a single us-east-1 region is fine.
2. PostgREST responses are typically <100ms of DB processing. Network latency dominates.
3. When growing: add read replicas in `eu-west-1` (Europe) and `ap-southeast-1` (Singapore) for Asian nomads
4. Edge Functions already execute at nearest edge for non-DB operations (great for translation, image processing)
5. For write-heavy operations (chat messages, check-ins): pin Edge Functions to `us-east-1` with `region: FunctionRegion.UsEast1`
6. CDN already handles global distribution for static assets (spot photos, avatars)
7. Consider region migration only if >50% of users are outside the Americas

---

## 23. Pricing Optimization

### Current Best Practice
Supabase pricing tiers (2026):
- **Free**: 500MB DB, 1GB Storage, 2GB bandwidth, 500K Edge Function invocations
- **Pro ($25/mo)**: 8GB DB, 100GB Storage, 250GB bandwidth, 2M Edge Function invocations, daily backups + PITR
- **Team ($599/mo)**: Everything in Pro + SOC2, SSO, priority support

### x/pat Current Usage (Free Tier)
- Database: 28 tables, mostly empty (pre-launch). 431 seed spots + 1 profile + 1 post.
- Storage: Minimal (spot photos from seeds)
- Bandwidth: Minimal (development only)
- Edge Functions: 0 deployed

### Cost Reduction Strategies
1. **Reduce database size**: Drop redundant indexes (saves ~5% per index). Clean up pg_stat_statements data.
2. **Storage**: Use WebP transforms to reduce image sizes by 30%. Set long cache-control headers to reduce bandwidth.
3. **Edge Functions**: Combine into fat functions to reduce cold starts and invocation count.
4. **Realtime**: Use Broadcast instead of Postgres Changes for chat -- Broadcast is cheaper (no WAL overhead).
5. **Connection pooling**: Use transaction mode for short-lived connections to maximize connection efficiency.

### Recommendations for x/pat
1. Stay on Free tier through beta testing with family
2. Move to Pro ($25/mo) before public launch -- you need: PITR backups, higher bandwidth for user photos, custom domain
3. Key Pro features worth $25: 8GB database (room to grow), PITR, email support, branching
4. Avoid Team tier until you have paying partners or investors
5. Monitor usage dashboard weekly during beta to avoid surprise overages
6. Estimated cost for first year with ~1000 users: Pro plan $25/mo = $300/year. This includes all infra.

---

## 24. Supabase vs Alternatives at Scale

### When to Consider Migration
| Factor | Supabase | Firebase | AWS (RDS + Lambda) | PlanetScale |
|--------|----------|----------|--------------------|-------------|
| Cost at 10K users | ~$25-75/mo | ~$50-200/mo | ~$100-500/mo | ~$30-100/mo |
| Cost at 100K users | ~$75-300/mo | ~$500-2000/mo | ~$500-2000/mo | ~$100-500/mo |
| Postgres compatibility | Native | N/A (NoSQL) | Native | MySQL only |
| Realtime | Built-in | Built-in | Custom (WebSocket API) | N/A |
| Auth | Built-in | Built-in | Cognito (complex) | N/A |
| RLS | Native Postgres | Firebase Rules | IAM policies | N/A |
| Geographic queries | PostGIS | GeoFire (limited) | PostGIS | Limited |
| Vendor lock-in | Low (standard Postgres) | High | Medium | Medium |
| React Native SDK | Official | Official | Custom | N/A |

### Recommendations for x/pat
1. **Supabase is the right choice** for x/pat through at least 100K users. Reasons:
   - Native Postgres means zero lock-in. You can migrate the DB to any Postgres host.
   - PostGIS, pgvector, full-text search are Postgres-native features that work out of the box
   - RLS policies are more powerful than Firebase Security Rules for social app patterns
   - Cost-effective: $25/mo covers everything a social travel app needs
2. **Only consider migration if**: Supabase pricing becomes prohibitive at scale (>500K users), or you need features Supabase doesn't offer (e.g., native GraphQL subscriptions, multi-master writes)
3. **Migration path**: Since everything is standard Postgres, you can migrate to: Neon, CockroachDB, AWS RDS, or self-hosted Postgres without changing application code. Only Supabase-specific features (Auth, Storage, Realtime, Edge Functions) would need replacement.
4. **Hybrid approach at scale**: Keep Postgres on Supabase, add Redis for caching, use Cloudflare Workers for edge compute if needed

---

## 25. AI Features 2026

### Supabase AI Capabilities (Current)
1. **pgvector**: Store and query embeddings. Already available. (See Section 19)
2. **Automatic Embeddings**: Trigger-based pipeline for auto-generating embeddings on INSERT/UPDATE using Edge Functions + pgmq + pg_cron
3. **AI SQL Assistant**: Dashboard feature that generates SQL from natural language
4. **Supabase MCP** (public alpha): Model Context Protocol server for AI agents to interact with Supabase projects
5. **pg_graphql**: AI tools can query via GraphQL

### Implementation Roadmap for x/pat

**Phase 1 (Post-Launch):** AI-Powered Spot Search
- Generate embeddings for all 431 spots using spot name + description + category + tags
- Enable natural language spot search: "quiet cafe with fast wifi near the river"
- Use `find_similar_spots()` function from Section 19

**Phase 2 (With User Data):** Personalized Recommendations
- Build user taste profiles from saved/visited/liked spots
- "Spots you might like" section on explore screen
- Use `get_recommendations()` function from Section 19

**Phase 3 (Scale):** AI Features
- Auto-categorize user-submitted spots using LLM classification
- Auto-generate spot descriptions from user notes + photos
- Chat translation using AI (already have message_translations table)
- "Trip planner" agent: suggest spots and itinerary based on preferences

### Recommendations for x/pat
1. Start with embeddings on spots -- it is the highest-value, lowest-effort AI feature
2. Use OpenAI text-embedding-3-small ($0.02/1M tokens) -- all 431 spots cost <$0.01 to embed
3. The automatic embeddings pipeline (triggers + pgmq + Edge Function) ensures new spots get embedded automatically
4. For chat translation: use the existing `message_translations` table with an Edge Function that calls a translation API
5. The Supabase MCP server could power your agent system's database interactions -- worth exploring for the CEO/CTO agent architecture
6. AI features align with the "free for life" model -- AI costs are infrastructure, not user-facing charges

---

## Priority Implementation Order

Based on x/pat's current stage (pre-public launch, 431 spots, family beta):

### Immediate (This Sprint)
1. **Drop redundant indexes** (Section 1) -- free performance win
2. **Add PostGIS** (Section 11) -- critical for map experience
3. **Add Full-Text Search** (Section 10) -- search is a core feature
4. **Add trigger for profile_completion_score** (Section 8) -- field exists but never computed
5. **Add trigger for spot vote count** (Section 8) -- avoid COUNT(*) on every spot card

### Next Sprint
6. **Set up pg_cron cleanup jobs** (Section 9) -- prevent data bloat from beta
7. **Optimize chat RLS policies** (Section 2) -- replace per-row is_blocked with set-based
8. **Create trending spots materialized view** (Section 17) -- explore screen feature
9. **Set up manual backup routine** (Section 21) -- protect against data loss

### Pre-Launch
10. **Move to Pro tier** (Section 23) -- PITR, higher limits
11. **Add Storage buckets with transforms** (Section 5) -- optimized image serving
12. **Set up Database Webhooks for push notifications** (Section 18)
13. **Configure Edge Functions** (Section 3) -- fat function architecture

### Post-Launch
14. **Add pgvector for spot recommendations** (Section 19)
15. **Add materialized views for feed and city stats** (Section 17)
16. **Implement rate limiting** (Section 20)
17. **Set up monitoring dashboards** (Section 15)
18. **Enable branching** (Section 13) -- when on Pro

### Scale Phase (1000+ users)
19. **Read replicas** (Section 22) -- multi-region
20. **Advanced RLS patterns** (Section 16) -- privacy controls
21. **Connection pooling optimization** (Section 12)
22. **AI features pipeline** (Section 25)
