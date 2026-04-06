-- Migration: Keep spots.votes in sync with spot_votes table
-- spot_votes is a presence table — each row = 1 upvote

CREATE OR REPLACE FUNCTION public.update_spot_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spots
    SET votes = COALESCE(votes, 0) + 1
    WHERE id = NEW.spot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spots
    SET votes = GREATEST(0, COALESCE(votes, 0) - 1)
    WHERE id = OLD.spot_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_spot_votes ON public.spot_votes;
CREATE TRIGGER trg_update_spot_votes
  AFTER INSERT OR DELETE ON public.spot_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spot_vote_count();

-- Backfill vote counts from existing spot_votes
UPDATE public.spots s
SET votes = COALESCE((
  SELECT COUNT(*) FROM public.spot_votes sv WHERE sv.spot_id = s.id
), 0);
