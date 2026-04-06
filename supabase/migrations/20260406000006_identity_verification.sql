-- Migration: Identity verification & trust badge system
-- Based on identity-verification-trust-safety-research.md
-- Uses Stripe Identity ($1.50/verification) as primary provider

-- ========================
-- VERIFICATION TIERS
-- ========================
-- Tier 0: Unverified (default)
-- Tier 1: Email verified (Supabase auth handles this)
-- Tier 2: Phone verified
-- Tier 3: ID document verified (Stripe Identity)
-- Tier 4: Community vouched (3+ Tier 3 users vouch)

CREATE TABLE IF NOT EXISTS public.user_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN (
    'email', 'phone', 'document_id', 'community_vouch', 'social_link'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'verified', 'failed', 'expired'
  )),
  provider text, -- 'stripe', 'supabase_auth', 'manual', etc.
  provider_reference_id text, -- Stripe VerificationSession ID
  verified_at timestamptz,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, verification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON public.user_verifications (status) WHERE status = 'verified';

-- ========================
-- TRUST SCORE ON PROFILES
-- ========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Auto-update verification_level when verifications change
CREATE OR REPLACE FUNCTION public.update_user_verification_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_level integer := 0;
  v_trust integer := 0;
  v_id_verified boolean := false;
BEGIN
  -- Count verified types
  SELECT
    COALESCE(SUM(CASE
      WHEN verification_type = 'email' AND status = 'verified' THEN 1
      WHEN verification_type = 'phone' AND status = 'verified' THEN 1
      WHEN verification_type = 'document_id' AND status = 'verified' THEN 1
      WHEN verification_type = 'community_vouch' AND status = 'verified' THEN 1
      ELSE 0
    END), 0),
    COALESCE(SUM(CASE
      WHEN verification_type = 'email' AND status = 'verified' THEN 10
      WHEN verification_type = 'phone' AND status = 'verified' THEN 15
      WHEN verification_type = 'document_id' AND status = 'verified' THEN 50
      WHEN verification_type = 'community_vouch' AND status = 'verified' THEN 25
      WHEN verification_type = 'social_link' AND status = 'verified' THEN 10
      ELSE 0
    END), 0),
    BOOL_OR(verification_type = 'document_id' AND status = 'verified')
  INTO v_level, v_trust, v_id_verified
  FROM public.user_verifications
  WHERE user_id = NEW.user_id;

  UPDATE public.profiles SET
    verification_level = v_level,
    trust_score = v_trust,
    is_identity_verified = v_id_verified,
    verified_at = CASE WHEN v_id_verified AND verified_at IS NULL THEN now() ELSE verified_at END
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_verification_level ON public.user_verifications;
CREATE TRIGGER trg_update_verification_level
  AFTER INSERT OR UPDATE ON public.user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_verification_level();

-- ========================
-- COMMUNITY VOUCHING
-- ========================
CREATE TABLE IF NOT EXISTS public.community_vouches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (voucher_id, recipient_id),
  CHECK (voucher_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_vouches_recipient ON public.community_vouches (recipient_id);
CREATE INDEX IF NOT EXISTS idx_vouches_voucher ON public.community_vouches (voucher_id);

-- Grant community_vouch verification when 3+ verified users vouch
CREATE OR REPLACE FUNCTION public.check_community_vouch_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  vouch_count integer;
BEGIN
  -- Count vouches from Tier 3+ verified users
  SELECT COUNT(*) INTO vouch_count
  FROM public.community_vouches cv
  JOIN public.profiles p ON p.id = cv.voucher_id
  WHERE cv.recipient_id = NEW.recipient_id
    AND p.is_identity_verified = true;

  IF vouch_count >= 3 THEN
    INSERT INTO public.user_verifications (user_id, verification_type, status, provider, verified_at)
    VALUES (NEW.recipient_id, 'community_vouch', 'verified', 'community', now())
    ON CONFLICT (user_id, verification_type) DO UPDATE
      SET status = 'verified', verified_at = now(), updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_vouch_threshold ON public.community_vouches;
CREATE TRIGGER trg_community_vouch_threshold
  AFTER INSERT ON public.community_vouches
  FOR EACH ROW EXECUTE FUNCTION public.check_community_vouch_threshold();

-- ========================
-- RLS
-- ========================
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own verifications" ON public.user_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Verification level is public" ON public.user_verifications FOR SELECT USING (
  verification_type IN ('email', 'phone', 'document_id', 'community_vouch')
  AND status = 'verified'
);
CREATE POLICY "System can insert/update verifications" ON public.user_verifications
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.community_vouches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vouches are public" ON public.community_vouches FOR SELECT USING (true);
CREATE POLICY "Verified users can vouch" ON public.community_vouches FOR INSERT
  WITH CHECK (
    auth.uid() = voucher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_identity_verified = true)
  );
