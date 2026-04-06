-- Migration: profile_completion_score trigger
-- Fixes the always-0 bug: profile_completion_score was never updated

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p profiles)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Each field worth points (total = 100)
  IF p.display_name IS NOT NULL AND length(trim(p.display_name)) > 0 THEN score := score + 15; END IF;
  IF p.username IS NOT NULL AND length(trim(p.username)) > 0 THEN score := score + 10; END IF;
  IF p.bio IS NOT NULL AND length(trim(p.bio)) > 0 THEN score := score + 15; END IF;
  IF p.avatar_url IS NOT NULL AND length(trim(p.avatar_url)) > 0 THEN score := score + 20; END IF;
  IF p.current_city IS NOT NULL AND length(trim(p.current_city)) > 0 THEN score := score + 15; END IF;
  IF p.nationality IS NOT NULL AND length(trim(p.nationality)) > 0 THEN score := score + 10; END IF;
  IF p.languages IS NOT NULL AND array_length(p.languages, 1) > 0 THEN score := score + 10; END IF;
  RETURN score;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_completion_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.profile_completion_score := public.calculate_profile_completion(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_completion ON public.profiles;
CREATE TRIGGER trg_update_profile_completion
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_completion_score();

-- Backfill existing profiles
UPDATE public.profiles SET updated_at = updated_at;
