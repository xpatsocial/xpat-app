-- Migration: Performance indexes cleanup and additions
-- Drop redundant indexes identified in supabase-optimization-research.md

-- blocks table: unique composite already covers individual lookups
DROP INDEX IF EXISTS public.idx_blocks_blocker;
DROP INDEX IF EXISTS public.idx_blocks_blocker_blocked;
DROP INDEX IF EXISTS public.idx_blocks_blocked_blocker;

-- travel_plans: duplicate index
DROP INDEX IF EXISTS public.idx_travel_plans_user_id;

-- push_tokens: unique constraint already serves as lookup index
DROP INDEX IF EXISTS public.idx_push_tokens_user_id;

-- Add missing indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_current_city
  ON public.profiles (current_city)
  WHERE current_city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spots_lat_lng
  ON public.spots (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spots_city_category
  ON public.spots (city, category);

CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON public.posts (user_id, created_at DESC);

-- Partial index for active users (common filter in "who's here" queries)
CREATE INDEX IF NOT EXISTS idx_profiles_city_updated
  ON public.profiles (current_city, updated_at DESC)
  WHERE current_city IS NOT NULL;
