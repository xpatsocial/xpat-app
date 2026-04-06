-- Migration: Content moderation infrastructure

-- Add is_flagged column to UGC tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;

-- Moderation log table
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'chat_message', 'spot', 'profile', 'user_report')),
  content_id text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  flagged boolean NOT NULL DEFAULT false,
  categories jsonb DEFAULT '{}',
  scores jsonb DEFAULT '{}',
  action text NOT NULL DEFAULT 'auto_flagged' CHECK (action IN (
    'auto_flagged', 'user_reported', 'human_reviewed', 'content_removed',
    'user_warned', 'user_suspended', 'dismissed'
  )),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_log_user_id ON public.moderation_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_log_action ON public.moderation_log (action) WHERE action IN ('auto_flagged', 'user_reported');
CREATE INDEX IF NOT EXISTS idx_moderation_log_content ON public.moderation_log (content_type, content_id);

-- User violation tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

-- Auto-suspend after 5 flags (configurable)
CREATE OR REPLACE FUNCTION public.check_user_flag_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  flag_count_recent integer;
BEGIN
  -- Count recent flags for this user (last 30 days)
  SELECT COUNT(*) INTO flag_count_recent
  FROM public.moderation_log
  WHERE user_id = NEW.user_id
    AND flagged = true
    AND created_at > now() - interval '30 days';

  -- Auto-suspend at 5+ flags in 30 days
  IF flag_count_recent >= 5 THEN
    UPDATE public.profiles
    SET
      flag_count = flag_count_recent,
      is_suspended = true,
      suspended_until = now() + interval '24 hours'
    WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles SET flag_count = flag_count_recent WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_flag_threshold ON public.moderation_log;
CREATE TRIGGER trg_check_flag_threshold
  AFTER INSERT ON public.moderation_log
  FOR EACH ROW
  WHEN (NEW.flagged = true)
  EXECUTE FUNCTION public.check_user_flag_threshold();

-- RLS
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
-- Only service role can read/write moderation log (Edge Functions use service key)
-- No user-facing policies — moderation data is internal only

-- Hide flagged content from public feeds (existing RLS on posts/spots still applies)
-- We filter is_flagged in app queries; this is defense-in-depth
CREATE INDEX IF NOT EXISTS idx_posts_not_flagged ON public.posts (created_at DESC) WHERE is_flagged = false;
CREATE INDEX IF NOT EXISTS idx_spots_not_flagged ON public.spots (city, category) WHERE is_flagged = false;
