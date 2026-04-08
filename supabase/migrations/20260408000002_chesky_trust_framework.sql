-- Migration: Chesky trust framework — vouches with IRL context, peer reviews, progressive trust
-- Based on research/playbook-brian-chesky-trust-belonging.md
-- Implements: vouch-at-spot, double-blind peer reviews, progressive trust scoring

-- ========================
-- ENHANCED COMMUNITY VOUCHES (add spot context for IRL meetings)
-- ========================

-- Add spot_id and spot_name columns for IRL context
ALTER TABLE public.community_vouches
  ADD COLUMN IF NOT EXISTS spot_id integer REFERENCES public.spots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS spot_name text,
  ADD COLUMN IF NOT EXISTS city text;

-- Relax the vouching policy: allow ANY verified-email user to vouch (not just ID-verified)
-- This enables the trust-building flywheel from day one
DROP POLICY IF EXISTS "Verified users can vouch" ON public.community_vouches;
CREATE POLICY "Authenticated users can vouch" ON public.community_vouches FOR INSERT
  WITH CHECK (auth.uid() = voucher_id);

-- Users can delete their own vouches
CREATE POLICY "Users can delete own vouches" ON public.community_vouches FOR DELETE
  USING (auth.uid() = voucher_id);

-- ========================
-- PEER REVIEWS (Airbnb double-blind model)
-- ========================
-- After users interact (mutual check-in, event, chat), both can leave a review.
-- Reviews are hidden until BOTH submit or 7 days elapse.

CREATE TABLE IF NOT EXISTS public.peer_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Context: how did they interact?
  interaction_type text NOT NULL CHECK (interaction_type IN (
    'mutual_checkin', 'event', 'direct_message', 'connection'
  )),
  interaction_ref text, -- e.g. spot_id, event_id, etc.
  -- Review content
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'neutral')),
  -- No negative option: we don't want a burn book. Report system handles bad actors.
  review_text text CHECK (char_length(review_text) <= 280),
  -- Double-blind: when was it revealed?
  revealed_at timestamptz,
  -- Pair key: both reviews for the same interaction share this
  pair_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- One review per reviewer per pair
  UNIQUE (reviewer_id, pair_key),
  CHECK (reviewer_id != subject_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_subject ON public.peer_reviews (subject_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_pair ON public.peer_reviews (pair_key);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_revealed ON public.peer_reviews (subject_id) WHERE revealed_at IS NOT NULL;

-- RLS for peer reviews
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;

-- Users can see their own reviews (revealed or not)
CREATE POLICY "Users see own reviews" ON public.peer_reviews FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = subject_id);

-- Public can see revealed reviews
CREATE POLICY "Public sees revealed reviews" ON public.peer_reviews FOR SELECT
  USING (revealed_at IS NOT NULL);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can write reviews" ON public.peer_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- ========================
-- DOUBLE-BLIND REVEAL FUNCTION
-- ========================
-- When a review is inserted, check if the other party already submitted.
-- If yes, reveal both immediately. Otherwise, a cron/edge function reveals after 7 days.

CREATE OR REPLACE FUNCTION public.reveal_peer_review_pair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  other_review_id uuid;
BEGIN
  -- Check if the other party already submitted a review with the same pair_key
  SELECT id INTO other_review_id
  FROM public.peer_reviews
  WHERE pair_key = NEW.pair_key
    AND reviewer_id = NEW.subject_id
    AND subject_id = NEW.reviewer_id
    AND revealed_at IS NULL;

  IF other_review_id IS NOT NULL THEN
    -- Both reviews exist — reveal both
    UPDATE public.peer_reviews
    SET revealed_at = now()
    WHERE pair_key = NEW.pair_key AND revealed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reveal_peer_reviews ON public.peer_reviews;
CREATE TRIGGER trg_reveal_peer_reviews
  AFTER INSERT ON public.peer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reveal_peer_review_pair();

-- ========================
-- PROGRESSIVE TRUST SCORE ENHANCEMENT
-- ========================
-- Recalculate trust_score to include: verifications + vouches + reviews + profile completeness + account age

CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_score integer := 0;
  v_verification_pts integer := 0;
  v_vouch_count integer := 0;
  v_review_count integer := 0;
  v_profile_complete integer := 0;
  v_account_age_days integer := 0;
  v_spot_count integer := 0;
BEGIN
  -- 1. Verification points (max 60)
  SELECT COALESCE(SUM(CASE
    WHEN verification_type = 'email' AND status = 'verified' THEN 10
    WHEN verification_type = 'phone' AND status = 'verified' THEN 15
    WHEN verification_type = 'social_link' AND status = 'verified' THEN 10
    WHEN verification_type = 'document_id' AND status = 'verified' THEN 50
    WHEN verification_type = 'community_vouch' AND status = 'verified' THEN 25
    ELSE 0
  END), 0) INTO v_verification_pts
  FROM public.user_verifications
  WHERE user_id = p_user_id;
  -- Cap at 60
  v_verification_pts := LEAST(v_verification_pts, 60);

  -- 2. Vouch points (3 pts each, max 30)
  SELECT COUNT(*) INTO v_vouch_count
  FROM public.community_vouches
  WHERE recipient_id = p_user_id;
  v_score := v_score + LEAST(v_vouch_count * 3, 30);

  -- 3. Positive review points (2 pts each, max 20)
  SELECT COUNT(*) INTO v_review_count
  FROM public.peer_reviews
  WHERE subject_id = p_user_id
    AND sentiment = 'positive'
    AND revealed_at IS NOT NULL;
  v_score := v_score + LEAST(v_review_count * 2, 20);

  -- 4. Profile completeness (max 10)
  SELECT COALESCE(profile_completion_score, 0) INTO v_profile_complete
  FROM public.profiles WHERE id = p_user_id;
  v_score := v_score + LEAST(v_profile_complete / 10, 10);

  -- 5. Account age bonus (1 pt per 30 days, max 10)
  SELECT EXTRACT(DAY FROM (now() - created_at))::integer INTO v_account_age_days
  FROM public.profiles WHERE id = p_user_id;
  v_score := v_score + LEAST(v_account_age_days / 30, 10);

  -- 6. Spot contributions (1 pt per 5 spots, max 10)
  SELECT COUNT(*) INTO v_spot_count
  FROM public.spots WHERE created_by = p_user_id;
  v_score := v_score + LEAST(v_spot_count / 5, 10);

  -- Total = verification + community contributions
  v_score := v_score + v_verification_pts;

  -- Update profile
  UPDATE public.profiles
  SET trust_score = LEAST(v_score, 100)
  WHERE id = p_user_id;

  RETURN LEAST(v_score, 100);
END;
$$;

-- ========================
-- MUTUAL CHECK-IN DETECTION VIEW
-- ========================
-- Finds pairs of users who checked in at the same spot within 4 hours of each other

CREATE OR REPLACE VIEW public.mutual_checkins AS
SELECT DISTINCT ON (LEAST(a.user_id, b.user_id), GREATEST(a.user_id, b.user_id), a.spot_id)
  a.user_id AS user_a,
  b.user_id AS user_b,
  a.spot_id,
  s.name AS spot_name,
  s.city,
  GREATEST(a.created_at, b.created_at) AS met_at
FROM public.check_ins a
JOIN public.check_ins b
  ON a.spot_id = b.spot_id
  AND a.user_id < b.user_id
  AND ABS(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 14400 -- 4 hours
JOIN public.spots s ON s.id = a.spot_id
ORDER BY LEAST(a.user_id, b.user_id), GREATEST(a.user_id, b.user_id), a.spot_id, met_at DESC;
